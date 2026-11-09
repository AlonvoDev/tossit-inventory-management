# TossIt pilot checks

Manual checks that automated tests cannot prove. Record each as PASS / FAIL / NOT RUN with
date, device, OS/browser version and build SHA. Desktop Chromium results do not prove iPhone behavior.

## PWA install and updates (U4)

Automated so far (Chromium, local `serve -s dist`, build of claude/tossit-ui U4a):
exactly one registration (`/service-worker.js`, scope `/`); 12 precached build files; no
notification permission request on load; offline reload of a deep link (`/admin/users`) loads the
app shell; a new deploy waits (no automatic activation), the update dialog appears, accepting it
activates the new worker and removes only the previous TossIt precache.

### iPhone (Safari, installed to Home Screen) — NOT RUN
1. Open the production URL in Safari → Share → "Add to Home Screen". Icon is the teal TossIt tile, name "TossIt".
2. Launch from the Home Screen: opens standalone (no Safari bars) at `/dashboard` (or login), RTL layout, safe areas not clipped (notch/home bar).
3. Sign in, navigate to an admin deep link, close the app fully, enable Airplane Mode, relaunch: app shell loads; screens that need the server show errors, not fake success.
4. Deploy a new build, relaunch: update dialog "גרסה חדשה זמינה"; "מאוחר יותר" leaves a banner; "עדכן עכשיו" reloads to the new version; still signed in.
5. Notifications (after C4): enabling is only possible from an explicit button inside the installed app (iOS 16.4+); no prompt on launch.

### Android (Chrome) — NOT RUN
1. Install via the browser menu / install prompt; icon uses the maskable variant (no white square edges).
2. Repeat steps 2–4 above.

### Desktop (Chrome/Edge) — partially automated
- Install from the address-bar icon; repeat steps 3–4.
