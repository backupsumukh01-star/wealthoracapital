export type SalesmanStatus = 'ACTIVE' | 'DISABLED'

export type SalesmanPublic = {
  id: string
  name: string
  email: string
  code: string
  status: SalesmanStatus
  referralLink: string
}

export type SalesmanListItem = {
  id: string
  name: string
  email: string
  code: string
  status: SalesmanStatus
  createdAt: string
}

export type SalesNetworkSummary = {
  totalMembers: number
  directMembers: number
  maxDepth: number
  totalApprovedDeposits: string
  totalPaidWithdrawals: string
  netFunds: string
}

export type SalesNetworkMember = {
  userId: string
  parentUserId: string | null
  level: number
  isDirect: boolean
  name: string
  username: string
  referralCode: string | null
  registrationDate: string
  currentBalance: string
  approvedDeposits: string
  paidWithdrawals: string
  netFunds: string
  directReferralCount: number
  networkMemberCount: number
}

export type SalesMoneyEvent = {
  date: string
  amount: string
  status: string
  reference: string
}

export type SalesNetworkMemberDetail = {
  salesman: SalesNetworkSalesman
  member: SalesNetworkMember
  depositHistory: SalesMoneyEvent[]
  withdrawalHistory: SalesMoneyEvent[]
}

export type SalesNetworkSalesman = {
  id: string
  name: string
  code: string
  status: SalesmanStatus
}

export type SalesMeResponse = {
  salesman: SalesmanPublic
}

export type SalesLoginResponse = {
  salesman: SalesmanPublic
}

export type SalesNetworkResponse = {
  salesman: SalesNetworkSalesman
  summary: SalesNetworkSummary
  members: SalesNetworkMember[]
}

export type SalesNetworkMembersResponse = {
  salesman: SalesNetworkSalesman
  members: SalesNetworkMember[]
}

export type SalesNetworkSummaryResponse = {
  salesman: SalesNetworkSalesman
  summary: SalesNetworkSummary
}

export type SalesOwnerSalesmenResponse = {
  salesmen: SalesmanListItem[]
}
