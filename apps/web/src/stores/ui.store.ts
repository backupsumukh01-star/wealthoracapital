/**
 * UI-only state conventions — keep out of business providers.
 * Prefer URL search params for shareable filters; local state for ephemeral UI.
 */
export type UiFilterState = {
  query: string
  page: number
  status: string | null
}

export function emptyUiFilters(): UiFilterState {
  return { query: '', page: 1, status: null }
}
