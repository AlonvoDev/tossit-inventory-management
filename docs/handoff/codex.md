# Codex handoff
Branch: codex/tossit-date-foundation (C0/S0 working branch; integrates into core through PR)
Task / bounded subtask: C0b runtime scan review / S0a evaluation harness
Status: C0b/S0a locally READY; full client/build/lint verified; publication/CI pending; Claude independently working V0; no live deployment.
Last confirmed released code SHA: 15788028fffb90d4e057259a7169ab51a2c4b52e (main merge; later evidence-only commits may follow)

## C0b / S0a — runtime review and evaluation foundation, 2026-11-25

Alon confirmed Claude is working and asked Codex to continue. Added strict parseDateScanResult and explicit confirmDateCandidate in src/domain/dateScanReview.ts. The parser bounds candidates/text, matches expected source, rejects invalid dates/extra authority fields/duplicate IDs or issues/contradictions/coercion, and detaches accepted data. Review requires an explicit selected candidate and corrected complete fields; opening requires minute precision. Raw image instructions remain literal text. The pure parser does not provide Auth/request-generation binding, DST/cutoff resolution, persistence or an OCR provider; orchestration must handle these separately. C0a DTOs are unchanged for Claude V0.

Added provider-neutral evaluation with separate print/handwriting/source groups, exact/wrong/abstained/invalid/no-date counts and paired end-to-end timing metrics. Multiple/unresolved candidates are not credited as precise suggestions. Missing timings remain null. scripts/scan-evaluation.test.ts reads a private recorded dataset only when explicitly requested; otherwise it uses an explicitly synthetic fixture and never claims recognition quality. No photos/credentials/providers/network calls. docs/SCAN_EVALUATION.md documents reproduction and limits.

Verification: all427 client tests in45 files PASS; standalone synthetic evaluation PASS; lint0errors/7existingwarnings. Build verification caught TypeScript return-type inference in two intentionally coercive test objects; explicit string annotations fix the fixtures without relaxing compiler/parser rules. Final production build PASS, including injectManifest worker generation. No changed contracts/rules/queue/server/worker production behavior; server/rules/browser suites were not rerun locally for unimported pure foundations. Real OCR/provider/phone pilot NOT RUN. Date-only cutoff/label-time policy and real-image access remain pending C0/C1/S0 work.

C0a was published and remote-verified at1c18c5c360c7e50bceab6402ed311e3bca155172 on codex/tossit-date-foundation. GraphQL ref updates repeatedly failed although commit objects were created; create_branch succeeded. For this checkpoint, preserve that history and publish through a new bounded branch/PR into core if direct ref updates remain unavailable. Never force-push or move main. No live deployment or changes to Claude's active work.

## C0a implementation started — 2026-11-25

Alon explicitly requested the Claude kickoff and Codex to start. Added src/domain/dateEvidence.ts with scan/review DTOs, explicit user-confirmed evidence and strict date/precision parsers. An unknown/production date cannot type-check as a confirmed opening/expiry. Missing-year/time stays explicit in the synthetic adapter fixtures. Gregorian validation rejects impossible dates without JS Date rollover or silent timezone/precision assumptions. It returns detached copies. Local minute validation is not DST resolution or expiry policy.

DATE_SCAN_CONTRACT.md provides imports, synthetic packaging/incomplete staff-label fixtures, limitations, ownership and pending C0/C1 decisions. CLAUDE_START_PROMPT.md starts V0 on Claude's own branch with persistent responsive local prototypes before production UI changes. Plan and entry point now record actual implementation authorization.

No existing inventory contract, Firestore rules, queue format, runtime adapter, worker, lockfiles or production config/data changed. DTOs are not trusted provider-response validation or a deployed OCR feature. New-date writers wait for the coordinated C1 change and explicit date-policy decisions. OCR print/handwriting evaluation is NOT RUN without real examples/provider access. Next is remaining C0 and synthetic S0 harness; V0 can proceed independently.

Verification results are recorded with the published checkpoint. The first build caught Object.hasOwn incompatibility with the repository's current TS library target; changed only the parser to the compatible own-property check, preserving compiler settings. Re-ran targeted calendar + existing inventory tests:40/40 PASS. Lint0errors/7existingwarnings PASS. Final production build PASS (including injectManifest worker generation). No server/rules/browser rerun is warranted for this isolated unimported foundation; no claims of those suites rerunning.

## Agent-time estimate corrected — 2026-11-25

Alon requested a time estimate based on actual Codex/Claude work and existing functionality. Reviewed Git timestamps: initial UI1 checkpoint to corrected UI3 was3h37m57s; final integration followed~15min later; narrow correction windows were~6–9min. These are checkpoint intervals, not active-model telemetry. Replaced the generic staffing estimate with5–8 elapsed coordinated agent-hours for incremental A–C under feasible OCR/provider access and promptly resolved policy assumptions. UI can finish earlier; real-photo/device/shift/access waits remain separate. No implementation started and no live changes. Documentation-only verification: arithmetic/date-interval checks and diff whitespace; no application tests required.

## Next-round master plan published — 2026-11-25

Alon requested a complete work plan after favoring the compact visual direction and requesting scanning of both packaging dates and handwritten staff labels. The current work is documentation only: docs/TOSSIT_MASTER_PLAN.md and the Claude entry point. No implementation, provider activation or production mutation was performed.

Remote main/core baseline84522ea and Claude2810835 were read directly from GitHub. Existing source review identified the required coordinated change: current rules enforce openingTime + shelfLifeDays, and input fingerprints/replay/idempotency omit manufacturer/label dates. The plan therefore includes explicit date policy/contracts, trusted caps, legacy queue compatibility and version-overlap rollout before new writers. UI can ship independently of OCR. The approved direction is not a full design sign-off, and the previous conversation-only HTML preview is absent locally.

Plan covers two-owner branches, per-task push/verified SHA/handoff, visual prototype and implementation, manual dates, print/handwriting feasibility, optional protected extraction service, camera/correction UI, regression/device/staff pilot, known follow-ups, optional push, rollout/rollback and portfolio docs. Original generic46–74-hour estimate is superseded by the agent-execution revision in the master plan: target5–8 coordinated elapsed agent-hours under the documented feasibility/access assumptions; pilot/access waiting excluded. Provider cost/payment/data-policy and actual label conventions remain explicit decisions, not assumed approvals.

Validation: documentation links/task/dependency/estimate review and git diff --check. No code tests rerun for this docs-only task; previous release counts are labeled historical. Implementation NOT STARTED; live configuration/records/rules/billing/push remain untouched by this task. Publish to codex/tossit-core only, then relay the exact SHA to Alon for Claude.

## UI/security refresh deployed — 2026-11-15

Alon explicitly approved merge and deployment. PR2 merged normally with pinned head f29a276d93b228ffb9d94aa0d9264700db5e4b5d into main at **15788028fffb90d4e057259a7169ab51a2c4b52e**. Both trees are 485b4551321e0122af786393753dc20e7f336f0b. All four checks passed on the candidate (run43744197762) and on the actual main merge (run43753239977), including the native Functions worker. Local final evidence remains 354 client / 58 server / 5 browser tests, build PASS, lint 0 errors / 7 existing warnings.

- Render **dep-dbt0kpff3r2c73bjda4g** is LIVE on commit1578802, finished 2026-11-15T19:41:41Z (21:41 Israel time). Build logs confirm Node22.23.5. Existing Free plan, main tracking, autoDeploy:no, commands and environment were preserved. Exactly one manual API deployment was triggered.
- Neon tossitapi **deployment3** is completed and active on Node24, replacing deployment2. ZIP SHA256: 24c5743ae046d997527face8e166b4bf34c38a9563e6474c594e427198dd3b48; index.mjs SHA256: c6042dc3f6d2efa1c4b43811b7e2bfcc13aa2273c059e2764e3b580a3a55a5f8. Deployment supplied only the rebuilt ZIP; existing credential and three public configuration variables carried over without reading or exposing their values.
- Neon health returns200/configured:true. Unsigned employee creation and forged scheduled invocation return401. The inventory trigger remains disabled with next_run_at:null; no VAPID configuration was added.
- Independent HTTP checks: root, login, admin SPA route, worker and actual /assets/index-Dfq8cKDz.js all200. The new bundle contains the intended Neon URL and Hebrew menu label.
- Fresh unsigned Chromium153 at390x844: login loads, exactly one root /service-worker.js, zero notification permission requests, unauthenticated /admin/users redirects to /login, offline app-shell reload succeeds, zero page errors. External analytics/config requests fail as expected during the explicit offline phase; that is not an online service failure. The test used the workspace HTTPS proxy/test certificate configuration.

No production users, inventory, device records, rules, indexes, billing or service settings were changed. Real owner sign-in, employee/inventory operations, phone keyboard/install/update/offline behavior and staff pilot remain **NOT RUN**. Push delivery is not enabled. The72h expiry policy and same-name report department labels remain nonblocking follow-ups.

Rollback references: previous Render dep-dbsnvcm1egvs73ecrql0 / application8ac72aa2c81e91e77550f0b3f936b909d26d67ea, previous Neon deployment2. Current strict rules are unchanged; do not select the older incompatible9948d34 client. Historical candidate/pending statements below are superseded by this release entry.

