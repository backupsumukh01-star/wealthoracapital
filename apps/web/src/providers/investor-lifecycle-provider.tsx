'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

import {
  buildEmail,
  canDeposit,
  DEMO_OTP,
  depositTimeline,
  displayUsername,
  fileMeta,
  generateUserId,
  generateUsername,
  loadLifecycleStore,
  moneyAdd,
  moneySub,
  saveLifecycleStore,
  withdrawalTimeline,
  type DailyReturnRecord,
  type EmailTemplateId,
  type IdDocumentType,
  type InvestorAccount,
  type KycDocumentMeta,
  type KycSubmission,
  type LifecycleStore,
  type LoginEvent,
  type MoneyDeposit,
  type MoneyWithdrawal,
  type OutboundEmail,
} from '@/lib/investor-lifecycle'
import { resolveAccountStatus } from '@/lib/account-status'
import {
  clearDemoSession,
  hasDemoSession,
  markOnboardingComplete,
  markOnboardingPending,
  setDemoSession,
} from '@/lib/demo-auth'

type RegisterPayload = {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
}

type KycDraft = {
  country: string
  dateOfBirth: string
  address: string
  city: string
  occupation: string
  idType: IdDocumentType
  front?: File | null
  back?: File | null
  selfie?: File | null
}

type LifecycleContextValue = {
  ready: boolean
  accounts: InvestorAccount[]
  emails: OutboundEmail[]
  deposits: MoneyDeposit[]
  withdrawals: MoneyWithdrawal[]
  returns: DailyReturnRecord[]
  session: InvestorAccount | null
  canDeposit: boolean
  accountStatus: ReturnType<typeof resolveAccountStatus>
  registerAccount: (payload: RegisterPayload) => { account: InvestorAccount; otp: string }
  verifyEmail: (email: string, otp: string) => { ok: boolean; error?: string; account?: InvestorAccount }
  login: (identifier: string, password: string) => { ok: boolean; error?: string; account?: InvestorAccount; needsOtp?: boolean }
  completeLogin: (userId: string, authenticatorCode?: string) => { ok: boolean; error?: string; account?: InvestorAccount }
  loginWithGoogle: () => InvestorAccount
  logout: () => void
  logoutAllDevices: () => void
  requestPasswordReset: (email: string) => { ok: boolean; error?: string }
  resetPassword: (email: string, otp: string, password: string) => { ok: boolean; error?: string }
  changeEmail: (currentPassword: string, newEmail: string, otp: string) => { ok: boolean; error?: string }
  submitKyc: (draft: KycDraft) => { ok: boolean; error?: string }
  approveKyc: (userId: string) => void
  rejectKyc: (userId: string, reason: string) => void
  requestKycResubmit: (userId: string, reason: string) => void
  setAccountStatus: (userId: string, status: InvestorAccount['status']) => void
  addAdminNote: (userId: string, text: string) => void
  toggle2fa: (enabled: boolean, password?: string) => { ok: boolean; error?: string }
  changePassword: (current: string, next: string, otp: string, logoutOthers: boolean) => { ok: boolean; error?: string }
  pendingKycAccounts: InvestorAccount[]
  queueEmail: (template: EmailTemplateId, to: string, meta?: Record<string, string>) => void
  submitDeposit: (input: {
    amount: string
    method: string
    reference?: string
    proofLabel?: string
  }) => { ok: boolean; error?: string; deposit?: MoneyDeposit }
  approveDeposit: (depositId: string) => void
  rejectDeposit: (depositId: string, reason: string) => void
  needInfoDeposit: (depositId: string, reason: string) => void
  submitWithdrawal: (input: {
    amount: string
    destination: string
    destinationDetail: string
  }) => { ok: boolean; error?: string; withdrawal?: MoneyWithdrawal }
  approveWithdrawal: (withdrawalId: string) => void
  rejectWithdrawal: (withdrawalId: string, reason: string) => void
  markWithdrawalPaid: (withdrawalId: string) => void
  publishDailyReturn: (input: { returnPct: string; notes: string; tradingDay: string }) => {
    ok: boolean
    error?: string
  }
  sessionDeposits: MoneyDeposit[]
  sessionWithdrawals: MoneyWithdrawal[]
}

const LifecycleContext = createContext<LifecycleContextValue | null>(null)

function pushLogin(account: InvestorAccount): LoginEvent {
  return {
    id: `lg_${Date.now()}`,
    at: new Date().toISOString(),
    ip: '39.50.' + Math.floor(Math.random() * 200) + '.' + Math.floor(Math.random() * 200),
    country: account.kyc?.country === 'AE' ? 'United Arab Emirates' : 'Pakistan',
    browser: 'Chrome · Windows',
    current: true,
  }
}

