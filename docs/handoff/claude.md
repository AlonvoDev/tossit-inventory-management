# Claude handoff
Branch: claude/tossit-ui
Task / bounded subtask: U3a — working discard report and reports page (U3 split: U3a reports, U3b admin users, U3c catalog/fridges scope, U3d settings after C2)
Status: checkpoint — U3a passes checks. U1 remains a checkpoint until C1 is merged.
Last previously confirmed remote SHA: 25abc6e1bf0109eb4c510f2f3e372aec775b9803 (U1)

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
U3b: admin users screen — create/edit/deactivate semantics; "delete" must not claim the Auth account is removed. Then U3c catalog/fridge/category validation and manager department scope. U3d settings waits for C2 `settingsAPI`. When Codex marks C1 complete, merge that pinned SHA, re-run U1 tests and mark U1 done.

## Commands to resume
```bash
git fetch origin
git switch claude/tossit-ui
git status --short
git log -3 --oneline
npm ci && npm run build && npm run test:run && npm run lint
```
