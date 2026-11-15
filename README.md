# TossIt — inventory & expiry tracking for bars and kitchens

TossIt is a Hebrew, mobile-first Progressive Web App for tracking opened inventory in a bar or
kitchen: who opened what and when, when it expires, and whether it was finished or thrown away.

> **Status: deployed on 2026-11-15; pilot pending.** The [live site](https://tossit-inventory-management.onrender.com/)
> runs the integrated client with the scoped Firebase rules and a credential-connected Neon server.
> Production Chromium smoke checks pass, including the login screen, route guard, one service worker
> and offline app-shell reload. Real signed-in user workflows and phone/staff pilot remain unverified.
> Push is not configured and its schedule remains disabled. See [What is not verified yet](#what-is-not-verified-yet).

> **UI/security refresh released:** UI1–UI3 and dependency hardening are live at code
> `1578802`, with 354 client / 58 server / 5 emulator-browser tests and all four main CI jobs passing.
> Render and Neon were updated; fresh unsigned production browser smoke passes.
> Real signed-in workflows and phone/staff pilot remain NOT RUN. See [release status](docs/RELEASE.md).

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
| Server | Neon Functions (Node 24): employee/device callable HTTP API and scheduled notifications; legacy Firebase host retained for emulator compatibility |
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

Requirements: **current Node 22.x, at least22.13** (`.node-version`) for the frontend, **current Node 24.x** for the Neon server artifact, and **Java 21** for Firebase emulators. The Neon ZIP build also uses the Python 3 standard library.

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
| `npm run test:callables:neon` | host-neutral callable API with real Auth/Firestore SDKs | Java (emulators) |
| `npm run test:callables:neon:bundle` | isolated actual Neon artifact through the same SDK integration tests | Node 24, Java, Python 3 |
| `npm run test:callables` | real callable/Auth/Firestore integration | Java (emulators) |
| `npm run test:browser` | real Chromium: worker, offline reload & replay, role denial, account isolation | Java, Playwright Chromium |
| `npm run lint`, `npm run build`, `npm run build:functions` | lint and production builds | — |

GitHub Actions runs the existing set on Node 22 / Java 21 and adds a Node 24 Neon-host job (`.github/workflows`).

## Deploying

Deployment is a manual, owner-approved step. Prerequisites (dedicated Firebase server credentials stored in Neon, matching VAPID keys,
Neon/rules/client deployment, first-admin bootstrap, existing-profile review) and the release gates are
in **[docs/RELEASE.md](docs/RELEASE.md)**. The Neon path does not deploy Firebase Functions or require Firebase Blaze. Keep usage within the providers' Free quotas. Do not deploy the security rules without the matching client.

## What is not verified yet

- Real signed-in production workflows: login, inventory changes and employee administration still need owner verification. Client/rules are deployed; Neon has its dedicated Firebase credential. VAPID keys remain absent and the schedule is disabled.
- Real phones: iPhone/Android install, offline use, update flow — **NOT RUN**.
- Real push delivery with the app closed — **NOT RUN** (needs matching VAPID configuration and an authorized push pilot).
- Dependency maintenance candidate: root runtime/server audits are clean;24 dev-only moderate/low findings remain. These updates are not deployed yet. See [docs/DEPENDENCY_AUDIT.md](docs/DEPENDENCY_AUDIT.md).
- A pilot with real staff — **NOT RUN**. Checklist: [docs/PILOT.md](docs/PILOT.md).

## Documentation

- [docs/RELEASE.md](docs/RELEASE.md) — release gates, deployment prerequisites, full check commands.
- [docs/PILOT.md](docs/PILOT.md) — demo script and device/pilot checklist.
- [docs/superpowers/plans/2026-11-09-tossit-two-agent-delivery.md](docs/superpowers/plans/2026-11-09-tossit-two-agent-delivery.md) — delivery plan.
- `docs/handoff/` — per-agent delivery records.
