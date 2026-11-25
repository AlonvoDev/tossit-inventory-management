# V1 approved — include dark mode in accessibility (2026-11-25)

Alon approved V0 at Claude7668e623cb82ee6dd111e0c38bc8855f0b4b57a9 and asked for a dark-mode option in accessibility. **Proceed with V1 now**; do not ask for another general design approval. Merge the exact Codex approval checkpoint provided by Alon normally at a clean boundary; preserve your work and existing accepted functionality.

V1 scope now includes an accessible Hebrew `נגישות` entry with appearance choices `בהיר`, `כהה`, `לפי המכשיר`. Default to system preference until explicitly overridden. Save only this non-sensitive device preference locally; restore it on reload/offline and handle blocked/malformed storage gracefully. Follow system changes only in system mode. Use selected-state semantics and keyboard/focus support; keep the accessibility entry reachable on the login screen and for every role. Do not present dark mode as complete accessibility compliance or add an unrelated accessibility overlay/library.

Use the actual production theme path: src/main.tsx reexports src/app/main.tsx, which mounts the ThemeProvider from src/app/theme.tsx. src/theme.ts and src/theme/materialTheme.ts are other definitions; editing those alone will not change the app. src/app/App.tsx imports static background tokens. Audit CSS/hard-coded surfaces as well as MUI palette, dialogs/portals, inputs/select menus, focus, disabled states, errors/toasts, expiry/status, offline/PWA controls and reports. Use semantic light/dark tokens, not an inversion filter. Keep typography/layout and existing functionality consistent in both modes. Preserve the single worker and all providers' lifecycles.

Verify phone/desktop busy inventory, open/close dialogs, error/offline states and appearance selection in light/dark. Test explicit preference persistence, system changes, invalid/unavailable storage and no draft/queue loss when switching modes. Record contrast/readability checks; real iPhone/VoiceOver remains NOT RUN unless actually tested. Avoid an initial bright flash for returning dark-mode users where the existing Vite architecture permits. No new package is required without a concrete need and coordination.

Date review must synchronize C0b: opened-at at day precision stays unresolved; it cannot become confirmed applicable opening evidence. Do not invent the missing time. This does not block inventory V1; adopt parseDateScanResult/confirmDateCandidate before real V4/C1 wiring. The prior V0 day-only-opening prototype check is not the production contract.

After V1: relevant checks and before/after evidence, explicit-path commit, push, remote-SHA verification and docs/handoff/claude.md. Return the exact READY SHA. No main merge or deployment is authorized by this approval. Codex continues domain/date/OCR work; theme/accessibility UI is Claude-owned.

---

# Claude — next TossIt round (2026-11-25)

The current plan is [TOSSIT_MASTER_PLAN.md](TOSSIT_MASTER_PLAN.md). It supersedes the historical UI-round entry below for new work. Read the complete plan before starting. Alon authorized implementation on2026-11-25. Codex has started C0a; Claude should begin V0 now. Read DATE_SCAN_CONTRACT.md and use CLAUDE_START_PROMPT.md for kickoff.

Claude owns V0–V4: visual direction for busy inventory/forms, coherent compact UI, then optional camera/crop/date-confirmation UI. Codex owns P0/C0–C2/S0–S1 and integration: date contracts/policy, trusted validation, compatible offline queue/rules and OCR evaluation/service. See the task board for dependencies and acceptance. Preserve existing accepted fixes; do not repeat U1–U5/UI1–UI3.

Start the round now: preserve your worktree, fetch and merge the exact published Codex plan SHA normally into claude/tossit-ui. Begin V0 while Codex prepares contracts. Do not start a paid provider, deploy, alter shared contracts/rules/queue/worker/lockfiles independently, or upload real staff photos. Each completed task requires checks, commit, push, verified remote SHA and a precise handoff. Report blockers and IN PROGRESS checkpoints before context limits.

---

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
