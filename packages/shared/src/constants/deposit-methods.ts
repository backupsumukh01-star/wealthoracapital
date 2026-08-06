/** Supported deposit crypto assets and common networks per coin. */

export const DEPOSIT_CRYPTO_COINS = [
  'USDT',
  'USDC',
  'BTC',
  'ETH',
  'BNB',
  'SOL',
  'TRX',
  'XRP',
] as const

export type DepositCryptoCoin = (typeof DEPOSIT_CRYPTO_COINS)[number]

export const DEPOSIT_CRYPTO_NETWORKS: Record<DepositCryptoCoin, readonly string[]> = {
  USDT: ['TRC20', 'ERC20', 'BEP20', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'SOL'],
  USDC: ['ERC20', 'BEP20', 'POLYGON', 'ARBITRUM', 'OPTIMISM', 'SOL'],
  BTC: ['BTC', 'BEP20'],
  ETH: ['ERC20', 'ARBITRUM', 'OPTIMISM', 'POLYGON', 'BEP20'],
  BNB: ['BEP20', 'ERC20'],
  SOL: ['SOL'],
  TRX: ['TRC20'],
  XRP: ['XRP', 'BEP20'],
}

/** Canonical deposit method types for new admin creates. */
export const DEPOSIT_METHOD_TYPES = ['UPI', 'BANK_TRANSFER', 'CRYPTO', 'MANUAL', 'OTHER'] as const
export type DepositMethodType = (typeof DEPOSIT_METHOD_TYPES)[number]
