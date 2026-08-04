'use client'

import { Button } from '@/components/ui/button'

import { AuthDivider } from './auth-divider'

export function SocialLoginButtons({
  googleLabel = 'Continue with Google',
  onGoogle,
  showDivider = true,
}: {
  googleLabel?: string
  onGoogle?: () => void
  showDivider?: boolean
}) {
  return (
    <div className="space-y-3">
      <Button
        type="button"
        variant="secondary"
        fullWidth
        size="md"
        onClick={onGoogle}
        aria-label={googleLabel}
      >
        <GoogleMark />
        {googleLabel}
      </Button>

      {showDivider ? <AuthDivider label="OR" /> : null}
    </div>
  )
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden focusable="false">
      <path
        fill="#4285F4"
        d="M23.5 12.27c0-.86-.08-1.69-.22-2.48H12v4.7h6.45a5.5 5.5 0 0 1-2.39 3.62v3h3.86c2.26-2.08 3.56-5.14 3.56-8.84Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.9l-3.87-3a7.2 7.2 0 0 1-10.72-3.77H1.36v3.09A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.34 14.33a7.2 7.2 0 0 1 0-4.6V6.64H1.36a12 12 0 0 0 0 10.78l3.98-3.09Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.43-3.43C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.36 6.64l3.98 3.09A7.2 7.2 0 0 1 12 4.75Z"
      />
    </svg>
  )
}

/** @deprecated Prefer SocialLoginButtons */
export { SocialLoginButtons as OAuthButtons }
