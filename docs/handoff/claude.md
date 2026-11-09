# Claude handoff
Branch: claude/tossit-ui
Task / bounded subtask: U2a — Dashboard scope/cleanup and opening items on C2 `openInventoryItem` (U2 split: U2a open ✓, U2b list + finished/discarded on `closeInventoryItem` + realtime, U2c shift button; pending/provider parts after C3c)
Status: checkpoint. U1, U3 done; U4a done; U4b waits for C3c, U4c for C4.
Last previously confirmed remote SHA: 8f461c216945c4e216512fbd23ba785c83a2c5e2 (U3d)

## U2a changed files
- `src/components/OpenItemForm.tsx` (rewritten): `openInventoryItem({ operationId, productId, amount, fridgeId?, openedAtMs })` only — no actor/business/name/unit/expiry from the UI. One UUID + opening instant per intent (`src/features/inventory/openItem.ts`), reused on retry of the same payload and renewed when it changes. Decimal kg (comma or dot, ≤3 decimals) vs whole units; department catalog and fridges only (fridge optional, product default preselected); off-shift staff blocked; offline blocked with explanation; success only for a receipt (`synced` → "נפתח. תוקף עד …" in Asia/Jerusalem; `pending` → explicitly not saved yet); `unavailable` keeps the intent; permission/shift/catalog errors shown. Removed the `pendingOperations` localStorage queue, fake "saved locally" success, local product cache, made-up departments (מחסן/אחר) and `parseInt` truncation (0.5 kg was impossible).
- `src/components/FloatingActionButton.tsx`: canonical `department` prop; dialog stays open after a receipt so the confirmation is visible.
- `src/pages/Dashboard.tsx`: **removed the mount-time deletion of `pendingOperations` and `cachedItems_*`** (legacy data stays for C3 review); tabs only for operable departments (admin both, manager/staff own); Hebrew role/department chips; removed localhost dev card (self-promotion + sample products) and debug logging. Browser `startDiscardScheduler` still started here — C4 replaces it (request U4a).
- `src/components/ItemsList.tsx`, `src/components/DashboardKPIs.tsx`: **C2 regression fix** — area filters compared items with Hebrew labels, but C2 returns canonical `bar`/`kitchen`, so active tabs and staff KPIs would be empty; now compared via shared `normalizeDepartment`. (ItemsList is rewritten/tested in U2b.)
- `src/app/access.ts`: `operableDepartments`.
- Tests: `openItem.test.ts` (14), `OpenItemForm.test.tsx` (9), `Dashboard.test.tsx` (4).

## U2a checks
- `npm run build`: PASS. `npm run test:run`: 23 files, 212/212 pass. `npm run lint`: 2 errors / 6 warnings (Codex `syncManager.ts`). `git diff --check`: clean.
- NOT RUN: emulator/real Firestore opening; ItemsList area fix has no dedicated test yet (covered in U2b).

## U3d changed files
- `src/features/settings/SettingsPage.tsx`: loads `getBusinessSettings()` (defaults when no document), three real settings (evening reminders 23:00/23:20/23:40, 08:00 manager summary, midnight auto-end), timezone shown read-only; save enabled only when changed and online; success only after `saveBusinessSettings` resolves; errors keep the draft; retryable load error (never silently shows defaults on failure); cancel restores. Removed placeholder "company name", "notifications" and "auto sync" fields and the console.log save. Info note: reminders are sent only once the server notification service and device opt-in exist (C4/U4c).
- `src/components/UnifiedNavigation.tsx`: "הגדרות" menu entry for admins (route admin-only); removed "בדיקת איכות" entry.
- `src/pages/AdminPanel.tsx`: removed the QA tab — `QATestSuite` created real `TEST-*` inventory items and discarded them in the live business (items cannot be deleted under C1 rules, so this would pollute discard reports); removed the localhost debug card and stale QA notes. `?tab=qa` falls back to the inventory tab. (`QATestSuite.tsx` remains only in unrouted showcase components.)
- Tests: `SettingsPage.test.tsx` (6), `AdminPanel.test.tsx` (4), nav test updated.

