import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

export const metadata: Metadata = { title: 'Verify email', robots: { index: false } }

/** Legacy “sent” route — OTP lives on `/verify-email`. */
export default async function VerifyEmailSentPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>
}) {
  const params = await searchParams
  const email = params.email
  if (email) {
    redirect(
      `${ROUTES.auth.verifyEmail}?email=${encodeURIComponent(email)}&from=register`,
    )
  }
  redirect(ROUTES.auth.verifyEmail)
}
