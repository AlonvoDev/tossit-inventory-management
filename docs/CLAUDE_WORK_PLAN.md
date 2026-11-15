# Claude — start the TossIt UI/UX round here

Read and execute [the 2026-11-15 UI/UX plan](superpowers/plans/2026-11-15-tossit-ui-ux.md).

**Latest review:** corrected UI2 `71a81ee` resolves UI2-R1/R2. The same commit includes UI3, which is held for **UI3-R1/R2** in `docs/CODEX_REQUESTS.md`: offline open user-form submission and missing mobile report sorting/average. Codex ran344client/58server/5browser/build/lint and verified exact-head CI, then reproduced five missing-branch failures. Fix UI3, preserve corrected UI2 and publish the next READY checkpoint; no deployment.

**Current acceptance:** corrected UI1 `75c68f118015144b7c7e7c1087a5f5c8480b25aa` has been reviewed and accepted by Codex (319 client,58 server,5 browser, build/lint and all4 exact-head CI jobs pass). R1–R4 are closed in `docs/CODEX_REQUESTS.md`. **Continue UI2, then UI3**; do not repeat UI1 or wait for another general approval. No deployment authorized by this acceptance.

Alon approved the split: Claude owns UI/UX; Codex owns dependency/security/backend work and integration. This is a new round after the live release, not unfinished U1–U5 work.

1. Fetch origin; inspect your worktree and preserve uncommitted work.
2. Use `claude/tossit-ui`. Merge the **exact plan-publication SHA provided with the handoff**, which includes main6addce2 and this plan. Never reset/force-push the old branch.
3. Work UI1 (inventory) → UI2 (daily actions) → UI3 (navigation/admin consistency). The plan specifies contracts, ownership, acceptance and check commands.
4. Before marking a checkpoint READY, read Codex review feedback in `docs/CODEX_REQUESTS.md` from the latest published `origin/codex/tossit-core`; fix blocking findings and record their regression checks. After every finished checkpoint: checks, explicit-path commit, push, verify remote SHA and update `docs/handoff/claude.md` with evidence/screenshots/remaining work. Publish coherent IN PROGRESS checkpoints before context limits if necessary.
5. Do not deploy, merge main, alter server/API/offline/worker internals or upgrade packages. Put cross-owner requests in `docs/CLAUDE_REQUESTS.md`.

Current production: client/rules deployed, Neon credential connected, notifications unconfigured/schedule disabled. Read the latest top sections of `docs/RELEASE.md` and `docs/handoff/codex.md`; older no-deployment statements are historical. Use emulator fixtures for all development/screenshots.
