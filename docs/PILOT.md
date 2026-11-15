# TossIt demo script and pilot checks

Record every manual check as **PASS / FAIL / NOT RUN** with date, device, OS/browser version and
build SHA. Desktop Chromium results do not prove iPhone behaviour. Do not report a pilot result that
was not actually observed.

Candidate under test: Codex C5 `3be1d67` (tested code) / `1294636`, plus Claude U5 checkpoints on
`claude/tossit-ui`. Not deployed; `main` unchanged.

## Demo script (about 10 minutes)

Runs entirely on the local emulators (see README → "Local demo with emulators"). Use two browser
windows (or a desktop window and a phone-sized window): **A = admin**, **B = staff**.

1. **Admin setup (A).** Sign in as the emulator admin.
   - Menu → "ניהול מקררים" → "הוסף מקרר": `מקרר בר 1`, department בר.
   - Menu → "ניהול מערכת" → tab "ניהול מוצרים" → "הוסף מוצר חדש": `חלב`, 2 days, ק"ג, בר, fridge `מקרר בר 1`.
     Try `1.5` days → rejected (whole days only).
   - Menu → "הוסף משתמש חדש": staff member, department בר, initial password. (Needs the Functions
     emulator; the admin stays signed in.)
   - Show "/register": no sign-up form, only "איך מקבלים גישה ל-TossIt?".
2. **Staff permissions (B).** Sign in as the new staff member. Only the "בר" tab is visible; opening
   `/admin/users` directly shows "אין הרשאה". The open-item form says a shift is required, and
   "עדכן סטטוס" on items is disabled.
3. **Shift and opening (B).** "התחלת משמרת" → "פתיחת פריט" → `חלב`, amount `0.5` → "פתח פריט".
   Confirmation shows the expiry (opening time + 2 days, Israel time). Window A shows the item live.
4. **Offline (B).** DevTools → Network → Offline. Banner explains what is kept on the device. Open
   another `חלב` 0.25 → "נשמר במכשיר וממתין לשליחה"; header shows "1 ממתינות לשליחה"; the item is
   badged "ממתין לשליחה". Reload the page (still offline): the pending item is still there.
   Go back online: the chip and badge disappear; window A shows the item with the **original** opening time.
5. **Concurrent close.** In A and B open "עדכן סטטוס" on the same item. A: "סמן כנגמר".
   B's dialog closes by itself with "כבר עודכן ממכשיר אחר" (live update). If B submits before the
   update arrives, B gets "הפריט כבר סומן כנגמר או כנזרק על ידי פעולה אחרת" — never a success.
6. **Discard.** B: discard the other item, 0.2 kg, "פג תוקף". A: menu → "דוחות" → filter reason
   "פג תוקף" and today's date → the 0.2 kg discard appears; "נפגם" shows nothing.
7. **Unsent work at logout.** B offline: open an item (pending) → "התנתק" warns about 1 unsent
   action; cancel. (Isolation between accounts on one device is covered by the automated browser
   test below; on a phone it is checklist item "Offline inventory on devices" 6.)
8. **App behaviour.** Menu → "התראות במכשיר": shows "not available yet" without VAPID keys (expected
   locally); no permission prompt ever appeared on load. Admin → "הגדרות": toggle a setting, save →
   "ההגדרות נשמרו".

## Already automated (do not re-claim as manual results)

Verified on the integrated candidate (GitHub Actions run 42708118669 and locally on
`claude/tossit-ui` after merging C5, 4/4 Playwright tests against Auth/Firestore emulators):
- one root worker `/service-worker.js`, no notification prompt on load, offline deep-link reload;
- offline opening survives reload, replays exactly once with the original catalog values;
- staff cannot open admin users, including by deep link;
- logout keeps an offline action private until the original account returns.

Also verified in Chromium against a local `serve -s dist` build (U4a): a new deploy waits, the
update dialog appears, accepting it activates the new worker and removes only the previous TossIt
precache; 12 precached build files.

