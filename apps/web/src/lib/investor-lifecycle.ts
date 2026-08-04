/**
 * Investor lifecycle domain — frontend architecture ready for a real API.
 * Demo persistence uses localStorage; swap `persist` / `load` for HTTP later.
 */

export type LifecycleStatus =
  | 'PENDING_EMAIL'
  | 'PENDING_KYC'
  | 'VERIFIED'
  | 'RESTRICTED'
  | 'SUSPENDED'
  | 'REJECTED'

export type KycLifecycleStatus = 'NOT_STARTED' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED'

export type IdDocumentType = 'PASSPORT' | 'DRIVING_LICENSE' | 'NATIONAL_ID'

export type EmailTemplateId =
  | 'WELCOME'
  | 'VERIFY_EMAIL'
  | 'PASSWORD_RESET'
  | 'KYC_SUBMITTED'
  | 'KYC_APPROVED'
  | 'KYC_REJECTED'
  | 'DEPOSIT_APPROVED'
  | 'DEPOSIT_REJECTED'
  | 'DEPOSIT_SUBMITTED'
  | 'WITHDRAWAL_APPROVED'
  | 'WITHDRAWAL_REJECTED'
  | 'WITHDRAWAL_SUBMITTED'
  | 'DAILY_RETURN'
  | 'PASSWORD_CHANGED'
  | 'EMAIL_CHANGED'
  | 'NEW_LOGIN'
  | 'TWO_FA_ENABLED'
  | 'TWO_FA_DISABLED'

export type MoneyDepositStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'NEED_INFO'

export type MoneyWithdrawalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID'

export type TimelineStep = {
  id: string
  label: string
  at?: string
  done: boolean
  current?: boolean
}

export type MoneyDeposit = {
  id: string
  userId: string
  amount: string
  method: string
  reference: string
  status: MoneyDepositStatus
  submittedAt: string
  proofLabel?: string
  note?: string
  timeline: TimelineStep[]
}

export type MoneyWithdrawal = {
  id: string
  userId: string
  amount: string
  destination: string
  destinationDetail: string
  status: MoneyWithdrawalStatus
  requestedAt: string
  note?: string
  timeline: TimelineStep[]
}

export type WalletSnapshot = {
  availableBalance: string
  investedAmount: string
  pendingDeposit: string
  pendingWithdrawal: string
  totalDeposited: string
  totalWithdrawn: string
  totalProfit: string
  todayProfit: string
}

export type DailyReturnRecord = {
  id: string
  tradingDay: string
  returnPct: string
  notes: string
  status: 'DRAFT' | 'APPLIED'
  distributed: string
  publishedAt?: string
}

export type OutboundEmail = {
  id: string
  template: EmailTemplateId
  to: string
  subject: string
  preview: string
  sentAt: string
  meta?: Record<string, string>
}

export type LoginEvent = {
  id: string
  at: string
  ip: string
  country: string
  browser: string
  current?: boolean
}

export type KycDocumentMeta = {
  name: string
  size: number
  uploadedAt: string
}

export type KycSubmission = {
  country: string
  dateOfBirth: string
  address: string
  city: string
  occupation: string
  idType: IdDocumentType
  front?: KycDocumentMeta
  back?: KycDocumentMeta
  selfie?: KycDocumentMeta
  submittedAt?: string
  reviewedAt?: string
  rejectionReason?: string
  history: { at: string; action: string; note?: string }[]
}

export type InvestorAccount = {
  userId: string
  username: string
  firstName: string
  lastName: string
  email: string
  phone: string
  /** Demo-only credential store — replace with server-side hash. */
  password: string
  emailVerified: boolean
  status: LifecycleStatus
  kycStatus: KycLifecycleStatus
  kyc: KycSubmission | null
  twoFactorEnabled: boolean
  backupCodes: string[]
  createdAt: string
  investorSince: string | null
  referralCode: string
  avatarUrl: string | null
  loginHistory: LoginEvent[]
  adminNotes: { id: string; at: string; text: string; author: string }[]
  wallet: WalletSnapshot
  country?: string
}

export type LifecycleStore = {
  accounts: InvestorAccount[]
  emails: OutboundEmail[]
  deposits: MoneyDeposit[]
  withdrawals: MoneyWithdrawal[]
  returns: DailyReturnRecord[]
  sessionUserId: string | null
  usedUsernames: string[]
  usedUserIds: string[]
}

const STORAGE_KEY = 'growzy_investor_lifecycle_v2'
export const DEMO_OTP = '123456'

