# Codex handoff
Branch: codex/tossit-core
Task / bounded subtask: P0 — shared plan and branch bootstrap
Status: done
Last previously confirmed remote SHA: 9cdd8561cfe769954a13bc25a24b93368373f936

## Changed files
- docs/superpowers/plans/2026-11-09-tossit-two-agent-delivery.md
- docs/handoff/codex.md

## Checks and exact results
- Verified main: 9948d34bc9785b4aeed8eb6ffe9311621a727c9f.
- No pre-existing source changes in the working checkout.
- Plan structural check: passed; C1–C5 and U1–U5, ownership, contracts, dependency gates and push/recovery protocol present.
- Planning-only change; no product code, dependency, rule, data or deployment changes.
- Prior verified base build: PASS; existing tests: 5/5 PASS (Button only); lint baseline: 4 errors, 7 warnings. These were run during assessment, not repeated for the documentation-only P0.

## Known failures / NOT RUN checks
- Real signed-in pilot and device push are NOT RUN.
- Production Firebase rules/billing configuration have not been verified.
- Claude has not started; the user must launch their separate Claude session.
- No feature implementation has started. C1 is next.

## Integrated other-agent SHA
None. Both branches are seeded from the same P0 checkpoint after this handoff is committed.

## API / dependency requests
None for P0. Claude should begin U1 after reading the shared plan. Do not implement substitute domain APIs while waiting for C1/C2.

## Next smallest action
Start C1 with emulator authorization/auth regression tests in a Codex-only workspace, following the task and the shared-file ownership contract.
Do not deploy or edit main. Publish a checkpoint before context runs low.

## Commands to resume
```bash
git fetch origin
git switch codex/tossit-core
git status --short
git log -3 --oneline
```
Read the plan and this handoff before implementation. Every task requires commit + push + remote SHA verification.
