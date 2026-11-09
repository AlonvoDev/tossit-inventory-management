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