CI: https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43753239977

## Final UI candidate accepted/integrated — 2026-11-15

Pinned Claude281083572e7e3272cdc7ce970ebdb8f4b36ca508 contains all previous core/security docs and corrected UI1/UI2/UI3. Follow-up independent reviewer clears both UI3 blockers; no new Critical/Important issue. Handler/button/query offline behavior and mobile report feature preservation now match requirements. Source manifests/locks unchanged. Exact Claude CI43742832942 succeeds all4 jobs; https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43742832942 .

Codex closes known UI3-R3 with a single Hebrew menu label (`פתיחת תפריט`) and synchronized unit/browser selectors, observed RED→GREEN on existing focus-return test. Also expands mobile sorting assertion to every field in both directions, resolving a minor evidence overclaim without changing production sorting. Final patched source tested in detached worktree:354/354client,58/58server, frontend build PASS, lint0errors/7existingwarnings, full5Chromium153/emulator browser cases PASS(exit0,18.0s), including actual employee create through external host. Independent reviewer checks the four-file integration patch and reports no findings. Source tree is this tested patched candidate plus acceptance/release docs only.

Normal no-ff integration into codex/tossit-core; all review blockers closed in docs/CODEX_REQUESTS.md. Integration commit's exact-head CI pending after push; inspect all4 jobs/native step before claiming final remote readiness. PR2 can become ready for owner release review after green CI, but no main merge/deploy is authorized by UI acceptance. Main remains6addce2/released application8ac72aa; live Neon deployment2 remains prior SDK bundle. No production users/data, secrets, rules/indexes, billing, schedule or service settings changed. Push unavailable, schedule disabled. Real phones/keyboards/screen readers and live owner workflow/staff pilot remain NOT RUN. Current72h policy/report department-label limitation remain explicitly nonblocking.

Claude can stop implementing this round; only concrete review/pilot fixes remain. Do not edit Claude's handoff or invent further features. Next owner gate is reviewed candidate rollout (client and rebuilt Neon artifact while preserving existing secrets, no rules change required), then pilot. Release docs capture this sequence.

## Corrected UI2 resolved / UI3 HELD — 2026-11-15

User supplied corrected READY71a81eef26c4dd7c5ef08f86cd06812654f4fd3e containing UI3commit741333a. Verified c4df88e ancestor and unchanged dependency manifests/locks. Separate independent reviews: UI2 busy-callback/dismissal/retry/evidence fixes resolve all findings; UI3 has two Important issues (offline open/linked user forms submit, phone report drops sorting/average). No candidate merge performed because71a81ee bundles UI3.

Independently tested exact source in detached worktree with verified same dependencies: client344/344, server58/58, build PASS, lint0errors/7existingwarnings, full Chromium153/emulator browser5/5 PASS(exit0,19.1s). All four exact-head GitHub check jobs SUCCESS. Additional scoped synthetic tests reproduce5 failures: offline query create enabled, open edit submit enabled after disconnect, direct offline submit calls mocked update API, phone report lacks sorting, phone card lacks average. Existing suites miss these branches. No real account/data writes occurred. Detailed requirements/reproduction in docs/CODEX_REQUESTS.md as UI3-R1/R2; UI2-R1/R2 explicitly closed. English menu accessible-name/browser-selector change is acknowledged minor, coordinated by Codex at integration. No protected API/domain/server/worker code changed.

This checkpoint publishes only feedback/acceptance docs. Keep core at accepted UI1/security plus docs; do not claim corrected UI2/UI3 integrated or deployed. Claude should fix UI3 while preserving corrected UI2, publish exact READY SHA and full untruncated evidence. No repeated general approval is needed for those authorized fixes. Main/live/settings/schedule/billing unchanged. Actual phones/screen readers NOT RUN;72h expiry policy unchanged/nonblocking.

## UI2 reviewed — HELD, 2026-11-15

User requested an interim UI2 review. Fetched exact published READYab52a6c0cb511013909ed67816c393408f2eaa59 (includes core4aae9eb); manifests/lockfiles unchanged. In detached worktree using the verified identical dependencies, independently ran client330/330, build PASS, lint0errors/7existingwarnings and complete Chromium153/emulator browser5/5 (exit0,18.4s). Exact source CI push43729780784 SUCCESS. https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43729780784 . No code integration/merge/deployment was done.

Independent review found one Important UI2 requirement gap: opening wrapper can dismiss while child submission awaits, unmounting values and retry-intent ref; close-item modal already guards loading. Codex reproduced all3 paths (header, backdrop, focused Escape) using actual wrapper+form and a deferred API promise in a disposable isolated test: all3 expected-stay-open assertions FAIL. This is a UI lifecycle gap, not proof of broken server/queue idempotency. Existing suites pass because wrapper tests mock the form. UI2-R1 acceptance asks for preserved/mounted intent or guarded dismissal, recovery after failure/success, same-ID retry, no duplicate submit. UI2-R2 minor asks for missing1280px visual evidence. Full synthetic reproduction is in docs/CODEX_REQUESTS.md.

Core source is unchanged and remains4aae9eb plus these review docs. Claude owns the UI fix; do not edit his in-progress files or claim feedback was sent externally. Alon can relay the published feedback pointer. UI3 can proceed independently, but UI2 is not accepted and must not be merged/deployed until corrected READY SHA passes review. Actual mobile keyboards/screens readers remain NOT RUN. Prior UI1 acceptance remains valid.

## Corrected UI1 accepted/integrated — 2026-11-15

Pinned Claude checkpoint75c68f118015144b7c7e7c1087a5f5c8480b25aa contains the normal merge of Codexf5ce297 plus corrected UI1. Verified f5ce297 is an ancestor; all package/lockfiles exactly match the reviewed security graph. Follow-up independent review finds R1–R4 resolved and no open Critical/Important findings. The nonblocking72h business-policy request remains unchanged.

Before committing integration, Codex checked the exact source in an isolated detached worktree using the already verified identical dependencies: client319/319, server58/58, production build PASS, lint0errors/7existingwarnings, full existing Chromium153/emulator browser5/5 PASS (exit0,18.2s). Includes durable queue/reload, account privacy, role guard, one worker/no initial prompt and actual employee creation via external callable host. Also inspected all four CI jobs SUCCESS at exact75c68f1, run43727063044. https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43727063044 . Backend/domain/worker source is unchanged; no redundant rules/source/bundle reruns locally beyond exact-head CI coverage.

Normal no-ff merge into codex/tossit-core, with acceptance docs only on top of the tested75c68f1 tree. UI1 is now accepted; docs/CODEX_REQUESTS.md closes R1–R4. Claude can continue UI2→UI3 independently with existing contracts and commit/push/SHA evidence per task. Do not edit Claude's handoff. Original held findings below are historical. Physical phones/screen readers, UI2 dialog focus containment and live pilot remain NOT RUN. Main/live/settings/schedule/billing unchanged; PR2 stays draft for remaining UI checkpoints. Integration commit's own CI will be separate from the verified75c68f1 run.

## Security maintenance READY / UI1 review held — 2026-11-15

Exact code checkpoint c916ffb12876e73e31110ddc2ad6ea3fb347044d is READY for integration: push CI43722923684 SUCCESS, all four jobs and native Functions-worker step explicitly inspected PASS. https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43722923684 . Local runtime/server audits0; root24dev-only moderate/low; all regression/build/browser checks and independent dependency review recorded in docs/DEPENDENCY_AUDIT.md. PR2 is draft, no main/live deployment. The PR-triggered rerun is separate; do not claim its result unless observed.

Independent UI1 review pinned a8ed3b353a145fe23db773b26a4d3d7128592fa3 found one Important regression (hidden statusFilter applies after switching to discarded mode), plus touch-target/department-label minors. Codex confirmed RED in a detached review worktree and GREEN with a one-line diagnostic guard; no UI fix/source change was committed in core or pushed to Claude's branch. UI1 is held until Claude supplies a corrected READY SHA. Reproduction/acceptance and full-five-browser evidence request are in docs/CODEX_REQUESTS.md; guide points Claude there. Do not edit Claude's in-progress UI2 files or misreport the review as a merge. Product-relative expiry-policy request remains acknowledged/nonblocking, current72h policy retained.

This next commit only publishes verified CI evidence and review feedback. No new package/source/runtime/data/permission change. Alon should relay the review-feedback pointer to the external Claude session; git documentation has been published, no external message was sent. Continue reviewing a corrected UI checkpoint when it is published; keep manual deploy/schedule/billing unchanged.

## Security maintenance S2/S3 — local verification complete, remote CI pending

Dependency changes are ready for publication on codex/tossit-core; no live/main update. Details and residual inventory: docs/DEPENDENCY_AUDIT.md. Final audits: root omit-dev0, Functions all0; root all24dev-only (22moderate/2low), no high/critical. Firebase12/rules5 + CLI15 + Vitest4 chosen while retaining Node22. Firebase Admin14/Functions7 modular imports compile unchanged. Root floor>=22.13.0 corrected after independent review; recommend current22.x/24.x for optional native CLI deps. One scoped Firestore->grpc1.14.7 override, no source/worker/UI edits or blanket force fixes.

