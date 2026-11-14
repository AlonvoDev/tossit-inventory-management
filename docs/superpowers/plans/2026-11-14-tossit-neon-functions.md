# TossIt Neon Functions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Retain TossIt functionality without Firebase Blaze by hosting server entry points on Neon Free.
**Architecture:** Firebase Auth/Firestore and current business services remain authoritative. A web-standard callable HTTP adapter and shared client URL transport connect the existing app to Neon Node24. Trigger parsing replaces Google's schedule wrapper.
**Tech Stack:** Existing TypeScript, Firebase Admin/client SDKs, Vitest/emulators; Neon Node24 fetch handlers, bundled with esbuild.
**Spec:** docs/superpowers/specs/2026-11-14-tossit-neon-functions-design.md (approved by user's subsequent 'קדימה').

## Global Constraints
- Keep existing Firebase users/data/rules/offline and single worker; no SQL/auth migration, billing, main merge or production deployment.
- Reuse service interfaces; preserve callable results/error codes, actor/business checks, idempotency, cancellation and delivery claims.
- Keep credentials in server secrets only; no private keys/tokens in git, chat, client bundles or logs.
- Test only local Auth/Firestore demo data. New Neon project is separate, Free, in aws-eu-central-1; external staging health/auth denial uses no Firebase production credential and sends no push.
- Native execution in the existing Codex-only clone/branch; no new worktree or implementer agents. Publish and SHA-verify every completed task.

## Review Focus
1. Forged/expired/revoked bearer tokens and disabled profiles fail closed; anonymous capability revoke does not accept invalid supplied auth.
2. Configured Neon URL never falls back to Google when invalid/offline; emulator URLs are strictly loopback and production URL is HTTPS.
3. Spoofed cron calls cannot send push/end shifts; UTC schedule preserves Israel DST and ten-minute occurrence window.
4. Identity switch/retry and duplicate device actions retain request IDs/error codes without leaking data across accounts.
5. Missing/mismatched secret configuration and oversized/streamed JSON reject before privileged work; callable wire format remains real SDK-compatible.

### Task 1: Secure callable HTTP host adapter
**Files:** create functions/src/hosting/{http.ts,admin.ts,neon.ts}; functions/test/{hosting.test.ts,hostingConfig.test.ts}; extend functions/test/callables.integration.test.ts and package/config only as needed.
**Interfaces:** `createHttpHandler(deps: HostingDependencies): (request: Request) => Promise<Response>` with injected authenticate/call/scheduled/parseTrigger/allowedOrigins; `readAdminConfig(env)` and lazy `hostingServices()` reuse existing firebaseUserService/firebaseNotificationService.
- [x] Write HTTP/config tests and observe failure: auth denial, invalid supplied token on revoke, POST/body/CORS bounds, callable errors/results, unknown route, health without secret, cron origin/provenance/time and lazy configuration denial.
- [x] Implement adapter and project-scoped server credentials; keep raw errors sanitized and requests unlogged.
- [x] Extend real SDK/emulator suite with a hosting HTTP mode; run it and existing server suite/build. Expected: all tests pass including unauthorized/disabled/wrong-business behavior.
- [x] Commit/push/SHA-verify checkpoint.

### Task 2: Shared client callable URL transport
**Files:** create src/services/serverCalls.ts, src/test/domain/serverCalls.test.ts; modify src/api/authAPI.ts, src/utils/notificationUtils.ts, .env.example and affected domain mocks.
**Interfaces:** `serverCallable<Input, Output>(name: ServerCallName): (input: Input) => Promise<{data:Output}>`; VITE_SERVER_API_URL selects explicit HTTPS Neon base or loopback test URL; absent URL keeps explicit legacy emulator/current Firebase adapter until cutover.
- [ ] Write and observe failing tests for Neon URL routing, invalid config/no fallback, timeout/error preservation and unknown endpoint rejection.
- [ ] Implement with Firebase httpsCallableFromURL and migrate six calls without changing UI contracts/request IDs. Test hosted paths with real SDK/emulators.
- [ ] Run client suite/build/lint; expected zero errors and all tests green; commit/push/SHA-verify.

### Task 3: Neon bundle, staging proof, CI and release docs
**Files:** create functions/scripts/build-neon.mjs, functions/neon.ts (or root config scoped source); update package/lockfiles, CI, ignores, env examples, RELEASE/README/own handoff; hosting schedule/config tests.
**Interfaces:** `npm run build:neon` produces ignored deploy ZIP with Node24 fetch entry; six callable paths and `/scheduled` plus `/health`. `/scheduled` uses provider parser, expected trigger identity and existing israelSlot(service.run).
- [ ] Bundle and test import on Node24, checking firebase-admin/web-push load; write failing schedule/config tests before implementation where behavior added. Add Node24 CI adapter/build coverage while retaining existing suites.
- [ ] Create separate Free Neon project/branch, deploy candidate without production credentials or schedule, observe health and unauthorized/forged requests; explicitly record what was NOT tested. No actual device push, employee writes or auto-end in staging smoke.
- [ ] Update reproducible local commands and production secret/rollout gates; run all meaningful checks and inspect actual CI.
- [ ] Fresh independent final review; one TDD fix pass for important findings; publish final checkpoint and leave PR draft until credential/cutover authorization.

## Deployment boundary
Production Firebase service-account credential creation/installation is security-sensitive and requires a concrete reviewed scope after implementation. If platform staging or required native package/auth/trigger capability fails, record evidence and stop at that real blocker, never represent local tests as a deployed working backend. Free project quotas are verified, not assumed unlimited.