export function InvestorLifecycleProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<LifecycleStore>(() => ({
    accounts: [],
    emails: [],
    deposits: [],
    withdrawals: [],
    returns: [],
    sessionUserId: null,
    usedUsernames: [],
    usedUserIds: [],
  }))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const loaded = loadLifecycleStore()
    if (hasDemoSession() && !loaded.sessionUserId) {
      loaded.sessionUserId =
        loaded.accounts.find((a) => a.email === 'investor@growzy.com')?.userId ??
        loaded.accounts.find((a) => a.kycStatus === 'APPROVED')?.userId ??
        loaded.accounts[0]?.userId ??
        null
    }
    setStore(loaded)
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    saveLifecycleStore(store)
  }, [store, ready])

  const queueEmail = useCallback((template: EmailTemplateId, to: string, meta?: Record<string, string>) => {
    setStore((prev) => ({
      ...prev,
      emails: [buildEmail(template, to, meta), ...prev.emails].slice(0, 100),
    }))
  }, [])

  const session = useMemo(
    () => store.accounts.find((a) => a.userId === store.sessionUserId) ?? null,
    [store.accounts, store.sessionUserId],
  )

  const registerAccount = useCallback((payload: RegisterPayload) => {
    const email = payload.email.trim().toLowerCase()
    const snapshot = loadLifecycleStore()
    if (snapshot.accounts.some((a) => a.email === email) || store.accounts.some((a) => a.email === email)) {
      throw new Error('An account with this email already exists.')
    }
    const userId = generateUserId([...store.usedUserIds, ...snapshot.usedUserIds])
    const username = generateUsername(payload.firstName, [
      ...store.usedUsernames,
      ...snapshot.usedUsernames,
    ])
    const account: InvestorAccount = {
      userId,
      username,
      firstName: payload.firstName.trim(),
      lastName: payload.lastName.trim(),
      email,
      phone: payload.phone.trim(),
      password: payload.password,
      emailVerified: false,
      status: 'PENDING_EMAIL',
      kycStatus: 'NOT_STARTED',
      kyc: null,
      twoFactorEnabled: false,
      backupCodes: [],
      createdAt: new Date().toISOString(),
      investorSince: null,
      referralCode: `GRZ-${username.toUpperCase().slice(0, 8)}`,
      avatarUrl: null,
      loginHistory: [],
      adminNotes: [],
      wallet: {
        availableBalance: '0.00',
        investedAmount: '0.00',
        pendingDeposit: '0.00',
        pendingWithdrawal: '0.00',
        totalDeposited: '0.00',
        totalWithdrawn: '0.00',
        totalProfit: '0.00',
        todayProfit: '0.00',
      },
    }
    setStore((prev) => ({
      ...prev,
      accounts: [account, ...prev.accounts.filter((a) => a.email !== email)],
      usedUserIds: prev.usedUserIds.includes(userId) ? prev.usedUserIds : [...prev.usedUserIds, userId],
      usedUsernames: prev.usedUsernames.includes(username)
        ? prev.usedUsernames
        : [...prev.usedUsernames, username],
      emails: [
        buildEmail('WELCOME', email, {
          firstName: account.firstName,
          userId,
          username: displayUsername(username),
        }),
        buildEmail('VERIFY_EMAIL', email),
        ...prev.emails,
      ].slice(0, 100),
    }))
    markOnboardingPending()
    return { account, otp: DEMO_OTP }
  }, [store.accounts, store.usedUserIds, store.usedUsernames])

  const verifyEmail = useCallback((email: string, otp: string) => {
    if (otp !== DEMO_OTP) return { ok: false as const, error: 'Invalid verification code.' }
    let account: InvestorAccount | undefined
    setStore((prev) => {
      const next = prev.accounts.map((a) => {
        if (a.email !== email.trim().toLowerCase()) return a
        account = {
          ...a,
          emailVerified: true,
          status: a.kycStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING_KYC',
        }
        return account
      })
      if (!account) return prev
      return {
        ...prev,
        accounts: next,
        sessionUserId: account.userId,
      }
    })
    if (!account) return { ok: false as const, error: 'Account not found.' }
    setDemoSession()
    markOnboardingPending()
    return { ok: true as const, account }
  }, [])

  const finalizeSession = useCallback((found: InvestorAccount) => {
    const event = pushLogin(found)
    setStore((prev) => ({
      ...prev,
      sessionUserId: found.userId,
      accounts: prev.accounts.map((a) =>
        a.userId === found.userId
          ? {
              ...a,
              loginHistory: [
                event,
                ...a.loginHistory.map((l) => ({ ...l, current: false })),
              ].slice(0, 20),
            }
          : a,
      ),
      emails: [
        buildEmail('NEW_LOGIN', found.email, { browser: event.browser, country: event.country }),
        ...prev.emails,
      ].slice(0, 100),
    }))
    setDemoSession()
    if (found.kycStatus === 'APPROVED') markOnboardingComplete()
    else markOnboardingPending()
  }, [])

  const login = useCallback((identifier: string, password: string) => {
    const id = identifier.trim().toLowerCase()
    const found = store.accounts.find(
      (a) => a.email === id || a.username.toLowerCase() === id.replace(/^@/, ''),
    )
    if (!found || found.password !== password) {
      return { ok: false as const, error: 'Incorrect email/username or password.' }
    }
    if (!found.emailVerified) {
      return { ok: false as const, error: 'Verify your email to continue.', account: found }
    }
    if (found.status === 'SUSPENDED') {
      return { ok: false as const, error: 'This account is suspended. Contact support.' }
    }
    if (found.twoFactorEnabled) {
      return { ok: true as const, needsOtp: true, account: found }
    }
    finalizeSession(found)
    return { ok: true as const, account: found }
  }, [store.accounts, finalizeSession])

  const completeLogin = useCallback((userId: string, authenticatorCode?: string) => {
    const found = store.accounts.find((a) => a.userId === userId)
    if (!found) return { ok: false as const, error: 'Account not found.' }
    if (found.twoFactorEnabled) {
      const code = (authenticatorCode ?? '').trim()
      const backupOk = found.backupCodes.includes(code.toUpperCase())
      if (code !== DEMO_OTP && !backupOk) {
        return { ok: false as const, error: 'Invalid authenticator code.' }
      }
    }
    finalizeSession(found)
    return { ok: true as const, account: found }
  }, [store.accounts, finalizeSession])

  const loginWithGoogle = useCallback(() => {
    let account: InvestorAccount
    setStore((prev) => {
      const existing = prev.accounts.find((a) => a.email === 'google.investor@growzy.com')
      if (existing) {
        account = { ...existing, emailVerified: true, status: existing.kycStatus === 'APPROVED' ? 'VERIFIED' : 'PENDING_KYC' }
        return {
          ...prev,
          sessionUserId: account.userId,
          accounts: prev.accounts.map((a) => (a.userId === account.userId ? account : a)),
        }
      }
      const userId = generateUserId(prev.usedUserIds)
      const username = generateUsername('google', prev.usedUsernames)
      account = {
        userId,
        username,
        firstName: 'Alex',
        lastName: 'Investor',
        email: 'google.investor@growzy.com',
        phone: '+1 555 0100',
        password: '',
        emailVerified: true,
        status: 'PENDING_KYC',
        kycStatus: 'NOT_STARTED',
        kyc: null,
        twoFactorEnabled: false,
        backupCodes: [],
        createdAt: new Date().toISOString(),
        investorSince: null,
        referralCode: `GRZ-${username.toUpperCase()}`,
        avatarUrl: null,
        loginHistory: [pushLogin({} as InvestorAccount)],
        adminNotes: [],
        wallet: {
          availableBalance: '0.00',
          investedAmount: '0.00',
          pendingDeposit: '0.00',
          pendingWithdrawal: '0.00',
          totalDeposited: '0.00',
          totalWithdrawn: '0.00',
          totalProfit: '0.00',
          todayProfit: '0.00',
        },
      }
      return {
        ...prev,
        sessionUserId: userId,
        accounts: [account, ...prev.accounts],
        usedUserIds: [...prev.usedUserIds, userId],
        usedUsernames: [...prev.usedUsernames, username],
        emails: [
          buildEmail('WELCOME', account.email, {
            firstName: account.firstName,
            userId,
            username: displayUsername(username),
          }),
          ...prev.emails,
        ],
      }
    })
    setDemoSession()
    markOnboardingPending()
    return account!
  }, [])

  const logout = useCallback(() => {
    setStore((prev) => ({ ...prev, sessionUserId: null }))
    clearDemoSession()
  }, [])

  const logoutAllDevices = useCallback(() => {
    if (!store.sessionUserId) return
    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.userId === prev.sessionUserId
          ? {
              ...a,
              loginHistory: a.loginHistory
                .filter((l) => l.current)
                .map((l) => ({ ...l, current: true }))
                .slice(0, 1),
            }
          : a,
      ),
    }))
  }, [store.sessionUserId])

  const changeEmail = useCallback(
    (currentPassword: string, newEmail: string, otp: string) => {
      if (!session) return { ok: false as const, error: 'Not signed in.' }
      if (session.password !== currentPassword) {
        return { ok: false as const, error: 'Current password is incorrect.' }
      }
      if (otp !== DEMO_OTP) return { ok: false as const, error: 'Invalid email OTP.' }
      const normalized = newEmail.trim().toLowerCase()
      if (store.accounts.some((a) => a.email === normalized && a.userId !== session.userId)) {
        return { ok: false as const, error: 'That email is already in use.' }
      }
      const oldEmail = session.email
      setStore((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.userId === session.userId
            ? { ...a, email: normalized, emailVerified: true }
            : a,
        ),
        emails: [
          buildEmail('EMAIL_CHANGED', oldEmail, { note: `Previous email notified.` }),
          buildEmail('EMAIL_CHANGED', normalized),
          buildEmail('VERIFY_EMAIL', normalized),
          ...prev.emails,
        ].slice(0, 100),
      }))
      return { ok: true as const }
    },
    [session, store.accounts],
  )

  const requestPasswordReset = useCallback(
    (email: string) => {
      const found = store.accounts.find((a) => a.email === email.trim().toLowerCase())
      // Enumeration-safe: always pretend success
      if (found) queueEmail('PASSWORD_RESET', found.email)
      return { ok: true as const }
    },
    [queueEmail, store.accounts],
  )

  const resetPassword = useCallback((email: string, otp: string, password: string) => {
    if (otp !== DEMO_OTP) return { ok: false as const, error: 'Invalid code.' }
    let ok = false
    setStore((prev) => {
      const next = prev.accounts.map((a) => {
        if (a.email !== email.trim().toLowerCase()) return a
        ok = true
        return { ...a, password }
      })
      if (!ok) return prev
      return {
        ...prev,
        accounts: next,
        emails: [buildEmail('PASSWORD_CHANGED', email.trim().toLowerCase()), ...prev.emails],
      }
    })
    return ok ? { ok: true as const } : { ok: false as const, error: 'Account not found.' }
  }, [])

  const submitKyc = useCallback((draft: KycDraft) => {
    if (!store.sessionUserId) return { ok: false as const, error: 'Not signed in.' }
    if (!draft.front || !draft.selfie) {
      return { ok: false as const, error: 'Upload ID front and a selfie to continue.' }
    }
    const toMeta = (f?: File | null): KycDocumentMeta | undefined => (f ? fileMeta(f) : undefined)
    setStore((prev) => {
      const accounts = prev.accounts.map((a) => {
        if (a.userId !== prev.sessionUserId) return a
        const kyc: KycSubmission = {
          country: draft.country,
          dateOfBirth: draft.dateOfBirth,
          address: draft.address,
          city: draft.city,
          occupation: draft.occupation,
          idType: draft.idType,
          front: toMeta(draft.front),
          back: toMeta(draft.back),
          selfie: toMeta(draft.selfie),
          submittedAt: new Date().toISOString(),
          history: [
            ...(a.kyc?.history ?? []),
            { at: new Date().toISOString(), action: 'SUBMITTED' },
          ],
        }
        return {
          ...a,
          kyc,
          kycStatus: 'UNDER_REVIEW' as const,
          status: 'PENDING_KYC' as const,
        }
      })
      const me = accounts.find((a) => a.userId === prev.sessionUserId)!
      return {
        ...prev,
        accounts,
        emails: [buildEmail('KYC_SUBMITTED', me.email), ...prev.emails],
      }
    })
    markOnboardingComplete()
    return { ok: true as const }
  }, [store.sessionUserId])

  const approveKyc = useCallback((userId: string) => {
    setStore((prev) => {
      const accounts = prev.accounts.map((a) => {
        if (a.userId !== userId) return a
        return {
          ...a,
          kycStatus: 'APPROVED' as const,
          status: 'VERIFIED' as const,
          investorSince: a.investorSince ?? new Date().toISOString(),
          kyc: a.kyc
            ? {
                ...a.kyc,
                reviewedAt: new Date().toISOString(),
                rejectionReason: undefined,
                history: [...a.kyc.history, { at: new Date().toISOString(), action: 'APPROVED' }],
              }
            : a.kyc,
        }
      })
      const me = accounts.find((a) => a.userId === userId)
      return {
        ...prev,
        accounts,
        emails: me ? [buildEmail('KYC_APPROVED', me.email), ...prev.emails] : prev.emails,
      }
    })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('growzy:notify', {
          detail: {
            type: 'ANNOUNCEMENT',
            title: 'KYC approved',
            body: 'Your account is verified. You may now deposit funds.',
          },
        }),
      )
    }
  }, [])

  const rejectKyc = useCallback((userId: string, reason: string) => {
    setStore((prev) => {
      const accounts = prev.accounts.map((a) => {
        if (a.userId !== userId) return a
        return {
          ...a,
          kycStatus: 'REJECTED' as const,
          status: 'REJECTED' as const,
          kyc: a.kyc
            ? {
                ...a.kyc,
                reviewedAt: new Date().toISOString(),
                rejectionReason: reason,
                history: [
                  ...a.kyc.history,
                  { at: new Date().toISOString(), action: 'REJECTED', note: reason },
                ],
              }
            : a.kyc,
        }
      })
      const me = accounts.find((a) => a.userId === userId)
      return {
        ...prev,
        accounts,
        emails: me
          ? [buildEmail('KYC_REJECTED', me.email, { reason }), ...prev.emails]
          : prev.emails,
      }
    })
  }, [])

  const requestKycResubmit = useCallback((userId: string, reason: string) => {
    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.userId === userId
          ? {
              ...a,
              kycStatus: 'NOT_STARTED' as const,
              status: 'PENDING_KYC' as const,
              kyc: a.kyc
                ? {
                    ...a.kyc,
                    rejectionReason: reason,
                    history: [
                      ...a.kyc.history,
                      { at: new Date().toISOString(), action: 'RESUBMISSION_REQUESTED', note: reason },
                    ],
                  }
                : a.kyc,
            }
          : a,
      ),
    }))
  }, [])

  const setAccountStatus = useCallback((userId: string, status: InvestorAccount['status']) => {
    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) => (a.userId === userId ? { ...a, status } : a)),
    }))
  }, [])

  const addAdminNote = useCallback((userId: string, text: string) => {
    setStore((prev) => ({
      ...prev,
      accounts: prev.accounts.map((a) =>
        a.userId === userId
          ? {
              ...a,
              adminNotes: [
                {
                  id: `note_${Date.now()}`,
                  at: new Date().toISOString(),
                  text,
                  author: 'Admin',
                },
                ...a.adminNotes,
              ],
            }
          : a,
      ),
    }))
  }, [])

  const toggle2fa = useCallback(
    (enabled: boolean, password?: string) => {
      if (!session) return { ok: false as const, error: 'Not signed in.' }
      if (!enabled && password !== undefined && session.password !== password) {
        return { ok: false as const, error: 'Password required to disable 2FA.' }
      }
      setStore((prev) => {
        const accounts = prev.accounts.map((a) =>
          a.userId === prev.sessionUserId
            ? {
                ...a,
                twoFactorEnabled: enabled,
                backupCodes: enabled
                  ? Array.from({ length: 8 }, () =>
                      Math.random().toString(36).slice(2, 6).toUpperCase() +
                      '-' +
                      Math.random().toString(36).slice(2, 6).toUpperCase(),
                    )
                  : [],
              }
            : a,
        )
        const me = accounts.find((a) => a.userId === prev.sessionUserId)!
        return {
          ...prev,
          accounts,
          emails: [
            buildEmail(enabled ? 'TWO_FA_ENABLED' : 'TWO_FA_DISABLED', me.email),
            ...prev.emails,
          ],
        }
      })
      return { ok: true as const }
    },
    [session],
  )

  const changePassword = useCallback(
    (current: string, next: string, otp: string, logoutOthers: boolean) => {
      if (!session) return { ok: false as const, error: 'Not signed in.' }
      if (session.password !== current) return { ok: false as const, error: 'Current password is incorrect.' }
      if (otp !== DEMO_OTP) return { ok: false as const, error: 'Invalid email OTP.' }
      setStore((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) =>
          a.userId === session.userId
            ? {
                ...a,
                password: next,
                loginHistory: logoutOthers
                  ? a.loginHistory.filter((l) => l.current).slice(0, 1)
                  : a.loginHistory,
              }
            : a,
        ),
        emails: [buildEmail('PASSWORD_CHANGED', session.email), ...prev.emails],
      }))
      return { ok: true as const }
    },
    [session],
  )

  const submitDeposit = useCallback(
    (input: { amount: string; method: string; reference?: string; proofLabel?: string }) => {
      if (!session) return { ok: false as const, error: 'Not signed in.' }
      if (!canDeposit(session)) return { ok: false as const, error: 'KYC approval required before depositing.' }
      const amount = Number(input.amount).toFixed(2)
      const id = `DEP-${Date.now().toString().slice(-8)}`
      const submittedAt = new Date().toISOString()
      const deposit: MoneyDeposit = {
        id,
        userId: session.userId,
        amount,
        method: input.method,
        reference: input.reference || id,
        status: 'UNDER_REVIEW',
        submittedAt,
        proofLabel: input.proofLabel,
        timeline: depositTimeline('UNDER_REVIEW', submittedAt),
      }
      setStore((prev) => ({
        ...prev,
        deposits: [deposit, ...prev.deposits],
        accounts: prev.accounts.map((a) =>
          a.userId === session.userId
            ? {
                ...a,
                wallet: {
                  ...a.wallet,
                  pendingDeposit: moneyAdd(a.wallet.pendingDeposit, amount),
                },
              }
            : a,
        ),
        emails: [
          buildEmail('DEPOSIT_SUBMITTED', session.email, { amount }),
          ...prev.emails,
        ].slice(0, 100),
      }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('growzy:notify', {
            detail: {
              type: 'DEPOSIT_APPROVED',
              title: 'Deposit submitted',
              body: `${id} · $${amount} is under review.`,
            },
          }),
        )
      }
      return { ok: true as const, deposit }
    },
    [session],
  )

  const approveDeposit = useCallback((depositId: string) => {
    setStore((prev) => {
      const dep = prev.deposits.find((d) => d.id === depositId)
      if (!dep || dep.status === 'APPROVED') return prev
      const amount = dep.amount
      return {
        ...prev,
        deposits: prev.deposits.map((d) =>
          d.id === depositId
            ? {
                ...d,
                status: 'APPROVED' as const,
                timeline: depositTimeline('APPROVED', d.submittedAt),
              }
            : d,
        ),
        accounts: prev.accounts.map((a) => {
          if (a.userId !== dep.userId) return a
          return {
            ...a,
            wallet: {
              ...a.wallet,
              availableBalance: moneyAdd(a.wallet.availableBalance, amount),
              investedAmount: moneyAdd(a.wallet.investedAmount, amount),
              pendingDeposit: moneySub(a.wallet.pendingDeposit, amount),
              totalDeposited: moneyAdd(a.wallet.totalDeposited, amount),
            },
          }
        }),
        emails: [
          buildEmail(
            'DEPOSIT_APPROVED',
            prev.accounts.find((a) => a.userId === dep.userId)?.email ?? '',
            { amount },
          ),
          ...prev.emails,
        ].slice(0, 100),
      }
    })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('growzy:notify', {
          detail: {
            type: 'DEPOSIT_APPROVED',
            title: 'Deposit approved',
            body: `${depositId} credited to your wallet.`,
          },
        }),
      )
    }
  }, [])

  const rejectDeposit = useCallback((depositId: string, reason: string) => {
    setStore((prev) => {
      const dep = prev.deposits.find((d) => d.id === depositId)
      if (!dep) return prev
      return {
        ...prev,
        deposits: prev.deposits.map((d) =>
          d.id === depositId
            ? {
                ...d,
                status: 'REJECTED' as const,
                note: reason,
                timeline: depositTimeline('REJECTED', d.submittedAt),
              }
            : d,
        ),
        accounts: prev.accounts.map((a) =>
          a.userId === dep.userId
            ? {
                ...a,
                wallet: {
                  ...a.wallet,
                  pendingDeposit: moneySub(a.wallet.pendingDeposit, dep.amount),
                },
              }
            : a,
        ),
        emails: [
          buildEmail(
            'DEPOSIT_REJECTED',
            prev.accounts.find((a) => a.userId === dep.userId)?.email ?? '',
            { reason },
          ),
          ...prev.emails,
        ].slice(0, 100),
      }
    })
  }, [])

  const needInfoDeposit = useCallback((depositId: string, reason: string) => {
    setStore((prev) => ({
      ...prev,
      deposits: prev.deposits.map((d) =>
        d.id === depositId
          ? {
              ...d,
              status: 'NEED_INFO' as const,
              note: reason,
              timeline: depositTimeline('NEED_INFO', d.submittedAt),
            }
          : d,
      ),
    }))
  }, [])

  const submitWithdrawal = useCallback(
    (input: { amount: string; destination: string; destinationDetail: string }) => {
      if (!session) return { ok: false as const, error: 'Not signed in.' }
      if (!canDeposit(session)) return { ok: false as const, error: 'KYC approval required before withdrawing.' }
      const amount = Number(input.amount).toFixed(2)
      if (Number(amount) > Number(session.wallet.availableBalance)) {
        return { ok: false as const, error: 'Insufficient available balance.' }
      }
      const id = `WDR-${Date.now().toString().slice(-8)}`
      const requestedAt = new Date().toISOString()
      const withdrawal: MoneyWithdrawal = {
        id,
        userId: session.userId,
        amount,
        destination: input.destination,
        destinationDetail: input.destinationDetail,
        status: 'PENDING',
        requestedAt,
        timeline: withdrawalTimeline('PENDING', requestedAt),
      }
      setStore((prev) => ({
        ...prev,
        withdrawals: [withdrawal, ...prev.withdrawals],
        accounts: prev.accounts.map((a) =>
          a.userId === session.userId
            ? {
                ...a,
                wallet: {
                  ...a.wallet,
                  availableBalance: moneySub(a.wallet.availableBalance, amount),
                  pendingWithdrawal: moneyAdd(a.wallet.pendingWithdrawal, amount),
                },
              }
            : a,
        ),
        emails: [
          buildEmail('WITHDRAWAL_SUBMITTED', session.email, { amount }),
          ...prev.emails,
        ].slice(0, 100),
      }))
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('growzy:notify', {
            detail: {
              type: 'WITHDRAWAL_APPROVED',
              title: 'Withdrawal requested',
              body: `${id} · $${amount} is under compliance review.`,
            },
          }),
        )
      }
      return { ok: true as const, withdrawal }
    },
    [session],
  )

  const approveWithdrawal = useCallback((withdrawalId: string) => {
    setStore((prev) => {
      const w = prev.withdrawals.find((x) => x.id === withdrawalId)
      if (!w) return prev
      return {
        ...prev,
        withdrawals: prev.withdrawals.map((x) =>
          x.id === withdrawalId
            ? {
                ...x,
                status: 'APPROVED' as const,
                timeline: withdrawalTimeline('APPROVED', x.requestedAt),
              }
            : x,
        ),
        emails: [
          buildEmail(
            'WITHDRAWAL_APPROVED',
            prev.accounts.find((a) => a.userId === w.userId)?.email ?? '',
            { amount: w.amount },
          ),
          ...prev.emails,
        ].slice(0, 100),
      }
    })
  }, [])

  const rejectWithdrawal = useCallback((withdrawalId: string, reason: string) => {
    setStore((prev) => {
      const w = prev.withdrawals.find((x) => x.id === withdrawalId)
      if (!w) return prev
      return {
        ...prev,
        withdrawals: prev.withdrawals.map((x) =>
          x.id === withdrawalId
            ? {
                ...x,
                status: 'REJECTED' as const,
                note: reason,
                timeline: withdrawalTimeline('REJECTED', x.requestedAt),
              }
            : x,
        ),
        accounts: prev.accounts.map((a) =>
          a.userId === w.userId
            ? {
                ...a,
                wallet: {
                  ...a.wallet,
                  availableBalance: moneyAdd(a.wallet.availableBalance, w.amount),
                  pendingWithdrawal: moneySub(a.wallet.pendingWithdrawal, w.amount),
                },
              }
            : a,
        ),
        emails: [
          buildEmail(
            'WITHDRAWAL_REJECTED',
            prev.accounts.find((a) => a.userId === w.userId)?.email ?? '',
            { reason },
          ),
          ...prev.emails,
        ].slice(0, 100),
      }
    })
  }, [])

  const markWithdrawalPaid = useCallback((withdrawalId: string) => {
    setStore((prev) => {
      const w = prev.withdrawals.find((x) => x.id === withdrawalId)
      if (!w) return prev
      return {
        ...prev,
        withdrawals: prev.withdrawals.map((x) =>
          x.id === withdrawalId
            ? {
                ...x,
                status: 'PAID' as const,
                timeline: withdrawalTimeline('PAID', x.requestedAt),
              }
            : x,
        ),
        accounts: prev.accounts.map((a) =>
          a.userId === w.userId
            ? {
                ...a,
                wallet: {
                  ...a.wallet,
                  pendingWithdrawal: moneySub(a.wallet.pendingWithdrawal, w.amount),
                  totalWithdrawn: moneyAdd(a.wallet.totalWithdrawn, w.amount),
                },
              }
            : a,
        ),
      }
    })
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('growzy:notify', {
          detail: {
            type: 'WITHDRAWAL_APPROVED',
            title: 'Withdrawal paid',
            body: `${withdrawalId} has been transferred.`,
          },
        }),
      )
    }
  }, [])

  const publishDailyReturn = useCallback(
    (input: { returnPct: string; notes: string; tradingDay: string }) => {
      const pct = Number(input.returnPct)
      if (!Number.isFinite(pct) || pct > 5) {
        return { ok: false as const, error: 'Return must be a number ≤ 5%.' }
      }
      const id = `RR-${input.tradingDay.replaceAll('-', '')}`
      setStore((prev) => {
        let distributed = 0
        const accounts = prev.accounts.map((a) => {
          if (a.kycStatus !== 'APPROVED' || a.status !== 'VERIFIED') return a
          const base = Number(a.wallet.investedAmount || a.wallet.availableBalance)
          if (base <= 0) return a
          const credit = (base * pct) / 100
          distributed += credit
          const creditStr = credit.toFixed(2)
          return {
            ...a,
            wallet: {
              ...a.wallet,
              availableBalance: moneyAdd(a.wallet.availableBalance, creditStr),
              totalProfit: moneyAdd(a.wallet.totalProfit, creditStr),
              todayProfit: creditStr,
            },
          }
        })
        const emails = accounts
          .filter((a) => a.kycStatus === 'APPROVED' && Number(a.wallet.todayProfit) > 0)
          .slice(0, 20)
          .map((a) =>
            buildEmail('DAILY_RETURN', a.email, {
              pct: input.returnPct,
              amount: a.wallet.todayProfit,
            }),
          )
        return {
          ...prev,
          accounts,
          returns: [
            {
              id,
              tradingDay: input.tradingDay,
              returnPct: input.returnPct,
              notes: input.notes,
              status: 'APPLIED' as const,
              distributed: distributed.toFixed(2),
              publishedAt: new Date().toISOString(),
            },
            ...prev.returns.filter((r) => r.id !== id),
          ],
          emails: [...emails, ...prev.emails].slice(0, 100),
        }
      })
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('growzy:notify', {
            detail: {
              type: 'DAILY_PROFIT',
              title: 'Daily return credited',
              body: `+${input.returnPct}% applied to eligible wallets.`,
            },
          }),
        )
      }
      return { ok: true as const }
    },
    [],
  )

  const pendingKycAccounts = useMemo(
    () => store.accounts.filter((a) => a.kycStatus === 'UNDER_REVIEW'),
    [store.accounts],
  )

  const sessionDeposits = useMemo(
    () => store.deposits.filter((d) => d.userId === store.sessionUserId),
    [store.deposits, store.sessionUserId],
  )

  const sessionWithdrawals = useMemo(
    () => store.withdrawals.filter((w) => w.userId === store.sessionUserId),
    [store.withdrawals, store.sessionUserId],
  )

  const accountStatus = useMemo(
    () => resolveAccountStatus(session, store.deposits, store.withdrawals),
    [session, store.deposits, store.withdrawals],
  )

  const value = useMemo<LifecycleContextValue>(
    () => ({
      ready,
      accounts: store.accounts,
      emails: store.emails,
      deposits: store.deposits,
      withdrawals: store.withdrawals,
      returns: store.returns,
      session,
      canDeposit: canDeposit(session),
      accountStatus,
      registerAccount,
      verifyEmail,
      login,
      completeLogin,
      loginWithGoogle,
      logout,
      logoutAllDevices,
      requestPasswordReset,
      resetPassword,
      changeEmail,
      submitKyc,
      approveKyc,
      rejectKyc,
      requestKycResubmit,
      setAccountStatus,
      addAdminNote,
      toggle2fa,
      changePassword,
      pendingKycAccounts,
      queueEmail,
      submitDeposit,
      approveDeposit,
      rejectDeposit,
      needInfoDeposit,
      submitWithdrawal,
      approveWithdrawal,
      rejectWithdrawal,
      markWithdrawalPaid,
      publishDailyReturn,
      sessionDeposits,
      sessionWithdrawals,
    }),
    [
      ready,
      store.accounts,
      store.emails,
      store.deposits,
      store.withdrawals,
      store.returns,
      session,
      accountStatus,
      registerAccount,
      verifyEmail,
      login,
      completeLogin,
      loginWithGoogle,
      logout,
      logoutAllDevices,
      requestPasswordReset,
      resetPassword,
      changeEmail,
      submitKyc,
      approveKyc,
      rejectKyc,
      requestKycResubmit,
      setAccountStatus,
      addAdminNote,
      toggle2fa,
      changePassword,
      pendingKycAccounts,
      queueEmail,
      submitDeposit,
      approveDeposit,
      rejectDeposit,
      needInfoDeposit,
      submitWithdrawal,
      approveWithdrawal,
      rejectWithdrawal,
      markWithdrawalPaid,
      publishDailyReturn,
      sessionDeposits,
      sessionWithdrawals,
    ],
  )

  return <LifecycleContext.Provider value={value}>{children}</LifecycleContext.Provider>
}

export function useInvestorLifecycle() {
  const ctx = useContext(LifecycleContext)
  if (!ctx) throw new Error('useInvestorLifecycle must be used within InvestorLifecycleProvider')
  return ctx
}