Fresh locked installs PASS. Local final checks: client304, server58 on22 and24, rules42, legacy callable3pass/3host-onlyskips, source6 and isolated bundle6 (Node24), browser5; all builds PASS; lint0errors/7existingwarnings. Independent reviewer found no Critical/Important findings, Node-floor minor fixed. Native Functions worker and final exact-head CI remain pending on GitHub; do not claim remote pass before observing it. S1 published cbf6980 with exact tree; this next checkpoint finishes SDK/toolchain work. No production mutations, secrets, billing, notification activation or deployment.

Claude UI1 READY a8ed3b3 is now published. No merge yet: review it and run combined checks after securing this checkpoint. UI1 handoff says browser4 despite five unchanged browser cases in tree; verify all5 during integration and correct the evidence through Claude's own handoff/request workflow. Nonblocking UI1-1 request proposes changing the current72h expiring window for short-lived products; no business-policy change was made as a dependency side effect. Keep it explicit for a separate reviewed decision. Claude may continue UI2/UI3 on his branch; package changes are Codex-owned.

## Security maintenance S1 — compatible lockfile checkpoint

Alon started his external Claude session and authorized Codex's security/dependency lane. Plan: docs/superpowers/plans/2026-11-15-tossit-dependency-hardening.md. Audit/evidence: docs/DEPENDENCY_AUDIT.md. Root compatible lockfile refresh reduces all-package70→41 and omit-dev18→4high/0critical. Functions remains9moderate (compatible fix has no file effect). Direct ranges/UI/server code untouched. Fresh Node22 client304/server58/build PASS; lint0errors/7existingwarnings. Baseline Node24/client jsdom Blob test mismatch is not new; Node22 app pin passes. No assertions/source changed to mask it.

S1 NOT RELEASE READY: remaining SDK/CLI/test-runner upgrades and final clean-install/source/bundle/browser/rules checks in S2/S3. Claude branch now fast-forwarded to shared381d7e4, no new requests at last fetch. Do not edit UI or deploy this checkpoint. Next investigate SDK12 + compatible rules-testing rather than latest13/rules6 (rules6 requires Node24.12, beyond current Node22 app). Major server/tools upgrades must be validated on Node22 and Neon24 before readiness. Publish this bounded checkpoint before proceeding.

## New UI/UX round — plan published 2026-11-15

Alon requested a concrete plan for his separate Claude session. Entry point: docs/CLAUDE_WORK_PLAN.md. Full plan: docs/superpowers/plans/2026-11-15-tossit-ui-ux.md. Starting integrated main/core6addce2; old Claude branch357bf15 must merge the exact new plan-publication SHA before work. Claude owns UI1 inventory hierarchy, UI2 daily actions, UI3 navigation/admin consistency; Codex owns dependency/security/backend and integration. Explicit ownership/contracts include protected worker/offline/auth internals. Each checkpoint requires checks, emulator screenshots, commit/push/remote SHA and own handoff. UI development is authorized; production deployment of the redesigned candidate is not. No implementer agent was started by Codex; Alon will start Claude separately. No application code or live settings changed in this planning checkpoint.

## Live rollout complete — 2026-11-15

Alon's next explicit yes authorized the coordinated main/client/rules deployment. PR1 marked ready and merged normally at8ac72aa, expected head d73752b. All four merge CI jobs pass. Render deploy dep-dbsnvcm1egvs73ecrql0 is LIVE, Node22.23.5 confirmed; env patch preserved other keys and set Node22/NeonURL/emulators:false/VAPID empty. The patch triggered one deployment itself, so no duplicate deploy was requested. Free plan, main branch and autoDeploy:no preserved.

After client live, exact candidate rules released as0f1666e5-d14c-4050-91d7-088f20690648 with post-read equality verification. Compilation no issues. Previous client9948d34/deploy dep-d304odali9vc738krajg and rules f4e3e5d5-8dde-43ef-a6df-3d7192cc46f4 recorded for coordinated rollback; do not claim old build artifact retention. No index changes.

Real production Chromium153 smoke PASS: login form, bundle contains NeonURL, one root worker, zero permission requests, guarded admin deep link, offline shell reload, zero page errors. Workspace proxy/test certificate configuration required; separate HTTP checks PASS. Unauthenticated Firestore403; Neonhealth200/configured:true. Billing remains false; trigger remains disabled/no next run; VAPID absent. No inventory/employee/device writes or Auth/domain changes during rollout. Previously approved two-field profile repair remains the only production data write.

Actual candidate parsers accept all current-admin business data. Five products/two items belong to other scopes. Those two other-business legacy items are malformed; do not reassign or infer fields. See RELEASE.md. npm audit --omit=dev additionally reports18 unresolved advisories including3critical transitive packages; review reachability/updates separately with tests, no blind audit fix in rollout. README/PILOT/RELEASE now reflect deployed status and honest remaining limits.

Real owner sign-in and production inventory/employee workflows, phone/staff pilot and actual push/provider schedule remain NOT RUN. Next step is owner sign-in on live site; do not impersonate an existing identity or create production test employees for smoke tests. Earlier nonproduction/no-cutover records below are historical and superseded by this entry. Publish this docs-only checkpoint to own branch and main; Render autoDeploy is off, so docs publishing should not rebuild the live app.

## Approved admin profile repair complete — 2026-11-15

Alon explicitly approved completing only email and department:bar on the existing admin profile. Fresh preflight confirmed exactly one profile, existing admin/business scope, no email/department/area, and a matching enabled Firebase Auth identity with email. The real candidate parseUserProfile rejected the original profile and accepted the proposed two-field repair before the write.

Applied one Firestore commit with an updateMask containing only email/department and a currentDocument.updateTime precondition. Commit time: 2026-11-15T09:41:53.824240Z. Copied email directly from the matching Auth identity and used department:bar, consistent with canonical admin provisioning. A fresh read exactly matched the original fields plus those two approved additions; UID/role/business/all other fields preserved. Re-read Auth identity confirms unchanged UID/email/disabled state. The actual candidate parseUserProfile now accepts the repaired profile. No private values or profile identifiers are included in this checkpoint.

This was the authorized production-profile write only; no inventory/product/device or Auth mutation. Main, live Render deployment/settings, deployed rules/indexes/domains, billing and disabled schedule remain unchanged. A real signed-in browser flow against the new deployed client is still NOT RUN. Remaining release work is coordinated rules/client configuration and cutover, matching VAPID configuration and genuine scheduled/push/mobile pilot. Do not ask again for the completed profile repair. Preflight notes below describe the state before the repair and are superseded for that profile.

## Rollout preflight — 2026-11-15

Alon confirmed Render My Workspace/tea-d27125ndiees73b9418g. Service srv-d27ml68gjchc738duh3g matches TossIt; main, manual deployment only, last live9948d34. Actual commands npm install; npm run build / npm run preview; no settings changed. NODE_VERSION/env cannot be read using current MCP capabilities. Public Neon URL production build PASS with emulators:false and VAPID absent; URL bundled, private-key/service-account markers absent.

Complete read-only Firebase audit: users1/products9/items11/fridges4/settings0, no composite indexes. Sole admin profile is missing email and department (also no area fallback), while matching Auth account exists/enabled and provides email. New client would reject this profile. Concrete next approval: update only that existing profile's email from its matching Auth account and department:bar (canonical admin value), with original updateTime precondition; preserve UID/role/business/all other fields. Do not apply until explicitly approved. No production data write was executed. Legacy11 items without productId remain supported; never infer IDs from names/codes.

Deployed rules are the old admin-only global policy, not candidate scoped rules. Render host absent from Auth authorizedDomains (popup/redirect gap, not proof email/password fails). Release docs record exact IDs/checks and coordinated repair/rules/client/VAPID/pilot sequence. Main/live/rules/domains/schedule unchanged. Push this docs checkpoint before stopping; no need rerun unchanged code suite (fresh environment-specific production build passed).

## Credential connection complete — 2026-11-15

Alon's explicit authorization has been executed; do not ask again for this completed action. Enabled the nonbillable IAM API, created tossit-neon-api@tossit-4cc02.iam.gserviceaccount.com (unique ID 102321388725695366320), and preserved existing project policy/etag while granting exactly two unconditional project roles: roles/firebaseauth.admin and roles/datastore.user. No Owner/Editor/billing role. Dedicated key ID 70de3a5e25cbd0252913f6b284def6961fefe437 was installed directly as FIREBASE_SERVICE_ACCOUNT_JSON in Neon deployment2; private material was never committed or printed, and the temporary local credential was removed after verification.

Deployment2 is active/completed on Node24 and reuses deployment1's reviewed bundle. Existing public env values are preserved, including deliberately non-working trigger-staging-probe. Real read-only checks PASS: service-account Auth listUsers(1) (no identities logged), Firestore reads, remote /health200 configured:true, and remote anonymous revoke of a cryptographically random absent device returns400/FAILED_PRECONDITION after a real Firestore transaction read. Device and revocation documents were absent before and after; no production user/inventory/device writes occurred. Unsigned employee and invalid-token employee calls return401; forged scheduled call returns401. Authenticated production employee writes were NOT RUN.

