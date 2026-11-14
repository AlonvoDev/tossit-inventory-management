# TossIt: Neon Functions hosting with Firebase identity and inventory

Status: proposed design for approval; no implementation, external project creation or deployment.
Base: codex/tossit-core 5f0d84e7b8130c99c656061f98cf693b73625860; main remains9948d34.

## Intent and constraints

Alon wants all existing TossIt functionality, including employee administration and scheduled push, without adding an accepted payment card or enabling Firebase Blaze. He selected Neon as the alternative. Keep the reviewed UI, Firebase Auth users, Firestore data/rules, offline queue, device state and single PWA worker. The Neon Free plan must be sufficient for the proposed rollout; never silently upgrade, enable billing or replace production data. Free availability is not an unlimited usage promise.

## Approaches

1. **Neon Functions host only (selected direction; design pending approval).** Retain Firebase Auth/Firestore and their tested Admin SDK adapters. Move HTTP entry points and scheduling to Neon. This avoids a database/auth migration and changes the smallest surface; it adds a secure cross-provider credential and transport configuration.
2. Full Neon backend, Postgres and auth migration. Removes more Firebase dependency but requires rewriting realtime reads, security rules, transactions, offline reconciliation and account migration. Disproportionate to the payment-card blocker; excluded.
3. Keep Firebase Functions/Blaze or remove paid-hosted features. Neither meets the current request: the card is unavailable and the user explicitly wants to keep the functionality.

## Boundaries

Neon will execute three employee endpoints (create/update/deactivate), three push device endpoints (upsert/revoke/status) and scheduledInventoryNotifications. Existing src/users and notification business logic and Firestore adapters remain shared. No Neon Postgres tables are required: use a functions-only branch if supported in the connected account. No Firebase Functions deployment is needed in this mode. Firebase Auth and Firestore remain on the existing project, subject to their own quotas.

The frontend remains on Render. No UI redesign or unrelated features. Existing Firebase Functions entry points can remain as an explicitly selected legacy/local test adapter, but production Neon mode must never silently fall back to Google endpoints on error or missing configuration.

## HTTP and identity

Use a small Node HTTP/fetch adapter on Neon, implementing the existing Firebase callable wire protocol. A shared client transport chooses the Neon HTTPS base URL using a public build configuration, with the current Firebase callable adapter retained for explicit emulator tests. Preserve results and `functions/<code>` errors so UI code and retry intents remain compatible. No public URL means unavailable, not fabricated success.

Use Firebase ID tokens from the signed-in client. Verify signature, issuer, audience, expiration and revoked/disabled identity server-side with Firebase Admin against the fixed configured project. Do not accept a user-provided project, role, UID or business as authority. Existing service profile checks and expected actor/business checks remain mandatory. Unauthenticated device revocation remains capability-scoped as in C4; invalid supplied auth does not silently become anonymous auth.

Restrict requests to supported POST routes, JSON content type, bounded bodies, allowed methods and configured exact frontend origins; handle preflight. Never use CORS as authentication, return stack traces, or log passwords, tokens, push capabilities, subscriptions or secret values. Unknown route and malformed callable envelopes fail explicitly. Domain errors retain their existing codes; unexpected errors become sanitized internal/unavailable responses.

## Firebase credentials outside Google hosting

The Google-hosted default credential assumption must be replaced by explicit server-only Firebase Admin initialization. Use a dedicated project-scoped service account with only the Auth/Firestore privileges the existing adapters need. Prefer a supported keyless identity mechanism if Neon provides one; otherwise store a dedicated service-account credential in Neon runtime secrets. No owner credentials, browser-exposed keys, committed private JSON, or reuse of the interactive CLI login as a production credential. Never ask the user to paste a private key into chat. Credential creation and secure installation are separate reviewed deployment actions, not design/CI side effects. Validate missing/malformed/project-mismatched configuration before privileged requests run.

