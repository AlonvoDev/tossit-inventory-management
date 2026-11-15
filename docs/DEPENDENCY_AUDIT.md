# Dependency hardening — 2026-11-15

Scope: Codex maintenance branch only. These changes are not deployed. Claude UI1–UI3 work remains independent.

| Audit graph | Released/baseline | S1 compatible lockfile refresh |
| --- | --- | --- |
| Root, all installed packages |70: 8critical/34high/20moderate/8low|41: 3critical/11high/25moderate/2low|
| Root, omit-dev |18: 3critical/10high/4moderate/1low|4high, 0critical|
| Functions/server |9moderate, 0high/critical|9moderate, no compatible resolution available|

Counts are npm audit package findings, not confirmed exploitation. Root installed-dependency counts include Node-specific parts of the Firebase SDK that may not be included in the browser bundle. Do not present omit-dev as proof of reachable browser exposure. Before/after reports were captured separately; subsequent registry updates may change results.

## S1 — compatible refresh

`npm audit fix --dry-run` reviewed, then `npm audit fix --ignore-scripts` without force. Only the root lockfile changed; direct version ranges and UI/server source remain unchanged. Relevant resolutions include Vite6.4.6, Vitest3.2.7, react-router7.18.5, serve14.2.8, protobufjs7.6.6, proxy-addr2.0.8, websocket-driver0.7.5 and Firebase CLI14.27.0. PWA plugin1.3.0 stays within declared1.x; production build still emits the single worker. Functions compatible audit fix made no file change.

Fresh Node22 checks after refresh: client304/304, server58/58, production build PASS, lint0errors/7existingwarnings. Baseline client Node24/jsdom has a Blob-copy assertion mismatch; Node22 (the app/CI pin) passes. No worker/test assertion was weakened. S1 is a tested maintenance checkpoint, **not ready for release**; clean reinstall and full integration/browser checks are deferred to the final selected dependency graph to avoid repeating unchanged runs.

## S2/S3 — final selected graph and local verification

| Audit graph | Final candidate |
| --- | --- |
| Root, all installed packages |24: 22moderate/2low; 0high/critical; all remaining nodes dev-only|
| Root, omit-dev |0 findings|
| Functions, all installed packages |0 findings|

Selected versions: Firebase12.19.0 + rules-unit-testing5.0.2, Firebase CLI15.36.0, Vitest4.1.12, Vite6.4.6, router7.18.5, serve14.2.8; server Firebase Admin14.5.1 + Functions7.4.0. Existing modular APIs remain supported; no application, worker, offline, UI or business-policy code changed. Root engine is now >=22.13.0 for required new transitive tooling. Use current22.x for app/native-worker work and current24.x for Neon (some optional CLI native dependencies require newer patch releases). The Functions engine stays22 as the Firebase runtime major selector. Firebase13/rules-testing6 were deliberately avoided because rules6 requires Node24.12 and would force a broader app-toolchain migration.

One narrowly scoped override: `@firebase/firestore` -> `@grpc/grpc-js`1.14.7. Firebase12's Firestore package pins ~1.9.0, which retains reported issues;1.14.7 remains grpc1.x and meets both patched advisory thresholds. This affects its Node transport rather than adding browser business logic. Real SDK/emulator rules/source/bundle tests verify compatibility, not just package-version assertions. Remove the override when the selected upstream Firebase package allows a patched transport natively. No blanket overrides, force upgrades or obsolete tool downgrades.

Fresh installs (`npm ci --no-fund --no-audit`, then `npm ci --prefix functions --no-fund --no-audit`) PASS on Node22.23.4. Final graph checks PASS:
- Client304/304 on Node22; server58/58 on Node22 and separately Node24.
- Frontend build, Functions TypeScript build, actual Neon ESM/ZIP build PASS; lint0errors/7existingwarnings.
- Firestore rules42/42; retained legacy callable3pass/3intentionallyhost-onlyskips; Neon source6/6 and isolated actual artifact6/6 on Node24.
- Real Chromium153/emulator browser5/5, including single worker/no load prompt/offline shell, durable replay, role denial, account-private queue and actual employee creation through the external callable URL.
- Independent read-only review found no Critical/Important issue; the root Node-floor minor was fixed before this checkpoint. The managed host previously blocked native Functions-worker Unix sockets; native execution of this final toolchain is delegated to GitHub CI and is not claimed as locally run. Final remote CI/native result is pending publication of this exact checkpoint.

No assertions were weakened and no new mock-only dependency tests were added. Source/isolated bundle integrations exercise actual SDK Auth/Firestore behavior. This is an integration candidate for Claude to merge, not authorization to deploy. Live Render/Neon/rules/main remain unchanged by these maintenance commits.

### Residual dev-only advisories

The24 package findings derive from five direct advisory causes, with higher-level metavulnerability counts through the CLI/PWA/lint graph:
- OpenTelemetry baggage allocation (moderate): https://github.com/advisories/GHSA-8988-4f7v-96qf
- deepmerge prototype poisoning (low): https://github.com/advisories/GHSA-gcqx-w48m-w2h4
- glob AbortSignal traversal (moderate): https://github.com/advisories/GHSA-3g3m-2fjr-6pw4
- minimatch globparts amplification (moderate): https://github.com/advisories/GHSA-g3hv-75wg-m249
- uuid caller-supplied buffer bounds (moderate): https://github.com/advisories/GHSA-w5hq-g745-h8pq

These are not assumed safe merely because they are dev-only. They remain an explicit upstream/tooling follow-up. Current CLI/PWA graphs retain constrained older packages; compatible audit fix has been exhausted. npm suggests unsupported/downgraded tooling or additional cross-major overrides for some resolutions. Those are not applied just to force a zero count. No production HTTP service or new exposed development listener is added by this change.

## Migration decisions

Firebase12/rules5 resolves the SDK-generation mismatch while keeping Node22; the scoped grpc override resolves its remaining pinned Node transport finding. Vitest4 replaces the vulnerable3.x test pool/tool chain; Firebase CLI15 replaces the remaining14.x critical tooling dependencies. Server Admin14/Functions7 removes all9 server moderate findings. These are deliberate direct-version upgrades validated by the checks above, not a blind `--force` resolution. PWA remains1.x/Vite6; no framework or app-source migration was needed.

Upstream references reviewed:
- https://v4.vitest.dev/guide/migration.html
- https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9
- https://firebase.google.com/support/release-notes/admin/node

## Verification gate before release

Fresh lockfile installs, client/server tests, frontend/server/Neon builds, lint, Firestore authorization tests, legacy callable compatibility, hosted-source and isolated-bundle SDK integrations, and the existing five real Chromium emulator scenarios. Capture exact commands/results and remaining audit findings. Never use production accounts/data as test fixtures. Request independent review before marking the final checkpoint READY; do not merge main or deploy automatically.
