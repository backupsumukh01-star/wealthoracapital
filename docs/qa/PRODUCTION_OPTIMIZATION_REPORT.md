# Production Optimization Report — Growzy Web

**Date:** 2026-08-05  
**Target:** `apps/web` (Next.js 15.5 / App Router) + live `https://growzycapital.com`  
**Method:** Local production compile + route chunk inventory + live Cache-Control probes + Lighthouse mobile (Perf category)  

---

## Executive verdict

**Lighthouse Performance: 47 / 100 (mobile).**  
Core problems are **main-thread JS cost** (TBT **1.3s**, LCP **6.2s**), not network weight (total transfer **~525 KiB**). Marketing already code-splits below-fold sections; the shared root `Providers` tree still hydrates **investor + admin client OS stores** and a **LogoIntro** splash on every public page.

| Area | Status | Severity |
|------|--------|----------|
| Bundle size (route JS, raw) | Marketing home ~905 KB · Dashboard ~1.3 MB | High |
| Unused JS on marketing | Root providers ship investor/admin client state machines | High |
| Unused CSS | Tailwind-purged; global CSS still ~174 KB | Medium |
| Lazy loading / dynamic imports | Home below-fold OK; charts/modals mostly eager | High |
| Images | Almost no `next/image`; CMS/avatar use raw `<img>` | Medium |
| Fonts | `next/font` Geist + `display: swap` | Good |
| Caching | Hashed `_next/static` immutable 1y; `/public` `max-age=0` | Medium |
| Code splitting | Route-level OK; shared layout too heavy | High |
| Lighthouse / CWV | Perf 47 · LCP fail · INP/TBT risk · CLS OK | High |

---

## Checklist

| Check | Finding |
|-------|---------|
| **Bundle size** | Home listed chunks **~905 KB** raw JS; dashboard **~1.3 MB** (incl. **~367 KB recharts**); admin **~1.0 MB**. Site-wide compiled chunks ~**3.6 MB** raw (not all loaded per page). |
| **Unused JS** | Marketing visitors pay for `InvestorLifecycleProvider` + `AdminOsProvider` via root `Providers`. `geist` npm package unused (`next/font/google` only). |
| **Unused CSS** | Primary CSS **~174 KB** (+ ~4 KB). Lighthouse unused-CSS empty (coverage limited); still large for utility CSS + custom layers in `globals.css`. |
| **Lazy loading** | Home: 6× `next/dynamic` below-fold. Dashboard charts (`recharts`) **not** dynamic. Modals/sheets mostly static imports. |
| **Images** | Brand = SVG. Zero `next/image` usage. Raw `<img>` in testimonials / KYC / media admin. `images.formats` avif/webp configured but unused. |
| **Fonts** | Geist + Geist Mono via `next/font`, latin subset, `display: 'swap'`. CSP still allows Google Fonts CDNs though self-hosted. |
| **Caching** | `/_next/static/*`: `public, max-age=31536000, immutable`. HTML: `s-maxage=31536000`, `x-nextjs-cache: HIT`. `/brand/*.svg`: `max-age=0`. Cloudflare `cf-cache-status: DYNAMIC` on assets (origin still sets long TTL). |
| **Code splitting** | App Router per-route chunks present (108 routes in manifest). Shared client graph dominates first load. |
| **Dynamic imports** | Concentrated on marketing home only (`page.tsx`). |
| **Lighthouse** | Mobile Perf **47**. (Chrome launcher EPERM on temp cleanup; metrics still emitted.) |
| **Core Web Vitals** | See table below. |

---

## Lighthouse & Core Web Vitals (mobile, production home)

| Metric | Value | Assessment |
|--------|------:|------------|
| Performance score | **47** | Fail |
| FCP | 2.0 s | OK-ish |
| LCP | **6.2 s** | Fail (text hero copy; delayed by JS/main thread) |
| TBT | **1,290 ms** | Fail (INP risk) |
| CLS | 0.089 | Pass / borderline Good |
| Speed Index | 4.5 s | Weak |
| TTI | 6.9 s | Weak |
| TTFB (doc) | ~360 ms | Acceptable |
| Total byte weight | 525 KiB | Good |
| Main-thread work | **8.9 s** | Critical |
| JS bootup | **2.6 s** | Critical |
| DOM size | 2,362 nodes | Heavy |
| Max potential FID | 770 ms | Poor |

**LCP element:** hero supporting paragraph (`p.prose-measure`), not an image — LCP is gated by **hydration / script evaluation**, not image decode.

**Hottest scripts (bootup):**
- `6331-*.js` ~1.9 s total (~1.5 s scripting)
- `8047-*.js` ~1.3 s
- `de2574b6-*.js` ~1.3 s

---

## Bundle inventory (local `next build` compile)

Compile **succeeded**; full `next build` then **failed ESLint** (restricted-imports / `any` in mocks) — sizes below are from the successful webpack emit.