function emptyWallet(): WalletSnapshot {
  return {
    availableBalance: '0.00',
    investedAmount: '0.00',
    pendingDeposit: '0.00',
    pendingWithdrawal: '0.00',
    totalDeposited: '0.00',
    totalWithdrawn: '0.00',
    totalProfit: '0.00',
    todayProfit: '0.00',
  }
}

function moneyAdd(a: string, b: string) {
  return (Number(a) + Number(b)).toFixed(2)
}

function moneySub(a: string, b: string) {
  return Math.max(0, Number(a) - Number(b)).toFixed(2)
}

export function depositTimeline(status: MoneyDepositStatus, submittedAt: string): TimelineStep[] {
  const steps: TimelineStep[] = [
    { id: 'requested', label: 'Requested', at: submittedAt, done: true },
    { id: 'submitted', label: 'Submitted', at: submittedAt, done: true },
    {
      id: 'review',
      label: 'Review',
      done: status !== 'PENDING',
      current: status === 'UNDER_REVIEW' || status === 'NEED_INFO' || status === 'PENDING',
    },
    {
      id: 'approved',
      label: status === 'REJECTED' ? 'Rejected' : 'Approved',
      done: status === 'APPROVED' || status === 'REJECTED',
      current: status === 'APPROVED' || status === 'REJECTED',
    },
    {
      id: 'wallet',
      label: 'Wallet updated',
      done: status === 'APPROVED',
      current: status === 'APPROVED',
    },
  ]
  return steps
}

export function withdrawalTimeline(
  status: MoneyWithdrawalStatus,
  requestedAt: string,
): TimelineStep[] {
  return [
    { id: 'requested', label: 'Requested', at: requestedAt, done: true },
    {
      id: 'compliance',
      label: 'Compliance review',
      done: status !== 'PENDING',
      current: status === 'PENDING',
    },
    {
      id: 'approved',
      label: status === 'REJECTED' ? 'Rejected' : 'Approved',
      done: status === 'APPROVED' || status === 'PAID' || status === 'REJECTED',
      current: status === 'APPROVED',
    },
    {
      id: 'transferred',
      label: 'Transferred',
      done: status === 'PAID',
      current: status === 'PAID',
    },
  ]
}

export function kycTimeline(kyc: KycSubmission | null, status: KycLifecycleStatus): TimelineStep[] {
  if (!kyc || status === 'NOT_STARTED') {
    return [
      { id: 'submitted', label: 'Submitted', done: false, current: true },
      { id: 'review', label: 'Review', done: false },
      { id: 'approved', label: 'Approved', done: false },
    ]
  }
  return [
    { id: 'submitted', label: 'Submitted', at: kyc.submittedAt, done: true },
    {
      id: 'review',
      label: 'Review',
      done: status === 'APPROVED' || status === 'REJECTED',
      current: status === 'UNDER_REVIEW',
    },
    {
      id: 'approved',
      label: status === 'REJECTED' ? 'Rejected' : 'Approved',
      at: kyc.reviewedAt,
      done: status === 'APPROVED' || status === 'REJECTED',
      current: status === 'APPROVED' || status === 'REJECTED',
    },
  ]
}

const SEED_ACCOUNT: InvestorAccount = {
  userId: 'GRZ-100001',
  username: 'ayesha',
  firstName: 'Ayesha',
  lastName: 'Khan',
  email: 'investor@growzy.com',
  phone: '+92 300 555 0142',
  password: 'Growzy2026!',
  emailVerified: true,
  status: 'VERIFIED',
  kycStatus: 'APPROVED',
  kyc: {
    country: 'PK',
    dateOfBirth: '1994-06-12',
    address: 'Clifton Block 5',
    city: 'Karachi',
    occupation: 'Investor',
    idType: 'PASSPORT',
    submittedAt: '2025-05-14T12:00:00.000Z',
    reviewedAt: '2025-05-15T09:00:00.000Z',
    history: [{ at: '2025-05-15T09:00:00.000Z', action: 'APPROVED', note: 'Seed verified investor' }],
  },
  twoFactorEnabled: false,
  backupCodes: [],
  createdAt: '2025-05-14T12:00:00.000Z',
  investorSince: '2025-05-15T09:00:00.000Z',
  referralCode: 'GRZ-AYESHA',
  avatarUrl: null,
  country: 'Pakistan',
  loginHistory: [
    {
      id: 'lg1',
      at: new Date().toISOString(),
      ip: '39.50.12.8',
      country: 'Pakistan',
      browser: 'Chrome · Windows',
      current: true,
    },
  ],
  adminNotes: [],
  wallet: {
    availableBalance: '12480.75',
    investedAmount: '10000.00',
    pendingDeposit: '500.00',
    pendingWithdrawal: '100.00',
    totalDeposited: '11000.00',
    totalWithdrawn: '1000.00',
    totalProfit: '2480.75',
    todayProfit: '87.36',
  },
}

