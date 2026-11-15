# TossIt release gates

## Current hosting direction — Neon replaces Firebase Functions

This section supersedes historical Firebase Functions/Blaze/Secret Manager deployment instructions below. Firebase Auth and Firestore remain in tossit-4cc02. Employee/device services and scheduling now have a Neon Node24 host. Do not enable Google billing or deploy Firebase Functions for this path.

### Verified staging resources (connected to production Firebase for read-only smoke checks)

- Neon Free organization org-aged-cell-89320935; isolated project tossit-server (misty-flower-45450210), aws-eu-central-1, branch staging (br-flat-mud-b9coh1k6).
- Native URL: https://br-flat-mud-b9coh1k6-tossitapi.compute.c-7.eu-central-1.aws.neon.tech/
- Deployment2 is active/completed on Node24, reusing deployment1 artifact SHA2560c5b6e586827e7302d2c4f1319c4e75fa648b5615f75cdec1ea912cce31ad159. Following explicit owner approval, the dedicated Firebase service-account credential is installed as a Neon runtime secret. VAPID keys and application Postgres data remain absent.
- Initial credential-free deployment1 smoke checks passed: health200/configured:false, unsigned employee call401, allowed preflight204, forbidden origin403, spoofed schedule header401 (edge strips client x-neon headers), oversized anonymous revoke413. This is a staging smoke test, not a working production backend claim.
- Disabled schedule trigger: `trigger-f2baa3cc-f349-4d46-a316-abbc26890e98` (`inventory`), next_run_at:null. The staging environment still pins the deliberately non-working probe ID, so a real schedule is fail-closed until its reviewed credential/configuration cutover. Schedule remains disabled. Authentic provider-trigger delivery, push transport and mobile display still require verification. The schedule remains disabled after credential installation.

The verified implementation candidate is138eebcbff59ed9b9d66222563ca809507cc6168. All four CI jobs passed in push43631718046 and PR43631722809, including Node24 source6/bundle6 real SDK integrations and five browser scenarios. Fresh independent review found no Critical/Important issue; minor documentation/coverage notes were addressed. The credential gate was completed on 2026-11-15 as recorded below; trigger delivery/push/mobile and coordinated client/rules cutover remain pending.

### Credential readiness verified — 2026-11-15

Dedicated account tossit-neon-api@tossit-4cc02.iam.gserviceaccount.com has exactly roles/firebaseauth.admin and roles/datastore.user at project scope, with no conditional bindings. Its dedicated key is held only as a Neon runtime secret; temporary local JSON was removed after verification. No billing activation was needed (billingEnabled:false).

Read-only live verification passed: Firebase Auth listUsers(1), Firestore reads, health200/configured:true, and a remote anonymous revoke against a random absent device returned400/FAILED_PRECONDITION after the real Firestore transaction read. Device/revocation paths were absent before and after. Unsigned and invalid-token employee calls and forged scheduled delivery return401. No employee, inventory or device mutation was performed; signed-in production employee management, genuine trigger delivery, push and mobile pilot remain untested. Main/Render/rules remain unchanged.

### Read-only production preflight — 2026-11-15

Confirmed Render workspace My Workspace (tea-d27125ndiees73b9418g) with Alon. Existing service srv-d27ml68gjchc738duh3g is the intended TossIt URL/repository, on main, autoDeploy:no/trigger:off, Free Node web service in Oregon. Last live deploy dep-d304odali9vc738krajg is commit9948d34bc9785b4aeed8eb6ffe9311621a727c9f. Current commands: `npm install; npm run build` and `npm run preview`. Candidate preview script serves the built SPA on PORT. Actual NODE_VERSION/env values are not exposed by the connected read tools and remain unverified; no Render settings were changed.

Firebase audit was read-only and complete for the inspected collections (no pagination remaining): users1, products9, items11, fridges4, businessSettings0; no composite indexes. All inspected products/items/fridges have business scope. All11 legacy items lack productId; this is explicitly supported for existing records and must not be guessed or rewritten. Missing settings use documented defaults.

