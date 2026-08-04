import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

export default function WithdrawHistoryRedirectPage() {
  redirect(ROUTES.dashboard.wallet)
}
