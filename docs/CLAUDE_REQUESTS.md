# Claude → Codex requests

Requests for Codex-owned files. Claude does not edit these paths. Newest first.

## From U3a (2026-11-09)

1. **Discard report must be department-scoped for managers** (`getDiscardReport` / `getDiscardedItemsWithDateFilter`
   in `src/api/firestoreAPI.ts`). They query `items where businessId == X` with no `area` constraint. Under the C1b
   rules (rules are not filters) a manager's query will be rejected as a whole. Please constrain by the actor's department
   for non-admins (including legacy Hebrew area values) or move the report behind a callable.
2. **Reason filter:** please add an optional `reason?: DiscardReason` (and later `department?`) parameter to
   `getDiscardReport` so totals are computed only from matching discards. The UI currently shows per-reason counts
   but cannot filter totals by reason without duplicating the aggregation.
3. **Date bounds:** the UI now passes inclusive whole local-day bounds (`start` 00:00:00.000, `end` 23:59:59.999).
   Items without `discardedAt` fall back to `openingTime` in the API filter; please confirm or drop that fallback in C2.

## From U1 (2026-11-09)

1. **Disabled/inactive profiles must resolve to `isAuthenticated: false`** in `src/context/AuthContext.tsx`
   (C1 contract). U1 routes rely only on `user`, `isAuthenticated`, `profileNotFound`, `role` and `loading`.
   Optional but useful: expose a reason (e.g. `accessState: 'ok' | 'missing' | 'disabled' | 'error'`) so the UI can
   show "account disabled" instead of the generic "could not load your permissions" screen. Until then a disabled
   profile is shown the `profile-error` screen (still no access).
2. **Remove the `demoUser` localStorage fallback** from `AuthContext.tsx` and `hooks/useAuth.ts`.
   `LoginPage` no longer writes `demoUser`, but a stale value on localhost still yields a fake manager profile in the context.
3. **Remove fake profile defaults** in `fetchUserProfileFromFirestore` (`businessId || 'business1'`,
   `department || 'bar'`, unknown role → `staff`). A profile missing these should grant no access.
4. **`authAPI.signUp` is no longer called by any UI** (public self-signup removed). It writes `role` and `businessId`
   from the client; please remove or lock it down and make sure rules reject self-created `users/{uid}` profiles.
5. **`hooks/useAuth.ts` facade:** all Claude-owned consumers now import `useAuth` from `src/context/AuthContext`
   (the context hook). Once `hooks/useAuth.ts` is a facade over the context, either import works; no further UI change needed.
6. **Align rules/callables with the UI matrix** in `src/app/access.ts`:
   - admin: everything;
   - manager: dashboard, `/admin` panel (inventory, products, discard report tabs), `/reports`; not users, fridges, settings;
   - staff: dashboard only.
   If C1 decides managers get a different scope (e.g. department fridges), tell me and I will update the matrix and tests.
