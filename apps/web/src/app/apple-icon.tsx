import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#07090B',
          borderRadius: 40,
        }}
      >
        <div
          style={{
            width: 140,
            height: 140,
            borderRadius: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #C4CBD3 0%, #D4D9DF 45%, #F2F4F7 100%)',
            boxShadow: '0 0 40px rgba(212, 217, 223, 0.18)',
            fontSize: 88,
            fontWeight: 700,
            color: '#07090B',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          W
        </div>
      </div>
    ),
    { ...size },
  )
}