const SEED_DEPOSITS: MoneyDeposit[] = [
  {
    id: 'DEP-2026-884211',
    userId: 'GRZ-100001',
    amount: '500.00',
    method: 'UPI',
    reference: 'UTR4829103341',
    status: 'UNDER_REVIEW',
    submittedAt: '2026-08-02T14:22:00.000Z',
    proofLabel: 'upi-receipt.jpg',
    timeline: depositTimeline('UNDER_REVIEW', '2026-08-02T14:22:00.000Z'),
  },
]

const SEED_WITHDRAWALS: MoneyWithdrawal[] = [
  {
    id: 'WDR-2026-55102',
    userId: 'GRZ-100001',
    amount: '100.00',
    destination: 'Bank',
    destinationDetail: 'HDFC · ****4521',
    status: 'PENDING',
    requestedAt: '2026-08-02T15:40:00.000Z',
    timeline: withdrawalTimeline('PENDING', '2026-08-02T15:40:00.000Z'),
  },
]

function emptyStore(): LifecycleStore {
  return {
    accounts: [SEED_ACCOUNT],
    emails: [],
    deposits: SEED_DEPOSITS,
    withdrawals: SEED_WITHDRAWALS,
    returns: [
      {
        id: 'RR-2026-0802',
        tradingDay: '2026-08-02',
        returnPct: '0.72',
        notes: 'Strong London session',
        status: 'APPLIED',
        distributed: '19890.50',
        publishedAt: '2026-08-02T21:05:00.000Z',
      },
    ],
    sessionUserId: null,
    usedUsernames: [SEED_ACCOUNT.username],
    usedUserIds: [SEED_ACCOUNT.userId],
  }
}

export function loadLifecycleStore(): LifecycleStore {
  if (typeof window === 'undefined') return emptyStore()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyStore()
    const parsed = JSON.parse(raw) as LifecycleStore
    if (!parsed.accounts?.length) return emptyStore()
    // Migrate older shapes
    return {
      ...emptyStore(),
      ...parsed,
      deposits: parsed.deposits ?? emptyStore().deposits,
      withdrawals: parsed.withdrawals ?? emptyStore().withdrawals,
      returns: parsed.returns ?? emptyStore().returns,
      accounts: parsed.accounts.map((a) => ({
        ...a,
        wallet: a.wallet ?? emptyWallet(),
      })),
    }
  } catch {
    return emptyStore()
  }
}

export function saveLifecycleStore(store: LifecycleStore) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

export { emptyWallet, moneyAdd, moneySub }

export function generateUserId(existing: string[]): string {
  for (let i = 0; i < 40; i++) {
    const n = 100000 + Math.floor(Math.random() * 900000)
    const id = `GRZ-${n}`
    if (!existing.includes(id)) return id
  }
  return `GRZ-${Date.now().toString().slice(-6)}`
}

export function generateUsername(firstName: string, existing: string[]): string {
  const base = firstName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 10) || 'investor'
  for (let i = 0; i < 50; i++) {
    const suffix = Math.floor(1000 + Math.random() * 9000)
    const candidate = `${base}${suffix}`
    if (!existing.includes(candidate)) return candidate
  }
  return `${base}${Date.now().toString().slice(-4)}`
}

export function displayUsername(username: string) {
  return username.startsWith('@') ? username : `@${username}`
}

export function canDeposit(account: InvestorAccount | null | undefined) {
  if (!account) return false
  return account.status === 'VERIFIED' && account.kycStatus === 'APPROVED' && account.emailVerified
}