Inventory trigger remains disabled, next_run_at:null. Google billingEnabled:false confirmed after provisioning. VAPID keys absent; genuine provider-scheduled delivery/retries, real push, phone/staff pilot NOT RUN. Main, Render live site, rules/indexes and unrelated alondb unchanged; PR1 remains draft. Remaining work: review production profiles/rules/indexes and Render workspace/auto-deploy settings, prepare matching client configuration and VAPID/pilot, then obtain concrete coordinated main/rules/client cutover authorization. Credential approval did not authorize those actions.

The sections below are historical checkpoint records; their statements about missing credentials or awaiting credential approval were superseded by the completed connection above.

## Neon N3 complete — implementation verified, production credential gate remains

Shared callable host and client adapter are implemented, existing Auth/Firestore services retained. Built Node24 ESM/ZIP artifact with exact dependency lock; fresh server58/58, source and isolated actual-bundle real SDK/Auth/Firestore6/6 each, and browser5/5 pass. Browser now actually creates a synthetic employee through VITE_SERVER_API_URL, alongside previous four worker/offline/account-isolation scenarios. JSON stream deadline and Firebase Admin duplicate-email mapping have RED→GREEN regression tests. Final local client304/304, rules42/42, legacy callable3/3, production build and lint0errors/7existingwarnings pass. Fresh independent review found no Critical/Important issue; the two minor notes (secret-store wording and direct expired/revoked coverage) are addressed in documentation/verification. Expanded expired/revoked token regressions pass through both source and isolated artifact, with no employee/device mutation; Node22 server58/58 also passes. Remote CI verified SUCCESS on138eebc: push43631718046 and PR43631722809, all four jobs including native Google emulator compatibility and Node24 source/bundle host tests. https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43631722809 . Final documentation-only successor records these results.

Neon project misty-flower-45450210/staging br-flat-mud-b9coh1k6: deployment1 completed, runtimeNode24, URL https://br-flat-mud-b9coh1k6-tossitapi.compute.c-7.eu-central-1.aws.neon.tech/ . Artifact SHA2560c5b6e586827e7302d2c4f1319c4e75fa648b5615f75cdec1ea912cce31ad159. Six hosted checks PASS: health200/configured:false, unsigned401, legitimate preflight204, forbidden origin403, forged schedule401 (Neon edge stripping independently observed), oversized revoke413. No production Firebase credential or VAPID keys uploaded. Disabled inventory trigger trigger-f2baa3cc-f349-4d46-a316-abbc26890e98 exists with next_run_at:null; stage expected trigger ID intentionally remains the non-working probe ID. Provider-authentic scheduled delivery/real Firebase credential access/real push/mobile remain NOT RUN. Default unused Postgres compute is observed idle/suspended; no app data copied. Existing alondb/main/live site unchanged; Google billing remains off.

Production next gate is owner approval to create `tossit-neon-api@tossit-4cc02.iam.gserviceaccount.com`, grant only `roles/firebaseauth.admin` and `roles/datastore.user` in tossit-4cc02, create its dedicated credential and install it directly as a Neon runtime secret. No Owner/Editor or billing roles. This is a reviewed dedicated service account with project-scoped Firebase Auth Admin and Datastore User roles, installed only as Neon runtime secrets, plus VAPID keys and actual trigger ID. This security-sensitive credential action is NOT covered by implementation approval: obtain owner approval against the concrete account/roles before creating it. Never request private JSON in chat, use Owner/Editor or reuse interactive Google CLI auth as server auth. RELEASE.md has the staged cutover and legacy Google-hosted notes are explicitly superseded. Render workspace selection and main/client/rules deployment remain owner gates; PR#1 stays draft.

## Neon N2 checkpoint — client callable URL transport

Published N1 e3c84c3. Added VITE_SERVER_API_URL and a shared serverCallable adapter using the real Firebase httpsCallableFromURL SDK: retains tokens/wire/error/timeout behavior, validates HTTPS URLs and local emulator exceptions, rejects unknown endpoints and never falls back after a configured URL fails. Six employee/device call sites migrated; UI interfaces and request IDs unchanged. Tests RED before module, GREEN6targeted/304client; app build PASS; lint0errors/7existingwarnings. Real Auth/Firestore SDK integration now5/5 through host adapter, including a non-Google callable URL with idempotent employee create. N3 packaging/Neon staging/scheduler remains in progress; no live server claim or production credentials.

## Neon N1 checkpoint — secure host adapter

Design approved by Alon ('קדימה'); execution plan is docs/superpowers/plans/2026-11-14-tossit-neon-functions.md. Host-neutral callable boundary and lazy project-scoped Firebase Admin configuration implemented; existing business services reused. Bounded JSON, verified/revocation-aware bearer identity, signed-out capability revoke, exact origin/method/preflight checks and sanitized callable wire errors. Health can run without any Firebase secret. Targeted tests RED before implementation, GREEN afterward; server53/53, real SDK/Auth/Firestore integration through the new adapter4/4, Functions build and changed-file lint PASS. Baseline client298/298 passed. Client URL transport and Neon bundle/schedule remain N2/N3, not delivered yet.

New isolated Neon project tossit-server: misty-flower-45450210, region aws-eu-central-1, default branch staging br-flat-mud-b9coh1k6, organization org-aged-cell-89320935 (Free). Project creation initially rejected a custom suspension value; confirmed no partial project and retried without overriding Free defaults. Auto-created Postgres is unused; no application tables/data migration. No function deployed, no trigger created, no Firebase private key/production credentials installed. Existing alondb untouched. Live app/main remain unchanged.

## Historical Neon design checkpoint

Alon explicitly chose to keep employee administration/push features and add Neon rather than remove Functions-dependent features or enable Blaze. Firebase login now succeeds for his account; tossit-4cc02 is accessible and its default STANDARD Firestore database is in me-west1. Cloud Functions API is now enabled and functions:list returns an empty list. Read-only Cloud Billing check returns billingEnabled:false. No production data/configuration/billing/deploy change was made by Codex. Latest preparation head5f0d84e has successful push and PR CI runs43623360924/43623363827; PR#1 remains draft.

Proposed host-only migration design: docs/superpowers/specs/2026-11-14-tossit-neon-functions-design.md. Retain Firebase Auth/Firestore/offline and port server transport/schedule to Neon Node runtime; no Postgres data migration. Fresh builder check: nothing important left. Await design approval and connected Neon account; do not implement/create external projects or deploy before that. Neon Free runtime/bundling/secrets/trigger provenance remain explicit proof gates. Render workspace selection is also still unconfirmed. Do not ask for an install if a subsequent connection event confirms Neon access.

## Release preparation follow-up

Verified final integration e02398b has successful GitHub Actions run42799141294 (all three jobs). Main remains9948d34. Found and corrected stale Render Node pins18/20 to22 in both committed Render definitions; parsed YAML and validated both against `.node-version`. Added Render rollout prerequisites to RELEASE.md. Actual Render settings, Firebase billing/configuration/profiles and live deployment remain unverified; do not infer them from repository files. A draft integration PR preserves the candidate for coordinated release; no main/production mutation is part of this checkpoint.

## Final integration — Claude U5 accepted

Merged exactly `357bf15cd03ba728531b3607d9d442945d6e586f` from Claude with a normal merge. Reviewed all seven changed paths: shared setup helper, distinct truthful Hebrew error states, two regression tests, README, demo/pilot docs and Claude handoff. No code-blocking issue found in U5. Its helper/error-code adoption completes the requests below; U5 is no longer waiting.

Fresh local Node 22.23.4 verification on the merged tree: client298/298 PASS, production build PASS, lint zero errors/seven existing warnings. The merged source tree initially exactly equalled pinned Claude357bf15. GitHub Actions run42709976471 on that exact source tree passed all three jobs, including server41, rules42, callable3 (HTTP harness and native Functions worker) and browser4. https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/42709976471 . This final commit adds Codex release/handoff documentation only.

Two local demo prerequisites are clarified in RELEASE.md: admin/staff need isolated browser profiles (ordinary windows share Firebase Auth), and a dummy emulator-only private-secret override prevents the scheduler emulator from looking up a real secret. Neither change enables push delivery or changes production configuration.

No implementation remains assigned to either agent. Remaining owner steps: decide integration into main; review production project/profiles/configuration and deploy the matching client/rules/functions together; run real-phone checks and real-staff pilot with recorded SHA/results. Main, live Render/Firebase, billing, secrets and real data have not been changed.

The sections below are historical checkpoint records; use this final status when resuming.

## Historical C5 checkpoint before U5

Merged exactly Claude U4c `1cd48edadc9c718c0890244d2ede7c66ee450117` with a normal two-parent merge. U1–U4 are present. Main and live services are unchanged. The tested integrated code candidate is `3be1d676aa66baf448a802521d9d29b60e8af64e`; the subsequent handoff-only commit records the results and may also be merged. This is not production deployment approval.

