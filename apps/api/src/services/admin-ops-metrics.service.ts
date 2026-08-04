import { prisma } from '../database/prisma.js'

export const adminOpsMetricsService = {
  async summary() {
    const [
      openTickets,
      pendingTickets,
      reportsGenerated,
      reportsFailed,
      emailsSent,
      emailsQueued,
      emailsFailed,
      notificationsDelivered,
      cmsPublishes,
      broadcastsSent,
      mediaAssets,
    ] = await Promise.all([
      prisma.supportTicket.count({ where: { status: 'OPEN' } }),
      prisma.supportTicket.count({ where: { status: 'PENDING' } }),
      prisma.reportJob.count({ where: { status: 'COMPLETED' } }),
      prisma.reportJob.count({ where: { status: 'FAILED' } }),
      prisma.emailOutbox.count({ where: { status: 'SENT' } }),
      prisma.emailOutbox.count({ where: { status: 'QUEUED' } }),
      prisma.emailOutbox.count({ where: { status: 'FAILED' } }),
      prisma.notification.count(),
      prisma.cmsRevision.count({ where: { action: 'PUBLISH' } }),
      prisma.broadcast.count({ where: { status: 'SENT' } }),
      prisma.mediaAsset.count({ where: { deletedAt: null } }),
    ])

    const recentPublishes = await prisma.cmsRevision.findMany({
      where: { action: { in: ['PUBLISH', 'ROLLBACK', 'SCHEDULE'] } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })

    return {
      support: { open: openTickets, pending: pendingTickets },
      reports: { generated: reportsGenerated, failed: reportsFailed },
      emails: { sent: emailsSent, queued: emailsQueued, failed: emailsFailed },
      notifications: { delivered: notificationsDelivered },
      cms: {
        publishes: cmsPublishes,
        recent: recentPublishes.map((r) => ({
          id: r.id,
          documentKey: r.documentKey,
          action: r.action,
          version: r.version,
          createdAt: r.createdAt.toISOString(),
        })),
      },
      broadcasts: { sent: broadcastsSent },
      media: { assets: mediaAssets },
    }
  },
}
