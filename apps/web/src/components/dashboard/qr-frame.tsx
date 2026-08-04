'use client'

import { cn } from '@/lib/cn'

/** Decorative QR placeholder — not a real encoded payload. */
export function QrFrame({
  label = 'Scan to pay',
  className,
}: {
  label?: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-inset/60 p-4',
        className,
      )}
    >
      <div
        className="relative grid size-40 place-items-center overflow-hidden rounded-xl bg-white p-3 sm:size-44"
        aria-hidden
      >
        <svg viewBox="0 0 100 100" className="size-full text-[#07131C]">
          <rect x="8" y="8" width="28" height="28" rx="3" fill="currentColor" />
          <rect x="14" y="14" width="16" height="16" rx="2" fill="#fff" />
          <rect x="18" y="18" width="8" height="8" fill="currentColor" />
          <rect x="64" y="8" width="28" height="28" rx="3" fill="currentColor" />
          <rect x="70" y="14" width="16" height="16" rx="2" fill="#fff" />
          <rect x="74" y="18" width="8" height="8" fill="currentColor" />
          <rect x="8" y="64" width="28" height="28" rx="3" fill="currentColor" />
          <rect x="14" y="70" width="16" height="16" rx="2" fill="#fff" />
          <rect x="18" y="74" width="8" height="8" fill="currentColor" />
          {[40, 48, 56].map((x) =>
            [8, 16, 24, 40, 48, 56, 72, 80].map((y) => (
              <rect
                key={`${x}-${y}`}
                x={x}
                y={y}
                width="6"
                height="6"
                fill="currentColor"
                opacity={(x + y) % 16 === 0 ? 0.35 : 1}
              />
            )),
          )}
          <rect x="40" y="40" width="20" height="20" rx="2" fill="currentColor" />
          <rect x="45" y="45" width="10" height="10" fill="#12D6A0" />
        </svg>
      </div>
      <p className="text-center text-caption text-fg-subtle">{label}</p>
    </div>
  )
}
