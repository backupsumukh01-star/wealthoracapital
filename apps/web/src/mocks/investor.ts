/**
 * Extended dummy data for investor money flows, ledger filters, profile & support.
 * Presentation only — swap for API responses later.
 */

import type { MoneyString } from '@meridian/shared'

export const INR_BANK_DETAILS = {
  bankName: 'Growzy Settlement Bank',
  accountName: 'Growzy Capital Partners',
  accountNumber: '50200044881234',
  ifsc: 'HDFC0001234',
  branch: 'Bandra Kurla Complex, Mumbai',
  upiId: 'growzy@hdfcbank',
  note: 'Include your Growzy User ID in the transfer remark.',
}

/** UPI app deep links — replace with live pay links before production. */
export const UPI_APPS = [
  {
    id: 'gpay',
    name: 'Google Pay',
    brand: '#4285F4',
    deepLink:
      'upi://pay?pa=growzy@hdfcbank&pn=Growzy%20Capital%20Partners&cu=INR&tn=Growzy%20Deposit',
  },
  {
    id: 'phonepe',
    name: 'PhonePe',
    brand: '#5F259F',
    deepLink:
      'phonepe://pay?pa=growzy@hdfcbank&pn=Growzy%20Capital%20Partners&cu=INR&tn=Growzy%20Deposit',
  },
  {
    id: 'paytm',
    name: 'Paytm',
    brand: '#00BAF2',
    deepLink:
      'paytmmp://pay?pa=growzy@hdfcbank&pn=Growzy%20Capital%20Partners&cu=INR&tn=Growzy%20Deposit',
  },
] as const

export const WALLET_DEPOSIT_TIMELINE = [
  { id: 'method', label: 'Method selected' },
  { id: 'pay', label: 'Payment initiated' },
  { id: 'proof', label: 'Proof submitted' },
  { id: 'review', label: 'Under review' },
  { id: 'credited', label: 'Funds credited' },
]

export const WALLET_WITHDRAW_TIMELINE = [
  { id: 'request', label: 'Request submitted' },
  { id: 'review', label: 'Compliance review' },
  { id: 'processing', label: 'Processing payout' },
  { id: 'paid', label: 'Paid' },
]

export const CRYPTO_DEPOSIT_OPTIONS = {
  coins: [
    { id: 'USDT', label: 'USDT', networks: ['TRC20', 'ERC20', 'BEP20'] },
    { id: 'USDC', label: 'USDC', networks: ['ERC20', 'BEP20'] },
    { id: 'BTC', label: 'BTC', networks: ['Bitcoin'] },
    { id: 'ETH', label: 'ETH', networks: ['ERC20'] },
  ],
  addresses: {
    'USDT-TRC20': 'TXk9fR2mQpL8nVhYw3sA7cBdE6uJ1oK4Zm',
    'USDT-ERC20': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'USDT-BEP20': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
    'USDC-ERC20': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    'USDC-BEP20': '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d',
    'BTC-Bitcoin': 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    'ETH-ERC20': '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
  } as Record<string, string>,
  confirmationsRequired: {
    TRC20: 19,
    ERC20: 12,
    BEP20: 15,
    Bitcoin: 2,
  } as Record<string, number>,
}

export const SAVED_INR_ACCOUNTS = [
  {
    id: 'bank_1',
    bankName: 'HDFC Bank',
    accountName: 'Ayesha Khan',
    accountNumberMasked: '•••• 0142',
    ifsc: 'HDFC0002211',
    primary: true,
  },
  {
    id: 'bank_2',
    bankName: 'ICICI Bank',
    accountName: 'Ayesha Khan',
    accountNumberMasked: '•••• 8831',
    ifsc: 'ICIC0001099',
    primary: false,
  },
]

export const SAVED_CRYPTO_WALLETS = [
  {
    id: 'cw_1',
    label: 'Personal USDT',
    coin: 'USDT',
    network: 'TRC20',
    address: 'TYg7fR2mQpL8nVhYw3sA7cBdE6uJ1oK4Ab',
    primary: true,
  },
  {
    id: 'cw_2',
    label: 'Cold ETH',
    coin: 'ETH',
    network: 'ERC20',
    address: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb1',
    primary: false,
  },
]

export type DepositRail = 'INR' | 'CRYPTO'
export type WithdrawRail = 'INR' | 'CRYPTO'

