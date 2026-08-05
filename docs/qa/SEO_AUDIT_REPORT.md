# Production SEO Audit Report — Growzy

**Date:** 2026-08-05  
**Live target:** https://growzycapital.com  
**Code:** `apps/web` (Next.js App Router metadata API)  
**Mode:** Report only  

---

## Executive verdict

Crawl fundamentals are **in place** (robots, sitemap, canonicals, favicons, manifest, real 404, HTTPS/www redirects). The main SEO gap is **Open Graph / Twitter not updating per page** — child routes keep the homepage `og:title`, `og:url`, and Twitter title. Structured data is **FAQ-only**; there is no Organization/WebSite graph. Auth/app paths are mostly `noindex` in metadata, but **robots.txt omits `/wallet` and `/support`**.

| Area | Status | Severity |
|------|--------|----------|
| Metadata (title/description) | Mostly good; legal pages inherit generic description; home title doubles brand | Medium |
| OpenGraph | Image OK; **page OG title/url stuck on home** | **High** |
| Twitter Cards | `summary_large_image` present; **same home title bleed** | **High** |
| Canonical | Marketing pages correct; trailing-slash → 308 | Good |
| robots.txt | Live + sitemap link; incomplete disallow list | Medium |
| sitemap.xml | 16 public URLs, correct host | Good |
| Structured Data | FAQPage only; FAQ page emits 3 graphs | Medium |
| Favicons | `/icon`, `/apple-icon` 200 | Good |
| Manifest | Live; icons too small for install (32/180) | Low–Medium |
| 404 | True HTTP 404 | Good |
| Redirects | http→https, www→apex, auth 307 | Good |

---

## Checklist

### Metadata

| Check | Result |
|-------|--------|
| Root `metadataBase` | `SITE.url` → `https://growzycapital.com` |
| Default title template | `%s · Growzy` |
| Home title | Live: `Growzy — AI-assisted Forex… · Growzy` — **brand duplicated** via template |
| Marketing pages | Unique `title` + most have unique `description` |
| Legal pages | Title + canonical only; **description falls back to site default** |
| Auth / dashboard / admin | Almost all `robots: { index: false }` |
| Gap | `/settings/emails` has title only — **missing `noindex`** |
| Helper | `buildMetadata()` in `seo.tsx` exists but **marketing pages do not use it** |

### OpenGraph

Live home:

- `og:type` website · `og:site_name` Growzy  
- `og:url` https://growzycapital.com  
- `og:image` https://growzycapital.com/opengraph-image?… (200 PNG, 1200×630 route)  

Live `/about`, `/faq`, `/performance`, `/legal/terms`:

- Document title/description/canonical are page-specific  
- **`og:title` / `og:url` / Twitter title still equal homepage**  

Root cause: pages set `title` / `description` / `alternates.canonical` only; they do **not** set page-level `openGraph` / `twitter`. Next merges root OG and does not remap `title` into `og:title` when root already defines OG fields.

Also: OG image artwork footer text says **`growzy.com`** while production domain is **growzycapital.com** (`opengraph-image.tsx`).

### Twitter Cards

| Check | Result |
|-------|--------|
| Card type | `summary_large_image` (root) |
| Image | Same as OG image URL |
| Per-page title/description | **No** — inherits home |

### Canonical

| URL | Canonical |
|-----|-----------|
| `/` | `https://growzycapital.com` |
| `/faq` | `https://growzycapital.com/faq` |
| `/about` | `https://growzycapital.com/about` |
| `/login` | none (noindex — OK) |
| `/about/` | **308** → `/about` |

Sitemap ↔ canonical host alignment: **pass**.

### robots.txt

```
User-Agent: *
Allow: /
Disallow: /dashboard, /deposit, /withdraw, /trades, /my-performance,
          /transactions, /notifications, /referrals, /settings, /admin, /oauth
Sitemap: https://growzycapital.com/sitemap.xml
```

| Gap | Notes |
|-----|-------|
| `/wallet`, `/support` | Protected by middleware but **not disallowed** |
| `/login`, `/register`, auth flows | Rely on meta `noindex` only (acceptable; disallow optional) |
| `/onboarding`, `/verify-email` | Meta noindex; not in robots |

### sitemap.xml

