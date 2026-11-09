# TossIt release gates

Implementation checkpoints are not production deployments. Do not deploy the C1
rules by themselves against an older client: the C2 inventory adapters and the
reviewed Claude UI checkpoints must be integrated first.

## Reproduce C1 checks

Use the committed npm lockfiles. Install root dependencies with `npm ci` and
server dependencies with `npm ci --prefix functions`. Functions target Node 22;
the managed development host currently uses Node 24. Node 22 CI validation remains
a release check until recorded in the integrated candidate.

```bash
npm run build
npm run test:run
npm run test:functions
npm run test:rules
npm run test:callables
npm run lint
```

`test:rules` uses only the `demo-tossit-auth` Firestore emulator. `test:callables`
starts Auth/Firestore emulators and serves the actual Firebase `onCall` HTTP/auth
wrappers over loopback TCP. It uses real Firebase client SDK requests and real
Admin SDK adapters. It does not mock callable auth or bypass server authorization.
The Firebase CLI Functions worker cannot start its Unix socket in the managed
host (`listen EPERM`); that worker-specific startup test is NOT verified here.
The server TypeScript build is verified independently.

No test may use production as a fallback. Emulator-only tests explicitly reject
missing/non-loopback emulator hosts. UI/domain tests exclude emulator suites.
When emulators are explicitly selected in the development app, Firebase services
connect synchronously to the local demo project; absent services fail locally.

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
- End-to-end integration of both branches and owner review before updating main.

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

Evidence:104client tests,41server tests,42rules/SDK tests,3actualcallable HTTP/Auth/
Firestore integration tests; app/functions builds and changed-file lint pass (one
existing Fast Refresh warning). Push transport in tests is stubbed. Native Functions
worker startup and Node22 CI remain separate C5/release checks.

Primary references used for deployment/transport details:
- https://firebase.google.com/docs/functions/schedule-functions
- https://github.com/web-push-libs/web-push/blob/master/README.md
- https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
