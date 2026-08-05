# Mobile UX Audit Report — Growzy

**Date:** 2026-08-05  
**Devices:** iPhone (notch / Dynamic Island), Android, Tablet  
**Surfaces:** Marketing, Investor dashboard, Admin console  
**Mode:** Full audit; **High severity fixed** in this pass  

---

## Executive verdict

Investor shell (fixed topbar + bottom nav + overflow clipping) is largely solid. High-severity breakage concentrated on **iOS input zoom**, **Select stacking under chrome**, **safe-area gaps** (marketing drawer, admin topbar, sheet/dialog close, wallet/auth modals), and a **24px account menu** hit target.

| Severity | Count | Action |
|----------|------:|--------|
| High | 7 | **Fixed** |
| Medium | ~9 | Report only |
| Low | ~4 | Report only |

---

## Checklist by area

| Area | iPhone | Android | Tablet | Notes |
|------|:------:|:-------:|:------:|-------|
| Overflow / horizontal scroll | ✅ | ✅ | ✅ | `overflow-x: clip` + shell `overflow-x-clip` |
| Header | ✅* | ✅* | ✅ | *Admin safe-area fixed |
| Drawer | ✅* | ✅* | ✅ | *Marketing drawer safe-area fixed |
| Forms | ✅* | ✅ | ✅ | *16px inputs — no iOS zoom |
| Keyboard | ⚠️ | ⚠️ | ✅ | Medium: CTAs not sticky above keyboard |
| Bottom sheets | ✅ | ✅ | ✅ | Sheet bottom + safe-bottom |
| Dropdowns | ✅* | ✅* | ✅ | *Select z-[300] aligned with dropdown |
| Charts | ✅ | ✅ | ✅ | `min-w-0` / overflow hidden |
| Tables | ⚠️ | ⚠️ | ✅ | Medium: table-only sideways scroll |
| Buttons | ✅ | ✅ | ✅ | Default ≥52px; nav cells 64px |
| Touch targets | ✅* | ✅* | ✅ | *UserMenu / sheet close enlarged |
| Safe areas | ✅* | ✅* | ✅ | *High gaps closed |

---

## High severity (fixed)

| ID | Issue | Fix |
|----|-------|-----|
| H1 | Form controls `text-sm` (14px) → iOS focus zoom | `text-base` (16px) on Input, Textarea, SelectTrigger, DatePicker |
| H2 | Marketing drawer under notch | `pt-[env(safe-area-inset-top)]` + larger close |
| H3 | Admin fixed topbar / spacer ignore safe-area | Match investor: height + `pt` + spacer calc |
| H4 | Sheet/Dialog close under status bar; 32px hit | `top-[max(1rem,env(safe-area-inset-top))]` + `size-10` |
| H5 | Wallet/auth modals `p-0` wipe safe padding | Restore safe-area top/bottom on shells |
| H6 | Select `z-50` under topbar/dialog | Portal content `z-[300]` + collisionPadding |
| H7 | Account avatar ~24px tap target | Trigger `min-h-10 min-w-10` |

---

## Medium (not fixed)

- Topbar icon buttons `size-10` (40px) vs 44px HIG  
- Notification “Mark all” `h-9`  
- Wallet/auth submit not sticky above virtual keyboard  
- Admin wide tables (`min-w-[560–1100px]`) — horizontal scroll inside panel only  
- Admin ad-hoc `h-8` / `text-caption` inputs  
- Dialog `100vw` width smell (clipped by body overflow)  
- Settings sticky offset omits safe-area on large screens  
- Popover `z-[200]` without collision padding  

## Low (not fixed)

- `DropdownMenuSubContent` no portal (unused)  
- Intentional marketing carousels  
- Short tab labels  
- Live activity toast fixed width  

---

## What already worked

- Global `overflow-x: clip`, `viewport-fit=cover`  
- Investor fixed topbar + spacer + bottom nav safe-area  
- Sheet side panels had safe-area padding (close position was the gap)  
- Dropdown menu already `z-[300]` + collisionPadding  
- DataTable card layout below `md`  
- Charts constrained; OTP already 16px+  

---

## Device notes

| Device | Primary risks addressed |
|--------|-------------------------|
| **iPhone** | Zoom (H1), notch/home indicator (H2–H5), avatar tap (H7), Select under chrome (H6) |
| **Android** | Same safe-area/stacking; zoom less common but 16px still good |
| **Tablet** | Admin topbar safe-area; Select stacking; forms readable |

---

*High fixes landed in shared UI primitives + marketing drawer + admin chrome + wallet/auth shells. Medium/Low deferred.*