Keep WEB_PUSH_VAPID_PUBLIC_KEY and WEB_PUSH_CONTACT on the server; put WEB_PUSH_VAPID_PRIVATE_KEY only in Neon secrets. The frontend VITE_VAPID_PUBLIC_KEY must match. A separate secret store replaces Firebase Secret Manager for this hosting mode. Existing device binding/cancellation/idempotency collections and transaction guarantees remain in Firestore.

## Schedule, time and delivery safety

Neon scheduled triggers use UTC cron. Builder choice: invoke at `0,20,40 * * * *` (72 lightweight calls/day), then derive the existing Israel slot from the trusted occurrence time with `israelSlot`. This covers 23:00/23:20/23:40,08:00 and optional00:00 across Israel DST without manual cron changes. Return immediately before querying data for non-slots. Preserve the existing ten-minute retry window, deterministic slot/device tags, transactional leases, cancelled bindings, confirmed-send behavior and opt-in-only shift ending. Do not claim exactly-once phone display.

Scheduled route is separate from user calls. In production accept only the provider-attested trigger metadata described by Neon (edge strips client-set X-Neon-* headers); validate the configured trigger identity, header/body invocation consistency, occurrence time and bounded payload. Never accept an arbitrary browser timestamp as permission to run a schedule. Local tests use an explicit emulator-only injection, never a production bypass. Verify current provider trigger/retry guarantees in a real nonproduction function before enabling schedule; if provenance cannot be verified, fail closed and resolve it before delivery.

## Verification and rollout gates

1. Prove Neon account Free access, supported region, functions-only branch, secret configuration, Node runtime and firebase-admin/web-push bundling/network compatibility before migration is considered complete. Connected account currently not available. Frankfurt is a proposed supported region, to be checked rather than silently selected.
2. HTTP adapter tests: unauthenticated/forged/expired/revoked token, disabled profile, wrong business, invalid method/body/origin, sanitized errors, exact callable responses and logout revocation.
3. Run existing employee/push domain tests and real Auth/Firestore emulator integration through the new HTTP adapter. Reproduce idempotent create, concurrent deactivate/create, cancelled device binding and durable delivery claims. Retain existing root/rules/browser coverage; add focused client transport tests and browser coverage that a non-default server URL is really used.
4. Test forged/malformed trigger requests, real provider invocation, retry timing and Israel DST. Preserve existing terminal inventory/offline/account isolation tests. Add Node24 backend verification to match current Neon runtime; retain Node22 frontend verification.
5. Only synthetic demo data during CI. A real Neon staging deploy first serves health/auth checks without production credentials or push; privileged runtime validation uses a separate demo Firebase project, not production employee creation/deactivation or real push. Never send a real notification as a smoke test without explicit authorization.
6. Update CI, env examples, README, RELEASE/PILOT and handoff for the actual hosting contract and truthful pending/live status. Every completed task/checkpoint is committed, pushed and SHA-verified.
7. Production cutover is separate: verify Firebase profiles/rules/indexes and Render deploy settings; install restricted secrets safely; deploy Neon without schedule enabled; verify auth without production writes, switch Render URL/public key and coordinate client/rules release; enable schedule only after authorized device pilot. Preserve old candidate and rollback instructions. No automatic main merge, billing activation or live deployment during implementation.

## Builder decisions and outstanding checks

Builder may select lightweight routing/library layout, exact public config names and test fixture organization, preserving the contracts above. Reuse the existing service interfaces rather than rewrite business logic. Neon account availability, Free quotas/regions and real package/trigger compatibility are proof gates, not claims of success. If any gate requires payment or account/data migration, stop and report the concrete finding; do not substitute a paid provider or remove features.

## Primary sources checked 2026-11-14

- https://neon.com/pricing — Free, no card, Functions included; usage limits apply.
- https://neon.com/docs/compute/functions/overview — Node24, supported regions, request/response runtime.
- https://neon.com/docs/compute/functions/environment-variables — functions-only branch and runtime secrets.
- https://neon.com/docs/compute/functions/triggers/schedule — UTC cron, scheduled payload, attested edge header.
