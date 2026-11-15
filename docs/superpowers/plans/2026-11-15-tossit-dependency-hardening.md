# TossIt dependency hardening — Codex execution plan

**Goal:** Reduce the recorded dependency vulnerabilities while preserving the released inventory, permissions, offline and PWA behavior and avoiding Claude's UI files.
**Authorized scope:** Alon assigned dependency/security/backend maintenance to Codex and requested execution after starting his separate Claude UI session. Work on codex/tossit-core; no automatic main merge, deployment, billing, production data write or push activation is included in this new development round.
**Starting point:** 381d7e4 (UI handoff plan), released code8ac72aa. Use Node22 for the application's baseline and Node24 for the Neon artifact verification.

## Constraints and approach

Start with semver-compatible security resolution in root/functions lockfiles. Review the dry run before applying; no `--force`, broad dependency overrides or downgrading vite-plugin-pwa to the unrelated old version suggested by npm audit. If a major direct dependency bump is required, isolate it in the next tested checkpoint and consult upstream migration/security documentation. Do not alter shared UI, worker or offline code to hide a toolchain regression.

Source of truth is the actual npm registry/audit graph plus upstream advisories, not the scanner count alone. Record runtime versus development exposure and residual findings honestly. Existing unit/integration/browser tests verify dependency compatibility; no new tests that merely assert package version strings.

## Checkpoints

- [x] S1: capture baseline/audit and root/function compatible fixes; fresh locked install, root304/server58 tests, builds/lint, Firebase rules and source/bundle/browser integrations as warranted by changed graph; publish exact SHA and before/after audit.
- [x] S2: resolve remaining major-toolchain/server findings where supported. Verify migration requirements before changing versions; isolate unavoidable configuration changes from Claude work and document any residual unsupported dependency with precise rationale.
- [x] S3: run combined final verification on Node22 and Neon bundle Node24; request focused independent review, publish READY checkpoint and integration instructions. Report CI separately until actually completed.

Baseline on 2026-11-15: root npm audit70 (8critical/34high/20moderate/8low), omit-dev18 (3critical); functions9moderate/0high/0critical. Node22 client304/304 and server58/58 PASS. Host Node24 running client jsdom tests has an existing Blob-clean-copy assertion mismatch; Node22 is the declared app/CI baseline. Do not claim this is an application production regression or weaken the worker test to hide it. Root Node24 full-suite support is not a prerequisite for the separate Node24 server artifact.

## Coordination

Claude continues UI1–UI3 from381d7e4. Codex owns package manifests/lockfiles/config/CI/server; presentation contracts stay stable. Read Claude's published requests and integrate only pinned READY checkpoints. Each bounded task ends with checks, commit, push/remote-SHA verification and docs/handoff/codex.md updates; no completed work is left only local at context limits.

S3 complete: local suites/review and all four remote CI jobs (including native worker) PASS on c916ffb, run43722923684. See docs/DEPENDENCY_AUDIT.md for exact evidence and residual dev-only findings. No deployment was performed.
