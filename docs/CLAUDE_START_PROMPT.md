# Claude kickoff — compact TossIt redesign and optional date scanning

Copy the following prompt into Claude. Use the exact published Codex checkpoint supplied alongside it.

```text
Start the next TossIt round now. Repository: AlonvoDev/tossit-inventory-management.

First inspect your worktree and AGENTS.md, preserve uncommitted changes, fetch origin, and normally merge the exact Codex checkpoint SHA supplied by Alon into claude/tossit-ui. Never reset, force-push, overwrite Codex's branch, or deploy.

Read docs/TOSSIT_MASTER_PLAN.md, docs/DATE_SCAN_CONTRACT.md, docs/CLAUDE_WORK_PLAN.md and the latest owner handoffs. Existing U1–U5/UI1–UI3 are accepted and deployed; preserve their fixes. The new task is a deliberate compact visual redesign plus optional camera/date-review UI. Codex has started C0a and owns date contracts, domain/API/rules/queue, OCR evaluation/service, dependencies and integration.

Begin V0 immediately: create a persistent local interactive prototype in docs/ui-review/v0/ showing busy inventory, opening and closing on a phone, with a desktop variant. Use synthetic data only. The direction: a flat inventory list, clear Hebrew typography, restrained green, thin separators, small radii, minimal enclosing cards, no gradients/emoji/KPI clutter. Product, quantity/unit and remaining time must scan quickly. Keep comfortable touch targets, compact filters and reachable actions. Show long Hebrew names, multiple fridges, kg/units, expiry warnings, empty/error/offline states and duplicate product names across departments.

Include an optional scan entry and review state for packaging and handwritten staff labels, using the C0a DTOs/mocks. Preserve explicit missing-year/time and ambiguous candidates; never infer missing dates or save a model suggestion automatically. This is a local prototype; no paid API, live photos, backend/persistence changes or claim of working OCR.

Do not stop at another written plan. Deliver the V0 preview and screenshots at390px/1280px (also check320px overflow), then publish it for visual review before the full V1–V3 implementation. No unit tests needed solely for a throwaway prototype; check its key local interactions and layout. Keep it out of production routes until reviewed.

Work only on your UI/prototype files. Do not alter shared contracts, rules, queue, worker internals or package/lockfiles without coordination. After EVERY finished task: run relevant checks, commit explicit paths, push, verify the remote SHA, and update docs/handoff/claude.md with task ID, READY/IN PROGRESS, full evidence and remaining dependencies. Publish a coherent IN PROGRESS checkpoint before context limits. Read latest docs/CODEX_REQUESTS.md before READY. Do not claim phone/provider tests that were not run.

Return the exact V0 checkpoint SHA, preview path, evidence and concrete questions. Keep moving on independent UI work while Codex builds the date/OCR foundation.
```
