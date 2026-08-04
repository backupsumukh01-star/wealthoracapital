# 10 — Design System

The rules that make the product look like one thing built by one team. Defined before any page is
built, so nothing is decided by whoever happened to write the component first.

---

## 1. Principles

1. **Numbers are the hero.** This is a product where people check a figure and close the tab. The
   figure must be the most legible thing on the screen — tabular figures, generous size, high
   contrast, nothing competing with it.
2. **One accent, used rarely.** The accent colour marks the primary action and nothing else. If it
   appears three times on a screen, it means nothing.
3. **Depth from layers, not shadows.** Surfaces stack by lightness. Shadows are for genuinely
   floating elements — menus, dialogs, toasts — not for every card.
4. **Motion clarifies, never decorates.** Animation shows where something came from or that
   something changed. If removing it loses no information, remove it.
5. **Honest about loss.** Losing days are shown with the same weight as winning days. No red that
   is dimmer than the green, no charts that clip the downside.
6. **Space is the luxury signal.** Premium reads as confident spacing and restraint, not as more
   gradients. When in doubt, remove an element and add space.

---

## 2. Colour

Dark-first, because a financial dashboard is looked at for long stretches and dark surfaces make
coloured data legible. A light theme is a first-class citizen, not an afterthought.

### 2.1 Surfaces (dark theme)

Depth comes from five stepped surfaces, not from shadows.

```css
--surface-base:    #0B0E14;   /* page background          — deepest */
--surface-raised:  #11151F;   /* cards, panels            */
--surface-overlay: #171C28;   /* popovers, dropdowns      */
--surface-inset:   #080A0F;   /* inputs, wells, code      — recessed */
--surface-hover:   #1C2230;   /* interactive hover        */
--border-subtle:   #1F2634;
--border-default:  #2A3244;
--border-strong:   #3A4459;
```

### 2.2 Text

```css
--text-primary:   #E8ECF4;    /* headings, figures        */
--text-secondary: #A3ADC2;    /* body                     */
--text-tertiary:  #6B7689;    /* labels, captions         */
--text-disabled:  #454E5F;
--text-inverse:   #0B0E14;    /* on accent fills          */
```

### 2.3 Accent — deep teal

Chosen deliberately over the near-universal fintech blue and the crypto purple. Teal reads as
considered and calm, holds contrast well on a near-black surface, and is distinguishable from the
semantic green used for profit — which matters, because an accent that looks like "gain" would
make every button look like a gain.

```css
--accent-50:  #E6FAF7;
--accent-100: #B8F2E9;
--accent-200: #7FE6D6;
--accent-300: #45D6C0;
--accent-400: #1FBFA8;
--accent-500: #12A28D;   /* primary — buttons, links, active states */
--accent-600: #0D8574;
--accent-700: #0A6A5D;
--accent-800: #085346;
--accent-900: #063E35;
```

### 2.4 Semantic

Profit and loss get their own tokens, separate from success/error, because "your balance went down"
is not the same message as "the form failed".

```css
--profit:     #34D399;   --profit-bg: rgba(52,211,153,0.10);
--loss:       #F87171;   --loss-bg:   rgba(248,113,113,0.10);
--neutral:    #94A3B8;

--success:    #22C55E;   --success-bg: rgba(34,197,94,0.10);
--warning:    #F59E0B;   --warning-bg: rgba(245,158,11,0.10);
--danger:     #EF4444;   --danger-bg:  rgba(239,68,68,0.10);
--info:       #38BDF8;   --info-bg:    rgba(56,189,248,0.10);
```

Status colours map to states consistently across the whole product:

| Status | Token |
|--------|-------|
| `PENDING`, `UNDER_REVIEW` | warning |
| `APPROVED`, `PAID`, `COMPLETED`, `DISTRIBUTED` | success |
| `REJECTED`, `FAILED` | danger |
| `CANCELLED`, `DRAFT` | neutral |
| `REVERSED` | info |

### 2.5 Light theme

The same token names remap; no component ever references a raw hex value, so the theme switch is a
single CSS variable swap. Light surfaces run `#FFFFFF → #F7F9FC → #EEF2F8`, text inverts, and the
accent shifts one step darker (`--accent-600`) to maintain contrast on white.

**Colour-blind safety:** profit and loss are always accompanied by a sign (`+`/`−`) and a direction
arrow. Colour is reinforcement, never the sole carrier of meaning.

---

## 3. Typography

Two families, self-hosted as variable fonts with `font-display: swap` and preloaded.

| Role | Family | Why |
|------|--------|-----|
| Display & UI | **Geist Sans** (fallback: Inter, system-ui) | Neutral, excellent at small sizes, true tabular figures |
| Numeric & mono | **Geist Mono** (fallback: JetBrains Mono) | Prices, references, ledger amounts |

Every numeric display uses `font-variant-numeric: tabular-nums` so digits never shift width — a
count-up animation on proportional figures wobbles, and wobbling money looks unserious.