export function statusBadge(status: LifecycleStatus): { label: string; tone: 'warning' | 'info' | 'profit' | 'loss' | 'neutral' } {
  switch (status) {
    case 'PENDING_EMAIL':
      return { label: 'Pending Email', tone: 'warning' }
    case 'PENDING_KYC':
      return { label: 'Pending KYC', tone: 'info' }
    case 'VERIFIED':
      return { label: 'Verified', tone: 'profit' }
    case 'RESTRICTED':
      return { label: 'Restricted', tone: 'warning' }
    case 'SUSPENDED':
      return { label: 'Suspended', tone: 'loss' }
    case 'REJECTED':
      return { label: 'Rejected', tone: 'loss' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

export function kycBadge(status: KycLifecycleStatus): { label: string; tone: 'warning' | 'info' | 'profit' | 'loss' | 'neutral' } {
  switch (status) {
    case 'NOT_STARTED':
      return { label: 'Not started', tone: 'neutral' }
    case 'UNDER_REVIEW':
      return { label: 'Under Review', tone: 'warning' }
    case 'APPROVED':
      return { label: 'Verified', tone: 'profit' }
    case 'REJECTED':
      return { label: 'Rejected', tone: 'loss' }
    default:
      return { label: status, tone: 'neutral' }
  }
}

const EMAIL_COPY: Record<EmailTemplateId, (meta?: Record<string, string>) => { subject: string; preview: string }> = {
  WELCOME: (m) => ({
    subject: 'Welcome to Growzy Capital',
    preview: `Welcome ${m?.firstName ?? ''}. Your User ID is ${m?.userId ?? ''} and username is ${m?.username ?? ''}.`,
  }),
  VERIFY_EMAIL: () => ({
    subject: 'Verify your Growzy email',
    preview: `Your verification code is ${DEMO_OTP}. It expires in 10 minutes.`,
  }),
  PASSWORD_RESET: () => ({
    subject: 'Reset your Growzy password',
    preview: `Your reset code is ${DEMO_OTP}.`,
  }),
  KYC_SUBMITTED: () => ({
    subject: 'KYC submitted — under review',
    preview: 'Our compliance team is reviewing your documents. Expected review: 24–48 hours.',
  }),
  KYC_APPROVED: () => ({
    subject: 'KYC Approved — you may deposit',
    preview: 'Congratulations. Your account is verified. You may now deposit funds.',
  }),
  KYC_REJECTED: (m) => ({
    subject: 'KYC needs attention',
    preview: m?.reason ?? 'Please re-upload your documents.',
  }),
  DEPOSIT_APPROVED: (m) => ({
    subject: 'Deposit approved',
    preview: `$${m?.amount ?? ''} credited to your wallet.`,
  }),
  DEPOSIT_REJECTED: () => ({ subject: 'Deposit rejected', preview: 'See your dashboard for details.' }),
  DEPOSIT_SUBMITTED: (m) => ({
    subject: 'Deposit received',
    preview: `We received your $${m?.amount ?? ''} deposit proof and are reviewing it.`,
  }),
  WITHDRAWAL_APPROVED: (m) => ({
    subject: 'Withdrawal approved',
    preview: `$${m?.amount ?? ''} payout is being processed.`,
  }),
  WITHDRAWAL_REJECTED: () => ({
    subject: 'Withdrawal rejected',
    preview: 'See your dashboard for details.',
  }),
  WITHDRAWAL_SUBMITTED: (m) => ({
    subject: 'Withdrawal requested',
    preview: `Your $${m?.amount ?? ''} withdrawal is under compliance review.`,
  }),
  DAILY_RETURN: (m) => ({
    subject: 'Daily return credited',
    preview: `+${m?.pct ?? '0'}% credited · $${m?.amount ?? '0'} added to your wallet.`,
  }),
  PASSWORD_CHANGED: () => ({ subject: 'Password changed', preview: 'Your Growzy password was updated.' }),
  EMAIL_CHANGED: () => ({ subject: 'Email changed', preview: 'Your Growzy email was updated.' }),
  NEW_LOGIN: (m) => ({
    subject: 'New login to Growzy',
    preview: `New sign-in from ${m?.browser ?? 'a device'} · ${m?.country ?? ''}.`,
  }),
  TWO_FA_ENABLED: () => ({ subject: '2FA enabled', preview: 'Authenticator protection is now on.' }),
  TWO_FA_DISABLED: () => ({ subject: '2FA disabled', preview: 'Authenticator protection was turned off.' }),
}

export function buildEmail(
  template: EmailTemplateId,
  to: string,
  meta?: Record<string, string>,
): OutboundEmail {
  const copy = EMAIL_COPY[template](meta)
  return {
    id: `em_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    template,
    to,
    subject: copy.subject,
    preview: copy.preview,
    sentAt: new Date().toISOString(),
    meta,
  }
}

export function fileMeta(file: File): KycDocumentMeta {
  return { name: file.name, size: file.size, uploadedAt: new Date().toISOString() }
}