**Blocking profile repair:** the sole existing admin profile has businessId and an enabled matching Firebase Auth account, but lacks both email and department/area. parseUserProfile rejects it; deploying the new client now would block that admin's application access. Proposed owner-reviewed repair is limited to that existing profile: copy email from its matching Firebase Auth account and set department:`bar`, consistent with the server's canonical admin provisioning value. Preserve document ID, existing role/admin authority, businessId, all other fields and Auth account. Re-read before applying; use the original updateTime as a write precondition and abort if profile/identity/role/business changed. No repair has been executed. Obtain explicit approval for this concrete production-profile write, then verify parsing/readiness.

The current Firestore release is projects/tossit-4cc02/rulesets/f4e3e5d5-8dde-43ef-a6df-3d7192cc46f4, SHA2561f7bdc93793d4d87958935fc27fb6399b08d60b3c8309149a4229b49db8f4fab. Its22-line policy permits an existing admin read/write across all collections and denies everyone else; it differs from the reviewed scoped candidate. Rules/client rollout must be coordinated after profile repair. No rules/indexes were deployed.

The Render hostname is absent from Firebase Auth authorizedDomains. This is a popup/redirect-flow configuration gap; do not claim that it independently blocks email/password login. Review adding the exact hostname before enabling those flows. No domain settings were changed.

Candidate frontend production build with the exact Neon URL, emulators:false and no VAPID key PASS. Built JavaScript contains the Neon URL and no private-key/service-account markers. Notifications remain unavailable until matching VAPID configuration/pilot; no placeholder key was installed. This local build is not a deployment. Do not enable auto-deploy, deploy the old client with new rules, or merge main before the coordinated rollout decision.

### Reproduce the Neon checks

Install both lockfiles (`npm ci`, `npm ci --prefix functions`). Use Node24, Java21 and Python3 (standard ZIP module), then:

```bash
npm run test:functions
npm run test:callables:neon
npm run test:callables:neon:bundle
npm run build:neon
```

Five browser scenarios additionally verify actual admin employee creation through the configured external callable URL, alongside the retained worker/offline/role/account-isolation checks. The last integration mode copies the built artifact into a temporary directory outside node_modules and starts a separate Node process. It verifies real SDK calls/auth/provisioning/idempotency/push bindings through the artifact, using only local demo Auth/Firestore. The six cases include actual expired/revoked token denial and retained device state, not only mocks. Native host tests and client tests are retained. No paid cloud project is used in tests.

### Secure connection and cutover (not authorized by implementation alone)

1. Completed for staging with explicit owner approval on 2026-11-15: review/create a dedicated service account in tossit-4cc02 with `roles/firebaseauth.admin` and `roles/datastore.user` only, scoped to this project. These grant sensitive Auth/Firestore server access: create/install the credential only after owner authorization. Do not use Owner/Editor or interactive CLI refresh tokens as server credentials. Never paste private JSON into chat or git. Prefer a supported keyless exchange if available; otherwise install the dedicated JSON directly as a Neon runtime secret over the authenticated deployment channel.
2. Configure server-only `TOSSIT_FIREBASE_PROJECT_ID`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `TOSSIT_ALLOWED_ORIGINS`, matching `WEB_PUSH_VAPID_PUBLIC_KEY`, `WEB_PUSH_VAPID_PRIVATE_KEY`, and `WEB_PUSH_CONTACT`. `functions/.env.example` is a template only. `functions/neon.ts` declares required runtime env and a disabled UTC schedule; Neon environment values are deployment secrets, never frontend env. The Firebase credential is already installed in staging; VAPID values remain absent. Preserve existing env values when adding reviewed configuration.
3. Build/deploy the reviewed artifact. Required `neon.ts` env prevents a full configured deploy with missing values. Retrieve the actual schedule trigger ID, set `TOSSIT_NEON_TRIGGER_ID`, keep the trigger disabled, and verify real identity/profile authority using a separate demo Firebase project before production employee writes. Health `configured:true` means structural credential config only, not successful credential/role/push validation.
4. The schedule is `0,20,40 * * * *` UTC (72 light calls/day); existing Israel/DST slot logic filters actual 23:00/23:20/23:40,08:00 and optional00:00. Parser requires provider-attested metadata and the exact trigger ID. No secret or database work on irrelevant, stale or future ticks. Test genuine provider delivery/retry before enabling. Local forged-header tests do not substitute for provider provenance checks; the staging spoof rejection has been observed separately.
5. Review production profiles/rules/indexes and the current Render service's tracked branch/auto-deploy settings before any main merge. Build Render with `VITE_SERVER_API_URL` set to the configured Neon base URL and `VITE_VAPID_PUBLIC_KEY` set to the matching public key. An invalid configured URL fails closed; it never silently switches to Google. Missing URL selects the retained legacy/emulator adapter and is not the intended Neon production configuration.
6. Coordinate matching rules/functions-client cutover. Complete docs/PILOT.md real-device and staff tests. Enable only the reviewed real trigger after the authorized push pilot. Keep the old code candidate and environment/rules backup for coordinated rollback; never clear IndexedDB/device bindings. Do not roll back to a client incompatible with deployed rules.

