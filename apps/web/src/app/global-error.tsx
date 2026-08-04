'use client'

/**
 * Catches failures in the root layout itself, which is why it must render its own `<html>` and
 * cannot use any provider, font variable, or design token.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: '100dvh',
          display: 'grid',
          placeItems: 'center',
          margin: 0,
          padding: '2rem',
          backgroundColor: '#07131C',
          color: '#ffffff',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '32rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.75rem' }}>
            The application failed to start
          </h1>
          <p style={{ color: '#9aa4b5', lineHeight: 1.6, marginBottom: '1.5rem' }}>
            This is a fault on our side, not with your account. Reload the page to try again.
          </p>
          {error.digest ? (
            <p style={{ color: '#6b7488', fontSize: '0.8125rem', marginBottom: '1.5rem' }}>
              Reference: {error.digest}
            </p>
          ) : null}
          <button
            onClick={reset}
            style={{
              backgroundColor: '#12D6A0',
              color: '#07131C',
              border: 0,
              borderRadius: '10px',
              padding: '0.75rem 1.5rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  )
}
