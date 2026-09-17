import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

/** Browser favicon — Wealthora geometric W mark. */
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
          background: 'linear-gradient(135deg, #C4CBD3 0%, #D4D9DF 50%, #F2F4F7 100%)',
          borderRadius: 9,
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: '#07090B',
            fontFamily: 'system-ui, sans-serif',
            lineHeight: 1,
          }}
        >
          W
        </div>
      </div>
    ),
    { ...size },
  )
}