## U3d checks
- `npm run build`: PASS. `npm run test:run`: all files pass. `npm run lint`: 2 errors / 6 warnings (Codex `syncManager.ts` only). `git diff --check`: clean.
- NOT RUN: emulator/real Firestore for settings (Codex reports businessSettings rules tests passing).

## Integrated other-agent SHAs
- C1 `70d953e21a8b70c6b46d1fbddc6b01226e78f26e` (earlier merge).
- C2 `1f55cc4ccf58f728aa46c0a5ac99d05c449b9ca9` — normal merge, no conflicts. Not merged: C3a/C3b (8eeaf29, 5ca59b8; Codex marks C3 in progress).

## C2 integration changes
- `src/components/DiscardReport.tsx`: reason filter ("סיבת זריקה") passed to `getDiscardReport(..., reason)` so totals are computed server-side; rows keyed by name+unit (C2 groups by product and unit); empty state covers reason/date filters.
- `src/app/access.ts`: `normalizeDepartment`/`Department` now re-exported from Codex `src/domain/normalizeItem`/`contracts` (one definition).
- `src/pwa/swLogic.ts`: `PushPayload` type imported from `src/domain/contracts` (runtime parser unchanged).
- `src/features/common/errorMessage.ts`: Hebrew text for `not-on-shift`, `already-closed`, `catalog-changed`.
- Tests: DiscardReport reason/unit-split test added.

## C2 integration checks
- `npm ci`, `npm run build`: PASS (injectManifest, 18 precache entries). `npm run test:run`: 18 files, all pass (Claude UI + Codex C1/C2 client suites). `npm run lint`: 2 errors / 6 warnings (both errors in Codex legacy `src/utils/syncManager.ts`). `git diff --check`: clean.
- NOT RUN here: Codex emulator suites (rules/inventory integration) — Codex reports 35/35 on their side.

## U4a changed files
- `src/pwa/service-worker.ts` (new entry), `src/pwa/swHandlers.ts`, `src/pwa/swLogic.ts`: one worker built by vite-plugin-pwa `injectManifest` and served at `/service-worker.js` (root scope; the same URL older clients and `notificationUtils` used, so they update in place instead of competing). Precaches only build assets (install fails if any is missing, old worker stays); navigations are network-first with the cached app shell offline; API/Firestore/other origins and non-GET are never intercepted or cached; activation deletes only obsolete TossIt/legacy caches; no automatic `skipWaiting` (page posts `SKIP_WAITING` after user consent); strict `PushPayload` v1 parsing with generic fallback; notification clicks open only same-origin paths. Redirected precache responses (hosts that redirect `/index.html`) are stored as clean copies — found by the browser smoke test.
- `src/pwa/updateStore.ts` (new), `src/pwa/PWAPrompt.tsx`, `src/app/main.tsx`: single registration; a waiting update is stored (no lost event, no 1-hour suppression) and applied only when the user chooses; "later" keeps a banner; failures shown. Removed the unreachable install dialog that advertised offline work and push before they exist.
- `src/pwa/OfflineIndicator.tsx`: no longer claims changes are saved locally/synced (true only after C3).
- `vite.config.ts`: injectManifest, `injectRegister: false`, manifest with existing icons (any + maskable), `start_url: /dashboard`, `base: '/'` (relative base broke assets on deep-link reloads).
- `index.html`: icons/apple-touch/theme metadata; removed a manifest `<link>` that was inside `#root`.
- Assets: new `public/icons/*` (≈50 KB total, white glyph on teal; maskable/apple full-bleed); `src/assets/tossit-logo.png` 1.6 MB → 34 KB, `tossit-favicon.png` 1.4 MB → 11 KB (same artwork). Deleted unused/duplicate: `public/service-worker.js`, `public/manifest.json`, `public/index.html`, `public/offline.html`, three duplicate 1.4–2.2 MB PNGs in `public/`, `src/assets/tossit-app-icon.png`, old `src/service-worker.ts`.
- `src/types/pwa.d.ts`: fixed baseline `no-explicit-any` lint error.
- Tests: `swLogic.test.ts` (27), `swHandlers.test.ts` (15), `PWAPrompt.test.tsx` (4), `OfflineIndicator.test.tsx` (1).
- Docs: `docs/PILOT.md` (PWA device checklist, iPhone/Android NOT RUN), `docs/CLAUDE_REQUESTS.md` (U4a 1–6).