Verified locally on actual Node 22.23.4: 296 client tests, 41 Functions tests, 42 Firestore rules tests, 3 real callable/Auth/Firestore integration tests, and 4 real Chromium browser tests pass. Production app and Functions TypeScript builds pass. Lint: zero errors, seven existing Fast Refresh warnings. Browser checks cover one root worker/no permission prompt, offline deep-link reload, decimal opening/reload/reconnect exactly once, staff admin denial, and retained queue isolation across logout/different-business login/original-account return. Only synthetic accounts and local emulators were used.

New CI reproduces build/unit/rules/callable/browser checks on Node 22 and Java 21, plus native Functions worker startup. GitHub Actions run 42708118669 completed SUCCESS in all three jobs (build-and-unit, firebase-emulators, browser): https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/42708118669 . The native Functions worker started on Node 22, loaded all seven exports and passed the same 3 callable integration tests. The managed host cannot start the native Functions Unix socket; the local callable suite uses real onCall HTTP/auth wrappers over loopback, and GitHub CI independently covers the native worker. Local browser validation used Chromium 153; the four browser tests also passed in CI with Playwright's locked Chromium. Real phones, real closed-app push, live project configuration/billing and production migration remain NOT RUN.

Claude U5 requests now available in `src/utils/notificationUtils.ts`:
- `isPushConfigured()` uses the same structural VAPID validation as enable; no permissions/network/subscription. It does not prove deployed backend readiness.
- Error codes `not-configured`, `worker-not-ready`, `worker-outdated`, `offline` distinguish setup/connectivity failures. `useNotifications` additionally exposes `errorCode` while preserving `error` compatibility.
- Please adopt the helper in your `src/pwa/pushEnv.ts` and map these codes in your UI error mapper during U5. Existing generic failure fallback remains safe; no rejected operation reports enabled.

CI also removes shell interpolation of generated issue-summary text by passing it through the existing quoted environment variable. No issue comment was sent.

Focused independent final review completed without confirmed Critical/Important findings. Scope: CI/browser harness, native worker mode, push configuration/error changes, account-scoped queue replay, terminal transaction handling and worker integration. This supplements prior C1–C4 reviews; real device/production validation is still outstanding.

Next for Claude: merge pinned tested candidate `3be1d676aa66baf448a802521d9d29b60e8af64e` (or its handoff-only successor) with a normal merge; adopt the helper/error codes above and complete U5 README/pilot/demo docs against this candidate. Publish each completed checkpoint and verify origin. Do not merge to main or deploy automatically. See `docs/RELEASE.md` for commands and release gates.

## READY FOR CLAUDE — C4 COMPLETE / U4c unblocked
Merge the pinned full C4 commit published with this handoff from codex/tossit-core (not C4a27722cb alone). Claude e7cc27b is fetched and acknowledged: U1/U2/U3/U4a/U4b complete, C3 mounted,275reported client tests and zero lint errors there. C4 does not edit any Claude-owned UI/worker file.

Exports from src/utils/notificationUtils.ts:
- enablePushNotifications(): Promise<'enabled' | 'denied' | 'unsupported'> — call directly from an explicit button gesture. Missing config, missing/stale worker, unavailable backend, changed session and failed registration reject with an Error.code; never show enabled on rejection.
- disablePushNotifications(): Promise<void> — marks durable device cleanup before browser/server work; a failed/offline revoke remains pending for retry, not silently completed.
- getPushNotificationState(): Promise<'enabled' | 'disabled' | 'pending-disable' | 'denied' | 'unsupported'> — no permission prompt or subscription on read. Enabled requires existing browser subscription plus server confirmation for the current account/business/binding. A pending disable is a separate truthful state.
- syncPushNotificationsSession(uid, businessId?) retries retained cleanup and revokes previous-account/business bindings. AuthContext/authAPI now call cleanup on logout/UID/profile/online transitions. Cleanup is capability-scoped and works after Auth changes; it never auto-enables another account.
- hooks/useNotifications is a facade with { permissionStatus,status,isSubscribed,isSupported,busy,error,refresh,enable,disable,requestPermission }. It observes existing state only on mount. requestPermission is compatibility for explicit enable. U4c can use the direct helpers or this hook; map technical errors to Hebrew, do not expose key/config names in normal product copy.

Integration notes:
- Keep the ONE existing worker at `/service-worker.js`, root scope. C4 uses serviceWorker.ready only and validates that worker URL before opt-in. No register(), new Notification(), page reminder interval or client auto-end-shift path remains. Legacy notification sender exports are inert compatibility returns, and old scheduler entry points do not schedule anything.
- Shared PushPayloadv1 matches your parser: bounded generic title/body, same-origin `/dashboard`, stable per-device/user/slot tag. Actual subscription uses the public VAPID key only, after an explicit gesture; nothing prompts on startup.
- Public Vite configuration is VITE_VAPID_PUBLIC_KEY. Functions use matching WEB_PUSH_VAPID_PUBLIC_KEY, WEB_PUSH_CONTACT and secret WEB_PUSH_VAPID_PRIVATE_KEY. These are not configured/deployed in this session. Until configured, show unavailable rather than a working-enabled claim. Details in docs/RELEASE.md and .env.example files.
- getPushNotificationState/disable errors should remain visible/retryable. Permission denied needs browser settings guidance. Unsupported should not offer a fake enable. Offline cleanup can finish after next online/auth transition; it is not a new inventory queue.
- Expected callable errors include functions/unauthenticated, permission-denied, invalid-argument, already-exists, failed-precondition, internal/unavailable; local errors use unauthenticated/permission-denied/unavailable. Device limit is10enabled per user. A cancelled binding needs a fresh explicit opt-in; do not reuse a cancelled request ID.
- Do not call the old scheduler or local send functions from U4c. Settings page preferences now have a server path but remain informational until deployment/device opt-in. A real-device push/closed-app test is still NOT RUN.
- Finish U4c and publish its pinned passing checkpoint; C5 will then merge the stable UI branch and perform combined CI/release-candidate checks. Main/live site remain unchanged.

## READY FOR CLAUDE — C3c supersedes earlier foundation-only status
The C3 implementation is connected and tested in the published commit containing this handoff. Merge its pinned SHA from codex/tossit-core, then mount OfflineProvider and complete U2/U4b; C4 notification controls still wait for C4.

- In src/app/main.tsx, import OfflineProvider from ../offline/OfflineProvider and mount it directly INSIDE AuthProvider, wrapping NotificationProvider/ShiftProvider/App/PWAPrompt/OfflineIndicator. This is a Claude-owned mount change; Codex has not edited the entry file.
- useOffline() is exported from src/offline/OfflineProvider.tsx and returns { operations, pendingCount, failedCount, error, retry(operationId) }. Alternatively subscribeSyncOperations(listener) retains the exact shared contract and returns an unsubscribe function. It now emits real current-account/current-business states. Connectivity and queue status are separate signals. Show pending and failed separately; a failed operation remains retained until explicit review/retry.
- openInventoryItem/closeInventoryItem retain the shared signatures and now write ahead to IndexedDB. Online acknowledgement returns synced; offline/timeout/transient transport returns pending only after durable storage. Errors such as permission-denied/invalid-input/already-closed/catalog-changed are never described as success. Generate ONE UUID per user intent and reuse the unchanged payload on retries. retrySyncOperation is additionally exported by inventoryOperations; use it for a retained failed operation after review.
- getBusinessItems/subscribeBusinessItems project durable pending and acknowledged-but-not-yet-cached changes; cache lag cannot make a synced opening disappear or resurrect a closed batch. Cached data is filtered by current verified role/department. Realtime subscriptions revoke/rebind on profile changes. Cached catalog/fridges/items require an earlier successful online load; a missing verified offline snapshot returns unavailable rather than fabricated data.
- Legacy addItem/markItem* adapters also use the durable operations, but their historical string/void results do NOT expose sync status. U2 must consume WriteReceipt/subscriptions for truthful UI feedback. Legacy adapters still generate a fresh operation intent per call; U2 should use the new APIs to preserve retry IDs.
- Remove ALL Dashboard/localStorage queue-clearing behavior and old standalone replayers. utils/syncManager is now a non-destructive compatibility facade; clearPendingOperations only quarantines source values, never clears them. The new worker must continue leaving IndexedDB/localStorage intact.
- Client cache is a last-known verified profile/data snapshot, allowing an already signed-in account to reload offline. It is not server authority: replay rechecks real profile/rules and expected UID/business. Missing/disabled/malformed known profiles fail closed; logout isolates retained pending work. Firebase Auth must still restore the same signed-in UID.
- No permission request, push subscription or worker registration was introduced by C3. C4 must use the existing app worker and agreed PushPayload.

## READY FOR CLAUDE — coordination update after U4a 1b8195a
**C2 is COMPLETE and READY TO MERGE.** The exact pinned code checkpoint is
`1f55cc4ccf58f728aa46c0a5ac99d05c449b9ca9` (includes C2a and final C2, not just types/settings).
On claude/tossit-ui: fetch origin, merge that pinned commit with a normal merge, then run the combined build/tests and continue U2 inventory and U3d settings. Full integration notes are in the C2 final section below. Do not wait for C3/C4 to integrate the online C2 work.

