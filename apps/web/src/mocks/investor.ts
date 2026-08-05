/** Production stubs — empty money fixtures. Prefer deposit/withdraw API hooks. */

export type DepositRail = 'INR' | 'CRYPTO'
export type WithdrawRail = 'INR' | 'CRYPTO'
export type LedgerFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'RETURN' | 'BONUS' | 'REFERRAL'

export const INR_BANK_DETAILS = {
  bankName: '',
  accountHolder: '',
  accountName: '',
  accountNumber: '',
  ifsc: '',
  branch: '',
  upiId: '',
  note: '',
}

export const UPI_APPS = [] as Array<{
  id: string
  name: string
  hint: string
  deepLink?: string
  brand?: string
}>

export const WALLET_DEPOSIT_TIMELINE = [
  { id: 'submit', label: 'Submitted', done: false, current: true },
  { id: 'review', label: 'Under review', done: false },
  { id: 'credit', label: 'Credited', done: false },
]

export const WALLET_WITHDRAW_TIMELINE = [
  { id: 'request', label: 'Requested', done: false, current: true },
  { id: 'approve', label: 'Approved', done: false },
  { id: 'paid', label: 'Paid', done: false },
]

export const CRYPTO_DEPOSIT_OPTIONS = {
  coins: [
    { id: 'USDT', label: 'USDT', networks: ['TRC20', 'ERC20', 'BEP20'] },
    { id: 'USDC', label: 'USDC', networks: ['ERC20', 'BEP20'] },
  ],
  addresses: {} as Record<string, string>,
  confirmationsRequired: {
    TRC20: 20,
    ERC20: 12,
    BEP20: 15,
  } as Record<string, number>,
}

export const SAVED_INR_ACCOUNTS = [] as any[]
export const SAVED_CRYPTO_WALLETS = [] as any[]
export const DEMO_DEPOSITS = [] as any[]
export const DEMO_WITHDRAWALS = [] as any[]
export const DEMO_LEDGER = [] as any[]
export const DEMO_MONTHLY_RETURNS = [] as any[]
export const DEMO_DAILY_RETURNS = [] as any[]
export const SUPPORT_FAQS = [] as Array<{ q: string; a: string }>
export const DEPOSIT_TIMELINE_STEPS = WALLET_DEPOSIT_TIMELINE