## U4a checks
- `npm run build`: PASS — `mode injectManifest`, precache 18 entries (1353 KiB), one `dist/service-worker.js`, one manifest link.
- `npm run test:run`: 14 files, 148/148 pass. `npm run lint`: 2 errors / 6 warnings (both errors in Codex `src/utils/syncManager.ts`). `git diff --check`: clean.
- Chromium smoke (Playwright, `serve -s dist`): 1 registration `/service-worker.js` scope `/`; 12 precached URLs; 0 permission requests on load; offline reload of `/admin/users` renders the app; new deploy → waiting worker + dialog → accept → new worker active, previous precache deleted, 1 registration.
- NOT RUN: real iPhone/Android install, real push delivery (needs C4 + deployment). See `docs/PILOT.md`.

## Integrated other-agent SHA
- Codex C1 code checkpoint `70d953e21a8b70c6b46d1fbddc6b01226e78f26e` merged with a normal merge commit (no conflicts). Codex handoff says C1 done; emulator/rules/callable tests passed on their side. Not deployed.

## C1 integration changes
- `src/pages/AdminUsersPage.tsx`: "השבתה" (deactivate) replaces "הסרת גישה" — server deactivation keeps the record for audit; deactivated users (`isActive === false`) are shown as "מושבת" with no edit/deactivate/reactivate controls; list reloads from the server after deactivation; cannot deactivate yourself. Create passes one `requestId` per form intent (renewed when the form reopens, reused on retry).
- `src/features/common/errorMessage.ts`: `aborted` (lease conflict) → retryable message; `functions/` prefixes handled; `functions/already-exists` on create → "email already registered".
- Tests: `AdminUsersPage.test.tsx` now 12 (deactivation copy/reload, deactivated row, self, permission, aborted, requestId reuse).
- U1 re-check against the C1 AuthContext: routes/nav tests pass unchanged; disabled profiles resolve to `profileNotFound` → "no access" screen; profile read errors → "could not load permissions" screen.

## Integration checks
- `npm ci`, `npm run build`: PASS. `npm run test:run`: 10 files, 101/101 pass (Claude UI + Codex client suites). `npm run lint`: 3 errors / 7 warnings (remaining: `src/types/pwa.d.ts` — Claude U4; `src/utils/syncManager.ts` x2 — Codex C3). `git diff --check`: clean.
- NOT RUN here: Codex rules/functions/callable suites (need emulators); real Firebase; device tests.

## U3c changed files
- `src/app/access.ts`: `normalizeDepartment` (canonical + legacy Hebrew), `manageableDepartments` (admin both, manager own, staff none); `/admin/fridges` now admin+manager (C1b rules let managers manage own-department fridges); department labels accept legacy values.
- `src/features/catalog/productForm.ts` (new): shelf life must be a whole number of days 1–3650 (no truncation of "1.5"), department within scope, display code generation.
- `src/features/common/errorMessage.ts` (new): Hebrew messages by error `code`; used by users, products, fridges.
- `src/components/ProductManagement.tsx` (logic/markup rewritten, CSS kept): removed the self-service "set business ID" panel (client wrote its own `businessId`), removed offline fake-success adds and the `pendingOperations`/`cachedProducts_*` localStorage queue/cache, debug panel removed; managers see/manage only their department (legacy Hebrew included) with a locked department field and department-matched fridges; category creation admin-only; unit type locked on edit; one controlled add/edit form; permission errors shown, never success; changes disabled offline.
- `src/pages/AdminFridgesPage.tsx`: manager scope (list, form department), duplicate name check, Hebrew mapped errors instead of raw Firebase messages, double-submit guard, offline disables changes.
- `src/pages/AdminUsersPage.tsx`: uses the shared error mapper.
- Tests: `ProductManagement.test.tsx` (11), `AdminFridgesPage.test.tsx` (5); routes/nav matrix tests updated for manager fridges.

