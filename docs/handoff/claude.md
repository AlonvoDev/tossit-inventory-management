# Claude handoff
Branch: claude/tossit-ui
Task / bounded subtask: U1 — consistent access, menus and user-facing states (UI against existing auth exports)
Status: checkpoint — U1 UI work passes checks; per the plan it is declared done only after C1 identity is merged and re-tested.
Last previously confirmed remote SHA: d77fef2 (P0 planning commit; first Claude checkpoint)

## Changed files
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
Start U3 (admin, existing reports, settings UI) using existing APIs per gate 2, without new contract imports until C2 is merged. When Codex publishes C1, merge that pinned SHA, re-run U1 tests and mark U1 done.

## Commands to resume
```bash
git fetch origin
git switch claude/tossit-ui
git status --short
git log -3 --oneline
npm ci && npm run build && npm run test:run && npm run lint
```