### Scale (1.250 major third, 16px base)

| Token | Size / line-height | Use |
|-------|-------------------|-----|
| `display-xl` | 72 / 1.05, -0.03em | Hero headline (desktop) |
| `display-lg` | 56 / 1.10, -0.025em | Section headlines |
| `display-md` | 44 / 1.15, -0.02em | Page titles |
| `heading-xl` | 32 / 1.25, -0.015em | Card group titles |
| `heading-lg` | 26 / 1.30 | Card titles |
| `heading-md` | 21 / 1.35 | Sub-headings |
| `heading-sm` | 18 / 1.40 | Table group headers |
| `body-lg` | 18 / 1.65 | Marketing body |
| `body-md` | 16 / 1.60 | Default body |
| `body-sm` | 14 / 1.55 | Table cells, secondary |
| `caption` | 13 / 1.45 | Labels, helper text |
| `overline` | 12 / 1.40, 0.08em, uppercase | Section eyebrows |
| `stat-xl` | 48 / 1.0, tabular | Primary balance |
| `stat-lg` | 36 / 1.0, tabular | Dashboard stat cards |
| `stat-md` | 24 / 1.0, tabular | Inline figures |

Display sizes step down on mobile via `clamp()`; the hero is `clamp(2.5rem, 7vw, 4.5rem)`.

**Measure:** body text is capped at 68 characters. Marketing paragraphs are never full-width.

---

## 4. Spacing, radii, elevation

### Spacing — 4px base

```
0.5→2px  1→4px  2→8px  3→12px  4→16px  5→20px  6→24px  8→32px
10→40px  12→48px  16→64px  20→80px  24→96px  32→128px  40→160px
```

Rhythm rules, applied consistently:

| Context | Value |
|---------|-------|
| Marketing section padding (desktop) | `py-32` (128px) |
| Marketing section padding (mobile) | `py-20` (80px) |
| Dashboard page padding | `p-8` desktop, `p-4` mobile |
| Card padding | `p-6` |
| Between related elements | `gap-3` |
| Between element groups | `gap-6` |
| Between page sections | `gap-12` |
| Content max width | 1440px, marketing prose 720px |

### Radii

```
sm 6px  ·  md 10px  ·  lg 14px  ·  xl 20px  ·  2xl 28px  ·  full 9999px
```

Inputs and buttons `md`. Cards `lg`. Modals and marketing feature panels `xl`. Pills `full`.

### Elevation

```css
--elev-1: 0 1px 2px rgba(0,0,0,.24);                              /* resting card  */
--elev-2: 0 4px 12px rgba(0,0,0,.28);                             /* hovered card  */
--elev-3: 0 12px 32px rgba(0,0,0,.36);                            /* dropdown      */
--elev-4: 0 24px 64px rgba(0,0,0,.48);                            /* modal         */
--glow-accent: 0 0 0 1px rgba(18,162,141,.35), 0 8px 32px rgba(18,162,141,.18);
```

`--glow-accent` is reserved for the primary CTA and for a value that has just changed. Nothing else.

---

## 5. Motion

### Tokens

```css
--dur-instant: 100ms;   --dur-fast: 160ms;    --dur-normal: 240ms;
--dur-slow:    360ms;   --dur-slower: 560ms;

--ease-out:    cubic-bezier(0.16, 1, 0.3, 1);      /* default — entering  */
--ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);     /* moving              */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);  /* playful, used rarely */
```

### The motion language

| Interaction | Spec |
|-------------|------|
| Button press | `scale 0.98`, 100ms |
| Card hover | `translateY(-2px)` + elevation 1→2, 160ms ease-out |
| Scroll reveal | `opacity 0→1`, `translateY(24px→0)`, 560ms ease-out, triggers at 15% visible, **once** |
| Stagger | 60ms between siblings, capped at 8 items then simultaneous |
| Page transition | Fade + 8px rise, 240ms |
| Modal | Overlay fade 160ms; panel `scale 0.96→1` + fade, 240ms ease-out |
| Drawer | Slide from edge, 280ms ease-out |
| Accordion | Height auto-animate, 240ms ease-in-out |
| Toast | Slide in from bottom-right + fade, 240ms spring |
| Number count-up | 1200ms ease-out, tabular figures, only on first view |
| Chart draw | Path `stroke-dashoffset` over 1400ms ease-out |
| Skeleton | Shimmer sweep, 1600ms linear, infinite |
| Value change | Brief accent glow + colour flash on the changed figure, 800ms |

### Hard rules

- **Nothing animates for longer than 600ms** except deliberate showpieces (count-up, chart draw).
- **Nothing blocks content.** Text is readable before its animation finishes; reveals animate
  opacity and transform only, never layout.