## Historical Firebase-hosted release gates


Implementation checkpoints are not production deployments. Do not deploy the C1
rules by themselves against an older client: the C2 inventory adapters and the
reviewed Claude UI checkpoints must be integrated first.

## Reproduce integrated C5 checks

Use the committed npm lockfiles. Install root dependencies with `npm ci` and
server dependencies with `npm ci --prefix functions`. Use Node 22 (`.node-version`) and Java 21 for CI emulators. The integrated candidate was locally verified on Node 22.23.4; GitHub Actions run 42708118669 also passed all three jobs on tested candidate `3be1d676aa66baf448a802521d9d29b60e8af64e`, including native Functions-worker startup and real Chromium browser checks.

```bash
npm run build
npm run build:functions
npm run test:run
npm run test:functions
npm run test:rules
npm run test:callables
npm run lint
npx playwright install --with-deps chromium
npm run test:browser
```

`test:rules` uses only the `demo-tossit-auth` Firestore emulator. `test:callables`
starts Auth/Firestore emulators and serves the actual Firebase `onCall` HTTP/auth
wrappers over loopback TCP. It uses real Firebase client SDK requests and real
Admin SDK adapters. It does not mock callable auth or bypass server authorization.
The Firebase CLI Functions worker cannot start its Unix socket in the managed
host (`listen EPERM`); GitHub CI verified native Node 22 worker startup, all
seven exported definitions and the same three callable tests with
`npm run test:callables:native`. The CI-only secret file contains a dummy value
for emulator startup, never a usable production private key.
The server TypeScript build is verified independently.

No test may use production as a fallback. Emulator-only tests explicitly reject
missing/non-loopback emulator hosts. UI/domain tests exclude emulator suites.
When emulators are explicitly selected on localhost (`VITE_USE_FIREBASE_EMULATORS=true`, including the built browser test), Firebase services
connect synchronously to the local demo project; absent services fail locally.

## Final U5 candidate and local demo prerequisites

Claude U5 `357bf15cd03ba728531b3607d9d442945d6e586f` completes the notification UI/helper adoption and README/pilot documentation. All three GitHub CI jobs passed on that tree (run42709976471); fresh local merged-tree checks pass298client tests, build and lint0errors/7warnings. Real devices and live push remain NOT RUN.

For the two-account demo, use **separate browser profiles or normal plus incognito**, not two ordinary windows in one profile: Firebase Auth is shared between ordinary windows. Keep each demo profile online for its initial sign-in/catalog load before simulating offline work.

Before starting the native Functions emulator for the demo, create the ignored local secret override used by CI:

```bash
printf '%s\n' 'WEB_PUSH_VAPID_PRIVATE_KEY=emulator-only-no-real-key' > functions/.secret.local
```

This dummy value is only for `demo-tossit-auth` emulator startup and cannot deliver push. Never use it in production or commit `.secret.local`; do not provide real project credentials/keys for a local demo. The app remains unconfigured for push without a valid matching public key. Follow the README emulator command and first-admin instructions, then the pilot demo script. Native Functions startup may be unavailable in a restricted host; CI has verified it on Ubuntu/Node22.

## Render rollout preparation