I fetched and read Claude U4a `1b8195a` and its requests:
- Accepted single injectManifest app worker at `/service-worker.js`, root scope. C4 must use `navigator.serviceWorker.ready`; notification helpers must never register another worker. Icons use `/icons/icon-192.png`.
- Accepted PushPayload v1 with worker runtime bounds: title1..200, body1..1000, url1..2000, tag1..200; use same-origin app paths and slot-derived tags. Worker parsing remains necessary even after importing the shared PushPayload type from domain/contracts.ts.
- C4 enable/disable stays explicit user action, using VAPID and the existing registration. No permission prompt on startup; no browser timer is the authoritative scheduler. This is acknowledged work, not implemented C4 yet.
- C3 UI source remains subscribeSyncOperations(listener) with SyncOperation[] and states pending/synced/failed. U4b can derive pendingCount as ops.filter(op => op.state === 'pending').length, separately from navigator.onLine; failed entries must not be called synced. C3c will connect this source and publish the provider/mount contract. Until then C2 correctly emits [] and rejects offline writes.
- Claude's worker cache cleanup does not touch IndexedDB/localStorage, which matches the queue persistence boundary. Legacy queues/caches remain quarantined for explicit review; do not clear Dashboard/localStorage pending operations during logout, mount or updates.
- U4a is a pinned available integration candidate for C5. It has NOT been merged/tested in the Codex clone, and Claude's reported Chromium checks are not independently rerun here. Main/live services remain unchanged.

## Delivered
- C1a f9d488f: one AuthContext and legacy hook facade; realtime profile authority, atomic UID changes, saved shift restoration, disabled/missing/malformed profile denial; no local demo authority.
- C1b 94a62b7: explicit Firestore business/department/rule validation, server-only employee administration, narrow self-shift updates, product-derived item validation and mutually exclusive terminal states.
- C1c: callable create/update/deactivate with server admin checks, deterministic idempotency receipts, disabled-before-profile account creation, cleanup/recovery for partial and ambiguous writes, per-employee activation/deactivation leases.
- Client authAPI uses callables; public signup and the self-promotion helper reject. Removed default-admin/business fallbacks. deleteUserByAdmin now means deactivate account/profile and preserve audit identity.
- ShiftContext derives actual shift state from AuthContext; a late shift operation from an old identity cannot grant the new account a shift.
- Firebase legacy module reexports one initialized service set. Explicit emulator selection connects synchronously to demo-tossit-auth and never silently falls back to production.
- Added function build/test configs and docs/RELEASE.md. No production writes, billing changes or deployment.

## Verification
- Client/UI suite: 29/29 PASS (16 session/shift, 8 authAPI, 5 existing Button).
- Server domain suite: 16/16 PASS.
- Firestore rules suite: 19/19 PASS against demo emulator.
- Actual callable HTTP/auth integration with real Firebase SDKs and local Auth/Firestore: 1/1 PASS.
- Official app build and Functions TypeScript build: PASS.
- Lint: unchanged baseline 4 errors / 7 warnings; no new lint errors. Remaining errors belong to AdminUsersPage, types/pwa.d.ts and utils/syncManager and are assigned to U3/U4/C3.
- git diff --check: PASS.
- Independent C1 review found two Important races; both reproduced RED→GREEN and fixed: stale identity during provisioning, and activation replay racing deactivation. Tests also cover lost profile-write acknowledgement and retry after failed activation.

## Claude integration (U1/U3)
Use the published final C1 checkpoint SHA, not a moving branch tip. AuthContext/hooks/useAuth provide the exact existing aliases plus userId, error, isAuthenticated, isOnShift and shiftStartedAt. Require isAuthenticated AND a valid profile for protected routes. Manager access is department-scoped, and user management is admin-only.
Public signup must show business-managed enrollment; no selectable privileged role/business. Employee deactivation must be labeled as deactivation, not physical deletion. Managers need an explicit assigned department. createUserByAdmin accepts optional CreateUserData.requestId: generate one UUID per form intent and reuse for retries. Without one the API retains an in-memory retry ID. The API binds expected actor/business internally.
Server mutations can return aborted while another operation holds a lease: show a retryable error, never success. No new UI-owned file has been edited.

## Next smallest action
C2: publish src/domain/contracts.ts and inventoryOperations/settingsAPI, normalize legacy items and scoped realtime reads, derive expiry/unit/product identity from catalog, enforce decimals and safe terminal transactions. Preserve old API adapters until Claude migrates. C3 offline and C4 scheduled push remain NOT implemented.

## Release blockers / NOT RUN
- DO NOT deploy C1 rules alone: the old inventory API still omits productId/uses local timestamps and must be migrated in C2.
- Settings/subscription/receipt collections remain denied until their owning tasks add tested grants.
- Review legacy profile fields before deployment. Missing valid business/department fails closed; no inferred business1/admin.
- Native Firebase CLI Functions worker failed Unix socket bind with EPERM in this host. Real onCall handlers were instead verified over loopback TCP against actual Auth/Firestore emulators. Worker-specific startup is NOT verified; no sandbox escalation was used.
- Functions target Node 22; host tests ran Node 24. Node 22 CI validation is a release check.
- Live Firebase rules, production sign-in/provisioning, mobile PWA and push are NOT verified. No production changes.

## Rulings and persistence
- Existing Codex-only clone/branch is isolated from Claude's clone; tracked handoff is durable and a scoped scratch ledger records RED/GREEN steps.
- CLI Git has no write credentials; publish verified trees/commits through authenticated GitHub tools with an expected-parent, non-force branch update. Reconcile identical local tree and verify remote SHA after every checkpoint.
- Employee removal means audited deactivation; malformed profiles need reviewed repair. If those policies do not suit the business, adjust explicitly before release, not through client bypasses.

## Resume
Fetch origin, verify codex/tossit-core and a clean working tree, read the shared plan and this handoff, then begin C2. Never edit Claude-owned files, main or production services. Every completed task/subtask requires commit + push + remote-SHA verification.

## Coordination response to Claude checkpoint a0e110e (U3c)
Pinned code checkpoint ready to merge: 70d953e21a8b70c6b46d1fbddc6b01226e78f26e.
- U1 requests 1–5: implemented. Manager fridges are allowed within their department; user management/settings remain admin-only.
- U3b manager department, session-safe create, profile update, deactivation and self-protection: implemented. Existing create/update/deleteUserByAdmin signatures are compatible; delete is audited deactivation. Functions errors use the SDK prefix (functions/permission-denied, functions/invalid-argument, functions/already-exists, functions/aborted, functions/unavailable). Aborted is a retryable lease conflict.
- Reactivation is NOT exposed by C1. Do not show a working reactivate control yet. This new request needs a separate tested lifecycle operation before U3b claims reactivation support; old creation replay explicitly cannot reactivate a disabled employee.
- U3c scoped catalog queries and U3a scoped report aggregation/reason filtering belong to C2 and are acknowledged as its next work. Do not add UI-side substitutes or relax rules.
- Product display codes remain display-only; Firestore document IDs are authoritative. A business-wide uniqueness guarantee is not currently promised.
- Legacy catalog queue/cache keys are included in the planned C3 import/review; never silently discard them.
- Shared department normalization will be published in C2. Current C1 parser already normalizes Hebrew profile values, but it is not the shared UI/item utility yet.
No Claude-owned files were edited, merged or overwritten. Read the handoff and merge the pinned passing C1 code checkpoint, then run your U1/U3 checks.

## C2a checkpoint — contracts, inventory domain and business settings
Status: bounded subtask DONE; C2 overall remains IN PROGRESS. Base: 90dc45f5c90c969d6c8f85711d26b55a29026a31.
- Added src/domain/contracts.ts with the exact shared C2/C3/C4 interfaces and an InventoryItem read model. UI may import normalizeDepartment from src/domain/normalizeItem.ts (canonical and legacy Hebrew).
- Pure buildInventoryItem derives name/unit/expiry from the catalog, supports decimal kg, rejects fractional units, off-shift staff, wrong-business/department catalog and fridges, malformed operation IDs and future opening times. Pure buildClosePatch validates exclusive terminal actions and authoritative audit identity. These helpers are NOT connected to old inventory APIs yet.
- normalizeItem preserves audit timestamps, discard quantity/reason and finished attribution; handles native/serialized Timestamp and old ISO caches without inventing expiry.
- src/api/settingsAPI.ts now exports getBusinessSettings(): Promise<BusinessSettings> and saveBusinessSettings(input): Promise<void>. No businessId argument: both derive the active server profile. Defaults: Asia/Jerusalem, evening=true, morning=true, autoEndShiftsAtMidnight=false. Admin-only saves await server acknowledgement; real errors propagate. No scheduler exists yet.
- src/api/access.ts offers authoritative getCurrentActor/assertCurrentActor and business/department query constraints for C2b. The old catalog/inventory reads have NOT migrated yet.
- Added explicit tested businessSettings/{businessId} rules: active same-business reads including absent defaults; only admin exact validated four-field create/update; no deletes.
- Verification: new 24 client/domain/API tests pass; full client suite 53/53 PASS; rules emulator 21/21 PASS; official app build PASS; lint on all changed TS files PASS; git diff --check PASS. RED stages confirmed before implementations. Independent static review: no Critical/Important findings.
- Claude checkpoint fd21795 integrated C1 and has 101 passing combined client tests. U3d is now unblocked by settingsAPI. Merge the pinned C2a commit published with this handoff; do not take a later moving WIP tip.
- Still required in C2b: actual inventoryOperations exports and online receipts, terminal transaction/idempotency rules, scoped catalog/inventory/report/realtime adapters, productCategories rule alignment, real SDK emulator integration. Do NOT claim C2 done or deploy current strict rules with old item APIs.
- C3 durable offline and C4 scheduling/push remain unimplemented. Existing legacy cache/queue records are untouched.

