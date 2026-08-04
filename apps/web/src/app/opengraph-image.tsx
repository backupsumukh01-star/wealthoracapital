import { ImageResponse } from 'next/og'

import { SITE } from '@/lib/constants'

export const alt = `${SITE.name} — ${SITE.tagline}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

/** Default Open Graph / social share image. */
export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: 'linear-gradient(145deg, #07131C 0%, #0C1C28 55%, #0A2420 100%)',
          color: '#F4F8FB',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #5EF2C4 0%, #12D6A0 45%, #2AE8FF 100%)',
              color: '#07131C',
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            G
          </div>
          <div style={{ fontSize: 40, fontWeight: 650, letterSpacing: '-0.02em' }}>
            {SITE.wordmark.primary}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, maxWidth: 920 }}>
          <div
            style={{
              fontSize: 56,
              fontWeight: 650,
              lineHeight: 1.15,
              letterSpacing: '-0.03em',
            }}
          >
            {SITE.tagline}
          </div>
          <div style={{ fontSize: 24, color: '#9AA4B5', lineHeight: 1.45 }}>
            Published trades. Operator-verified daily returns. Withdraw when you want.
          </div>
        </div>

        <div style={{ display: 'flex', color: '#5EF2C4', fontSize: 20, fontWeight: 600 }}>
          growzy.com
        </div>
      </div>
    ),
    { ...size },
  )
}
