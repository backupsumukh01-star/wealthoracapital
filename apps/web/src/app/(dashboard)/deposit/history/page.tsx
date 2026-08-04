import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

export default function DepositHistoryRedirectPage() {
  redirect(ROUTES.dashboard.wallet)
}