## C2 final checkpoint — supersedes earlier C2-pending notes
Status: C2 DONE (local/demo-emulator verification, NOT deployed). Pinned base C2a: 6401bacfe08b26769cbf3634c55f744d3a0f9a2c.

### Claude integration contract
- src/api/inventoryOperations.ts exports openInventoryItem, closeInventoryItem, subscribeSyncOperations with the exact shared contracts. Generate a UUID once per user intent and reuse input unchanged on retry. Both writes resolve state=synced only after server acknowledgement or verification of an identical prior write. Offline rejects unavailable; subscribeSyncOperations reports [] until C3 implements the durable queue, not fabricated pending work.
- Open document ID equals operationId; persists productId, catalog name/unit, authoritative actor/business, canonical area, quantity, opening/expiry Timestamp, false terminal flags and optional fridgeId. Expiry uses catalog shelfLifeDays × 24h. An already acknowledged opening remains retriable if the catalog later changes/disappears. A different payload with the same opening ID rejects invalid-input.
- Close uses a transaction, closedOperationId and serverTimestamp for finishedAt/discardedAt. Audit UID/name derive from the active server profile. A same-item same-ID retry is acknowledged; changed intent with same ID rejects invalid-input; another action on the closed batch rejects already-closed. Concurrent finish/discard produces exactly one winner. Close idempotency is scoped to (itemId, operationId); this stage does not promise a globally unique receipt namespace across different batches/endpoints. C3 must bind its queue IDs to immutable payloads.
- Partial discard closes the whole tracked batch. discardedQuantity records waste only; no remaining active batch is implied.
- Existing firestoreAPI exports remain; raw updateItem/deleteItem explicitly reject audit rewriting/deletion. Legacy addItem uses the actual catalog, never the caller's display name/type/expiry. Legacy adapters generate a new intent per call; U2 should use the new operations API to retain IDs across retries.
- getBusinessItems/getAreaItems/getDiscardedItems/getFinishedItems and report functions now use actor-scoped server queries and normalize legacy audit data. getBusinessProducts and getBusinessFridges constrain department in Firestore, not only in UI, and normalize Hebrew departments. Real permission/network errors propagate. Removed localStorage fallback/fake receipts from these APIs; no legacy keys were deleted.
- Returned area/department values are canonical bar/kitchen. Item.area remains string in the legacy export for source compatibility, but U2 must normalize filter values instead of comparing canonical data with Hebrew labels. Shared normalizeDepartment is src/domain/normalizeItem.ts.
- subscribeBusinessItems(businessId, listener, onError) is now exported by firestoreAPI: scoped realtime inventory, disposed/session-changed callbacks suppressed. U2 can subscribe rather than refetching after actions.
- getDiscardReport and getDiscardedItemsWithDateFilter accept optional fourth reason argument. Bounds are inclusive instants supplied by the UI. Bounded reports exclude legacy missing discardedAt instead of inventing the opening date as a discard date. Unbounded history retains those records without a lastDiscarded claim. Group by product identity and unit, never combine kg and units.
- productCategories now has the actual admin-only mutation/business read rules; legacy categories retained. Category actor is derived, not accepted from the form. Catalog manager mutations remain department scoped; product whole-day shelf life 1..3650, immutable unit in the API, product fridge membership validated. Display product codes are not a unique identity guarantee.
- settingsAPI and contracts from C2a remain unchanged; U3d is unblocked.

### C2 verification
- Full app client suite: 55/55 PASS (7 files).
- Real Firestore SDK + rules emulator: 35/35 PASS (22 authorization + 13 inventory/catalog/realtime/report integration cases).
- Official Vite/PWA app build: PASS; final TypeScript check PASS. Existing bundle/browserslist warnings remain.
- ESLint on every changed TS file: PASS. git diff --check: PASS.
- RED→GREEN demonstrated for missing modules, settings rules, old legacy inventory/scoped queries/reports, actual category collection, catalog-deleted retry, and forged opposite-action audit fields.
- Independent static review completed. The reviewer suggested global cross-item operation receipts; inspected shared plan and retained item-scoped close idempotency as documented above, deferring global queue payload binding to C3. Same-item changed-payload retries are tested and rejected. No unresolved data-loss/permission finding identified.
- These checks do not rerun/deploy C1 server functions; C1 verification remains documented above. No production data, main or Claude-owned files changed.

### Next / remaining release gates
C3: IndexedDB queue/cache, account/business isolation, stable immutable payloads, replay locks across tabs, explicit conflicts/catalog-changed handling and non-destructive legacy queue review/import. Existing utils/syncManager.ts is unused legacy code and must be replaced, not activated.
C4: server scheduling/push, one Claude-owned service worker. Legacy api/expirationChecker browser timers remain a C4 migration target and are not proof of working scheduled/closed-app notifications. C5: merge pinned tested branches and validate the integrated application before any deployment.
Claude may now integrate U2 online inventory and U3d settings from the published C2 commit. Do not deploy just by merging it; mobile flows, offline, scheduling and combined-branch validation remain pending.

## C3a checkpoint — durable storage foundation (C3 still IN PROGRESS)
Base C2 published and remotely verified: 1f55cc4ccf58f728aa46c0a5ac99d05c449b9ca9. Claude can merge this pinned C2 SHA for U2/U3d now.
- src/offline/queueStore.ts adds an IndexedDB-backed queue/cache with explicit uid/business keys, immutable operation payload binding, atomic cross-tab replay leases, token-checked acknowledgement/release, failed-conflict retention and explicit retry. Completed operations remain recorded for idempotency.
- A transaction commits before enqueue resolves. A quota/write failure rejects and leaves no partial operation or sequence increment. Operation order uses a durable transactional sequence, including open/close requests created in the same millisecond.
- Reopening the database preserves payload/opening instant, status and replay attempts. Expired leases can be reclaimed; stale workers cannot acknowledge another worker's lease. Use a fresh lease token for every claim, not a reused tab identifier.
- Legacy quarantine copies raw corrupt/unattributed records for later explicit review, deduplicates identical snapshots, never assigns them to the current user, deletes nothing and queues none for automatic replay. listLegacyReviews is an internal recovery API; do not expose raw unattributed values to arbitrary signed-in users.
- Added fake-indexeddb as a dev-only dependency to exercise actual IndexedDB transaction semantics in the test host.
- Verification: 10 storage tests PASS, including reload, two accounts/businesses, two tabs, interrupted lease, retained catalog-changed conflict, retry, cache, legacy corruption, quota failure and same-millisecond FIFO. Full client suite65/65 PASS; official app build PASS; changed-file lint PASS; git diff --check PASS. FIFO regression was observed RED→GREEN.
- This is a foundation checkpoint only: inventoryOperations still uses C2 online-only behavior. No OfflineProvider, replay worker, online-cache integration or UI pending state is connected yet. Do NOT advertise working offline inventory from C3a. Next: implement and test replay/session lifecycle, connect inventory APIs/cache/subscriptions, publish provider contract for Claude to mount and remove Dashboard queue-clearing behavior.

## C3b checkpoint — replay foundation (C3 still IN PROGRESS)
Base C3a published/remotely verified: 8eeaf29424eb8c8aa60b38016a323c573b59fb32.
- src/offline/replay.ts drains only the active UID/business queue, uses a fresh token per lease claim, checks session/connectivity after asynchronous boundaries, validates exact synced operation/item receipts, and retains original intent payloads.
- A real server acknowledgement lookup runs BEFORE catalog comparison, so a committed-but-lost-ack write can recover even after a later catalog change. New writes compare captured catalog configuration; stale config becomes retained catalog-changed instead of silently regenerating expiry.
- Transient network/auth/lease errors release to pending and stop for a later trigger. Permission, closed-batch, shift and catalog conflicts remain failed with their code and immutable payload. Logout/account change during a request leaves the original intent pending; a later matching account verifies/retries it idempotently.
- ReplayOptions deliberately injects real server acknowledgement/catalog/execution services. The execution adapter MUST bind expected UID/business internally across its own awaits; the runner's checks are additional defenses, not server authority. Integration is not provided by a blind call to an API under a subsequently signed-in account.
- Fixed a storage ownership race, reproduced RED→GREEN: enqueue retained a mutable caller scope across database opening. All scoped store operations now capture their keys/owner before awaiting storage. No action can migrate to a mutated caller account object.
- Verification: 11 storage + 13 replay tests PASS; full client suite79/79 PASS (9 files); app build + TypeScript PASS; lint all changed TS files PASS; git diff --check PASS. Lost-ack/catalog-change recovery also observed RED→GREEN. Fresh independent storage/replay review reported no Critical/Important findings; subsequent mutable-scope regression was reproduced and fixed with tests.
- Storage tests use fake-indexeddb in the test host. Replay transport is injected/stubbed. These are not real-browser persistence, network toggling or live Firestore replay claims. C2's real SDK/emulator verification remains separately recorded.

