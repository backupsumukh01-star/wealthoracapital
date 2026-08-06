/**
 * Promotes an existing, already-registered account to SUPER_ADMIN.
 *
 * The password is never touched — accounts must be created through the normal
 * registration flow so the bcrypt hash is produced by the app.
 *
 * Usage: node apps/api/scripts/promote-admin.mjs someone@example.com
 */
import { PrismaClient } from '@prisma/client'

const email = (process.argv[2] ?? process.env.ADMIN_EMAIL ?? '').trim().toLowerCase()

if (!email) {
  console.error('Usage: node apps/api/scripts/promote-admin.mjs <email>')
  process.exit(1)
}

const prisma = new PrismaClient()

try {
  const user = await prisma.user.findFirst({ where: { email } })

  if (!user) {
    console.error(`No account found for "${email}".`)
    const recent = await prisma.user.findMany({
      select: { email: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    })
    if (recent.length > 0) {
      console.error('\nMost recent registrations:')
      for (const row of recent) {
        console.error(`  ${row.email}  ${row.role}  ${row.createdAt.toISOString()}`)
      }
    }
    console.error('\nRegister this email on the site first, then re-run.')
    process.exit(1)
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: {
      role: 'SUPER_ADMIN',
      staffRole: 'SUPER_ADMIN',
      status: 'ACTIVE',
      emailVerifiedAt: user.emailVerifiedAt ?? new Date(),
    },
    select: { email: true, role: true, staffRole: true, status: true },
  })

  console.log('Promoted:', updated)
  console.log('Sign in at /admin/login with this account and its existing password.')
} finally {
  await prisma.$disconnect()
}
