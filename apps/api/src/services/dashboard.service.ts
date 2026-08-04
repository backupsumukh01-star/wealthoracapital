import { userRepository } from '../repositories/user.repository.js'
import { activityService } from './activity.service.js'
import { cache } from './cache/index.js'

export type AdminDashboardSummary = {
  totalUsers: number
  todaysRegistrations: number
  activeInvestors: number
  pendingKyc: number
  pendingDeposits: number
  pendingWithdrawals: number
  suspendedUsers: number
  blockedUsers: number
  revenueSummary: {
    totalRevenue: string
    currency: string
  }
  investmentSummary: {
    totalAum: string
    currency: string
  }
  recentActivities: Array<{
    id: string
    kind: string
    title: string
    at: string
  }>
}

export const dashboardService = {
  async getSummary(): Promise<AdminDashboardSummary> {
    const cacheKey = 'admin:dashboard:summary'
    const cached = await cache.get<AdminDashboardSummary>(cacheKey)
    if (cached) {
      return cached
    }

    const startOfDay = new Date()
    startOfDay.setUTCHours(0, 0, 0, 0)
    const endOfDay = new Date(startOfDay)
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1)

    const [totalUsers, todaysRegistrations, activeInvestors, pendingKyc, suspendedUsers, blockedUsers] =
      await Promise.all([
        userRepository.count({}),
        userRepository.countCreatedBetween(startOfDay, endOfDay),
        userRepository.count({ status: 'ACTIVE', role: 'USER' }),
        userRepository.countPendingKyc(),
        userRepository.countByStatus('SUSPENDED'),
        userRepository.countByStatus('BLOCKED'),
      ])

    // Deposits/withdrawals/revenue land in later phases — return zeroed placeholders.
    const summary: AdminDashboardSummary = {
      totalUsers,
      todaysRegistrations,
      activeInvestors,
      pendingKyc,
      pendingDeposits: 0,
      pendingWithdrawals: 0,
      suspendedUsers,
      blockedUsers,
      revenueSummary: { totalRevenue: '0.00', currency: 'USD' },
      investmentSummary: { totalAum: '0.00', currency: 'USD' },
      recentActivities: [],
    }

    const recent = await activityService.list({
      page: 1,
      limit: 10,
      sortOrder: 'desc',
    })
    summary.recentActivities = recent.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      title: item.title,
      at: item.at,
    }))

    await cache.set(cacheKey, summary, 30)
    return summary
  },
}