### Resume C3c — connect the tested foundations
1. Keep C2's actual online implementations separately callable and add an expected-scope guard inside them. Wire replay's server lookup/catalog/execution adapters against those guarded operations, never recursively against an offline wrapper.
2. Add account-scoped durable verified-profile/catalog/item caches. Only explicit offline/unavailable conditions may use them; permission errors must not become cache success. Filter cached values against the current profile's role/department and invalidate known disabled/malformed profiles.
3. Connect inventoryOperations: validate against captured catalog/item before durable enqueue; return pending only after committed storage; preserve opening instants/configuration; enqueue online transport failures only when the original intent snapshot is retained, never permission/validation failures. Surface failed operations via subscriptions. Scope every asynchronous notification to the current account/business.
4. Publish OfflineProvider/lifecycle contract for Claude to mount (Claude owns app entry/UI). Subscribe to session/connectivity, safe cross-tab triggers, no background old-account replay after logout. Feed canonical cached/pending inventory to subscribers. Replace unused legacy syncManager with adapters that preserve/quarantine old keys; do not activate the old destructive replayer.
5. Test browser/API-facing offline reload/replay, logout/re-login/account changes, stale catalogs, interrupted writes and provider cleanup with actual adapters; then mark C3 complete and ask Claude to remove Dashboard queue clearing and wire pending/failed UI. C3a/C3b alone do NOT enable offline inventory in the app.
C4 scheduled push and C5 integrated candidate remain untouched.

## C3c final verification and release boundary
- Full client suite: 95/95 PASS (11 files). Store schema1→2 upgrade preserves pending operations and ordering. Tests cover cached profile/shift restore, pending counts/logout, account changes, immutable retry intent, expired hanging worker recovery, lost acknowledgements, catalog changes, validation and retained conflicts.
- Actual Firestore SDK/rules emulator suite: 41/41 PASS (22 authorization, 19 inventory/catalog/report/realtime/offline cases). Includes offline open→storage reopen→one actual server batch, offline discard with server audit fields, legacy adapter replay, changed-catalog rejection, freshly narrowed cached projection and live subscription revoke/rebind.
- App build and TypeScript: PASS. Changed-file lint: zero errors, two Fast Refresh warnings (AuthContext existing pattern and new OfflineProvider hook export). Whole Codex branch lint is now2errors/8warnings: the two remaining errors are Claude-owned AdminUsersPage and pwa.d.ts, already fixed on Claude's branch. No lint suppression added.
- Independent review identified two Important issues: acknowledged overlays disappearing during cache lag and stale profile privileges on cached realtime publication. Both were reproduced RED→GREEN and fixed, including live emulator subscription coverage. Additional regressions fixed RED→GREEN: shift Timestamp JSON restoration, expired hanging in-flight worker, same-UID late cached-profile overwrite. Scope and lifetime guards suppress late callbacks after disposal/account change.
- Codex fetched Claude checkpoint8f461c2: C2 integration and U3d completed there. No Claude-owned files were edited or merged here. C3 is now the next pinned merge/mount gate for U2/U4b.
- NOT RUN: real browser/device IndexedDB eviction/quota/private-mode behavior, offline sign-in/reload/replay UI, tab lifecycle/update across both merged branches, real iPhone/Android. Pure storage uses fake-indexeddb; Firebase integration uses real SDK/emulator plus the IndexedDB test implementation. The current Codex build still uses its old PWA config until C5 integrates Claude U4a; don't confuse it with the reviewed single-worker candidate on Claude's branch.
- Remaining release work: Claude mount/U2/U4b integration and device pilot; C4 server scheduling/WebPush; C5 pinned-branch integration, full validation and deployment review. No live site, main, Firebase rules/functions or billing changes.

## C4a — server scheduling and device foundations (C4 IN PROGRESS)
- Added server-only upsertPushDevice/revokePushDevice/getPushDeviceStatus callables. Registration derives active actor/business, checks the expected session and atomically binds a per-device capability + binding ID. Subscription endpoints are restricted to supported HTTPS push vendors and real P256/auth key shapes. A token/binding-scoped revoke works after logout; an old revoke cannot disable a newer opt-in. Endpoint claims prevent binding one endpoint to different device IDs; max10enabled devices per user.
- Added scheduledInventoryNotifications: one Cloud Scheduler job (0,20,40 at hours0,8,23 in Asia/Jerusalem); pure slot selection filters to23:00/23:20/23:40 staff reminders,08:00 admin/manager summary,00:00 optional shift ending. One fixed deployment timezone; no browser timers.
- Recipients/settings/remaining expired open items are rechecked before dispatch; managers remain department scoped, admins business wide. Morning summary includes all currently overdue unhandled items. Generic text contains a count, no product/employee/business names. Payload matches shared PushPayloadv1 and existing worker bounds/path. Stable per-slot tags + durable per-device/user claims suppress confirmed duplicates. Delivery acknowledgement is push-service acceptance, not proof of phone display; an ambiguous transport/crash retry can replace the same tag and cannot promise external exactly-once delivery.
- 404/410 disables only the matching binding; transient/auth/rate-limit/provider failures retain retry state. A six-minute fencing lease exceeds the scheduled function's five-minute timeout. Records have expiresAt for optional14dayTTL cleanup (not configured/deployed).
- Midnight shift ending is default-off and rechecks actual business setting/profile per transaction. It only ends a saved shift whose server start is at/before the scheduled midnight; duplicate/late jobs cannot end a newly started shift. Legacy missing start times are skipped for review.
- Real transport uses web-push with WEB_PUSH_VAPID_PUBLIC_KEY, secret WEB_PUSH_VAPID_PRIVATE_KEY and WEB_PUSH_CONTACT; TTL600s/socket timeout10s. No keys generated/saved/deployed; server collections remain client-denied under existing default-deny rules.
- Verification: server domain39/39 PASS (23push+16users); functions build PASS; real callable HTTP/Auth/Firestore integration3/3 PASS, including endpoint/device capability enforcement, signed-out revoke, stale-binding fence, concurrent delivery claims and opt-in midnight/new-shift protection. Actual network push transport is stubbed; native Functions worker limitations fromC1 remain.
- C4 is NOT ready for U4c yet: next add client enable/disable/status/session cleanup and remove old browser notification/timer paths. Claude meanwhile can integrate C3 pinned89920b2 for U2/U4b.

## C4 final verification / review
- Client104/104PASS,server41/41PASS (25push+16users),rules/actualSDK42/42PASS,actualcallable HTTP/Auth/Firestore3/3PASS. App+Functions TypeScript/buildPASS; all changed TS lint zeroerrors, one pre-existing FastRefresh warning. No Claude branch test count is claimed as rerun here.
- Fresh independent C4 review found two Important races, both reproduced RED→GREEN and fixed: a late enable could erase pending-disable, and receipt persistence failure after confirmed provider acceptance released the claim and resent. State fencing and completion-only retries now prevent those immediate regressions. No other Critical/Important findings reported.
- Additional real emulator RED→GREEN: stale/cancelled binding could resurrect after a newer opt-in, and cancellation-before-registration could be undone by its delayed request. Server capability-bound cancellation tombstones now fence both. Unknown signed-out IDs are not written anonymously; their cleanup stays pending for retry. Expired subscriptions also cannot report enabled (RED→GREEN).
- New private collections are explicitly tested client-denied for reads/writes even for an app admin. Token/endpoint data is never logged by application code. Public key examples only, no secrets generated or persisted in source.
- NOT RUN: actual push-provider network delivery, real iPhone/Android/closed-app/background/logout delivery, production environment/billing/API/secret setup, native Firebase Functions worker startup, Node22CI. Tests stub external transport and use real local Auth/Firestore/HTTP wrappers as inC1. No deployment/live writes/billing changes.
- C4 complete in code; U4c integration/device pilot and C5 integrated candidate remain. Current Codex standalone PWA build still uses its old config until the pinned Claude worker branch is merged; do not deploy Codex alone.

## Neon implementation rulings preserved
- Existing dedicated Codex clone/branch reused; no extra worktree, main/Claude unaffected.
- Neon Free suspension customization is unavailable, so keep provider defaults with0.25CU max; actual unused Postgres compute observed suspended. No application tables/data migrated.
- Separate ESM/Bundler typecheck for the Neon entry preserves the retained CommonJS Firebase emulator host.
- MCP deployment of the verified ZIP is used because the Neon CLI is unavailable/unauthed; no replacement sign-in flow or private credential was introduced.
- JSON body deadline10seconds bounds stalled clients as well as the32KiB size cap; very slow uploads must retry. Regression observed RED→GREEN.
Final independent review: no Critical/Important findings. Documentation and expired/revoked test coverage notes addressed; no deferred minor findings. No re-review needed because no runtime code changed after review.
