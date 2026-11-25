# V3 evidence — admin, catalog, fridges, settings, reports and PWA controls

Synthetic data only: local Auth/Firestore emulators, project `demo-tossit-auth`. No production traffic.

- `before-{light,dark}-*`: the V1 checkpoint `0092592`, built and seeded the same way.
- `after-{light,dark}-*`: this checkpoint.
- File names give the width (390 or 1280) and the page:
  - `admin-inventory`;
  - `users`, `fridges`, `settings`;
  - `products` and `product-form`;
  - `reports` and `reports-date-dialog`.

## Browser checks (Chromium, emulators)

| Check | Before (V1 `0092592`) | After (this checkpoint) |
| --- | --- | --- |
| No horizontal overflow at 320px on users, fridges, settings, reports, products (including the open form) and admin inventory, light and dark | **FAIL**: reports overflowed by 12px (date button `minWidth: 320`) | PASS |
| Admin-inventory controls at least 44px at 320px (an input is measured by its field container), light and dark | PASS | PASS |

## Not run

- Real devices.
- Screen readers.

The "before" screenshots come from a run that skipped the interactive steps (`FULL=0`), so there are no "before" captures of the product form or the reports date dialog.
