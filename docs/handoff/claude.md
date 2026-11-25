# Claude handoff
Branch: claude/tossit-ui
Task / bounded subtask: **V3 — the same visual language on admin, catalog, fridges, settings, reports and PWA controls** (`docs/TOSSIT_MASTER_PLAN.md` V3)
Status: **V3 READY FOR CODEX REVIEW**. Not deployed; `main` not touched.
Integrated Codex SHA: none new since V1 (`codex/tossit-core` `ac46bd2` date-scan lifecycle not merged; needed for V4).
Last previously confirmed remote SHA: 009259223fad42ce7678ee3f018975b8445c2121 (V1)

## V3 — 2026-11-25
- **Shared management rows** (`src/components/layout/ManagementList.tsx`, new): `ManagementList`, `ManagementRow` and `Tag`. These are flat rows with thin separators, small bordered text tags and compact named actions, matching the inventory rows. They replace the card grids on:
  - users: `data-user-row`, the `article` name and "עריכה/השבתה — X" are kept, as are the self, deactivated and offline guards;
  - fridges;
  - catalog (`ProductManagement`).
- **AdminPanel**:
  - flat tabs; no enclosing card;
  - inventory sub-tabs are text-only (פעילים / עומדים לפוג / פג תוקף ונזרקו / נגמרו; no emoji, no repeated coloured headings);
  - one `h2` per section; the expired and discarded views are side-by-side sections instead of nested cards;
  - the access-denied fallback uses MUI buttons (it no longer injects a `<style>` with `grey[300]`).
- **Catalog form**:
  - rewritten with MUI fields: native selects keep the roles and labels the tests use; same handlers, validation, permissions and offline lock;
  - the unscoped global `<style>` block was removed: it re-styled every `label`/`input` and set `* { pointer-events }` while mounted.
- **Reports**:
  - one flat summary strip (kg and units still separate);
  - phone rows via `ManagementRow`, keeping the UI3-R2 sort control and per-product unit averages;
  - neutral table header;
  - date button: a normal 44px control (it overflowed at 320px; see evidence);
  - the date dialog's close button is named "סגירה", 44px;
  - the dialog's preset panel and info box use tokens (`grey[100]` looked bright in dark mode).
- **Report rounding:** desktop now uses the same unit-aware rounding as phones (up to 3 decimals for totals, 2 for averages, with units). Before, `toFixed(0)` showed a 1.5-unit average as "2" and `toFixed(1)` showed 0.25 kg as "0.3".
- **Same-name products in reports:** a department tag is rendered once the report data carries `area`. The API change is requested from Codex as **V3-1** in `docs/CLAUDE_REQUESTS.md`.
- **Shared `ui/Card`** (Settings, report error): flat, thin border, compact `h2` header; no shadow or large title. NotAuthorized and Register cards are outlined.
- **PWA controls:**
  - the queue chips ("ממתינות לשליחה" / "נכשלו") are now 44px outlined (they were 24px);
  - update and notification controls already use theme buttons (44px from the theme) and tokens.
- **Responsive borders:** the `border: {md: 1}` shorthand reset the colour to currentColor on desktop (dark outline in light mode, white separator in dark mode). Inventory list, management list and report strip now use explicit `1px solid var(--tossit-line)`.

### Evidence and checks
- **Screenshots:** `docs/ui-review/v3/`, 56 PNGs (README there): before = V1 `0092592`, after = this checkpoint; light and dark; 390 and 1280.
- **Emulator harness:** after **4/4 PASS**. Before **2/4**: the reports page overflowed by 12px at 320px (fixed).
- **Unit tests:** `npm run test:run` 47 files, **499/499 PASS** (V1: 495; +4). New tests:
  - report rounding and department tag;
  - date dialog close button;
  - queue chips at 44px.
  Existing users, fridges, products, admin, report and PWA tests are unchanged.
- **Lint:** `npm run lint` 0 errors, 7 existing warnings.
- **Build:** `npm run build` PASS.
- **Browser suite:** `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:browser` **5/5 PASS** (21.7s; the container's Chromium differs from the project's Playwright, as before).
- **NOT RUN:** real devices, screen readers.
- No Codex-owned files, packages or lockfiles changed.

---

# Previous: V1 (READY for Codex review at 0092592)

## V1 — 2026-11-25

### Appearance (בהיר / כהה / לפי המכשיר)
- **Theme** (`src/app/theme.tsx`):
  - semantic `palettes.light|dark` and `createAppTheme(mode)` (MUI palette, flat surfaces, no dark elevation overlay, RTL icon spacing);
  - `cssVariables(mode)`;
  - `tokens.colors.*` are now `var(--tossit-*, <light fallback>)`, so existing static `sx`/CSS follows the active appearance;
  - the `theme` export (light) is kept for imports and tests.
- **Provider** (`src/features/appearance/`):
  - `AppearanceProvider` owns the ThemeProvider and sets the `:root` variables, `data-appearance`, `color-scheme` and `theme-color`;
  - it follows `prefers-color-scheme` live, but only in system mode;
  - switching only swaps the theme object, so nothing below it remounts (drafts, dialogs, queue and provider lifecycles kept);
  - `appearancePreference.ts` handles safe read/write of `localStorage['tossit.appearance']`: missing, malformed or blocked storage means system, and choosing system removes the key;
  - `appearanceContext.ts` holds the hooks.
- **"נגישות" entry** (`AccessibilityMenu`):
  - an icon button with `aria-haspopup`/`aria-expanded`, opening a menu of `menuitemradio` items with `aria-checked`;
  - MUI keyboard navigation, and focus returns to the button;
  - if the choice could not be saved, the menu says so;
  - placed in the app bar (every role), and on the login, register and not-authorized screens;
  - renders nothing outside the provider (isolated tests).
- **Pre-paint**: an inline script in `index.html` applies the saved appearance before React, so returning dark users get no bright flash. The `theme-color` meta tags are now light/dark.
- **`src/app/main.tsx`**: only `ThemeProvider theme={theme}` → `AppearanceProvider`. The provider order, the single worker registration and the other providers are unchanged.
- **Hard-coded colours** moved to tokens in every routed screen:
  - global/CSS: `index.css` (Vite template dark defaults and OS-only colours removed), `LoadingSkeleton.css`, `responsive.css`;
  - components: NotificationToast (tinted surface + status border), ProductManagement (including its unscoped global `<style>` rules), ShiftButton, DiscardReport chips, ItemActionModal, DateRangePicker, MultiColumnLayout;
  - pages: LoginPage (flat card, readable inputs in dark), NotFound, AdminFridgesPage;
  - OfflineIndicator; UnifiedNavigation (flat surface app bar, no gradients).
  - Unrouted showcase/demo files were left as they are.
