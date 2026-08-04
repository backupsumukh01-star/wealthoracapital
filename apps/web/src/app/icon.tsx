import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** Browser favicon — Growzy geometric G mark. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #5EF2C4 0%, #12D6A0 50%, #2AE8FF 100%)',
          borderRadius: 9,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#07131C',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
          }}
        >
          G
        </div>
      </div>
    ),
    { ...size },
  )
}
