# V1-R1 / V1-R2 / theme-color — fixes for Codex's V1 review (`docs/ui-review/V1_CODEX_REVIEW.md` on `codex/tossit-v1-review-notes`)

Real application with synthetic data: local Auth/Firestore emulators (`demo-tossit-auth`), admin account, 10 open rows including the long passion-fruit name, plus discarded rows that have two detail lines.

## Before and after

- `before-0092592-checks.txt`: the reviewed V1 build, light mode. **10/20 checks**.
  - R1 reproduces exactly as in the review: at 900px the action sits at `x=-45..48`, inside a list clipped at `24..876`. At 960px it starts at `x=15`.
  - The run also found that in V1 the side-by-side expired/discarded admin panels clip the action at **every** width up to 1280px.
  - The "0 table rows" alignment failures on that build only mean the old markup has none of the new test attributes; they are not evidence either way. R2 was reproduced by Codex separately.
- `after-checks.txt`: this checkpoint, light and dark. **40/40 PASS**.
- Screenshots: `after-{light,dark}-{900,1024,1280}-dashboard.png`, `after-{light,dark}-{900,1280}-discarded.png`, `after-{light,dark}-1280-admin-expired-discarded.png`, and `before-light-*` for comparison.

## What is checked

Each check runs at 899, 900, 960, 1024 and 1280px, in light and dark:

- **Visible and clickable actions.** On the dashboard, the admin inventory and the side-by-side expired/discarded panels, every "נגמר / נזרק — X" button:
  - lies inside its nearest clipping ancestor and the viewport;
  - is at least 44px tall;
  - is the element `elementFromPoint` hits at its centre.
- **Discarded rows.**
  - At 1024 and 1280 they render as table rows; their opening, remaining and expiry cells sit on the first line, centred under the matching column heading.
  - Below 1024 the list is narrower than 960px, so it uses stacked rows.

## Not run

Real devices, Safari, screen readers. Browser chrome colour (`theme-color`) is covered by DOM unit tests only; it was not observed on a device.