## U3c checks
- `npm run build`: PASS. `npm run test:run`: 8 files, 74/74 pass. `npm run lint`: 3 errors / 7 warnings (no new issues; errors are pre-existing in `src/types/pwa.d.ts` and `src/utils/syncManager.ts`). `git diff --check`: clean.
- NOT RUN: emulator/real Firestore. Manager catalog reads will be denied under C1b rules until C2 scopes the queries (request U3c-1).

## U3b changed files
- `src/features/users/userForm.ts` (new): form defaults, Hebrew validation, create/update payloads. Department required for staff AND managers (managers are department-scoped); admins business-wide.
- `src/pages/AdminUsersPage.tsx`: Hebrew copy and RTL table; manager department shown and kept on edit (was reset to `bar`); "מחיקה" → "הסרת גישה" with confirmation that the sign-in account is not deleted; cannot remove own access or change own role; permission/network errors mapped to Hebrew, never shown as success; repeated submit ignored while saving; no fake email/name fallbacks; removed users-list console.log (PII); fixed the baseline `no-explicit-any` lint error.
- `src/components/UnifiedNavigation.tsx`: removed the duplicate create-user dialog; "הוסף משתמש חדש" opens the users page form via `/admin/users?add=1`.
- Tests: `src/pages/AdminUsersPage.test.tsx` (9), nav test (+1).

## U3b checks
- `npm run build`: PASS. `npm run test:run`: 6 files, 58/58 pass. `npm run lint`: 3 errors / 7 warnings (baseline was 4/7; the AdminUsersPage error is fixed, remaining errors are in Codex/PWA files: `src/types/pwa.d.ts` (Claude, U4) and `src/utils/syncManager.ts` x2 (Codex)). `git diff --check`: clean.
- NOT RUN: real provisioning. Under C1b rules client profile create/update/delete is denied, so these actions will show the permission error until C1c callables are integrated (see requests U3b-1..4).

## U3a changed files
- `src/components/dateRange.ts` (new): local calendar-day helpers. Fixes: presets started at the current time instead of midnight (so "היום" dropped earlier discards); `new Date('YYYY-MM-DD')` parsed as UTC and `toISOString()` displayed the previous day in Israel; end-before-start could be applied.
- `src/components/DateRangePicker.tsx`: uses the helpers; invalid range shows an error and disables "החל".
- `src/components/DiscardReport.tsx`: inclusive whole-day query bounds; recoverable error with "נסה שוב"; empty state says when the date filter matched nothing.
- `src/features/reports/ReportsPage.tsx`: removed placeholder "inventory"/"expiry" report types, the dead date select and the console.log "generate" button; shows the discard report only.
- `src/components/UnifiedNavigation.tsx`: "דוחות" menu entry for admin/manager (matches `/reports` access).
- Tests: `dateRange.test.ts` (7), `DiscardReport.test.tsx` (5), both under `TZ=Asia/Jerusalem`; nav test updated.
- RED check: the new DiscardReport tests fail 4/5 against the previous picker/report and pass after the fix.

## U3a checks
- `npm run build`: PASS. `npm run test:run`: 5 files, 48/48 pass. `npm run lint`: 4 errors / 7 warnings (baseline, none in changed files). `git diff --check`: clean.
- NOT RUN: real Firestore data / emulator; manager-scoped report query (see request U3a-1, it will be denied under C1b rules until fixed).
- Report day boundaries use the device's local timezone (filter only, not a scheduled action). Acceptable for Israeli devices; revisit if C2 exposes the business timezone.

