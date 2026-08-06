# `features/`



Each folder owns one domain's data layer and nothing else.



```

features/<domain>/

  api.ts     # re-exports typed `@/services/*` methods

  hooks.ts   # React Query hooks — queryKeys, useX queries, useX mutations

  guards.tsx # (auth) Guest / Investor / Admin / Staff / Permission gates

```



## Rules



1. **Components never call `api-client` directly.** They call a hook from here (or keep using demo providers until cutover).

2. **`api.ts` returns typed DTOs from `@meridian/shared` / `@/types`.**

3. **Query keys are exported from `hooks.ts`** as a `queryKeys` object.

4. **Money stays a string** all the way through this layer.



## Status



Service methods are typed and call `apiClient` against `API_ROUTES`. Until the API is live they will throw `ApiError` / network errors — UI continues to use demo providers. Wire hooks to services domain-by-domain during backend integration.