- **Contrast** (`docs/ui-review/v1/contrast.md`, enforced by `src/app/theme.test.ts`):
  - all text pairs ≥ 4.5:1, and status stripes, focus and input boundaries ≥ 3:1, in both modes;
  - the light amber stripe was darkened to `#C46A15`;
  - a new `control` token (≥ 3:1) is used for input borders.

### Inventory / navigation (approved V0 direction)
- **`InventoryItemCard`** is now a flat row:
  - phone: three lines; desktop: table columns shared with a column header;
  - thin status stripe, and the status always in text with an icon;
  - remaining time is bold and coloured; exact expiry and opening time are kept;
  - department tag in the combined view;
  - pending/failed sync line;
  - the action keeps "נגמר / נזרק — {name}" (44px).
- **`ItemsList`**:
  - urgency groups with text headers and counts when "הכל" is selected; a single status filter shows one plain list (Codex recommendation);
  - search and fridge on one line; status chips scroll horizontally at a **real 44px** (UI1-R2 kept, no pseudo-element hit area);
  - flat list with separators; desktop table with a divider-coloured outline.
- **`Dashboard`**: no enclosing card; flat tabs. `FloatingActionButton variant="responsive"` is a full-width opening bar fixed to the bottom below md (safe-area padding) and the inline header button from md up, as one instance.
- **`OpenItemForm`**: the footer uses the dialog surface. UI2-R1 busy lock, inline amount error, receipts and retry intent are unchanged.
- **`OfflineIndicator`** (found during V1 phone checks; this predates V1): at phone width, the offline snackbar (z-index 2000, permanent) covered the dialog close button, the menu and "נגישות". It is now below modals, dismissible ("סגירת ההודעה") and hides after 8 seconds. The offline state stays shown in the list and inside forms.
- **V0-I1** (Codex review):
  - the prototype no longer confirms an opening at day precision: "זמן פתיחה" requires an explicit hour and minute and otherwise stays unconfirmed;
  - "יום בלבד" applies only to expiry evidence;
  - prototype checks: `node docs/ui-review/v0/capture.cjs` → **30/30 PASS**.