Both committed Render definitions pin Node 22, matching `.node-version` and CI. Confirm the actual Render service uses Node 22 and the intended build/start commands; repository YAML does not prove the running service applies them. Confirm its tracked branch and automatic deploy setting before merging to main. Pause automatic client deployment until the matching Firebase rules/functions and existing profiles have been reviewed and the rollout sequence is agreed. The production Firebase project configured by this client is `tossit-4cc02`; verify that identity in the owner account before any deployment. Do not set `VITE_USE_FIREBASE_EMULATORS` in production. Push requires the matching valid public VAPID key at build time; keep the private key only in Firebase Secret Manager.

## Prerequisites before approved deployment

- Verify the Firebase project identity, current deployed rules, authorized domains
  and Functions/billing eligibility in the owner's account. Do not enable billing
  as part of code implementation.
- Inspect existing user profiles for a real businessId, supported role, assigned
  department, email and matching document UID. Missing `isActive` is legacy-active;
  `isActive: false` disables access. Malformed data requires reviewed repair,
  not a permissive fallback or inferred admin role.
- Bootstrap a business's first admin using a trusted Admin SDK procedure under
  the owner's control. Public signup and browser self-promotion are disabled.
  Never temporarily reopen Firestore rules to bootstrap an admin.
- Deploy the reviewed privileged callables and validate the client region
  (`us-central1`) before relying on employee management. Keep any server secrets
  in the provider's secret store, never Git.
- The old `deleteUserByAdmin` export now deactivates the Firestore profile and
  disables/revokes the Firebase Auth account, preserving audit records. UI copy
  must say deactivate/disable, not permanent deletion.
- New products use canonical department values; legacy Hebrew item departments
  remain readable. Staff/manager queries must constrain business and department.
- C2 must send productId, product-derived expiry/unit, authorized actor identity
  and server timestamps for terminal audit fields before deploying strict rules.
- Rules deny unrecognized collections. Settings, device subscriptions and queue
  receipts need their explicitly tested C2/C3/C4 grants before those features ship.
- A real sign-in, employee creation/edit/deactivation and a two-device pilot must
  pass against the reviewed deployment. No such production writes have been run.

## Deferred release validation

- Real-device PWA install/update, closed-app push delivery and scheduler setup.
- Firestore indexes and performance for production-sized data.
- Owner review and U5 pilot/demo documentation before updating main. Both branches are integrated; local and GitHub CI checks pass.

## C1 provisioning coordination

Provisioning requests include the expected actor UID and business ID. The server
compares both with the verified caller/profile; it derives authority from the
server profile, not these client values. This prevents an in-flight form intent
from creating employees under a subsequently signed-in account.

Account activation and deactivation use a shared per-employee Firestore lease
with a five-minute TTL and token-checked release. An overlapping operation returns
`aborted` and must be retried; it is not reported as completed. A completed
provisioning request cannot reactivate an inactive profile. Interrupted request
receipts are retained without passwords so a later retry can resume safely.

## C2a settings and domain checkpoint

Business settings now have explicit same-business read/admin-write rules and a
server-backed settingsAPI. Missing settings use Israel timezone, evening and
morning notifications enabled, and automatic midnight shift ending disabled.
These preferences do not start a scheduler; scheduling remains C4.
Pure inventory validation/normalization and shared contracts are tested, but the
legacy inventory APIs still need C2b wiring before strict rules can be deployed.

## C2 online inventory checkpoint (supersedes the C2a wiring blocker)

Inventory operations and legacy adapters now persist catalog product identity,
unit and expiry, use verified actor scope, acknowledge actual writes and use
transactional terminal states with server audit timestamps. Scoped server reads,
realtime inventory, normalized legacy audit fields, reason-filtered bounded
reports and productCategories grants are implemented and emulator tested.

This removes the old inventory-adapter blocker, but does not authorize a live
release. U2 must consume canonical department values and stable per-intent IDs;
C3 offline queue, C4 server push/scheduling, combined branch checks and real-device
pilot remain release gates. The old browser expiration timers are not a deployed
scheduler. No production configuration or data was changed.

## C3 connected offline inventory checkpoint

The shared operations now commit durable intents before attempting server writes.
They return pending for durable unsynced work and synced only after real server
acknowledgement. Expected actor/business guards, cross-tab leases, immutable input,
original opening/configuration, retained conflicts, cached profile/catalog/items
and scoped queue subscriptions are connected. Acknowledged previews survive a
collection-cache delay. Old localStorage queues remain untouched/quarantined.

