import Link from 'next/link'
import { ROUTES } from '@meridian/shared'
import { ArrowLeft, Compass } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Logo } from '@/components/common/logo'

export const metadata = { title: 'Page not found' }

export default function NotFound() {
  return (
    <main className="container-page flex min-h-dvh flex-col items-center justify-center gap-8 py-20 text-center">
      <Logo />

      <div className="space-y-3">
        <p className="text-overline text-accent-300">Error 404</p>
        <h1 className="text-display-md text-fg">This page does not exist</h1>
        <p className="prose-measure text-body-md mx-auto text-fg-muted">
          The link may be out of date, or the page may have moved. Your account and balance are
          unaffected.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href={ROUTES.marketing.home}>
            <ArrowLeft aria-hidden />
            Back to home
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={ROUTES.auth.login}>
            <Compass aria-hidden />
            Login
          </Link>
        </Button>
      </div>
    </main>
  )
}
