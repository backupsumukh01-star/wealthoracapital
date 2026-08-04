# Growzy — State Management Guide

---

## 1. Separation of concerns

| Kind | Where it lives | Examples |
|------|----------------|----------|
| **UI state** | Component `useState`, URL search params | Filters, pagination, modal open, command palette |
| **Session / auth** | `SessionProvider` → tomorrow React Query `authService.me` | User, role |
| **Investor business (demo)** | `InvestorLifecycleProvider` | Accounts, KYC, deposits, withdrawals |
| **Admin / CMS (demo)** | `AdminOsProvider` + `admin-os-store` | Landing, platform CMS, queues config, audit |
| **Notifications (demo)** | `NotificationsProvider` | In-app list |
| **Server cache (prod)** | TanStack Query via `features/*/hooks` | All list/detail payloads |

Do **not** put filter/pagination into Admin OS or lifecycle stores.

---

## 2. Store keys (demo persistence)

From `@/stores`:

| Key | Storage |
|-----|---------|
| `growzy_investor_lifecycle_v2` | localStorage |
| `growzy_admin_os_v4` | localStorage |
| `growzy_notifications_v2` | sessionStorage |
| `mfx_at` | cookie (investor) |
| `growzy_admin_at` | cookie (admin) |

---

## 3. API map

`STORE_API_MAP` in `@/stores/keys.ts` lists which service replaces each demo domain.

---

## 4. Cutover pattern

1. Add React Query hook calling the service.  
2. Read hook in the workspace; keep demo fallback behind `env` flag if needed.  
3. Remove localStorage write path for that domain.  
4. Delete seed once staging verified.

---

## 5. Providers composition

```
Theme → Query → Session → InvestorLifecycle → AdminOs → AuthModal → Notifications → UI
```

(`providers/index.tsx`)

QueryProvider is already mounted — hooks can be filled without restructuring.

---

## 6. Anti-patterns

- Duplicating User/Wallet interfaces in components  
- Syncing the same deposit list in both lifecycle and Admin OS as two truths (pick API as single source)  
- Storing derived UI flags in CMS documents  