### Evidence and checks (this tree)
- `npm run test:run`: **47 files, 495/495 PASS** (was 442 after merging Codex's foundation work). New tests:
  - appearance: 15 (storage, system follow, explicit override, reload, malformed and blocked storage, no-matchMedia, no remount and draft kept, menu semantics and keyboard, pre-paint script);
  - theme contrast and palette: 48;
  - ItemsList grouping: 2; responsive opening bar: 2; offline notice: 1.
- `npm run lint`: 0 errors, 7 existing warnings. Type-check (`tsc -p tsconfig.app.json`) passes.
- `npm run build`: PASS (`tsc -b` + vite + injectManifest; single `dist/service-worker.js`).
- `npm run test:browser` with the config's existing `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium` (the container's Chromium build 1243 vs the project's Playwright 1254, as at V0): **5/5 PASS** (24.3s, exit 0).
- **Emulator browser harness: 20/20 PASS**, light and dark (`docs/ui-review/v1/README.md`):
  - login entry; no overflow at 320, 390, 430 and 1280px;
  - an offline-queued opening survives an appearance switch and an offline reload; the preference persists;
  - live system following; explicit override; back to system;
  - dark first paint before the bundle runs.
- **Screenshots**: 42 PNGs in `docs/ui-review/v1/`. Before = `8a7fdae` (light only); after = light and dark.
- **NOT RUN**: real iPhone/Android, Safari or installed PWA, VoiceOver/TalkBack, real-device OS dark mode.

### Remaining / dependencies
- Older admin sub-tabs still use emoji labels (known UI3 item). V3 restyles the admin, catalog and reports screens further.
- V2 date fields wait for C1; V4 uses C0b/S0a and the new scan lifecycle (`codex/tossit-core` `ac46bd2`, not merged here yet).
- No Codex-owned files, packages or lockfiles changed.

---

# Previous: V0 (READY for visual review, approved by Alon)

## V0 — 2026-11-25
- Preview: `docs/ui-review/v0/index.html`. One self-contained file, synthetic data, no network, no dependencies, not routed. How to use it and the full state list: `docs/ui-review/v0/README.md`.
- Direction:
  - flat list, thin separators, small radii, restrained green (`#1d6a4e`), colour only for status;
  - rows grouped urgent first; remaining time plus exact expiry per row; per-row "סגירה";
  - compact search, fridge and status chips with counts; the opening action sits in a bottom bar on phones and in the toolbar on desktop;
  - department tags in the admin combined view.
- Opening, closing and scan states are as listed in the README.
- Accepted behaviour preserved in the prototype:
  - UI2-R1 busy dismissal lock;
  - inline invalid amount;
  - truthful synced, pending and failed messages;
  - staff limited to their own department; the shift requirement for opening.
- Date review uses the C0a `DateScanResult` v1 shapes, with the two published fixtures copied verbatim plus four synthetic ones (ambiguous, manufactured/unknown, unreadable, camera denied).
  - Nothing is inferred: no year, no midnight, no expiry policy.
  - "יום בלבד" is an explicit choice. Confirmation is a separate action, and cancel restores the unchanged draft.
  - Confirmed evidence is display-only and not sent, pending C1.
- Evidence: `node docs/ui-review/v0/capture.cjs` → **29/29 PASS, exit 0**. 31 PNGs in `docs/ui-review/v0/`, covering 390px phone states, 1280px desktop and 320px samples.
  - No horizontal overflow at 320, 390, 430 and 1280px across 14 states.
  - Interactive targets are at least 44px at 390px.
  - Key interactions are asserted; see the README.
- Repo checks on this tree (C0a merged):
  - `npm run test:run`: 42 files, **381/381 PASS**;
  - `npm run build`: PASS;
  - `npm run lint`: 0 errors, 7 existing warnings;
  - `npm run test:browser`, run unmodified: first attempt **5/5 FAILED at launch**. The container's Chromium is build 1243; the project's Playwright expects build 1254. No test assertion ran.
  - Re-ran with the config's existing `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium`: **5/5 PASS** (24.8s, exit 0).
- Ownership:
  - Codex files untouched: no shared contract, rules, queue, worker, package or lockfile changes.
  - The capture script uses the project's existing Playwright with the pre-installed Chromium.
- NOT RUN: real phones, iPhone keyboard and camera, VoiceOver, installed PWA, real OCR or photos.
- Questions for Alon:
  1. Is the row density right: 3 lines per row on a phone, remaining time beside the name?
  2. Should "פתיחת פריט" stay in a bottom bar on phones, or would you prefer a floating button?
  3. Should the status groups have headers, or just colour stripes?
  4. Should a scan or manual date be offered on every opening, or only for selected products?
- Next: V1 starts after visual approval. V2 date fields wait for C0/C1; V4 waits for the C0 + S1 adapter or mock.

---

# Previous: UI3 follow-up (accepted by Codex, deployed 2026-11-15)

## UI3-R1 (Important) — offline guard on open/linked user forms and the submit handler
- `src/pages/AdminUsersPage.tsx`:
  - `handleSubmit` returns **before any API call** while `isOffline` (covers Enter/direct form submission, not only the
    button) and shows "אין חיבור. השינויים לא נשלחו; הטופס נשמר…".
  - `?add=1` opens the create form only when online (same rule as the add button); it opens once the connection
    returns.
  - Open dialog while offline: warning inside the dialog, save/create button disabled; draft values and the create
    `requestId` are kept; on reconnection the same draft submits normally. Existing self-role protection, server errors
    and in-flight behaviour unchanged.
- Tests (`AdminUsersPage.test.tsx`, +5, all **RED before → GREEN**): offline `?add=1` opens no form + explanation;
  linked form opens after reconnection; open edit form disabled on connectivity loss with draft kept; direct submit
  offline → `updateUserByAdmin` not called; create draft offline → direct submit blocked (0 calls), button disabled,
  after reconnection the same draft submits with a `requestId`.
- Real Chromium (Playwright offline mode fires the browser `offline` event), 390 and 1280 px: save disabled, Enter keeps
  the dialog open without submitting, draft "עובדת חדשה" kept; online again → save enabled.
  `docs/ui-review/ui3/r1-390-users-dialog-offline.png`, `r1-1280-users-dialog-offline.png`.

## UI3-R2 (Important) — report functionality on phones / zoom
- `src/components/DiscardReport.tsx` (phone branch, < 600 px): sort control "מיון לפי" with the **same five keys and
  labels as the desktop headers** (שם המוצר, כמות כוללת נזרקת, מספר זריקות, ממוצע לזריקה, זריקה אחרונה) and a 44 px
  direction button (accessible name "כיוון מיון: יורד/עולה"), both driving the existing `sortKey`/`sortOrder` state;
  each card shows "ממוצע לזריקה: <value> ק״ג/יח׳" from the existing `averageQuantity` (rounded to ≤ 2 decimals, no
  string stripping; kg/units never mixed). Desktop table unchanged.
- Tests — new `src/components/DiscardReport.mobile.test.tsx` (phone branch forced via `useMediaQuery`, 5 tests): average
  with correct unit + separate kg/unit totals; real ordering changes for every key in both directions; sorting
  combined with search and the reason filter (server reason argument asserted, sort kept); 44 px controls and one-row /
  empty reports; average formatting (60 stays 60, 1.5 units shown). First four **RED before → GREEN**; the formatting
  test guards a bug I caught in my own first draft (a trailing-zero regex would have shown 60 as 6).
- Real Chromium 390 px: sort by "מספר זריקות" applied, overflow 0 px; 1280 px table unchanged, overflow 0 px.
  `docs/ui-review/ui3/r2-390-report-phone-sort-average.png`, `r2-1280-report-table.png`.
- Note (existing scope, unchanged): the report groups by product + unit and does not show department, so same-name bar
  and kitchen products appear as two rows without a department label (desktop and phone alike).

## UI3-R3 (Minor, coordinated) — unchanged: header menu button still `aria-label="menu"` until Codex changes the browser
selector together with it (request UI3-1).

## Checks (this checkpoint)
- `npm run test:run`: 41 files, **354/354 pass**. `npm run build`: PASS. `npm run lint`: 0 errors / 7 existing warnings.
  `git diff --check`: clean.
- `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:browser` (unmodified, full output): exit 0, **Running 5 tests
  … 5 passed (23.2 s)**.
- NOT RUN: real phones/keyboards/screen readers.

Task / bounded subtask (accepted by Codex at `5c518c6`): **UI2 follow-up — Codex review UI2-R1 / UI2-R2** (`docs/CODEX_REQUESTS.md` at `c4df88e`)
Status: **UI2 READY (corrected)** — supersedes UI2 at `ab52a6c`. UI3 (`741333a`) remains READY FOR CODEX REVIEW and is
contained in this checkpoint. Not deployed; `main` not touched.
Integrated Codex SHA: `c4df88e` (UI2 review, docs only), normal merge.
Last previously confirmed remote SHA: 741333a6e1b80cb59e45fab9f4909ed123d4ec0d

## UI2-R1 (Important) — pending opening dialog could be dismissed
- Cause (as reported): `FloatingActionButton` closed the dialog unconditionally (header "סגירה", backdrop, Escape) while
  `OpenItemForm` awaited `openInventoryItem`; closing unmounted the form, its values and its intent ref.
- Fix (presentation only; payloads, operation IDs, queue, server untouched):
  - `OpenItemForm`: new **optional** `onBusyChange?(busy)` prop, reported from the existing `submitting` state and
    reset to false on unmount. Existing props unchanged.
  - `FloatingActionButton`: while busy, `handleCloseModal` is a no-op (header button and backdrop), `disableEscapeKeyDown`
    is set, and the header button stays focusable with `aria-disabled="true"` and an explanatory title. Close works
    again as soon as the request succeeds, returns a local (pending) receipt, or fails.
- Tests — new `src/components/OpenItemDialog.integration.test.tsx` with the **real wrapper + real form** (API boundaries
  mocked, synthetic fixtures), Codex's reproduction adopted unweakened:
  1. pending submission + Escape (focus on the header close button) / header click / backdrop → dialog, amount value and
     "שולח..." remain; exactly one API call (×3) — **RED before, GREEN after**;
  2. pending → rejected (`unavailable`): error shown, values kept, submit re-enabled, retry sends an **identical** input
     (same `operationId` and `openedAtMs`) — **RED before, GREEN after**;
  3. pending → `synced` and → `pending` (local) receipts: truthful message, normal close restored, focus returns to the
     opener (guards); idle Escape close still works (guard).
## UI2-R2 (Minor) — desktop evidence
- 1280 px before (pre-UI2 tree `75c68f1`, built in a temporary worktree, removed afterwards) and after, synthetic data:
  `docs/ui-review/ui2/before-1280-open-dialog.png`, `before-1280-open-dialog-short-460.png`, `before-1280-close-dialog.png`,
  `after-1280-open-dialog.png`, `after-1280-open-dialog-short-460.png`, `after-1280-close-dialog.png`; 390 px re-captured
  on this tree: `after-r1-390-open-dialog*.png`.
- Short-height measurement (viewport 1280×460, amount focused, invalid value): before — submit 475–519 px, **off-screen**;
  after — submit 362–410 px, visible; amount visible in both. 390×460 after: amount 219–272, submit 404–452, visible.
  Action dialog targets after: finished 56 / discarded 56 / ביטול 44 / confirm 44 px (before 42/42 choices).
- This is a reduced headless viewport, **not** a real phone keyboard. Real iPhone/Android keyboards and screen readers:
  **NOT RUN**.

## Checks (this checkpoint)
- `npm run test:run`: 40 files, **344/344 pass**. `npm run build`: PASS. `npm run lint`: 0 errors / 7 existing warnings.
  `git diff --check`: clean.
- `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:browser` (unmodified, full output): exit 0, **Running 5 tests
  … 5 passed (22.6 s)**.
- Changed files: `src/components/OpenItemForm.tsx`, `src/components/FloatingActionButton.tsx`,
  `src/components/OpenItemDialog.integration.test.tsx` (new), screenshots above, this handoff.

Task / bounded subtask (READY FOR CODEX REVIEW at `741333a`): UI/UX round — **UI3 navigation, admin screens and final visual review**
Status: **UI3 READY FOR CODEX REVIEW**. UI1 (accepted at `4aae9eb`), UI2 (`ab52a6c`) and UI3 together form the UI
candidate. Not deployed; `main` not touched.
Last previously confirmed remote SHA: ab52a6c0cb511013909ed67816c393408f2eaa59

## UI3 — problems found (before, 390/1280 px, synthetic emulator data)
- Header: large clock card and "TossIt Enterprise" tagline (desktop), English menu-button name, page title "לוח הבקרה".
- Admin panel: gradient banner "פאנל ניהול מתקדם", centred section headings, oversized tabs.
- Users / fridges: inline-styled buttons ("חזרה לפאנל ניהול", green "לוח בקרה", ~30 px "ערוך"/"מחק"), long blue
  instruction boxes, cramped tables at 390 px; the users add/edit form was a hand-built overlay **without focus trap**.
- Products: duplicated "ניהול מוצרים" heading, inline-styled add button, table squeezed at 390 px.
- Discard report: emoji title and four full-width gradient blocks before data; **totals summed kg and units together**
  and averaged them (meaningless mixed number).
- Login: bright blue Google button, 4 px radii, no visible focus ring.
- Screenshots: `docs/ui-review/ui3/before-*.png`, overview `before-sheet-390.png`.

## UI3 changed files
- `src/components/layout/PageHeader.tsx` (new): one h1, optional one-line description, actions; wraps on phones.
- `src/components/UnifiedNavigation.tsx`: flat teal app bar, logo + current page as plain text (pages own their h1),
  44 px menu button with focus ring, removed decorative clock card and tagline, 48 px menu items; menu labels aligned
  with page titles ("מלאי", "ניהול"); role-based visibility unchanged.
- `src/pages/AdminPanel.tsx`: PageHeader "ניהול" + scope description; simple outlined panel and tabs; right-aligned h2
  section headings. (The inventory tab's older sub-tabs were left as-is — see known issues.)
- `src/pages/AdminUsersPage.tsx` (logic unchanged): PageHeader with "הוסף משתמש"; offline → warning + add/edit/
  deactivate disabled; users as cards (name, LTR email, "אתה"/"מושבת", role/department chips) with 44 px actions named
  per user ("עריכה — X", "השבתה — X"); self-deactivation still disabled; add/edit form is now an MUI **Dialog**
  (focus trap, Escape, focus returns to the opener) with the same fields/placeholders/titles.
- `src/pages/AdminFridgesPage.tsx` (logic unchanged): PageHeader with "הוסף מקרר", offline warning, cards with
  department chip and 44 px named actions ("עריכה — X", "מחיקה — X").
- `src/components/ProductManagement.tsx` (logic unchanged): MUI alerts, 44 px add button, product cards with shelf
  life/unit/department/fridge chips and 44 px named actions; form fields min-height 44 px; no duplicated heading.
- `src/components/DiscardReport.tsx`: h2 "דוח זריקות" + description; compact filter row (dates, reason, search, 44 px);
  four small stats — events, products, **kg total and units total shown separately** (mixed total/average removed);
  phone (< 600 px) shows per-product cards, tablet/desktop keeps the sortable table.
- `src/features/reports/ReportsPage.tsx`, `src/features/settings/SettingsPage.tsx`: PageHeader.
- `src/pages/LoginPage.tsx` (CSS only): 48 px inputs/buttons, 10 px radii, neutral Google button, visible focus rings.
- Tests: UnifiedNavigation +2 (Escape returns focus to the menu button; title is plain text, no tagline/clock),
  AdminUsersPage +3 (offline actions disabled with explanation; labelled dialog returns focus; per-user action names),
  AdminPanel +1 (plain h1 "ניהול"), AdminFridgesPage +1 (one h1, per-fridge action names); existing tests updated only
  for renamed accessible names (`/^עריכה/`, `/^מחיקה/`), card containers and the report's separate kg/units totals.
  RED before: 6 of the new assertions (Escape guard already passed and stays as a guard).

## UI3 checks
- `npm run test:run`: 39 files, **337/337 pass**. `npm run build`: PASS. `npm run lint`: 0 errors / 7 existing warnings.
  `git diff --check`: clean.
- `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:browser` (unmodified, full output): exit 0, **Running 5
  tests … 5 passed (24.0 s)** — including admin employee creation through the redesigned users page.
- Real Chromium, synthetic data, admin at 390 / 640 (=1280 at 200 % zoom) / 1280 px on `/admin`, products, reports tab,
  `/admin/users`, `/admin/fridges`, `/reports`, `/settings`: page overflow **0 px everywhere**. Interactive elements
  under 40 px that remain are inner `<input>` elements of 44 px MUI fields, MUI's hidden native select input, and the
  three settings switches (38 px; the whole label row is also clickable) — not independently measured hit regions.
- Screenshots: `docs/ui-review/ui3/after-*.png`, overview `after-sheet-390.png`.
- NOT RUN: real iPhone/Android, screen readers, staff-account pass through every admin URL beyond the existing
  browser test (staff denied `/admin/users`).

## UI3 known issues / requests
- Request UI3-1: header menu button accessible name is still English "menu" (Codex browser spec selects it). Flip
  together.
- Admin panel "מלאי מוצרים" tab still uses its older sub-tabs (מוצרים פעילים / פג תוקף בקרוב / נזרקו / נגמר); the
  item cards inside are the new UI1 cards. Candidate for a follow-up if wanted.
- Request UI1-1 (expiring window) still open, non-blocking.

Task / bounded subtask (historical): UI2 fast, truthful opening and closing — READY at `ab52a6c`.
Integrated Codex SHA: `4aae9eb` (Codex merge of corrected UI1 + acceptance; fast-forward, docs only).
Last previously confirmed remote SHA: 75c68f118015144b7c7e7c1087a5f5c8480b25aa

## UI2 — problems found (before, 390 px, synthetic emulator data)
- Open-item dialog floated mid-screen; with an emulated keyboard (viewport 390×460, amount focused) the submit
  "פתח פריט" was at 479–527 px — **off-screen**; dialog header clipped. Title duplicated ("פתיחת פריט - בר" header +
  "פתיחת פריט — בר" in the form). An invalid amount showed twice (top banner + helper). Empty amount showed a stray
  unit "יחידות". Screenshots: `docs/ui-review/ui2/before-390-open-dialog.png`, `before-390-open-dialog-keyboard-460.png`.
- Finished/discarded dialog: choice rows 42 px (< 44); the confirm button used the shared `ui/Button` `loading` prop,
  which replaces the label with a generic "טוען..." (the intended "שולח..." never appeared).
  `docs/ui-review/ui2/before-390-close-dialog.png`.
- Already correct and now locked by tests: Escape restores focus to the opener; focus stays inside the action dialog.

## UI2 changed files
- `src/components/FloatingActionButton.tsx`: MUI `Dialog` (was `Modal`), **full screen below `sm`**, one title
  "פתיחת פריט — <מחלקה>" labelling the dialog (`aria-labelledby`), 44 px "סגירה" button; MUI focus trap and focus return.
- `src/components/OpenItemForm.tsx` (props unchanged; open/intent/receipt logic unchanged): no own heading (form keeps
  an accessible name); **sticky action footer** holding server error/receipt messages + "פתח פריט" (`data-testid=
  open-item-footer`, safe-area padding); invalid amount shown **once**, on the field (`aria-invalid`), and **focused**;
  unit adornment only when a product is selected; hints ("בחר מוצר כדי להזין כמות", "אפשר משקל עשרוני", "מספר שלם של
  יחידות"); 48 px selects/options; `enterKeyHint=done`; values and retry intent retained after failure.
- `src/components/ui/ItemActionModal.tsx` (props/`ItemActionConfirm` unchanged): dialog labelled by its title; finished /
  discarded as 56 px bordered options; reasons 44 px; buttons 44 px; "שולח..." while sending (no generic loading label);
  Escape/backdrop ignored while sending (existing guard, now tested).
- Tests: OpenItemForm +3 (`retains values and retry intent after failure`, `shows an invalid amount once, on the field,
  and moves focus there`, `keeps the submit button and any server error in the action footer`); new
  `FloatingActionButton.test.tsx` (2: labelled dialog/title once/focus restored on Escape; close button); new
  `ui/ItemActionModal.test.tsx` (3: 56 px choices, discard requires reason with exact confirm values, blocked while
  sending); ItemsList +2 (`restores focus to the item action button when the dialog is dismissed`, `prevents a repeated
  close while the first request is pending`); SyncStatus +1 (`keeps a failed operation distinct from the disconnected
  state`). Existing concurrent-close, offline receipt, off-shift and retry-ID tests preserved. RED before: 6 of the new
  assertions (invalid-once/focus, footer, 56 px, sending label ×2, dialog title/focus).

## UI2 checks
- `npm run test:run`: 39 files, **330/330 pass**. `npm run build`: PASS. `npm run lint`: 0 errors / 7 existing warnings.
  `git diff --check`: clean.
- `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:browser` (unmodified script, full output kept): exit 0,
  **Running 5 tests … 5 passed (23.5 s)**.
- Real Chromium, synthetic emulator data: at 390×460 (emulated keyboard) amount field 219–272 px and submit 404–452 px
  — both visible (before: submit off-screen). Also at 1280×460: submit visible. Escape from the open dialog → focus on
  "פתיחת פריט"; action dialog: focus inside the modal; targets finished 56 / discarded 56 / ביטול 44 / סמן כנגמר 44 px.
  Page overflow 0 px at 390 and 1280. Screenshots: `docs/ui-review/ui2/after-390-open-dialog.png`,
  `after-390-open-dialog-keyboard-460.png`, `after-390-close-dialog.png`.
- NOT RUN: real iPhone/Android on-screen keyboard (headless emulation by viewport height only), screen readers.
- No change to `useCloseItem`, receipts, operation IDs, offline queue, worker, `SyncStatus`/`OfflineIndicator` source.

Task / bounded subtask (accepted by Codex at 4aae9eb): UI1 correction — Codex review R1–R4 (docs/CODEX_REQUESTS.md at `f5ce297`)
Status: **UI1 READY (corrected)**. Supersedes the earlier UI1 READY at `a8ed3b3`. Not deployed.
Integrated Codex SHA: `f5ce297` (security/dependency checkpoint + review requests), normal merge, `npm ci` + `npm ci --prefix functions`.
Last previously confirmed remote SHA: a8ed3b353a145fe23db773b26a4d3d7128592fa3

## R1–R4 resolution
- **R1 (Important) — stale hidden status filter hid discarded stock.** `ItemsList.tsx`: the status filter applies only in
  modes where its control is shown (`effectiveStatusFilter`), `filtersActive` uses the effective value, and the selection
  resets to "הכל" whenever the mode changes. Search/fridge semantics unchanged. Tests: Codex's mode-transition
  reproduction (inventory "פג תוקף" → "נזרקו" shows the discarded item, no false no-match message) + return to inventory
  ("הכל" pressed, open item visible) — **RED before, GREEN after**; genuinely empty discarded scope shows "אין פריטים שנזרקו"
  without "נקה חיפוש וסינון" (guard).
- **R2 (Minor) — 44 px targets.** Status chips `min-height: 44px`; search and fridge inputs `min-height: 44px`. Test asserts
  computed 44 px for all three (RED before). Real Chromium at 390 px: overflow 0 px, visible focus ring on a chip after Tab —
  `docs/ui-review/ui1/r2-390-controls-44px-focus.png`.
- **R3 (Minor) — department identity in combined scope.** When no department filter is applied and the viewer can see all
  departments (admin "נזרקו"), each card shows a department chip from `departmentLabel(item.area)` (existing normalized
  data; no query change). Single-department tabs do not repeat it. Tests: same-name "לימון" bar + kitchen discarded items
  → labels "בר" / "מטבח" (RED before); single-department tab has no label (guard). Screenshots:
  `docs/ui-review/ui1/r3-390-admin-discarded-department-labels.png`, `r3-1280-admin-discarded-department-labels.png`.
- **R4 — evidence correction.** The earlier UI1 handoff said "4/4 browser tests". That was wrong: the spec has **5** tests
  and my command output was piped through `head -10`, which (after five emulator warning lines) cut off the fifth test and
  the summary line. No test was removed or skipped. This checkpoint ran the repository script unmodified, full output kept:
  `E2E_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:browser` → exit 0, "Running 5 tests using 1 worker",
  **5 passed (22.1 s)**, including "admin creates an employee through the configured external callable host".

## Corrected UI1 checks
- `npm run test:run`: 37 files, **319/319 pass**. `npm run build`: PASS. `npm run lint`: 0 errors / 7 existing warnings.
  `git diff --check`: clean. `npm run test:browser`: **5/5 PASS** (above).
- Changed files: `src/components/ItemsList.tsx`, `src/components/ItemsList.test.tsx` (+5 tests),
  `src/components/inventory/InventoryItemCard.tsx` (optional `departmentName` prop), screenshots above.
- Request UI1-1 (expiring window) acknowledged by Codex as non-blocking; 72 h policy unchanged.

Task / bounded subtask (historical, superseded above): UI1 inventory hierarchy and visual foundation at `a8ed3b3`
Status at the time: UI1 READY — **browser count in that entry was wrong (see R4 above)**.
Round starting HEAD: `381d7e4` (plan publication; includes live main `6addce2`), fast-forward from `357bf15`.
Last previously confirmed remote SHA: 381d7e4e0996203afc3e5e63286c041eb0e12f8c

## UI1 — problems found (before, synthetic emulator data, 390/1280 px)
- 390 px first screen had no inventory: large gradient greeting, big red end-shift button, four KPI cards; the list
  started ~2.5 screens down. The only open action was an unlabeled floating "+". Full page 2760 px tall.
- Status pills in English ("EXPIRING SOON") with yellow-on-yellow text; vague "עדכן סטטוס" on every card; quantity
  "kg 0.5" (English unit, reversed); nested cards, purple department header with emoji, oversized search box; grouping
  by fridge instead of urgency; dates in the browser's time zone.
- Screenshots: `docs/ui-review/ui1/before-390-staff-first-screen.png`, `before-390-staff-full.png`,
  `before-1280-admin-first-screen.png`.

## UI1 — layout implemented
Compact identity row (name, role, department, compact shift control) → department tabs + "נזרקו" → inventory header
"מלאי <מחלקה>" with a labelled **"פתיחת פריט"** button → search + fridge filter → status filter chips with counts
("הכל / פג תוקף / עומד לפוג / בתוקף") → one urgency-ordered list (existing selector order: soonest expiry first),
1 column on phones, 2 at ≥600 px, 3 at ≥1200 px. The four KPI cards are no longer rendered on the dashboard (their
counts duplicated the list with a separate data path); the status chips give the same counts from the same selector.
- Screenshots: `docs/ui-review/ui1/after-390-staff-first-screen.png`, `after-390-staff-full.png` (page now 1298 px),
  `after-1280-admin-first-screen.png`, `after-320-staff-first-screen.png`, `after-768-staff-first-screen.png`.

## UI1 changed files
- `src/components/inventory/InventoryItemCard.tsx` (new, presentational): name wraps (`overflow-wrap:anywhere`), status
  chip = Hebrew text + icon + colour + coloured edge (never colour alone), quantity in natural RTL ("0.5 ק״ג", "2 יח׳"),
  expiry (Asia/Jerusalem) + relative ("בעוד 9 שעות" / "לפני 24 שעות"), opened time, fridge only if the item has one,
  queued state chip ("ממתין לשליחה" / "הפעולה נכשלה") alongside the expiry status, closed-item details, 44 px action
  "נגמר / נזרק" with a per-item accessible name. Dates/times in an LTR isolate span.
- `src/features/presentation/inventoryDisplay.ts` (new): `displayStatus` derives status **only** from `selectItems`
  modes (expired / expiring / discarded / finished); Hebrew labels; quantity/date/relative formatting (display only).
- `src/components/ItemsList.tsx`: render rewritten with MUI (≈900 lines of custom CSS removed); data/action logic,
  props and `selectItems`/`useCloseItem`/`useOffline` usage unchanged. Distinct states: loading; **error as `role=alert`**
  (never shown as empty); **empty scope** ("אין פריטים פתוחים כרגע" + scope); **no matches** ("אין פריטים שתואמים לחיפוש או
  לסינון" + "נקה חיפוש וסינון"); offline note; off-shift note. No longer uses `utils/expiryUtils` (browser-time-zone
  dates, English labels).
- `src/pages/Dashboard.tsx`: new hierarchy above; `DashboardKPIs` no longer rendered (file untouched).
- `src/components/FloatingActionButton.tsx`: optional `variant?: 'fab' | 'inline'` (default unchanged).
- `src/components/ShiftButton.tsx`: compact visual (44 px, "סיום משמרת" outlined red instead of a large red block).
- Tests: new `InventoryItemCard.test.tsx` (3), `inventoryDisplay.test.ts` (2); ItemsList +4 (`keeps expiry and
  failed-sync labels visible together`, `distinguishes empty scope from no search matches`, `keeps permission errors
  visible instead of an empty list`, `filters by status with counts that match the list`) — all observed RED before the
  change; Dashboard +1 (`preserves staff department restrictions and puts the open action before the list`).

## UI1 checks (all on this checkpoint)
- `npm run test:run`: 37 files, **314/314 pass** (baseline 304). `npm run build`: PASS. `npm run lint`: 0 errors / 7
  existing warnings. `git diff --check`: clean.
- ~~Browser suite 4/4 PASS~~ — incorrect (output truncated; the suite has 5 tests). Corrected run: 5/5 PASS, see R4.
- Narrow screen: page-level horizontal overflow **0 px** at 320, 390, 640 (=1280 at 200 % zoom), 768, 1280 (measured
  `scrollWidth - clientWidth`). Long Hebrew name wraps without hiding the action; decimal kg; item without fridge shows no
  fridge; expired + queued labels together (unit test).
- Keyboard (390 px): Tab order = shift → tabs → **פתיחת פריט** → search → fridge → status chips → each item's action
  → header; Escape from the action dialog returns focus to its opener. Dialog focus containment not asserted yet
  (probe measured the wrong element) — verified in UI2.
- NOT RUN: real iPhone/Android, screen readers.

## UI1 known issues / requests
- Request UI1-1 (CLAUDE_REQUESTS): 3-day "expiring" window marks short-shelf-life products as expiring immediately.
- The header (`UnifiedNavigation`: clock box, "TossIt Enterprise") still has old styling — UI3.

Task / bounded subtask: U5 — C5 candidate integration, push helper/error codes, README and demo/pilot docs
Status: **All Claude tasks U1–U5 done in code/docs.** Remaining items are owner/manual: deployment per docs/RELEASE.md, real-device checks and the pilot (docs/PILOT.md, all NOT RUN).
Last previously confirmed remote SHA: 1cd48edadc9c718c0890244d2ede7c66ee450117 (U4c)

## Integrated other-agent SHAs
- C1 `70d953e`, C2 `1f55cc4`, C3 `89920b2`, C4 `818931e`, **C5 `1294636`** (docs-only successor of tested `3be1d67`; after the merge the tree equalled `1294636` exactly).

## U5 changes
- U5a (`f294cfc`): `src/pwa/pushEnv.ts` uses Codex `isPushConfigured()`; `errorMessage` maps `not-configured`, `worker-not-ready`, `worker-outdated`, `offline`; NotificationControls: invalid key at enable → not-configured state; offline disable → "saved, completes when online". Tests +2.
- U5b: `README.md` rewritten to verified behaviour only (status banner: release candidate, not deployed; roles/permissions; inventory; offline scope; PWA/notifications with deployment requirement; architecture; local emulator demo incl. first-admin bootstrap; test matrix; deployment pointer; explicit "not verified yet" list; warning that plain `npm run dev` targets the live project). `docs/PILOT.md`: 10-minute emulator demo script with exact UI labels, "already automated" section (no double-claiming), device checklists (iPhone/Android/desktop, offline, push), Hebrew/mobile/accessibility checks, real pilot — all NOT RUN.

## U5 checks
- `npm ci`, `npm ci --prefix functions`, `npm run build`: PASS. `npm run test:run`: 34 files, 298/298 pass. `npm run lint`: 0 errors / 7 warnings. `git diff --check`: clean.
- **Real browser suite run locally on claude/tossit-ui** (emulators auth+firestore, Playwright with /opt/pw-browsers/chromium): 4/4 PASS — single worker/no prompt/offline deep link; offline opening survives reload and replays once with original catalog values; staff denied admin users incl. deep link; offline intent private across logout until the original account returns.
- NOT RUN here: `test:rules`, `test:callables` (Codex/CI report pass; native Functions worker cannot start on this host); real devices; deployment; pilot.

## Remaining (owner / manual)
1. Review the integrated candidate; merge to `main` only after review (not done by agents).
2. Deployment prerequisites and deploy per docs/RELEASE.md (billing for scheduler, VAPID keys, rules + functions, first-admin bootstrap, profile review).
3. Device checks and pilot per docs/PILOT.md; record PASS/FAIL with SHA.
4. Optional later: employee reactivation lifecycle (not offered by C1); a product unit cannot be changed after creation.

## U4c changed files
- `src/pwa/NotificationControls.tsx` (new): reads `getPushNotificationState()` on open (no prompt, no subscription); "הפעל התראות במכשיר הזה" calls `enablePushNotifications()` directly from the click (browser prompt only there); "enabled" shown only for the server-confirmed result; rejection (e.g. disconnect mid-registration, account change) → Hebrew error, state re-read, never "enabled"; `denied` → browser-settings guidance + "בדוק שוב" (no enable button); `unsupported` → no fake enable, iPhone-not-installed gets Home Screen instructions; `pending-disable` shown separately with retry; read errors retryable; role-specific description of what is sent; missing `VITE_VAPID_PUBLIC_KEY` → "not available yet", no button, no state read.
- `src/pwa/pushEnv.ts` (new): `pushConfigured` (presence only; request C4-1 to replace with a Codex export), `needsHomeScreenInstall`.
- `src/components/UnifiedNavigation.tsx`: "התראות במכשיר" menu item for **all roles** (staff receive evening reminders; Settings is admin-only) opening a dialog with the controls.
- `src/features/common/errorMessage.ts`: `failed-precondition`, `internal`.
- Tests: `NotificationControls.test.tsx` (10), nav matrix updated.

## C4 / U4c checks
- `npm ci`, `npm run build`: PASS (injectManifest, one `service-worker.js`). `npm run test:run`: all files pass (Claude UI + Codex C1–C4 client suites). `npm run lint`: 0 errors. `git diff --check`: clean.
- Chromium smoke on the merged build (`serve -s dist`): 1 registration `/service-worker.js` scope `/`, 12 precached files, **0 permission requests on load**, offline deep-link reload renders the app, no failed requests/page errors. Verified C4 code contains no `serviceWorker.register` / `new Notification(`.
- NOT RUN: real push delivery (needs VAPID keys, deployed functions, billing per docs/RELEASE.md), real iPhone/Android opt-in and closed-app delivery — see docs/PILOT.md.

## C3 integration changes
- `src/app/main.tsx`: `OfflineProvider` mounted once, directly inside `AuthProvider`, wrapping Notification/Shift providers, App, PWAPrompt and OfflineIndicator (as specified by Codex).
- `src/pwa/SyncStatus.tsx` (new) in the header: separate chips "N ממתינות לשליחה" / "N נכשלו" (hidden when zero); dialog lists pending ("נשמר במכשיר, ממתין לשליחה") and failed operations with Hebrew reason by `errorCode`; "נסה שוב" only for failed, calls `retry(operationId)` (same operation), retry errors shown; storage-unavailable warning.
- `src/components/UnifiedNavigation.tsx`: logout asks for confirmation when unsent work exists, explaining it stays on this device for the same account.
- `src/pwa/OfflineIndicator.tsx`: offline banner now states exactly that opening/closing items is saved on the device and sent later, and other changes need a connection.
- `src/components/OpenItemForm.tsx`, `FloatingActionButton.tsx`, `ItemsList.tsx`, `Dashboard.tsx`: opening and closing are allowed offline (durable write-ahead in C3); `pending` receipts are reported as "saved on the device, not yet saved on the server"; items with pending/failed operations get badges ("ממתין לשליחה" / "הפעולה נכשלה"); offline list note says it shows the last state saved on the device. Settings, catalog, fridges, users and shift changes still require a connection.
- Dashboard no longer clears any localStorage queue (done in U2a); worker never touches IndexedDB/localStorage (U4a).
- Tests: `SyncStatus.test.tsx` (4); ItemsList (+2: badges, offline pending close), OpenItemForm (offline pending), UnifiedNavigation (+1 logout warning), OfflineIndicator updated.

## C3 integration checks
- `npm ci`, `npm run build`: PASS (injectManifest, 18 precache entries). `npm run test:run`: 31 files, 275/275 pass (Claude UI + Codex C1–C3 client suites). `npm run lint`: **0 errors** / 7 warnings. `git diff --check`: clean.
- NOT RUN: real browser offline sign-in/reload/replay with real Firebase (needs credentials/emulator in a browser), real device IndexedDB eviction/private mode, two-tab replay in a browser. Listed for U5/PILOT.

## U2c changed files
- `src/components/ShiftButton.tsx`: server-derived state only (ShiftContext/AuthContext); confirmation before ending a shift; disabled offline with explanation (an offline shift write would leave the button stuck); start time shown in Asia/Jerusalem; "התחלת משמרת" label; errors as alerts.
- Tests: `ShiftButton.test.tsx` (3).

## U2c checks
- `npm run build`: PASS. `npm run test:run`: 26 files, all pass. `npm run lint`: 2 errors / 6 warnings (Codex `syncManager.ts`). `git diff --check`: clean.

## U2b changed files
- `src/components/ItemsList.tsx` (data/action logic rewritten, rendering kept): one realtime `subscribeBusinessItems` subscription (server-scoped; other devices' opens/closes appear live; `refreshTrigger` now optional/unused); tab filtering via pure `selectItems` (canonical + legacy Hebrew departments, expiry re-evaluated every minute); closes via `useCloseItem`; success notice only after a receipt; already-closed and load errors explained in Hebrew; off-shift staff cannot open the action dialog; removed the localStorage `cachedItems_*` offline view and English error strings; department names via `departmentLabel` (legacy Hebrew no longer shows the wrong department).
- `src/hooks/useItemActions.ts` → `useCloseItem`: `closeInventoryItem({ operationId, itemId, action, discardedAmount?, reason? })`; one UUID per intent (item + action + amount + reason) reused on retry; no UI-supplied actor name/uid; repeated clicks ignored while sending.
- `src/components/ui/ItemActionModal.tsx` (rewritten): finished vs discarded; discarded requires amount (decimal kg / whole units, ≤ batch) and reason (פג תוקף / נפגם / אחר radio — the old free-text reason was keyword-guessed); states that the whole batch closes and the amount is recorded as waste; shows the last error and keeps the dialog open for retry; "closed elsewhere" state removes the confirm button.
- `src/features/inventory/itemSelection.ts`, `closeItem.ts` (new, tested). "Expired" now means expired and still open (needs handling); AdminPanel card relabelled "פג תוקף וממתינים לטיפול".
- Tests: `itemSelection.test.ts` (6, includes the C2 canonical-area regression), `ItemsList.test.tsx` (7).

## U2b checks
- `npm run build`: PASS. `npm run test:run`: 25 files, 225/225 pass. `npm run lint`: 2 errors / 6 warnings (Codex `syncManager.ts`). `git diff --check`: clean.
- NOT RUN: emulator/real Firestore concurrent closes from two devices (Codex reports transaction tests); manual two-device check listed for U5.

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
No further Claude implementation is scheduled. Fix owner-scoped issues found in review, device checks or the pilot, one commit per issue, each with tests and a pushed checkpoint. Do not remove Dashboard legacy queue code until C3c asks; never clear legacy keys. U4b (queue-aware status) after C3; U4c (notification controls) after C4.
Remaining U3: U3d settings after C2 `settingsAPI`; reactivation only if Codex publishes a lifecycle operation. Meanwhile U2 online parts wait for C2; U4 (service worker/PWA) can start with isolated worker tests per gate 4. Also review the "בדיקת איכות" (QA) tab and AdminPanel localhost debug card. U3d settings waits for C2 `settingsAPI`. When Codex marks C1 complete, merge that pinned SHA, re-run U1 tests and mark U1 done.

## Commands to resume
```bash
git fetch origin
git switch claude/tossit-ui
git status --short
git log -3 --oneline
npm ci && npm run build && npm run test:run && npm run lint
```
