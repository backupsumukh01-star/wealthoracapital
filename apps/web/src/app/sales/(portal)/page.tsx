import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

export default function SalesIndexPage() {
  redirect(ROUTES.sales.dashboard)
}