| Route | Approx raw JS (listed chunks) |
|-------|------------------------------:|
| `/(marketing)/page` | 905 KB |
| `/(marketing)/about` | 753 KB |
| `/(auth)/login` | 728 KB |
| `/(admin)/admin` | 1,045 KB |
| `/(dashboard)/dashboard` | 1,332 KB |
| `/(dashboard)/my-performance` | 1,160 KB |

| Chunk (local) | ~Size | Likely contents |
|---------------|------:|-----------------|
| `5014-*.js` | 367 KB | **recharts** (+ decimal) — dashboard/admin chart routes |
| `framework-*.js` | 185 KB | React / Next framework |
| `6331-*.js` | 170 KB | Shared app client (high main-thread cost on prod) |
| `de2574b6-*.js` | 169 KB | Shared vendor |
| `8047-*.js` | 121 KB | Shared vendor (high scripting cost) |
| CSS `f8f194*.css` | 174 KB | Global Tailwind + design system |

`experimental.optimizePackageImports` already set for `lucide-react`, `recharts`, `framer-motion`.

---

## Findings by severity

### High

| ID | Issue | Impact | Recommended fix |
|----|-------|--------|-----------------|
| P1 | Root `Providers` wraps **all** pages with `InvestorLifecycleProvider` + `AdminOsProvider` | Marketing pays for dashboard/admin client OS | Scope providers to `(dashboard)` / `(admin)` layouts only |
| P2 | `LogoIntro` (framer splash, body scroll lock ~1.2s) on every first session | Inflates LCP/TBT on home | Defer via `dynamic(..., { ssr: false })`, shorten, or marketing-only opt-in |
| P3 | `recharts` ~367 KB on dashboard/overview routes without `next/dynamic` | Slow dashboard INP / TTI | Dynamic-import chart components; keep SSR shell |
| P4 | Framer Motion imported across marketing/dashboard shells | Shared animation cost on first paint | Prefer CSS for chrome; dynamic heavy motion sections |
| P5 | Lighthouse Perf 47 / LCP 6.2s / TBT 1.3s | Fails CWV targets | Address P1–P4 first; re-measure |

### Medium

| ID | Issue | Recommended fix |
|----|-------|-----------------|
| P6 | Global CSS ~174 KB | Audit custom CSS in `globals.css`; drop unused utilities/layers |
| P7 | Public `/brand/*.svg` `Cache-Control: max-age=0` | Add long-cache headers for `/brand/:path*` (hashed or versioned) |
| P8 | Raw `<img>` for CMS photos / previews | Prefer `next/image` where remotePatterns allow |
| P9 | Unused `geist` dependency | Remove from `package.json` |
| P10 | CSP allows `fonts.googleapis.com` / `fonts.gstatic.com` unused | Tighten CSP to `'self'` for fonts |
| P11 | Dynamic imports only on home | Extend to trading-system sections, calculators, admin workspaces |
| P12 | `productionBrowserSourceMaps: false` | Keep off in prod; enable temporarily for deeper unused-JS attribution |

### Low

| ID | Issue | Notes |
|----|-------|-------|
| P13 | Legacy JS ~11 KiB savings | Minor polyfill trim |
| P14 | Legal routes already lean (~343–413 KB) | Good baseline for “content-only” pages |
| P15 | React Query Devtools not in bundle | Good |
| P16 | `output: 'standalone'` + tracing root | Deploy-friendly; keep |

---

## What already works

- Route-based code splitting (App Router)
- Home below-fold `next/dynamic` with placeholders
- `optimizePackageImports` for icon/chart/motion barrels
- `next/font` self-host + `display: swap`
- Hashed static assets: **1-year immutable** cache
- HTML CDN/prerender cache (`x-nextjs-cache: HIT`)
- AVIF/WebP configured in `next.config`
- No React Query Devtools in production tree
- Security headers + HSTS on production responses

---

## Priority roadmap (suggested)

1. **P1** — Split providers by route group (largest unused-JS win on marketing).  
2. **P2** — Remove or defer LogoIntro from critical path.  
3. **P3** — Dynamic-import all `recharts` surfaces.  
4. Re-run Lighthouse mobile on `/` and `/dashboard`.  
5. **P6–P10** — CSS trim, public asset cache, `next/image`, drop unused `geist`, tighten font CSP.  
6. Fix ESLint errors blocking `next build` completion (separate hygiene; blocks CI/analyzer automation).

---

## Method notes

- Local build: webpack compile OK; ESLint failed afterward (`no-restricted-imports` into `features/*`, `any` in mocks). Chunk sizes still valid from emit.  
- Lighthouse: mobile emulation against production; chrome-launcher hit EPERM cleaning temp dirs on this host, but report JSON was written under `docs/qa/.lh-tmp/lh.json`.  
- “Unused JS/CSS” Lighthouse audits returned empty item lists; attribution comes from route manifests + provider graph instead.

---

*Report only — no production code changes in this pass.*
