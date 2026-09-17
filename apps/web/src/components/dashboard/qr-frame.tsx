'use client'

import { cn } from '@/lib/cn'

/** QR display — shows uploaded image when `src` is set; never fabricates a scannable code. */
export function QrFrame({
  label = 'Scan to pay',
  src,
  className,
}: {
  label?: string
  src?: string | null
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-inset/60 p-4',
        className,
      )}
    >
      <div className="relative grid size-40 place-items-center overflow-hidden rounded-xl bg-white p-3 sm:size-44">
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={label} className="size-full object-contain" />
        ) : (
          <p className="px-3 text-center text-caption text-[#07090B]/70">
            QR image unavailable. Use the deposit address below.
          </p>
        )}
      </div>
      <p className="max-w-[12rem] text-center text-caption text-fg-subtle">{label}</p>
    </div>
  )
}