- **16 URLs**, all marketing + legal  
- Host: `https://growzycapital.com`  
- Priorities / changefreq set  
- `lastmod` = deploy/build time (identical across URLs) — low impact  
- Auth/app routes correctly omitted  

### Structured Data

| Type | Where | Notes |
|------|-------|-------|
| `FAQPage` | Home (`HomeFaq`) | Present |
| `FAQPage` ×3 | `/faq` | One graph per accordion section — should be **one** FAQPage |
| `FAQPage` | `/resources` | Via accordion |
| `Organization` / `WebSite` / `BreadcrumbList` | **Missing** | High-value for brand SERP |
| FinancialProduct / Investment | **Missing** | Optional; compliance-sensitive — only if accurate |

`StructuredData` helper is correct (`application/ld+json`).

### Favicons

| Asset | Live |
|-------|------|
| `/icon` | 200 `image/png` (32×32 generated) |
| `/apple-icon` | 200 `image/png` (180×180) |
| Linked in HTML | `rel=icon`, `rel=apple-touch-icon` |

No classic `/favicon.ico` file in `public/` (Next icon route covers modern browsers).

### Manifest

- `/manifest.webmanifest` 200  
- name / short_name / description / theme / start_url OK  
- Icons: **32×32** and **180×180** only — PWA install typically wants **192** and **512**  

### 404

| Check | Result |
|-------|--------|
| Unknown path | **HTTP 404** (not soft 200) |
| Cache | `private, no-store` |
| UX | Branded not-found with home + sign-in |
| Meta | title only — consider `robots: noindex` |

### Redirects

| Case | Result |
|------|--------|
| `http://` → `https://` | **301** |
| `www.` → apex | **301** |
| Trailing slash marketing | **308** to non-slash |
| `/dashboard`, `/wallet`, `/support` (logged out) | **307** → `/login?next=…` |
| Legacy `/deposit` | **307** → login (then app redirects to wallet when authed) |

No evidence of marketing→marketing permanent redirects beyond slash normalization.

---

## Severity summary

### High

| ID | Issue | Fix |
|----|-------|-----|
| S1 | Child pages inherit homepage OG/Twitter title + `og:url` | Use `buildMetadata()` (or explicit `openGraph`/`twitter`) on every public page with path-specific title, description, url |
| S2 | Same for social shares of `/performance`, `/faq`, etc. | Same as S1 |

### Medium

| ID | Issue | Fix |
|----|-------|-----|
| S3 | No Organization / WebSite JSON-LD | Add root layout structured data (name, url, logo, sameAs) |
| S4 | `/faq` emits 3× FAQPage | Single combined FAQPage |
| S5 | robots.txt missing `/wallet`, `/support` | Add to `disallow` |
| S6 | Legal pages lack unique descriptions | Add page descriptions |
| S7 | Home title `Brand — … · Brand` duplication | Set home `title.absolute` or adjust template usage |
| S8 | `/settings/emails` indexable meta | Add `robots: { index: false }` |
| S9 | OG art shows `growzy.com` | Change to `growzycapital.com` |

### Low

| ID | Issue | Fix |
|----|-------|-----|
| S10 | Manifest icons 32/180 only | Add 192 + 512 PNG icons |
| S11 | 404 without `noindex` | Add robots noindex |
| S12 | Sitemap `lastmod` always now | Optional: stable content dates |
| S13 | `buildMetadata` unused | Adopt for consistency |

---

## What already works

- `metadataBase` + robots index/follow on public pages  
- Canonicals on all major marketing routes  
- Dynamic OG image route (1200×630) served in production  
- Twitter `summary_large_image` wired  
- robots.txt + sitemap.xml live and linked  
- Sitemap limited to public URLs  
- Auth/admin/dashboard mostly `noindex`  
- True 404 responses  
- HTTPS and www canonical host redirects  
- Favicon + apple-touch + web manifest linked from HTML  

---

## Recommended order

1. **S1/S2** — Per-page Open Graph + Twitter via `buildMetadata`  
2. **S9** — Fix OG image domain string  
3. **S3/S4** — Organization/WebSite + single FAQ JSON-LD  
4. **S5/S8** — robots + emails noindex  
5. **S6/S7/S10/S11** — descriptions, title absolute, icons, 404 robots  

---

*Verified against live HTML/headers on 2026-08-05. Report only — no code changes.*
