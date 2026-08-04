import Link from 'next/link'
import { ROUTES } from '@meridian/shared'

import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'

/**
 * Shown while the account still has something outstanding — an unverified email or an
 * incomplete profile — that will block a deposit or a payout later.
 *
 * It appears above the page content and states the consequence, because "verify your email"
 * without "or you cannot withdraw" gets ignored.
 */
export function KycBanner() {
  return (
    <Alert
      tone="warning"
      title="Confirm your email address"
      action={
        <Button asChild size="sm" variant="secondary">
          <Link href={ROUTES.auth.verifyEmailSent}>Resend the link</Link>
        </Button>
      }
    >
      Deposits and withdrawals stay locked until your address is confirmed. It takes a minute and
      only has to be done once.
    </Alert>
  )
}
