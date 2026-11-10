# TossIt — inventory & expiry tracking for bars and kitchens

TossIt is a Hebrew, mobile-first Progressive Web App for tracking opened inventory in a bar or
kitchen: who opened what and when, when it expires, and whether it was finished or thrown away.

> **Status: release candidate, not deployed.** All of the behaviour below is implemented and covered
> by automated tests against Firebase emulators and a real Chromium browser. It has **not** yet been
> deployed to the live Firebase project, and real-phone checks (install, offline use, closed-app push)
> have **not** been run. See [What is not verified yet](#what-is-not-verified-yet).

## What it does

**Accounts and permissions**
- Three roles: **admin** (whole business), **manager** (one department), **staff** (one department,
  inventory actions only during an active shift). Departments are `bar` and `kitchen`.
- No public sign-up. The business admin creates, edits and **deactivates** employees through
  server-side functions; a deactivated account keeps its history and can no longer sign in.
- Menus, routes and Firestore security rules enforce the same scope. A missing or disabled profile
  gets no access.

**Inventory**
- Admins and managers maintain a product catalog per department: name, unit (kg or units),
  shelf life in whole days, optional category and fridge.
- Staff open an item by choosing a product, an optional fridge and an amount. Name, unit and expiry
  come from the catalog on the server. Kilograms may be decimal (e.g. 0.5); units are whole numbers.
- Each item is closed exactly once, as **finished** or **discarded** (with discarded amount and reason:
  expired / damaged / other). If two people close the same item at once, one succeeds and the
  other sees "already closed" — never a false success.
- The inventory list updates live across devices.
- Discard report with date range and reason filter, grouped by product and unit.

**Offline**
- Opening and closing items work without a connection. The action is saved on the device first
  (IndexedDB), shown as "ממתין לשליחה", and sent once when the connection returns, with the original
  opening time. Retries never create duplicates.
- Failed actions (e.g. the item was closed elsewhere) stay visible with a Hebrew reason and an
  explicit "נסה שוב". Pending work is bound to the signed-in account and business and is not shown
  to, or sent by, another account on the same device.
- Catalog, settings, users and shift changes need a connection; the app says so.

**App and notifications**
- Installable PWA with one service worker: the app opens offline, updates wait for the user's
  "עדכן עכשיו", and only the app's own files are cached (no API data).
- Scheduled push notifications from the server: evening reminders (23:00, 23:20, 23:40 Israel time)
  to on-shift staff with expired items, and an 08:00 summary for admins/managers. Each user turns
  notifications on per device from the menu ("התראות במכשיר"); nothing is requested on launch.
  **Requires deployment configuration** (VAPID keys, deployed functions) — until then the app shows
  notifications as not available.
- Business settings (admin): evening reminders, morning summary, end shifts automatically at midnight.

## Architecture

| Layer | Technology |
| --- | --- |
| UI | React 19, TypeScript, Vite, MUI, RTL Hebrew |
| Data & auth | Firebase Auth, Cloud Firestore with tested security rules |
| Server | Firebase Functions (Node 22): employee provisioning callables, push device callables, scheduled notifications |
| Offline | IndexedDB operation queue + replay (`src/offline`) |
| PWA | `vite-plugin-pwa` `injectManifest`; single worker `src/pwa/service-worker.ts` served at `/service-worker.js` |

```
src/
├── app/         routes, access matrix, entry point
├── pages/       login, dashboard, admin screens
├── components/  inventory list, forms, navigation
├── features/    reports, settings, form rules
├── api/         Firestore and callable adapters
├── domain/      shared contracts and inventory rules
├── offline/     durable queue, replay, provider
├── pwa/         service worker, update prompt, sync status, notification controls
└── test/        domain and rules tests
functions/       server functions and tests
tests/browser/   Playwright tests against the emulators
docs/            release gates, pilot checklist, delivery handoffs
```

## Running locally

Requirements: **Node 22** (`.node-version`), and **Java 21** for the Firebase emulators.

```bash
npm ci
npm ci --prefix functions
npm run dev            # http://localhost:5173
```

> ⚠️ Plain `npm run dev` connects to the **live** Firebase project configured in
> `src/services/firebase.ts`. For demos and experiments use the emulators below.

### Local demo with emulators (no real data)

The emulators use the demo project `demo-tossit-auth`; nothing reaches the live project.

```bash
npm run build:functions
npx firebase emulators:start --only auth,firestore,functions --project demo-tossit-auth
# in another terminal
VITE_USE_FIREBASE_EMULATORS=true npm run dev
```

1. **First admin (emulator only):** in the Emulator UI (http://127.0.0.1:4000) create an Auth user,
   then a Firestore document `users/<that uid>` with
   `{ uid, email, fullName, role: "admin", department: "bar", businessId: "demo-business", isActive: true }`.
   Public sign-up is disabled by design; in production the first admin is created with a trusted
   Admin SDK step (see [docs/RELEASE.md](docs/RELEASE.md)).
2. Follow the [demo script](docs/PILOT.md#demo-script-about-10-minutes).

## Tests

| Command | What it covers | Needs |
| --- | --- | --- |
| `npm run test:run` | UI, domain, offline queue, worker logic | — |
| `npm run test:functions` | server functions | — |
| `npm run test:rules` | Firestore security rules | Java (emulator) |
| `npm run test:callables` | real callable/Auth/Firestore integration | Java (emulators) |
| `npm run test:browser` | real Chromium: worker, offline reload & replay, role denial, account isolation | Java, Playwright Chromium |
| `npm run lint`, `npm run build`, `npm run build:functions` | lint and production builds | — |

GitHub Actions runs the full set on Node 22 / Java 21 (`.github/workflows`).

## Deploying

Deployment is a manual, owner-approved step. Prerequisites (billing for scheduled functions, VAPID keys,
rules and functions deployment, first-admin bootstrap, existing-profile review) and the release gates are
in **[docs/RELEASE.md](docs/RELEASE.md)**. Do not deploy the security rules without the matching client.

## What is not verified yet

- Live Firebase project: rules, functions, scheduler and indexes are **not deployed**.
- Real phones: iPhone/Android install, offline use, update flow — **NOT RUN**.
- Real push delivery with the app closed — **NOT RUN** (needs deployment).
- A pilot with real staff — **NOT RUN**. Checklist: [docs/PILOT.md](docs/PILOT.md).

## Documentation

- [docs/RELEASE.md](docs/RELEASE.md) — release gates, deployment prerequisites, full check commands.
- [docs/PILOT.md](docs/PILOT.md) — demo script and device/pilot checklist.
- [docs/superpowers/plans/2026-11-09-tossit-two-agent-delivery.md](docs/superpowers/plans/2026-11-09-tossit-two-agent-delivery.md) — delivery plan.
- `docs/handoff/` — per-agent delivery records.