- **`prefers-reduced-motion: reduce` disables everything.** Reveals resolve instantly to their final
  state, count-ups jump to the final number, carousels stop auto-advancing. Implemented once in
  `motion-config.tsx` and inherited by every wrapper, so it cannot be forgotten per-component.
- **Animate `transform` and `opacity` only.** Never `width`, `height`, `top` or `left`.
- **`will-change` is applied on interaction, then removed.** Never left on permanently.

---

## 6. Component inventory

### Primitives — `components/ui`

Each ships with every state (default, hover, focus-visible, active, disabled, loading, error) and
full keyboard support.

`Button` (variants: primary, secondary, ghost, danger, link × sizes sm/md/lg, with `loading` and
`icon` props) · `Input` · `Textarea` · `Select` · `Combobox` · `Checkbox` · `RadioGroup` · `Switch`
· `Label` · `FormField` (label + control + hint + error, wired to RHF) · `Card` · `Badge` ·
`Avatar` · `Dialog` · `Sheet` · `Popover` · `Tooltip` · `DropdownMenu` · `Tabs` · `Accordion` ·
`Table` · `Pagination` · `Skeleton` · `Spinner` · `Toast` · `Alert` · `Progress` · `Separator` ·
`DatePicker` · `DateRangePicker` · `FileDropzone` · `EmptyState` · `CopyButton`

### Domain components — `components/common`

| Component | Contract |
|-----------|----------|
| `<Money value="1250.75" />` | Never takes a `number`. Formats with `Intl.NumberFormat`, tabular figures, optional sign colouring, optional compact mode (`$1.2M`) |
| `<Percent value="0.70" />` | 2dp default, sign-aware colouring, optional arrow |
| `<DateTime value={iso} />` | Renders in the user's timezone, `title` shows the absolute UTC value, optional relative mode |
| `<StatusBadge status="APPROVED" />` | Maps any status enum to its semantic token |
| `<DataTable />` | Sorting, pagination, row expansion, sticky header, mobile card collapse, empty and loading states built in |
| `<StatCard />` | Label, value, delta with direction, sparkline, tooltip |
| `<EquityChart />` | Recharts line/area, range toggle, accessible table alternative |

`<Money>` refusing a `number` prop is a TypeScript-level guard against the single most dangerous
bug class in the product.

### Motion wrappers — `components/motion`

`FadeIn` · `RevealOnScroll` · `StaggerGroup` · `CountUp` · `Marquee` · `Magnetic` ·
`PageTransition` · `MotionConfig`

---

## 7. Iconography & imagery

- **Icons:** Lucide, 1.5px stroke, sized 16/20/24. Decorative icons are `aria-hidden`.
- **Illustrations:** original SVGs only, built from the token palette. No stock illustration packs,
  no traced or adapted artwork from other products.
- **Photography:** real team photos where possible. If stock is used it must be licensed, credited
  in an internal register, and colour-graded to the palette so it does not look bought.
- **Charts:** Recharts with our tokens. Grid lines at 8% opacity; the data line is the only
  saturated element; no drop shadows on data.
- **The hero visual** is an original animated equity curve: an SVG path that draws itself, with a
  gradient fill fading to transparent, floating trade markers, and a subtle parallax on pointer
  move. It is generated from our own data shape, not an imported illustration.

---

## 8. Content & tone

| Do | Don't |
|----|-------|
| "Your balance grew by $8.75 today." | "Congratulations! 🎉 Huge gains!" |
| "Today's result: −0.32%" | "A small setback" |
| "Verify your email to continue." | "Error: unverified" |
| "Usually reviewed within 2 hours." | "Please wait." |
| "$1,250.75" | "1250.75 USD" |
| "This link has expired. Send a new one?" | "Invalid token" |

Rules: sentence case everywhere except the wordmark; never blame the user; every error names the
next action; every waiting state gives an expectation; no exclamation marks in transactional copy;
never imply guaranteed returns anywhere in the product, marketing included.

---

## 9. Originality guarantee

The brief calls for FundedNext-level quality without copying. Concretely, this is how that is
enforced:

**What we studied and adopted as principles:** generous section spacing, restrained motion, a
numbers-first hierarchy, a single accent colour, and dark surfaces with layered depth. These are
craft standards, not property.

**What is entirely ours:** the teal accent ramp, the five-surface depth model, the type scale and
pairing, the spacing rhythm, the motion token set and timing language, every component's structure
and API, the landing page's section layouts, the hero equity-curve visual, all illustrations, all
copy, and the brand mark.

**What is prohibited, without exception:** copying markup or CSS from any live site; using another
product's colour values, assets, illustrations or icons; reproducing a section layout
screenshot-for-screenshot; adapting another product's copy; using their brand assets anywhere,
including in comparison content.

**Verification, at the Phase 4 exit gate:** a side-by-side review against the reference products
confirming no section is a visual match, a check that every asset in `public/` is original or
properly licensed with the licence recorded, and confirmation that all tokens trace back to this
document rather than to a sampled screenshot.
