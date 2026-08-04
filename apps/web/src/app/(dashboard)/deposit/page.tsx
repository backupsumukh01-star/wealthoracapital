import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

/** Legacy route — Wallet Center owns deposit via modal. */
export default function DepositRedirectPage() {
  redirect(`${ROUTES.dashboard.wallet}?action=deposit`)
}