## PWA install and updates — devices

### iPhone (Safari, installed to Home Screen) — NOT RUN
1. Open the production URL in Safari → Share → "Add to Home Screen". Icon is the teal TossIt tile, name "TossIt".
2. Launch from the Home Screen: opens standalone (no Safari bars) at `/dashboard` (or login), RTL layout, safe areas not clipped (notch/home bar).
3. Sign in, navigate to an admin deep link, close the app fully, enable Airplane Mode, relaunch: app shell loads; screens that need the server show errors, not fake success.
4. Deploy a new build, relaunch: update dialog "גרסה חדשה זמינה"; "מאוחר יותר" leaves a banner; "עדכן עכשיו" reloads to the new version; still signed in.
5. Notifications: menu → "התראות במכשיר". No prompt on launch; the browser prompt appears only after tapping "הפעל התראות במכשיר הזה" inside the installed app (iOS 16.4+). In Safari (not installed) the dialog shows Home Screen instructions instead.

### Android (Chrome) — NOT RUN
1. Install via the browser menu / install prompt; icon uses the maskable variant (no white square edges).
2. Repeat steps 2–4 above.

### Desktop (Chrome/Edge) — partially automated
- Install from the address-bar icon; repeat steps 3–4.

## Offline inventory on devices (C3 + U2/U4b) — NOT RUN
1. Signed in online on the phone, open the Dashboard once (caches profile/catalog). Enable Airplane Mode.
2. Open a 0.5 kg item: confirmation says it is saved on the device and not yet on the server; header shows "1 ממתינות לשליחה"; the item shows "ממתין לשליחה".
3. Close the app fully, relaunch offline: the pending item and badge are still there.
4. Reconnect: the chip disappears after the server acknowledges; the item has the original opening time/expiry (not the reconnect time).
5. On a second device, close the same item while the first is offline and closes it too: one device shows "הפעולה נכשלה" with "already closed" in the header list; no double close in the discard report.
6. With pending work, tap "התנתק": warning lists the unsent count; sign in as a different account on the same phone: the first account's pending work is not shown or sent; sign back in as the first account: it is sent.

## Push notifications on devices (C4 + U4c) — NOT RUN (requires deployment prerequisites in docs/RELEASE.md)
1. Admin: Settings → evening reminders and morning summary on; save.
2. Staff phone (installed app): "התראות במכשיר" → enable → allow. Dialog shows "ההתראות מופעלות במכשיר הזה".
3. Start a shift, leave an expired item open in the department, close the app fully. At 23:00/23:20/23:40 Israel time one notification each (no duplicates across devices of the same slot tag); tapping opens `/dashboard`.
4. Manager phone: 08:00 summary for the department only.
5. Deny permission on a second phone: dialog shows browser-settings guidance, no enable button.
6. Disable with Airplane Mode on: dialog shows "כיבוי ... עדיין לא הושלם בשרת"; reconnect → completes; no further notifications.
7. Log out on a phone with notifications enabled, log in as another user: the first user's notifications stop on that device.

## Hebrew, mobile and accessibility checks — NOT RUN on devices
1. Hebrew keyboard: product names, search and reasons type and display right-to-left; email/password fields are left-to-right.
2. Decimal entry on the phone keypad: `0.5` and `0,5` both accepted for kg; units keypad is numeric.
3. 360 px wide screen: dashboard tabs, item cards, dialogs and the header chips fit without horizontal scrolling.
4. Touch targets: open-item button, "עדכן סטטוס", dialog buttons are easy to hit with a thumb.
5. Empty and error states are readable (no products in department, no items, permission error, offline without cached data).

## Pilot (real business) — NOT RUN
Run only after the owner-approved deployment in docs/RELEASE.md. One shift with 1 admin and 2 staff
on their own phones: open real items, finish/discard, one offline period, evening reminders, next
morning summary, discard report review. Record issues with device, time and screenshot.
