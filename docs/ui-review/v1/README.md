# V1 evidence — compact inventory, navigation and light/dark appearance

Synthetic data only: local Auth/Firestore emulators, project `demo-tossit-auth`, with the build pointed at the emulators. No production data or traffic. Width and appearance are in each file name.

- `before-*`: the pre-V1 checkpoint `8a7fdae`, built and seeded the same way. It is light only, because dark mode did not exist before V1.
- `after-light-*` / `after-dark-*`: this checkpoint.
- `contrast.md`: WCAG contrast ratios for every semantic text/background pair and non-text boundary in both palettes. All pairs meet their targets. The same pairs are enforced by `src/app/theme.test.ts`.

## Screens

| Screen | Light | Dark |
| --- | --- | --- |
| Login, with the "נגישות" entry (390) | `after-light-390-login.png` | `after-dark-390-login.png` |
| Staff inventory, busy (390) | `after-light-390-staff-inventory.png`, `-full.png` | `after-dark-390-staff-inventory.png`, `-full.png` |
| "נגישות" menu (390) | `after-light-390-accessibility-menu.png` | `after-dark-390-accessibility-menu.png` |
| Opening dialog, invalid amount (390) | `after-light-390-open-dialog-invalid.png` | `after-dark-390-open-dialog-invalid.png` |
| Closing dialog (390) | `after-light-390-close-dialog.png` | `after-dark-390-close-dialog.png` |
| Offline with a queued opening (390) | `after-light-390-offline-pending.png` | `after-dark-390-offline-pending.png` |
| Admin inventory, all departments (1280) | `after-light-1280-admin-inventory.png` | `after-dark-1280-admin-inventory.png` |
| Opening / closing dialog (1280) | `after-light-1280-open-dialog.png`, `-close-dialog.png` | `after-dark-1280-open-dialog.png`, `-close-dialog.png` |
| Admin, reports, users, fridges, settings (1280) | `after-light-1280-{admin,reports,users,fridges,settings}.png` | `after-dark-1280-…` |
| Admin menu, reports (390) | `after-light-390-{admin-menu,reports}.png` | `after-dark-390-…` |
| 320px inventory and opening dialog | `after-light-320-*.png` | `after-dark-320-*.png` |

## Browser checks (Chromium, emulators): 20/20 PASS

The harness is a scratch script, not committed. It covers:

- **"נגישות" entry and appearance:** reachable on the login screen; `data-appearance` is applied at load in both modes.
- **Horizontal overflow:** none at 320, 390, 430 and 1280px, for inventory and the opening dialog, in both modes.
- **Queued work survives a mode switch:** an offline opening queued on the device stays queued through an appearance switch and an offline reload (1/1/1), and the new appearance persists after the reload.
- **System mode:** with no stored choice, the app follows a live device change from dark to light. An explicit "כהה" choice ignores a device change. Choosing "לפי המכשיר" again clears the stored choice.
- **No bright flash:** a returning dark-mode user gets a dark background (`rgb(17, 20, 24)`) before the app bundle runs. The check blocks the bundle to prove this.

## Not run

- Real iPhone or Android: Safari, installed PWA, keyboard, VoiceOver/TalkBack.
- Real-device or OS-level dark mode.
- A screen-reader pass.

Dark mode is a display preference. It is not presented as full accessibility compliance.