export const DEMO_DEPOSITS = [
  {
    id: 'DEP-2026-000418',
    rail: 'INR' as DepositRail,
    amount: '500.00' as MoneyString,
    currency: 'USD',
    status: 'UNDER_REVIEW' as const,
    createdAt: '2026-08-02T09:40:00.000Z',
    method: 'Bank transfer (INR)',
    confirmations: null as number | null,
    requiredConfirmations: null as number | null,
  },
  {
    id: 'DEP-2026-000412',
    rail: 'CRYPTO' as DepositRail,
    amount: '1000.00' as MoneyString,
    currency: 'USD',
    status: 'APPROVED' as const,
    createdAt: '2026-08-01T11:20:00.000Z',
    method: 'USDT · TRC20',
    confirmations: 19,
    requiredConfirmations: 19,
  },
  {
    id: 'DEP-2026-000401',
    rail: 'INR' as DepositRail,
    amount: '2500.00' as MoneyString,
    currency: 'USD',
    status: 'APPROVED' as const,
    createdAt: '2026-07-18T14:05:00.000Z',
    method: 'UPI',
    confirmations: null,
    requiredConfirmations: null,
  },
  {
    id: 'DEP-2026-000388',
    rail: 'CRYPTO' as DepositRail,
    amount: '750.00' as MoneyString,
    currency: 'USD',
    status: 'REJECTED' as const,
    createdAt: '2026-07-10T08:12:00.000Z',
    method: 'USDT · ERC20',
    confirmations: 3,
    requiredConfirmations: 12,
  },
]

export const DEMO_WITHDRAWALS = [
  {
    id: 'WDR-2026-000091',
    rail: 'INR' as WithdrawRail,
    amount: '100.00' as MoneyString,
    fee: '0.00' as MoneyString,
    net: '100.00' as MoneyString,
    status: 'PENDING' as const,
    createdAt: '2026-08-02T10:15:00.000Z',
    destination: 'HDFC •••• 0142',
    networkFee: null as string | null,
  },
  {
    id: 'WDR-2026-000088',
    rail: 'CRYPTO' as WithdrawRail,
    amount: '250.00' as MoneyString,
    fee: '1.00' as MoneyString,
    net: '249.00' as MoneyString,
    status: 'PAID' as const,
    createdAt: '2026-07-28T15:40:00.000Z',
    destination: 'USDT TRC20 · TYg7…K4Ab',
    networkFee: '1.00',
  },
  {
    id: 'WDR-2026-000074',
    rail: 'INR' as WithdrawRail,
    amount: '500.00' as MoneyString,
    fee: '0.00' as MoneyString,
    net: '500.00' as MoneyString,
    status: 'PAID' as const,
    createdAt: '2026-07-12T12:00:00.000Z',
    destination: 'ICICI •••• 8831',
    networkFee: null,
  },
]

export type LedgerFilter = 'ALL' | 'DEPOSIT' | 'WITHDRAWAL' | 'RETURN' | 'BONUS' | 'REFERRAL'

