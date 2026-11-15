# Claude — start the TossIt UI/UX round here

Read and execute [the 2026-11-15 UI/UX plan](superpowers/plans/2026-11-15-tossit-ui-ux.md).

**Current acceptance:** UI1–UI3 are complete and accepted at corrected Claude `281083572e7e3272cdc7ce970ebdb8f4b36ca508`, plus Codex's coordinated Hebrew menu label/test selectors and explicit ten-case sorting assertions. All blockers are closed in `docs/CODEX_REQUESTS.md`. Final local354client/58server/5browser/build/lint checks pass. The integration commit's own CI/release check follows publication. Do not repeat UI1/UI2/UI3 or deploy automatically; wait for concrete review/pilot feedback. The remaining checklist below is historical execution guidance, not unfinished work.

Alon approved the split: Claude owns UI/UX; Codex owns dependency/security/backend work and integration. This is a new round after the live release, not unfinished U1–U5 work.

1. Fetch origin; inspect your worktree and preserve uncommitted work.
2. Use `claude/tossit-ui`. Merge the **exact plan-publication SHA provided with the handoff**, which includes main6addce2 and this plan. Never reset/force-push the old branch.
3. Work UI1 (inventory) → UI2 (daily actions) → UI3 (navigation/admin consistency). The plan specifies contracts, ownership, acceptance and check commands.
4. Before marking a checkpoint READY, read Codex review feedback in `docs/CODEX_REQUESTS.md` from the latest published `origin/codex/tossit-core`; fix blocking findings and record their regression checks. After every finished checkpoint: checks, explicit-path commit, push, verify remote SHA and update `docs/handoff/claude.md` with evidence/screenshots/remaining work. Publish coherent IN PROGRESS checkpoints before context limits if necessary.
5. Do not deploy, merge main, alter server/API/offline/worker internals or upgrade packages. Put cross-owner requests in `docs/CLAUDE_REQUESTS.md`.

Current production: client/rules deployed, Neon credential connected, notifications unconfigured/schedule disabled. Read the latest top sections of `docs/RELEASE.md` and `docs/handoff/codex.md`; older no-deployment statements are historical. Use emulator fixtures for all development/screenshots.