## U1 changed files
- `src/app/access.ts` (new): single UI permission matrix (`ROUTE_ACCESS`, `canAccessRoute`, `canManageBusiness`), Hebrew role/department labels. Unknown roles grant nothing.
- `src/app/routes.tsx`: `RequireAccess` gate (signed out → /login; signed in without active profile → access screen; wrong role → not authorized); loading renders only a status view; `/not-authorized` route added (pages already navigated there); safe same-app return path after login.
- `src/app/App.tsx`: navigation shown only for an authenticated, resolved profile.
- `src/components/UnifiedNavigation.tsx`: menu visibility derived from the matrix; removed the no-op "הגדרות" item and the fake notification bell/badge ("3") and demo toast; Hebrew role and department labels.
- `src/pages/NotAuthorized.tsx`: reasons `role | no-profile | profile-error`, logout/retry where relevant.
- `src/pages/RegisterPage.tsx`: no public signup; explains admin-controlled onboarding. No account or profile is created.
- `src/pages/LoginPage.tsx`: removed localhost demo login (fake manager profile); redirect after sign-in handled by routes; Hebrew copy for "no account".
- `src/pages/AdminPanel.tsx`: users tab hidden for non-admins (route is admin-only).
- `src/features/reports/ReportsPage.tsx`, `src/features/settings/SettingsPage.tsx`, `src/hooks/useItemActions.ts`: import `useAuth` from the context (no second Firebase auth observer).
- Tests: `src/app/routes.test.tsx` (25), `src/components/UnifiedNavigation.test.tsx` (6).
- Docs: `docs/CLAUDE_REQUESTS.md`, this handoff.

## Checks and exact results
- `npx vitest run src/app/routes.test.tsx src/components/UnifiedNavigation.test.tsx`: 31/31 pass.
- `npm run build`: PASS (existing chunk-size and browserslist warnings only).
- `npm run test:run`: 3 files, 36/36 pass (5 baseline Button + 31 new).
- `npm run lint`: 4 errors, 7 warnings — identical to the recorded baseline; none in files changed by U1.
- `git diff --check`: clean.

## Known failures / NOT RUN checks
- Not run against real Firebase/emulators; tests mock `useAuth` at the context boundary.
- Disabled-profile behavior depends on C1 (see request 1). Tested as "context reports isAuthenticated=false".
- `/reports` and `/settings` pages still contain placeholders (non-working report types, console.log save). They are route-gated but no longer advertised in the menu; U3 fixes and re-adds them.
- QA tab / "בדיקת איכות" still visible to admin+manager (existing behavior); review in U3.

## Integrated other-agent SHA, if any
None. C1 not yet published.

## API / dependency requests
See `docs/CLAUDE_REQUESTS.md` (U1 section): disabled → not authenticated, remove demoUser and fake profile defaults, retire client `signUp`, confirm manager scope.

## Next smallest action
U2b: ItemsList + `useItemActions`/`ItemActionModal` on `closeInventoryItem` (UUID per close intent, finished vs discarded with reason/amount ≤ batch, `already-closed` shown, no optimistic success) and realtime `subscribeBusinessItems`; then U2c ShiftButton. Do not remove Dashboard legacy queue code until C3c asks; never clear legacy keys. U4b (queue-aware status) after C3; U4c (notification controls) after C4.
Remaining U3: U3d settings after C2 `settingsAPI`; reactivation only if Codex publishes a lifecycle operation. Meanwhile U2 online parts wait for C2; U4 (service worker/PWA) can start with isolated worker tests per gate 4. Also review the "בדיקת איכות" (QA) tab and AdminPanel localhost debug card. U3d settings waits for C2 `settingsAPI`. When Codex marks C1 complete, merge that pinned SHA, re-run U1 tests and mark U1 done.

## Commands to resume
```bash
git fetch origin
git switch claude/tossit-ui
git status --short
git log -3 --oneline
npm ci && npm run build && npm run test:run && npm run lint
```
