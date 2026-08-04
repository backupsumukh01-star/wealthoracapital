'use client'

import { BadgeCheck, Star } from 'lucide-react'

import { Section } from '@/components/common/section'
import { RevealOnScroll } from '@/components/motion/reveal-on-scroll'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { TESTIMONIALS, type ReviewPlatform } from '@/lib/landing-data'
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion'
import { initialsOf } from '@/lib/format'
import { cn } from '@/lib/cn'
import { useAdminOs } from '@/providers/admin-os-provider'

const PLATFORM_TONE: Record<ReviewPlatform, 'profit' | 'info' | 'accent' | 'warning'> = {
  Trustpilot: 'profit',
  Google: 'info',
  Facebook: 'accent',
  Reddit: 'warning',
}

/** Compact country markers for Trustpilot-style cards (presentation labels). */
const FLAGS: Record<string, string> = {
  'United Kingdom': '🇬🇧',
  India: '🇮🇳',
  UAE: '🇦🇪',
  Singapore: '🇸🇬',
  Germany: '🇩🇪',
  Canada: '🇨🇦',
  Japan: '🇯🇵',
  Australia: '🇦🇺',
  Spain: '🇪🇸',
  Pakistan: '🇵🇰',
  Nigeria: '🇳🇬',
  Portugal: '🇵🇹',
}

const TONE_CLASS = {
  default: 'panel-luxury',
  glow: 'panel-gradient-accent shadow-glow-soft',
  emerald: 'border border-hl-emerald/25 bg-gradient-to-br from-hl-emerald/10 to-raised',
  cyan: 'border border-hl-cyan/25 bg-gradient-to-br from-hl-cyan/10 to-raised',
  blue: 'border border-hl-blue/25 bg-gradient-to-br from-hl-blue/10 to-raised',
  violet: 'border border-hl-violet/25 bg-gradient-to-br from-hl-violet/10 to-raised',
  amber: 'border border-hl-amber/25 bg-gradient-to-br from-hl-amber/10 to-raised',
} as const

const SIZE_CLASS = {
  sm: 'min-h-[200px]',
  md: 'min-h-[240px]',
  lg: 'min-h-[280px]',
} as const

type WallItem = {
  name: string
  country: string
  quote: string
  rating: number
  platform: ReviewPlatform
  date: string
  photoUrl?: string
  size: keyof typeof SIZE_CLASS
  tone: keyof typeof TONE_CLASS
}

function TestimonialCard({ item }: { item: WallItem }) {
  const [first, ...rest] = item.name.split(' ')
  const last = rest.join(' ')

  return (
    <figure
      className={cn(
        'mb-3 break-inside-avoid rounded-2xl p-4 transition-transform duration-[160ms] hover:-translate-y-1 sm:mb-4 sm:p-5',
        TONE_CLASS[item.tone],
        SIZE_CLASS[item.size],
        'flex flex-col',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <Avatar size="sm">
            {item.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.photoUrl} alt="" className="size-full object-cover" />
            ) : (
              <AvatarFallback>{initialsOf(first, last)}</AvatarFallback>
            )}
          </Avatar>
          <div className="min-w-0">
            <p className="truncate text-body-sm font-medium text-fg">{item.name}</p>
            <p className="truncate text-caption text-fg-subtle">
              <span aria-hidden>{FLAGS[item.country] ?? '🌍'} </span>
              {item.country}
            </p>
          </div>
        </div>
        <Badge tone={PLATFORM_TONE[item.platform]} size="sm" className="shrink-0">
          {item.platform}
        </Badge>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex gap-0.5" aria-label={`${item.rating} out of 5`}>
          {Array.from({ length: item.rating }).map((_, i) => (
            <Star key={i} className="size-3.5 fill-current text-hl-amber" aria-hidden />
          ))}
        </div>
        <span className="inline-flex items-center gap-1 text-[11px] text-hl-emerald">
          <BadgeCheck className="size-3.5" aria-hidden />
          Verified investor
        </span>
      </div>

      <blockquote className="mt-3 flex-1 text-body-sm text-fg-muted">“{item.quote}”</blockquote>
      <p className="mt-3 text-caption text-fg-subtle">{item.date}</p>
    </figure>
  )
}

/** Auto-scrolling masonry testimonial wall — CMS-enabled entries preferred. */
export function Testimonials() {
  const prefersReducedMotion = usePrefersReducedMotion()
  const { ready, state } = useAdminOs()

  const source: WallItem[] =
    ready && state.testimonials.some((t) => t.enabled)
      ? state.testimonials
          .filter((t) => t.enabled)
          .map((t, i) => ({
            name: t.name,
            country: t.country,
            quote: t.quote,
            rating: t.rating,
            platform: (t.platform as ReviewPlatform) || 'Trustpilot',
            date: t.publishedAt?.slice(0, 10) || 'Published',
            photoUrl: t.photoUrl,
            size: (['md', 'lg', 'sm'] as const)[i % 3] ?? 'md',
            tone: (['glow', 'emerald', 'cyan', 'violet', 'amber', 'default'] as const)[i % 6] ?? 'default',
          }))
      : TESTIMONIALS.map((t) => ({
          name: t.name,
          country: t.country,
          quote: t.quote,
          rating: t.rating,
          platform: t.platform,
          date: t.date,
          photoUrl: undefined,
          size: t.size,
          tone: t.tone,
        }))

  const wall = [...source, ...source]

  return (
    <Section
      id="stories"
      eyebrow="Investor voices"
      title="Trusted by people who check the ledger"
      description="Attributed quotes from funded accounts. Past results do not guarantee future performance."
      centered
    >
      <div
        className={cn(
          'relative mx-auto w-full max-w-5xl overflow-hidden rounded-2xl border border-line/60',
          'h-[28rem] sm:h-[34rem] lg:h-[38rem]',
        )}
        style={{
          maskImage:
            'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
          WebkitMaskImage:
            'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
        }}
      >
        <div
          className={cn(
            'columns-1 gap-0 px-3 pt-3 sm:columns-2 sm:px-4 lg:columns-3',
            !prefersReducedMotion &&
              'animate-masonry-up hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] active:[animation-play-state:paused]',
          )}
          onTouchStart={(e) => {
            if (prefersReducedMotion) return
            ;(e.currentTarget as HTMLElement).style.animationPlayState = 'paused'
          }}
          onTouchEnd={(e) => {
            if (prefersReducedMotion) return
            ;(e.currentTarget as HTMLElement).style.animationPlayState = ''
          }}
        >
          {wall.map((item, i) => (
            <TestimonialCard key={`${item.name}-${i}`} item={item} />
          ))}
        </div>
      </div>

      <ul className="sr-only">
        {source.map((item) => (
          <li key={item.name}>
            {item.name} ({item.country}): {item.quote}
          </li>
        ))}
      </ul>

      <RevealOnScroll className="mt-8 text-center sm:mt-10">
        <p className="text-caption text-fg-subtle">
          Quotes used with consent for marketing. Individual results vary.
        </p>
      </RevealOnScroll>
    </Section>
  )
}
