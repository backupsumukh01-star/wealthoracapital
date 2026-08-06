import { redirect } from 'next/navigation'
import { ROUTES } from '@meridian/shared'

/** Email preview was removed from the investor dashboard; prefer Preferences. */
export default function EmailPreviewRedirectPage() {
  redirect(ROUTES.dashboard.settings.preferences)
}
