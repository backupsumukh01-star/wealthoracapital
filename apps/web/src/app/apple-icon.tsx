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
          background: '#07131C',
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
            background: 'linear-gradient(135deg, #5EF2C4 0%, #12D6A0 45%, #2AE8FF 100%)',
            boxShadow: '0 0 40px rgba(18, 214, 160, 0.45)',
            fontSize: 88,
            fontWeight: 700,
            color: '#07131C',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          G
        </div>
      </div>
    ),
    { ...size },
  )
}