export const DEMO_LEDGER = [
  {
    id: 'tx1',
    filter: 'RETURN' as LedgerFilter,
    type: 'DAILY_PROFIT',
    label: 'Daily profit',
    reference: 'RUN-2026-08-02',
    amount: '87.36',
    date: '2026-08-02T18:05:00.000Z',
  },
  {
    id: 'tx2',
    filter: 'DEPOSIT' as LedgerFilter,
    type: 'DEPOSIT',
    label: 'Deposit approved',
    reference: 'DEP-2026-000412',
    amount: '1000.00',
    date: '2026-08-01T11:20:00.000Z',
  },
  {
    id: 'tx3',
    filter: 'RETURN' as LedgerFilter,
    type: 'DAILY_PROFIT',
    label: 'Daily profit',
    reference: 'RUN-2026-08-01',
    amount: '52.10',
    date: '2026-08-01T18:02:00.000Z',
  },
  {
    id: 'tx4',
    filter: 'WITHDRAWAL' as LedgerFilter,
    type: 'WITHDRAWAL',
    label: 'Withdrawal paid',
    reference: 'WDR-2026-000088',
    amount: '-250.00',
    date: '2026-07-28T15:40:00.000Z',
  },
  {
    id: 'tx5',
    filter: 'BONUS' as LedgerFilter,
    type: 'BONUS',
    label: 'Welcome bonus',
    reference: 'BNS-2201',
    amount: '50.00',
    date: '2026-07-21T09:00:00.000Z',
  },
  {
    id: 'tx6',
    filter: 'REFERRAL' as LedgerFilter,
    type: 'REFERRAL',
    label: 'Referral reward',
    reference: 'REF-118',
    amount: '25.00',
    date: '2026-07-20T09:15:00.000Z',
  },
  {
    id: 'tx7',
    filter: 'RETURN' as LedgerFilter,
    type: 'DAILY_LOSS',
    label: 'Daily loss',
    reference: 'RUN-2026-07-22',
    amount: '-74.10',
    date: '2026-07-22T18:00:00.000Z',
  },
  {
    id: 'tx8',
    filter: 'DEPOSIT' as LedgerFilter,
    type: 'DEPOSIT',
    label: 'Deposit approved',
    reference: 'DEP-2026-000401',
    amount: '2500.00',
    date: '2026-07-18T14:10:00.000Z',
  },
  {
    id: 'tx9',
    filter: 'WITHDRAWAL' as LedgerFilter,
    type: 'WITHDRAWAL',
    label: 'Withdrawal paid',
    reference: 'WDR-2026-000074',
    amount: '-500.00',
    date: '2026-07-12T12:05:00.000Z',
  },
  {
    id: 'tx10',
    filter: 'RETURN' as LedgerFilter,
    type: 'DAILY_PROFIT',
    label: 'Daily profit',
    reference: 'RUN-2026-07-27',
    amount: '110.40',
    date: '2026-07-27T18:01:00.000Z',
  },
  {
    id: 'tx11',
    filter: 'BONUS' as LedgerFilter,
    type: 'BONUS',
    label: 'Loyalty credit',
    reference: 'BNS-2190',
    amount: '15.00',
    date: '2026-07-05T10:00:00.000Z',
  },
  {
    id: 'tx12',
    filter: 'REFERRAL' as LedgerFilter,
    type: 'REFERRAL',
    label: 'Referral reward',
    reference: 'REF-102',
    amount: '25.00',
    date: '2026-06-28T16:20:00.000Z',
  },
]

export const DEMO_MONTHLY_RETURNS = [
  { month: 'Jan', returnPct: '3.2', profit: '312.00' },
  { month: 'Feb', returnPct: '4.1', profit: '418.00' },
  { month: 'Mar', returnPct: '-1.2', profit: '-128.00' },
  { month: 'Apr', returnPct: '5.8', profit: '612.00' },
  { month: 'May', returnPct: '2.9', profit: '318.00' },
  { month: 'Jun', returnPct: '6.4', profit: '726.00' },
  { month: 'Jul', returnPct: '4.8', profit: '568.00' },
  { month: 'Aug', returnPct: '2.1', profit: '258.00' },
]

export const DEMO_DAILY_RETURNS = [
  { date: '2026-08-02', returnPct: '0.70', profit: '87.36' },
  { date: '2026-08-01', returnPct: '0.45', profit: '55.80' },
  { date: '2026-07-31', returnPct: '0.52', profit: '64.10' },
  { date: '2026-07-30', returnPct: '-0.18', profit: '-22.40' },
  { date: '2026-07-29', returnPct: '0.61', profit: '75.20' },
  { date: '2026-07-28', returnPct: '0.33', profit: '40.50' },
  { date: '2026-07-27', returnPct: '0.88', profit: '110.40' },
]

export const SUPPORT_FAQS = [
  {
    q: 'How long do deposits take to credit?',
    a: 'INR transfers are usually reviewed within one desk day after proof upload. Crypto credits after the required network confirmations, then ops review.',
  },
  {
    q: 'When can I withdraw?',
    a: 'After the deposit cooldown (demo: 24 hours) and once available balance covers the request. Pending withdrawals lock funds immediately.',
  },
  {
    q: 'How is today’s return calculated?',
    a: 'The desk publishes a day return %. Your credit is eligible balance × return %, rounded half-up to 2 decimals, applied in one atomic run.',
  },
  {
    q: 'Who do I contact for a stuck payout?',
    a: 'Open a ticket under Withdrawal or message WhatsApp support with your withdrawal reference.',
  },
]

export const DEPOSIT_TIMELINE_STEPS = [
  { id: 'request', label: 'Request submitted' },
  { id: 'proof', label: 'Proof uploaded' },
  { id: 'review', label: 'Compliance review' },
  { id: 'credited', label: 'Funds credited' },
]
