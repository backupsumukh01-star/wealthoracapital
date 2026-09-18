import type { Role, StaffRole, User, UserStatus } from '@prisma/client'
import { randomUUID } from 'node:crypto'

import { AUTH_LIMITS } from '../config/constants.js'
import { prisma } from '../database/prisma.js'
import { toPublicUser } from '../models/user.mapper.js'
import { sessionRepository } from '../repositories/session.repository.js'
import { userRepository, type UserListFilters } from '../repositories/user.repository.js'
import { generateReferralCode } from '../utils/crypto.js'
import { badRequest, conflict, forbidden, notFound } from '../utils/errors.js'
import { d, moneyDisplay } from '../utils/money.js'
import { storage } from './storage/index.js'
import { activityService } from './activity.service.js'
import { auditService } from './audit.service.js'
import { notificationService } from './notification.service.js'
import { opsAlertService } from './ops-alert.service.js'
import { passwordService } from './password.service.js'
import { ledgerService } from './finance/ledger.service.js'
import {
  batchUserFinance,
  mapPayoutMethod,
  singleUserFinance,
} from './admin-users-finance.js'

const DEFAULT_COUNTRY = 'IN'
const COUNTRY_LABELS: Record<string, string> = {
  IN: 'India',
  US: 'United States',
  GB: 'United Kingdom',
  AE: 'United Arab Emirates',
  SG: 'Singapore',
  AU: 'Australia',
  CA: 'Canada',
}

function resolveCountry(code: string | null | undefined, fallbackFromKyc?: string | null) {
  const raw = (code || fallbackFromKyc || DEFAULT_COUNTRY).trim().toUpperCase()
  const country = raw.length === 2 ? raw : DEFAULT_COUNTRY
  return {
    country,
    countryName: COUNTRY_LABELS[country] ?? country,
  }
}

function snapshotUser(user: User) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    country: user.country,
    timezone: user.timezone,
    role: user.role,
    staffRole: user.staffRole,
    status: user.status,
    kycStatus: user.kycStatus,
    emailVerified: user.emailVerifiedAt !== null,
    deletedAt: user.deletedAt?.toISOString() ?? null,
  }
}

/** Higher number = more privilege. Used to stop lateral/vertical escalation. */
function privilegeRank(user: { role: Role; staffRole: StaffRole | null }): number {
  if (user.role === 'SUPER_ADMIN' || user.staffRole === 'SUPER_ADMIN') return 100
  // Scoped staffRole must win over the ADMIN account role — otherwise every
  // FINANCE/SUPPORT/VIEWER staff account ranks as a full Admin (80).
  if (user.staffRole === 'ADMIN') return 80
  if (user.staffRole === 'FINANCE') return 60
  if (user.staffRole === 'SUPPORT' || user.staffRole === 'KYC' || user.staffRole === 'CONTENT') {
    return 40
  }
  if (user.staffRole === 'VIEWER') return 20
  if (user.role === 'ADMIN') return 80
  return 0
}

function assertCanManageTarget(
  actor: { role: Role; staffRole: StaffRole | null },
  target: { role: Role; staffRole: StaffRole | null },
): void {
  const actorRank = privilegeRank(actor)
  const targetRank = privilegeRank(target)
  if (targetRank === 0) return
  // Super Admins may manage other staff, including peer Super Admins (self blocked elsewhere).
  if (actorRank === 100) return
  if (actorRank <= targetRank) {
    throw forbidden('You cannot manage an account with equal or higher privilege.')
  }
}

function formatAddress(parts: Array<string | null | undefined>) {
  const cleaned = parts.map((p) => p?.trim()).filter(Boolean) as string[]
  return cleaned.length ? cleaned.join(', ') : null
}

async function allocateReferralCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode(AUTH_LIMITS.referralCodeLength)
    const existing = await userRepository.findByReferralCode(code)
    if (!existing) return code
  }
  return generateReferralCode(AUTH_LIMITS.referralCodeLength) + randomUUID().slice(0, 4)
}

