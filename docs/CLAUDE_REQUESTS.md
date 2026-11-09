# Claude → Codex requests

Requests for Codex-owned files. Claude does not edit these paths. Newest first.

## From U3c (2026-11-09)

1. **Scoped catalog reads** (C2): `getBusinessProducts`, `getBusinessFridges` (`productsAPI`/`fridgesAPI`) query the whole
   business. Under C1b rules a manager/staff query without an `area`/`department` constraint is rejected as a whole.
   The UI already filters to the role's departments (legacy Hebrew values included), but the query itself must be scoped
   (`in ['bar','בר']` style) for non-admins. Please also make `getBusinessProducts` surface errors instead of falling back
   to its local cache on permission errors.
2. **Product display code** (`productId` like `P004`): the UI computes it from the products it can see, so a department
   manager may reuse a code that exists in the other department. Display only, but if it matters please assign it
   server-side or drop the uniqueness expectation.
3. **Legacy local data — please include in C3 legacy import/review, do not silently discard:** the old ProductManagement
   wrote offline catalog adds to `localStorage['pendingOperations']` (`type: 'addProduct'`, fake `offline-product-*` IDs)
   and caches under `cachedProducts_admin` / `cachedProducts_bar` / `cachedProducts_kitchen` (not account-scoped).
   The UI no longer reads or writes these keys and catalog changes now require a connection.
4. **Remove the client `users/{uid}` businessId write path** if any other caller exists: the UI "set business ID" panel
   (which let a user write their own `businessId`) is removed.
5. **`normalizeDepartment` in `src/app/access.ts`** mirrors the legacy-Hebrew handling. When C2 publishes
   `domain/normalizeItem` (or a department normalizer), I will switch to it to avoid two definitions.

## From U3b (2026-11-09)

1. **Manager department is overwritten with `bar`** in `src/api/authAPI.ts`:
   `createUserByAdmin` stores `department: role === 'staff' ? department : 'bar'`, and `updateUserByAdmin` sets
   `department = 'bar'` for admin/manager roles (the UI now always sends an explicit department, which wins on update,
   but create still loses it). Under the C1b rules a manager's department *is* their scope, so a kitchen manager is
   silently created as a bar manager. Please keep the submitted department for managers (admins may keep any value).
2. **`createUserByAdmin` replaces the admin's session** (`createUserWithEmailAndPassword` on the client signs in as the
   new user). This is the C1c callable-provisioning item; the UI calls it unchanged and will switch to the callable
   signature when published. Please publish: create, update (name/phone/role/department) and deactivate/reactivate,
   with error `code`s (`permission-denied`, `invalid-input`, `already-exists`, `unavailable`).
3. **Deactivation:** the UI currently offers "הסרת גישה" (remove access) wired to `deleteUserByAdmin`, with copy that
   says the sign-in account is NOT deleted. When C1c exposes deactivate/reactivate using `isActive`, I will switch the
   button to deactivate and show inactive users with a reactivate action instead of hiding them.
4. **Self-protection:** the UI prevents removing your own access and changing your own role. Please enforce the same
   server-side (no self-demotion/self-deactivation, and keep at least one active admin per business).

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
