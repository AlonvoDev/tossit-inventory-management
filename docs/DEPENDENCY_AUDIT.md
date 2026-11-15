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

## Remaining work / chosen migration boundaries

- Firebase11's pinned gRPC dependency causes the four omit-dev high findings; do not accept npm's suggested downgrade to Firebase9/rules-testing2. Investigate a supported newer SDK and matching emulator test library while retaining Node22.
- Vitest3 cannot resolve its remaining pool/tool advisories by a compatible refresh. Upstream Vitest4 supports Vite6/Node22 and documents mock/config changes. Use a reviewed stable4.x version rather than jumping to5 without need.
- Firebase CLI14 retains vulnerable toolchain dependencies; evaluate15 separately. No force/blanket override or obsolete PWA downgrade.
- Server9moderate findings flow through older Google clients/uuid. Review Firebase Admin14/Functions7 requirements before a major update; verify actual source and isolated Neon artifact against local Auth/Firestore emulators on Node24.

Upstream references reviewed:
- https://v4.vitest.dev/guide/migration.html
- https://github.com/vitest-dev/vitest/security/advisories/GHSA-82fw-gwwq-j7x9
- https://firebase.google.com/support/release-notes/admin/node

## Verification gate before READY

Fresh lockfile installs, client/server tests, frontend/server/Neon builds, lint, Firestore authorization tests, legacy callable compatibility, hosted-source and isolated-bundle SDK integrations, and the existing five real Chromium emulator scenarios. Capture exact commands/results and remaining audit findings. Never use production accounts/data as test fixtures. Request independent review before marking the final checkpoint READY; do not merge main or deploy automatically.
