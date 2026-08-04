import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

/** Legacy route — Wallet Center owns withdraw via modal. */
export default function WithdrawRedirectPage() {
  redirect(`${ROUTES.dashboard.wallet}?action=withdraw`)
}