Before release, Claude must mount OfflineProvider directly inside AuthProvider,
connect pending/failed UI and remove Dashboard queue clearing. Validate the merged
single-worker app on actual devices, including offline reload, reconnect, two tabs,
logout/account changes, low/quota storage and updates. Current evidence is95client
and41realFirebaseSDK/rules-emulator tests; no real mobile/device persistence or live
server notification delivery is claimed. C4/C5 gates still apply.

## C4 server push and device controls

C4 code is implemented, not deployed. Client activation is explicit; startup reads
status and performs only pending revocation cleanup. The helper waits for the
existing root `/service-worker.js` registration and never registers another worker
or uses page notifications/timers. Claude must merge this C4 checkpoint and finish
U4c before the combined candidate is tested.

Configuration before any reviewed deployment:

1. Use one VAPID key pair for this environment. Keep its private key only in Firebase
   Secret Manager as `WEB_PUSH_VAPID_PRIVATE_KEY`, bound to the scheduled function.
   Never put it in a Vite variable, source, logs or these examples. No real keys have
   been generated or stored by this work.
2. Set Functions `WEB_PUSH_VAPID_PUBLIC_KEY` and `WEB_PUSH_CONTACT` (an actual mailto
   contact or HTTPS contact URL). Set Render build `VITE_VAPID_PUBLIC_KEY` to the same
   public key. `.env.example` files contain placeholders only; environment files are
   ignored. Rotating the key requires device resubscription.
3. Verify the Firebase billing/deployment prerequisites and enabled Cloud Scheduler
   API in the target project. The reviewed deployment must include callables and
   `scheduledInventoryNotifications`, not only client code. No billing/API settings
   or deployments were changed during implementation.
4. The scheduled function uses `Asia/Jerusalem`: 23:00/23:20/23:40 to active on-shift
   staff with unhandled expired items in their department; 08:00 to active admins
   business-wide/managers in their department; optional 00:00 shift ending only if
   explicitly enabled. Morning means all currently overdue unhandled items. Invalid
   settings fail closed. One cron invokes nine times/day, of which five are action
   slots. Retries older than ten minutes are ignored.
5. `pushDevices`, `pushEndpointClaims`, `pushRevocations` and `notificationDeliveries`
   are server-only under default-deny rules. Device capabilities are stored hashed;
   per-binding cancellation prevents a late register from undoing logout/disable.
   Unknown signed-out revocations remain pending until registration can be found;
   an authenticated cancellation may create the exact capability-bound tombstone.
   Consider the supplied `expiresAt` fields for 14-day Firestore TTL on delivery and
   cancellation bookkeeping after reviewing retention; TTL is not configured here.
6. Verify actual browser/device install, explicit permission, subscribe, locked/closed
   app push, safe click navigation, duplicate schedule, two accounts, offline logout,
   reconnect cleanup, disable and re-enable. iPhone Home Screen behavior and Android
   delivery remain NOT RUN. Record the exact deployed key/environment and browser.

Delivery jobs recheck profile, binding, settings and remaining inventory before
sending. Confirmed sends are not released for redispatch just because receipt
persistence failed. Transient transport errors retain retry state; 404/410 disables
only the exact obsolete binding. Stable tags replace a retry's prior notification.
Push-provider acceptance is not proof of phone display, and the external transport
cannot promise exactly-once display after an ambiguous crash/acknowledgement.
Generic notification text includes a count, not item/employee/business names.

C5 integrated local evidence on Node 22.23.4: 296 client tests, 41 server tests,
42 rules/SDK tests, 3 actual callable HTTP/Auth/Firestore integration tests and
4 real Chromium browser tests pass. App/Functions builds pass; full lint has
zero errors and seven existing Fast Refresh warnings. Independent focused final
review found no confirmed Critical/Important issue. Push transport in tests is
stubbed. Remote CI run 42708118669 also passed native Functions startup and the same
three callable tests, plus all four browser scenarios using the locked Playwright
browser. Phone installation and actual delivery remain gates.

Primary references used for deployment/transport details:
- https://firebase.google.com/docs/functions/schedule-functions
- https://github.com/web-push-libs/web-push/blob/master/README.md
- https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