export const adminUsersService = {
  async create(
    actorId: string,
    body: {
      firstName: string
      lastName: string
      email: string
      password: string
      phone?: string
      country?: string
      referralCode?: string
      accountOpened?: Date
    },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByEmail(body.email)
    if (existing) {
      throw conflict('An account with this email already exists.')
    }
    if (body.phone?.trim()) {
      const phoneOwner = await userRepository.findByPhone(body.phone.trim())
      if (phoneOwner) {
        throw conflict('An account with this phone number already exists.')
      }
    }

    let referredById: string | null = null
    if (body.referralCode) {
      const referrer = await userRepository.findByReferralCode(body.referralCode)
      if (!referrer) {
        throw badRequest('Invalid referral code.')
      }
      if (referrer.email.toLowerCase() === body.email.toLowerCase()) {
        throw badRequest('A user cannot be referred by their own code.')
      }
      referredById = referrer.id
    }

    const now = new Date()
    const openedAt = body.accountOpened && !Number.isNaN(body.accountOpened.getTime())
      ? body.accountOpened
      : now
    const passwordHash = await passwordService.hash(body.password)
    const referralCode = await allocateReferralCode()
    const country = (body.country || DEFAULT_COUNTRY).toUpperCase()

    const user = await userRepository.create({
      email: body.email,
      passwordHash,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone?.trim() || null,
      country,
      role: 'USER',
      status: 'ACTIVE',
      kycStatus: 'APPROVED',
      emailVerifiedAt: now,
      passwordChangedAt: now,
      createdByAdminId: actorId,
      referralCode,
      ...(referredById ? { referredBy: { connect: { id: referredById } } } : {}),
      termsAcceptedAt: openedAt,
      riskAcceptedAt: openedAt,
      createdAt: openedAt,
    })

    await ledgerService.ensureWalletsForUser(user.id)

    await auditService.record({
      actorId,
      targetUserId: user.id,
      action: 'user.create',
      module: 'users',
      newValue: snapshotUser(user),
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: user.id,
      actorId,
      kind: 'REGISTRATION',
      title: 'Account created',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: user.id,
      actorId,
      kind: 'KYC_APPROVED',
      title: 'KYC approved',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    if (referredById) {
      void import('./finance/referral-notification.service.js').then(
        ({ referralNotificationService }) => {
          void referralNotificationService.onReferredUserRegistered({
            referrerId: referredById!,
            refereeId: user.id,
          })
        },
      )
    }
    await opsAlertService.notify({
      event: 'USER_REGISTERED',
      title: 'User created by admin',
      action: 'New investor account created by operator',
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      userEmail: user.email,
      adminPath: `/admin/users/${user.id}`,
      recordActivity: false,
    })

    return toPublicUser(user)
  },

  async list(input: {
    filters: UserListFilters
    page: number
    limit: number
    cursor?: string
    sortBy: 'createdAt' | 'email' | 'status' | 'kycStatus' | 'firstName' | 'lastName'
    sortOrder: 'asc' | 'desc'
  }) {
    const skip = (input.page - 1) * input.limit
    const { items, total } = await userRepository.list({
      filters: input.filters,
      skip,
      take: input.limit,
      cursor: input.cursor,
      sortBy: input.sortBy,
      sortOrder: input.sortOrder,
    })

    const userIds = items.map((u) => u.id)
    const [financeMap, profiles, latestKyc] = await Promise.all([
      batchUserFinance(userIds),
      userIds.length
        ? prisma.userProfile.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, city: true, addressLine1: true, addressLine2: true, state: true },
          })
        : Promise.resolve([]),
      userIds.length
        ? prisma.kycSubmission.findMany({
            where: { userId: { in: userIds } },
            orderBy: { updatedAt: 'desc' },
            distinct: ['userId'],
            select: {
              userId: true,
              country: true,
              city: true,
              occupation: true,
              dateOfBirth: true,
              addressLine1: true,
            },
          })
        : Promise.resolve([]),
    ])

    const profileByUser = new Map(profiles.map((p) => [p.userId, p]))
    const kycByUser = new Map(latestKyc.map((k) => [k.userId, k]))

    const mapped = items.map((user) => {
      const finance = financeMap.get(user.id)!
      const profile = profileByUser.get(user.id)
      const kyc = kycByUser.get(user.id)
      const { country, countryName } = resolveCountry(user.country, kyc?.country)
      return {
        ...toPublicUser(user),
        phone: user.phone,
        country,
        countryName,
        city: profile?.city ?? kyc?.city ?? null,
        address: formatAddress([
          profile?.addressLine1 ?? kyc?.addressLine1,
          profile?.addressLine2,
          profile?.city ?? kyc?.city,
          profile?.state,
        ]),
        occupation: kyc?.occupation ?? null,
        dateOfBirth: kyc?.dateOfBirth ? kyc.dateOfBirth.toISOString().slice(0, 10) : null,
        staffRole: user.staffRole,
        referralCode: user.referralCode,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        deletedAt: user.deletedAt?.toISOString() ?? null,
        avatarUrl: user.avatarKey ? storage.getPublicUrl(user.avatarKey) : null,
        ...finance,
        walletsLabel: finance.hasWallet
          ? `${finance.walletCount} wallet${finance.walletCount === 1 ? '' : 's'}`
          : 'Missing',
      }
    })

    return {
      items: mapped,
      nextCursor: mapped.length === input.limit ? items[items.length - 1]?.id ?? null : null,
      pagination: {
        page: input.page,
        limit: input.limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / input.limit)),
        hasNext: skip + mapped.length < total,
      },
    }
  },

  async getById(id: string) {
    const user = await userRepository.findByIdIncludingDeleted(id)
    if (!user) {
      throw notFound('User not found.')
    }

    const [finance, profile, kyc, payoutMethods, deposits, withdrawals, profits, tickets, sessions, activities, tradeAllocations, txHistory] =
      await Promise.all([
        singleUserFinance(id),
        prisma.userProfile.findUnique({ where: { userId: id } }),
        prisma.kycSubmission.findFirst({
          where: { userId: id },
          orderBy: { updatedAt: 'desc' },
          include: {
            documents: {
              where: { deletedAt: null },
              orderBy: { createdAt: 'desc' },
              take: 20,
            },
          },
        }),
        prisma.payoutMethod.findMany({
          where: { userId: id, deletedAt: null },
          orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
        }),
        prisma.deposit.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { paymentMethod: { select: { id: true, name: true, type: true } } },
        }),
        prisma.withdrawal.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 100,
          include: { payoutMethod: { select: { id: true, label: true, type: true, maskedDetails: true } } },
        }),
        prisma.profitDistribution.findMany({
          where: { userId: id, isReversed: false },
          orderBy: { date: 'desc' },
          take: 100,
          select: {
            id: true,
            date: true,
            amount: true,
            returnPct: true,
            eligibleBalance: true,
            balanceAfter: true,
            createdAt: true,
            runId: true,
          },
        }),
        prisma.supportTicket.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            subject: true,
            status: true,
            priority: true,
            category: true,
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.session.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 30,
          select: {
            id: true,
            ip: true,
            userAgent: true,
            createdAt: true,
            lastUsedAt: true,
            revokedAt: true,
            expiresAt: true,
          },
        }),
        prisma.activityLog.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            kind: true,
            title: true,
            description: true,
            createdAt: true,
            ip: true,
            actor: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        }),
        prisma.tradeAllocation.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: {
            trade: {
              select: {
                id: true,
                pair: true,
                direction: true,
                tradeDate: true,
                entryPrice: true,
                exitPrice: true,
                returnPct: true,
                status: true,
                isPublic: true,
              },
            },
          },
        }),
        prisma.transactionHistory.findMany({
          where: { userId: id },
          orderBy: { createdAt: 'desc' },
          take: 100,
        }),
      ])

    const { country, countryName } = resolveCountry(user.country, kyc?.country)
    const mappedPayouts = payoutMethods.map(mapPayoutMethod)
    const bankAccounts = mappedPayouts.filter(
      (p) => p.type === 'BANK_TRANSFER' || p.type === 'UPI' || Boolean(p.bankName || p.upi),
    )
    const cryptoWallets = mappedPayouts.filter(
      (p) =>
        p.type === 'CRYPTO' ||
        p.type === 'USDT_TRC20' ||
        p.type === 'USDT_BEP20' ||
        p.type === 'BTC' ||
        p.type === 'ETH' ||
        Boolean(p.address && p.network),
    )

    return {
      ...toPublicUser(user),
      phone: user.phone,
      country,
      countryName,
      city: profile?.city ?? kyc?.city ?? null,
      state: profile?.state ?? null,
      postalCode: profile?.postalCode ?? kyc?.postalCode ?? null,
      address: formatAddress([
        profile?.addressLine1 ?? kyc?.addressLine1,
        profile?.addressLine2,
        profile?.city ?? kyc?.city,
        profile?.state,
        profile?.postalCode ?? kyc?.postalCode,
      ]),
      addressLine1: profile?.addressLine1 ?? kyc?.addressLine1 ?? null,
      addressLine2: profile?.addressLine2 ?? null,
      occupation: kyc?.occupation ?? null,
      dateOfBirth: kyc?.dateOfBirth ? kyc.dateOfBirth.toISOString().slice(0, 10) : null,
      staffRole: user.staffRole,
      createdByAdminId: user.createdByAdminId,
      referralCode: user.referralCode,
      referredById: user.referredById,
      lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
      lastLoginIp: user.lastLoginIp,
      twoFactorEnabled: user.twoFactorEnabled,
      deletedAt: user.deletedAt?.toISOString() ?? null,
      avatarUrl: user.avatarKey ? storage.getPublicUrl(user.avatarKey) : null,
      ...finance,
      walletsLabel: finance.hasWallet
        ? `${finance.walletCount} wallet${finance.walletCount === 1 ? '' : 's'}`
        : 'Missing',
      bankAccounts,
      cryptoWallets,
      payoutMethods: mappedPayouts,
      kyc: kyc
        ? {
            id: kyc.id,
            status: kyc.status,
            country: kyc.country,
            dateOfBirth: kyc.dateOfBirth.toISOString().slice(0, 10),
            occupation: kyc.occupation,
            city: kyc.city,
            addressLine1: kyc.addressLine1,
            postalCode: kyc.postalCode,
            submittedAt: kyc.submittedAt?.toISOString() ?? null,
            reviewedAt: kyc.reviewedAt?.toISOString() ?? null,
            documentCount: kyc.documents.length,
          }
        : null,
      deposits: deposits.map((dep) => ({
        id: dep.id,
        reference: dep.reference,
        amount: moneyDisplay(dep.amount),
        creditedAmount: dep.creditedAmount != null ? moneyDisplay(dep.creditedAmount) : null,
        status: dep.status,
        createdAt: dep.createdAt.toISOString(),
        reviewedAt: dep.reviewedAt?.toISOString() ?? null,
        paymentMethod: dep.paymentMethod,
      })),
      withdrawals: withdrawals.map((w) => ({
        id: w.id,
        reference: w.reference,
        amount: moneyDisplay(w.amount),
        netAmount: moneyDisplay(w.netAmount),
        status: w.status,
        createdAt: w.createdAt.toISOString(),
        paidAt: w.paidAt?.toISOString() ?? null,
        destinationLabel: w.destinationLabel,
        payoutMethod: w.payoutMethod,
      })),
      profitDistributions: profits.map((p) => ({
        id: p.id,
        date: p.date.toISOString().slice(0, 10),
        amount: moneyDisplay(p.amount),
        returnPct: p.returnPct.toFixed(6),
        eligibleBalance: moneyDisplay(p.eligibleBalance),
        balanceAfter: moneyDisplay(p.balanceAfter),
        createdAt: p.createdAt.toISOString(),
        runId: p.runId,
      })),
      trades: tradeAllocations.map((a) => ({
        id: a.trade.id,
        pair: a.trade.pair,
        direction: a.trade.direction,
        date: a.trade.tradeDate.toISOString().slice(0, 10),
        entryPrice: d(a.trade.entryPrice).toFixed(5),
        exitPrice: a.trade.exitPrice != null ? d(a.trade.exitPrice).toFixed(5) : null,
        returnPct: a.trade.returnPct != null ? a.trade.returnPct.toFixed(6) : null,
        status: a.trade.status,
      })),
      supportTickets: tickets.map((t) => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        category: t.category,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
      loginHistory: sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        lastUsedAt: s.lastUsedAt.toISOString(),
        revokedAt: s.revokedAt?.toISOString() ?? null,
        expiresAt: s.expiresAt.toISOString(),
        active: !s.revokedAt && s.expiresAt > new Date(),
      })),
      activityTimeline: activities.map((a) => ({
        id: a.id,
        kind: a.kind,
        title: a.title,
        description: a.description,
        at: a.createdAt.toISOString(),
        ip: a.ip,
      })),
      adminNotes: activities
        .filter((a) => a.kind === 'ADMIN_ACTION' && a.title === 'Admin note')
        .map((a) => ({
          id: a.id,
          body: a.description ?? '',
          createdAt: a.createdAt.toISOString(),
          author: a.actor
            ? {
                id: a.actor.id,
                name: `${a.actor.firstName} ${a.actor.lastName}`.trim(),
                email: a.actor.email,
              }
            : null,
        })),
      transactionHistory: txHistory.map((row) => ({
        id: row.id,
        event: row.event,
        status: row.status,
        amount: row.amount != null ? moneyDisplay(row.amount) : null,
        currency: row.currency,
        message: row.message,
        createdAt: row.createdAt.toISOString(),
      })),
    }
  },

  async addNote(
    actorId: string,
    id: string,
    note: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) {
      throw notFound('User not found.')
    }

    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title: 'Admin note',
      description: note,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.admin_note',
      module: 'users',
      newValue: { note: note.slice(0, 200) },
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getById(id)
  },

  async update(
    actorId: string,
    id: string,
    patch: {
      firstName?: string
      lastName?: string
      phone?: string | null
      country?: string | null
      timezone?: string
      email?: string
      password?: string
      role?: Role
      staffRole?: User['staffRole']
    },
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing || existing.deletedAt) {
      throw notFound('User not found.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }

    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const elevatingRole = patch.role !== undefined && patch.role !== existing.role
    const elevatingStaff = patch.staffRole !== undefined && patch.staffRole !== existing.staffRole
    if (elevatingRole || elevatingStaff) {
      const actorIsSuper =
        actor.role === 'SUPER_ADMIN' || actor.staffRole === 'SUPER_ADMIN'
      if (!actorIsSuper) {
        throw forbidden('Only Super Admin can change role or staffRole.')
      }
      if (patch.role === 'SUPER_ADMIN' || patch.staffRole === 'SUPER_ADMIN') {
        // Already gated to Super Admin above.
      }
    }

    if (patch.email && patch.email !== existing.email) {
      const taken = await userRepository.findByEmail(patch.email)
      if (taken && taken.id !== id) {
        throw conflict('An account with this email already exists.')
      }
    }
    if (patch.phone !== undefined && patch.phone && patch.phone !== existing.phone) {
      const phoneOwner = await userRepository.findByPhone(patch.phone)
      if (phoneOwner && phoneOwner.id !== id) {
        throw conflict('An account with this phone number already exists.')
      }
    }

    const passwordHash = patch.password ? await passwordService.hash(patch.password) : undefined

    const updated = await userRepository.update(id, {
      ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
      ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
      ...(patch.phone !== undefined ? { phone: patch.phone } : {}),
      ...(patch.country !== undefined ? { country: patch.country } : {}),
      ...(patch.timezone !== undefined ? { timezone: patch.timezone } : {}),
      ...(patch.email !== undefined ? { email: patch.email } : {}),
      ...(passwordHash
        ? { passwordHash, passwordChangedAt: new Date(), failedLoginCount: 0, lockedUntil: null }
        : {}),
      ...(patch.role !== undefined ? { role: patch.role } : {}),
      ...(patch.staffRole !== undefined ? { staffRole: patch.staffRole } : {}),
    })

    // Role / staffRole changes invalidate every JWT session so the next request
    // cannot keep stale privileges from an access-token cookie.
    let revokedSessions = 0
    if (elevatingRole || elevatingStaff || passwordHash) {
      revokedSessions = await sessionRepository.revokeAllForUser(id)
    }

    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.update',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: { ...snapshotUser(updated), revokedSessions },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title:
        elevatingRole || elevatingStaff
          ? 'Role updated — all sessions terminated'
          : passwordHash
            ? 'Password reset by admin — all sessions terminated'
            : 'Profile updated by admin',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    const becameAdmin =
      (elevatingRole || elevatingStaff) &&
      (updated.role === 'ADMIN' ||
        updated.role === 'SUPER_ADMIN' ||
        Boolean(updated.staffRole)) &&
      existing.role === 'USER' &&
      !existing.staffRole
    if (becameAdmin) {
      await opsAlertService.notify({
        event: 'ADMIN_CREATED',
        title: 'Admin created',
        action: 'User elevated to staff/admin',
        userId: updated.id,
        userName: `${updated.firstName} ${updated.lastName}`.trim(),
        userEmail: updated.email,
        ip: context.ip,
        adminPath: `/admin/users/${updated.id}`,
        details: {
          Role: updated.role,
          StaffRole: updated.staffRole ?? '—',
          ActorId: actorId,
        },
      })
    }

    return this.getById(id)
  },

  async setStatus(
    actorId: string,
    id: string,
    status: UserStatus,
    action: string,
    reason: string | null,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing || existing.deletedAt) {
      throw notFound('User not found.')
    }
    if (existing.id === actorId && (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'CLOSED')) {
      throw badRequest('You cannot change your own account to this status.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }
    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const updated = await userRepository.update(id, { status })
    await auditService.record({
      actorId,
      targetUserId: id,
      action,
      module: 'users',
      oldValue: { status: existing.status },
      newValue: { status },
      reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ACCOUNT_STATUS_CHANGE',
      title: `Account status changed to ${status}`,
      description: reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await notificationService.notify({
      userId: id,
      kind: 'ACCOUNT',
      title: 'Account status updated',
      body: reason ?? `Your account status is now ${status}.`,
    })

    if (status === 'SUSPENDED' || status === 'BLOCKED' || status === 'CLOSED') {
      await sessionRepository.revokeAllForUser(id)
    }

    return this.getById(updated.id)
  },

  async softDelete(
    actorId: string,
    id: string,
    reason: string | null,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) {
      throw notFound('User not found.')
    }
    if (existing.deletedAt) {
      throw badRequest('User is already deleted.')
    }
    if (existing.id === actorId) {
      throw badRequest('You cannot delete your own account.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }
    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const updated = await userRepository.update(id, {
      deletedAt: new Date(),
      status: 'ARCHIVED',
    })
    await sessionRepository.revokeAllForUser(id)
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.delete',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: snapshotUser(updated),
      reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title: 'Account soft-deleted',
      description: reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getById(id)
  },

  /**
   * SUPER_ADMIN only — permanently remove user + auth surface so email/phone can re-register.
   * Financial ledger rows that Cascade will go; prefer softDelete for audit retention.
   */
  async hardDelete(
    actorId: string,
    id: string,
    reason: string | null,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const actor = await userRepository.findById(actorId)
    if (!actor || actor.role !== 'SUPER_ADMIN') {
      throw forbidden('Hard delete requires SUPER_ADMIN.')
    }
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) throw notFound('User not found.')
    if (existing.id === actorId) throw badRequest('You cannot delete your own account.')
    if (existing.role === 'SUPER_ADMIN') {
      throw forbidden('Cannot hard-delete a SUPER_ADMIN account.')
    }

    await sessionRepository.revokeAllForUser(id)
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.hard_delete',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: null,
      reason,
      ip: context.ip,
      userAgent: context.userAgent,
    })

    // Release unique email/phone by anonymizing then deleting.
    const tombstone = `deleted_${id.slice(0, 8)}_${Date.now()}`
    await userRepository.update(id, {
      email: `${tombstone}@deleted.local`,
      phone: null,
      googleId: null,
      passwordHash: null,
      deletedAt: new Date(),
      status: 'ARCHIVED',
    })
    await prisma.user.delete({ where: { id } })
    return { id, deleted: true as const }
  },

  async restore(
    actorId: string,
    id: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findByIdIncludingDeleted(id)
    if (!existing) {
      throw notFound('User not found.')
    }
    if (!existing.deletedAt) {
      throw badRequest('User is not deleted.')
    }

    const updated = await userRepository.update(id, {
      deletedAt: null,
      status: existing.emailVerifiedAt ? 'ACTIVE' : 'PENDING_VERIFICATION',
    })
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.restore',
      module: 'users',
      oldValue: snapshotUser(existing),
      newValue: snapshotUser(updated),
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'ADMIN_ACTION',
      title: 'Account restored',
      ip: context.ip,
      userAgent: context.userAgent,
    })

    return this.getById(id)
  },

  async forceLogout(
    actorId: string,
    id: string,
    context: { ip?: string | null; userAgent?: string | null },
  ) {
    const existing = await userRepository.findById(id)
    if (!existing) {
      throw notFound('User not found.')
    }
    if (existing.id === actorId) {
      throw badRequest('Use normal logout for your own session.')
    }

    const actor = await userRepository.findById(actorId)
    if (!actor) {
      throw forbidden('Actor not found.')
    }
    assertCanManageTarget(
      { role: actor.role, staffRole: actor.staffRole },
      { role: existing.role, staffRole: existing.staffRole },
    )

    const count = await sessionRepository.revokeAllForUser(id)
    await auditService.record({
      actorId,
      targetUserId: id,
      action: 'user.force_logout',
      module: 'users',
      newValue: { revokedSessions: count },
      ip: context.ip,
      userAgent: context.userAgent,
    })
    await activityService.record({
      userId: id,
      actorId,
      kind: 'SESSION_TERMINATED',
      title: 'All sessions terminated by admin',
      ip: context.ip,
      userAgent: context.userAgent,
    })
    return { ok: true, revokedSessions: count }
  },
}
