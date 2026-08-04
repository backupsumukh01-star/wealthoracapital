# Growzy — Frontend Handoff

**Status:** Frontend + Admin + CMS **complete**  
**This refactor:** Architecture only — **no UI redesign, no new pages/features**

---

## 1. What the backend team gets

- Stable App Router IA and visual system  
- Typed services ready to hit `API_ROUTES`  
- Shared DTOs / enums / error codes in `@meridian/shared`  
- Central config (brand, cookies, flags, permissions, limits)  
- Route guards prepared (Guest / Investor / Admin / Staff / Permission)  
- Mock fixtures consolidated under `@/mocks`  
- Docs: structure, data flow, API integration, DB requirements, state guide  

---

## 2. Demo credentials (disable before production)

| Realm | Email | Password / OTP |
|-------|-------|----------------|
| Investor | `investor@growzy.com` | `Growzy2026!` / OTP `123456` |
| Admin | `admin@growzy.com` | `GrowzyAdmin2026!` |

---

## 3. How to integrate without breaking UI

1. Implement `apps/api` per `API_DOCUMENTATION.md`.  
2. Point `NEXT_PUBLIC_API_URL` at the API.  
3. Fill `features/*/hooks.ts` using existing services.  
4. Swap provider reads screen-by-screen.  
5. Keep components and CSS untouched.

---

## 4. Critical files

| Path | Role |
|------|------|
| `apps/web/src/services/*` | API methods |
| `apps/web/src/lib/api-client.ts` | Fetch + refresh |
| `packages/shared/src/constants/routes.ts` | `ROUTES` + `API_ROUTES` |
| `packages/shared/src/types/entities.ts` | DTOs |
| `apps/web/src/middleware.ts` | Cookie guards |
| `apps/web/src/features/auth/guards.tsx` | Role/permission gates |
| `apps/web/src/config/app.config.ts` | Config surface |
| `apps/web/src/mocks/*` | Demo data only |

---

## 5. Do not

- Redesign marketing/admin/investor UI  
- Add new product pages for “backend readiness”  
- Commit production secrets  
- Treat localStorage Admin OS as production CMS  

---

## 6. Sign-off checklist

- [ ] `pnpm typecheck` green in `apps/web`  
- [ ] Services cover auth, money, CMS, admin  
- [ ] Middleware separates investor vs admin cookies  
- [ ] Dead unused scaffolds removed  
- [ ] Handoff docs present  

See `BACKEND_READY_REPORT.md` for scores.
