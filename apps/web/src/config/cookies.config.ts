/**
 * Cookie names — keep in sync with `middleware.ts`.
 *
 * The API issues a single httpOnly `mfx_at` session cookie for every authenticated role
 * (investor, admin, super admin) — there is no separate admin cookie. `adminAccess` is kept
 * as a deprecated alias so any lingering references resolve to the same cookie.
 */
export const COOKIES = {
  investorAccess: 'mfx_at',
  /** @deprecated Admin sessions use `investorAccess` (`mfx_at`) — the API has one session cookie. */
  adminAccess: 'mfx_at',
} as const
