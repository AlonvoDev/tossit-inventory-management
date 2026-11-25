# TossIt — complete next-round work plan

Date: 2026-11-25 (Asia/Jerusalem). Status: **IMPLEMENTATION STARTED; C0a published; C0b/S0a foundation prepared; Claude working V0**.

## Outcome and boundaries

Ship a coherent Hebrew inventory tool that is quick to use during a real bar/kitchen shift, visually deliberate, reliable offline, and optionally assists with dates photographed from both packaging and handwritten staff labels. Camera use must save time compared with manual entry. Every scanned value requires human confirmation before inventory submission.

Alon prefers the demonstrated flat, compact inventory direction: clear type, restrained green, thin separators, fewer enclosing cards, and color for meaningful status. He accepted this as closer to his goal, not as approval of every screen or behavior. Success means efficiency and easy execution without compromising quality or design. Build a realistic busy-inventory/form preview before committing the full visual implementation.

Alon subsequently authorized implementation on2026-11-25. This does not start a production migration, activate billing, upload staff photos to a provider, enable push, or authorize another live release. Implementation checkpoints stay on separate branches until reviewed; a concrete tested release is presented for deployment approval. Existing authorized routine review/fixes do not require repeated permission.

## Verified baseline, and what is not new work

- Remote main and codex/tossit-core both point to 84522ea9e23256f1044f35a4bcc8bd73ec3ce20b when this plan was prepared. Claude branch is 281083572e7e3272cdc7ce970ebdb8f4b36ca508.
- Last recorded deployed code is 15788028fffb90d4e057259a7169ab51a2c4b52e, Render dep-dbt0kpff3r2c73bjda4g, Neon deployment3. This is release-document evidence, not a new provider-state inspection on Nov25.
- Existing U1–U5/UI1–UI3 fixes, scoped roles, shifts, offline queue, controlled updates and mobile reporting are already implemented. Preserve them; do not redo them as unfinished tasks.
- Last release evidence: 354 client tests, 58 server tests, 5 emulator-browser scenarios, production build and four CI jobs passed; lint had zero errors and seven existing warnings. These counts describe that release, not fresh executions for this planning commit.
- Push code exists but live VAPID/delivery are unconfigured and the schedule is disabled. Real owner workflows, physical-phone/install/keyboard/update/offline and staff pilot remain unverified.
- Known follow-ups: fixed 72-hour near-expiry policy, report products with the same name but no department label, existing out-of-business malformed legacy items, popup/redirect Auth domain configuration, and documented development-only dependency findings. Investigate without rewriting unrelated data.
- The earlier interactive mockup was conversation-only and is no longer available as a workspace file. Recreate it from this specification; do not claim it was committed or fully approved.

## Release sequence and priorities

| Release | Scope | Completion condition |
| --- | --- | --- |
| A — usable visual redesign | Inventory, opening/closing, navigation, admin/reports consistency, preserved offline feedback | Alon reviews busy/empty/error states; responsive browser checks pass; real-phone pilot recorded |
| B — date-aware inventory | Explicit manual manufacturer/label dates, deterministic validated expiry policy and compatible queue/rules | Approved date policy; domain/rules/replay tests pass; existing records and pending operations remain valid |
| C — assisted scanning | Packaging and staff-label capture, extraction, correction/confirmation, manual fallback | Representative evaluation meets agreed targets; provider/budget decision settled; optional feature can be disabled |
| D — optional notifications | Real delivery configuration and narrowly scoped pilot | Separately approved credentials/configuration, genuine provider delivery and real-device evidence |

A can ship before B/C. B is useful without OCR. C must not block manual opening or the visual release. D is tracked explicitly but is not silently required to complete A–C. No custom model training in the first implementation.

## Two-owner workflow

| Owner | Branch | Owns | Does not independently change |
| --- | --- | --- | --- |
| Codex | codex/tossit-core | Date policy/contracts, domain/API/rules, durable queue, OCR service adapter/security/evaluation, shared dependencies, integration and release evidence | Claude presentation files during active work |
| Claude | claude/tossit-ui | Visual system, inventory/forms/navigation/admin/reports, camera/crop/confirmation UI, responsive/accessibility evidence | Domain/API/rules/queue/service-worker internals, shared dependency versions, live configuration |

Before starting, fetch, inspect status/AGENTS.md, preserve dirty work, and merge the exact published plan SHA into each branch using a normal merge. Never reset or force-push. Claude's older branch must merge the plan publication before starting. Worktrees are isolated. Shared contracts land first; Claude can use agreed synthetic mocks while Codex implements the adapter.

Every bounded task ends with relevant checks, explicit-path commit, push, remote-SHA verification and owner handoff. Handoff records task ID, commit SHA, commands/exit codes, screenshots/evidence, limitations, dependencies and READY/IN PROGRESS. Before context/token limits, publish a coherent IN PROGRESS checkpoint; do not label it READY. Do not commit secrets, personal/staff photos or real business fixtures. Requests go in docs/CLAUDE_REQUESTS.md or docs/CODEX_REQUESTS.md; no external messages are implied.

Review one pinned SHA at a time; merge normally only after blockers are resolved. Keep evidence complete, including the full browser summary. Each owner fixes their own findings. Implementation was authorized2026-11-25. C0a publishes shared date-evidence DTOs and calendar validation; Claude begins V0. The next concrete design checkpoint resolves visual questions without reopening the whole project.

## Task board

| ID | Owner | Task / deliverable | Depends on | Done when |
| --- | --- | --- | --- | --- |
| P0 | Codex + Claude | Reconfirm baseline, inventory behaviors/route map, benchmark manual opening/closing and screenshot current states | None | Versioned baseline and open decisions documented; no speculative reimplementation |
| V0 | Claude | Recreate compact direction and show busy inventory, open form, close form at phone/desktop sizes | P0 | Alon reviews actual screens; examples include long Hebrew names, kg/units, several fridges and mixed expiry statuses |
| C0 | Codex | Publish v2 date/scan contracts and decision record; identify every persistence/replay/rules consumer | P0 | Types, field meanings, defaults and compatibility matrix are explicit; policy questions below resolved before enforcement |
| V1 | Claude | Implement shared visual system, inventory rows/filters/actions and navigation | V0 approval | Information/actions fit at320/390/430/1280px; no nested card noise or horizontal overflow; roles and filters preserved |
| V2 | Claude | Opening/closing flow, responsive dialogs, inline errors, dates and sync display | V1; C0 for new fields | Busy dismissal/retry/focus protections survive; comfortable touch/keyboard use; manual opening remains short |
| V3 | Claude | Apply visual language to users/catalog/fridges/settings/reports/PWA controls | V1 | No disconnected old styling; mobile sorting, unit averages, offline guards and direct-link actions preserved |
| C1 | Codex | Date-aware manual inventory: domain, normalization, rules, API, queue/replay/idempotency and audit metadata | C0 | Validation enforced at trusted boundaries; old records/queued operations work; new date data cannot bypass scope or extend expiry arbitrarily |
| S0 | Codex; Alon supplies examples | Evaluate OCR vs existing vision-language extraction on packaging and handwriting | P0 | Reproducible results, failure taxonomy, latency/correction burden and cost assumptions; no provider chosen by unsupported confidence claims |
| S1 | Codex | Provider-neutral extraction adapter and optional protected server endpoint | S0 go decision; C0 | Strict output validation, access control, quotas/limits, timeout/cancellation behavior and safe logging; no client secret |
| V4 | Claude | Camera/upload/crop, source mode, candidate review, corrections and confirmation | C0 + S1 adapter/mock | Packaging/staff-label modes work; cancel/error/denied permission preserve draft; manual fallback always available |
| C2 | Codex | Integrate accepted scan values with v2 opening intent and date policy | C1 + S1 + V4 | No model output writes inventory; explicit user confirmation creates one stable operation; retries preserve exact accepted values |
| Q0 | Codex integration; Claude fixes UI | Review, integrated CI and responsive visual checks; resolve known policy/report follow-ups | V1–V4/C1–C2 as applicable | All blocking findings closed; evidence per release A/B/C, not one giant unreviewable batch |
| Q1 | Alon + one staff user; both agents support | Real-phone and shift pilot | Reviewed candidate | Device/version/SHA and actual PASS/FAIL/NOT RUN recorded; median task times and correction burden compared with baseline |
| R0 | Codex | Pinned release, compatibility rollout/rollback, README/demo/portfolio narrative | Q0, required pilot gates, release approval | Provider deployment IDs and live smoke verified; remaining limitations explicit; no fabricated delivery/pilot claims |
| N0 | Codex backend; Claude device UI | Optional real push/scheduled-delivery pilot | Separate authorization and working provider prerequisites | Genuine trigger identity/retry + actual phone notification/click behavior verified before enabling for staff |

V1/V2 can progress in parallel with C0/S0. V4 must not invent contracts while C0 is undecided. C1 owns shared files and lockfiles; V4 proposes any new capture dependency before installation.

## Visual/product acceptance

- Replace oversized greeting/KPI blocks and repeated rounded containers with a compact hierarchy. Header, department selection, search/filter and inventory should feel like one screen.
- Product name, quantity/unit and remaining time are scannable; exact expiry stays available. Opening attribution/time can expand. Do not hide essential warnings behind hover.
- Primary opening action stays reachable; closing provides clear finished/discarded choices, reason/quantity when required, one submission, retained error/draft and explicit local-vs-server receipt.
- Use one Hebrew typographic scale, restrained spacing/radii, coherent icon set, RTL alignment and safe LTR date/number fragments. Theme tokens must provide sufficient contrast in every supported appearance.
- Target44px touch areas without turning every visible control into a large pill. Search/status/fridge filters remain accessible without consuming most of the screen.
- Provide busy, offline/pending/failed, empty, loading, permission, long-text, duplicate-name and many-item examples. Show department identity in the combined discard report so same-name products remain distinguishable; keep unit averages and all five sorting keys/directions.
- Preserve staff/manager/admin department restrictions and shift requirements. Hiding controls never replaces server/rules authorization.
- Real iPhone keyboard, camera/Photos picker, safe areas, installed PWA and Safari need direct checks. Reduced desktop viewports do not count as real-device proof.

## Dates: decisions and trusted behavior

Current code has OpenInventoryItemInput.openedAtMs only. src/domain/inventory.ts computes expiry as opening plus integer shelfLifeDays; firestore.rules validates that equality and permits only known fields. src/offline/inventoryController.ts fingerprints the opening payload; queueStore/replay and inventoryOnline compare stable intent fields. A UI-only date input would be incomplete and unsafe.

Proposed v2 model, to finalize in C0:

- Preserve opening instant, manufacturer expiry, staff-written expiry and effective expiry as distinct meanings. A printed production date is not an expiry date. A staff label is not manufacturer evidence.
- Preserve date precision (day-only vs date/time), source (manual/packaging/staff label), accepted value and confirmation provenance. Store normalized accepted values needed for audit, not a fabricated AI certainty percentage.
- Proposed rule: effective expiry is the earliest applicable approved cap and opening-derived expiry. Label dates can shorten, but cannot silently override a stricter product policy. Existing records without new fields retain their existing meaning.
- Resolve day-only cutoff in Asia/Jerusalem, missing year, ambiguous day/month, two-digit year, date without opening time, future opening, expired stock, disagreement between sources, DST and later corrections. Do not silently assign midnight/end-of-day, infer a missing year/time, or extend shelf life. Show ambiguous candidates for explicit selection/manual entry.
- Alon supplies/approves the business convention for staff labels and date-only cutoffs. The 72-hour near-expiry threshold is an independent business-policy choice; present the current behavior and a concrete configurable alternative, then test the selected policy. Do not quietly change it during OCR work.
- Server/rules calculate or validate effective expiry using canonical product/actor data. Model output is untrusted input. No arbitrary client expiry override, role/business reassignment or direct model write.
- Extend idempotency comparisons and catalog/intent fingerprints to include all accepted date fields. Reusing an operation ID with different accepted dates must fail. Replay must use the original accepted values, not rerun OCR or use reconnect time.
- Queue migration must decode legacy intents, preserve pending/failed operations across updates/account changes, and fail visibly on genuinely unsupported formats. No clear-all workaround.
- Ship tolerant readers before new writers. Rules must support old and v2 writers during installed-PWA overlap. The rollback must also understand new fields/queued intents; verify compatibility before allowing new writes. No bulk data rewrite is required merely to add optional fields.

## Scanning design and evaluation

Flow: manual open form -> optional scan -> packaging or staff-label mode -> camera/gallery -> crop -> extract -> candidates beside image -> explicit correction/confirmation -> return to form -> ordinary inventory submit. One scan must not initiate inventory mutation. No separate login or mandatory camera step.

The first experiment uses existing OCR or vision-language models. No training job or self-hosted GPU is assumed. Choosing local vs server extraction depends on measured print/handwriting accuracy, supported Hebrew/numerals, iPhone performance, latency, privacy and payment feasibility. Neon hosts the optional application adapter; it is not itself an OCR model. If an external provider requires billing that Alon cannot use, record that blocker; do not activate billing or pretend a free tier solves payment prerequisites.

Dataset: initially20–30 authorized examples spanning both sources, multiple writers, smudging, rotated/curved/glossy packaging, weak light, missing year, several dates and no date. Record human ground truth and whether the photo is readable. Do not commit identifiable staff/customer images. Use consented anonymized or synthetic fixtures in tests. Keep some examples out of prompt tuning; this small set proves feasibility only, not general reliability.

Report separately for packaging and handwriting: exact date match, correct date-type assignment, abstention/unreadable rate, wrong suggestions, manual correction frequency, end-to-end median/p95 latency and time saved vs typing. Suggested pilot targets to ratify before S0 evaluation: at least90% exact suggestions on readable print,80% on readable handwriting,100% explicit confirmation, and no ambiguous result silently auto-selected. These are proposed targets, not claimed model performance. If the sample or latency cannot justify scanning, deliver manual dates and retain experimental scanning behind a default-off flag.

Do not conflate model self-reported confidence with a calibrated probability. A valid JSON date can still be wrong; confirmation remains mandatory. Image text is data, never an instruction to change business rules or execute tools. Evaluate adversarial text, multiple dates, impossible calendar dates, numeric batch codes, empty output and malformed responses.

Backend controls: existing Auth/role/business checks before extraction; bounded file size/dimensions and accepted formats; assess actual iPhone HEIC/JPEG conversion support; remove unnecessary metadata; compress/crop before transfer; enforce per-user/business limits plus a global budget cap; provider key server-only; stable request IDs; safe retries/timeouts; no image/base64/token content in logs. Provider cost, image retention/use/region and deletion policy must be verified before real-photo use. Default design is transient processing without storing the original in Firestore, offline queue or public Git.

Offline: a server OCR path clearly requires a connection. Keep the manual draft and permit ordinary supported manual operations; never label a failed scan as saved/synced. Do not promise offline OCR unless a separately measured local implementation works on target devices. A local preview must be revocable/deleted on cancel or account switch; avoid leaking photos across users.

## Validation matrix

| Layer | Required evidence |
| --- | --- |
| Domain/date policy | Table-driven date/type/precision/timezone/DST/legacy fixtures; caps cannot extend authoritative policy; consistent display and notification calculations |
| Rules/API | Emulator tests for old/v2 fields, invalid caps/precision, role/business scope, protected fields and idempotent retries |
| Offline | Reload/reconnect retains accepted dates and operation ID; exactly-once effect; account isolation; old queue format upgrade; version overlap |
| OCR adapter | Authorized calls, quotas/size/type limits, invalid/ambiguous/unreadable model output, prompt injection, timeout/cancel, mocked failure paths and separate recorded real-provider evaluation |
| UI/browser | Busy dismissal/focus/retry, offline users form, all mobile report sorts/averages, scan correction/cancel/draft recovery, camera denial/manual fallback, long Hebrew text and320/390/430/1280px checks |
| Real devices | iPhone Safari + installed PWA, Android when available, camera/gallery formats, real keyboard/VoiceOver basics, offline/reconnect and controlled update with pending queue |
| Production | Pinned source/provider versions, assets/worker/health/auth denials, controlled owner login/workflows and scoped staff pilot; no synthetic production mutations without agreement |

Use existing npm scripts: test:run, build, lint; test:functions/build:functions for server changes; test:rules for schema/security changes; test:callables and test:callables:native for Firebase-host compatibility; test:callables:neon, test:callables:neon:bundle and build:neon for changed Neon code; test:browser for integrated user flows. Run emulator suites sequentially to avoid port conflicts. Review complete outputs and CI on the actual candidate. Do not claim existing354/58/5 counts after adding tests without recounting. UI-only changes do not justify rerunning unrelated cloud mutation checks.

## Pilot and remaining operational work

1. Record manual-entry baseline with real staff consent: opening/closing time, wrong taps and corrections. Repeat representative tasks on the new UI, with and without scanning. Suggested usability gate: median task time no worse than baseline, clearer expiry identification, no increased data errors; scanning should improve the median including correction time.
2. Run a phone session with Alon and one staff member, then two real shifts. Record device/browser/build, each failure, severity and reproduction. Real items/actions must be intentional business actions, not hidden test data.
3. Confirm report department labels and decide near-expiry policy. Inspect out-of-business legacy records only if enrolling their legitimate business; never manufacture fields or move them into Alon's scope.
4. Recheck runtime/dev dependency audits and current provider/free-plan settings before release; address reachable blockers with focused updates, not force upgrades. Auth domain configuration is needed only for selected popup/redirect flows; do not claim it blocks email/password independently.
5. Optional N0 separately verifies VAPID matching, supported phone install requirements, per-device opt-in/off/account binding, authentic scheduler identity/retries, timezone slots and actual delivery/clicks. Enable narrowly only after evidence and owner approval. Preserve the current disabled trigger until then.

## Agent execution estimate — revised 2026-11-25

The previous46–74 cumulative engineering-hour estimate was a generic staffing estimate. It overstated the incremental work and did not answer Alon's question about elapsed work by Codex and Claude on an existing, tested application. It is superseded by the estimate below.

Observed Git timestamps from the previous round (all converted consistently): Claude's initial UI1 checkpoint a8ed3b3 was2026-11-15T14:06:52Z; corrected UI3 checkpoint2810835 was17:44:49Z, an interval of3h37m57s containing UI2/UI3 implementation, corrections and coordination. The final Codex integration f29a276 followed at17:59:48Z, about15minutes later. Narrow correction windows from Claude's feedback-merge commits to corrected commits were6m08s(UI1),7m15s(UI2) and8m51s(UI3). These are checkpoint intervals, not telemetry of active model time: tests may overlap and interruptions/earlier work are not measured. Do not extrapolate them as guaranteed throughput or claim the whole previous project took that long.

**Planning target:5–8 elapsed hours of coordinated agent work for A–C**, with both agents running and prompt handoffs, assuming a usable existing extraction provider is accessible, the agreed small scope stays fixed, date conventions are resolved promptly and the photo experiment shows the feature is feasible. This is an estimate, not a delivery guarantee; it does not guarantee arbitrary handwriting recognition quality.

| Work package | Owner | Agent working interval | Parallelism |
| --- | --- | --- | --- |
| Lock visual/date decisions and adapter contract | Both | 15–30min | First checkpoint; use existing design and code |
| Compact UI across existing inventory/forms/admin/report components | Claude | 2–3h | In parallel with date/OCR work |
| Optional dates + trusted domain/rules/queue compatibility | Codex | 1–2h | In parallel with visual implementation |
| Existing-model print/handwriting feasibility check | Codex | 30–60min | Uses provided examples and existing provider access; no training |
| Connect capture/crop/confirmation UI to extraction and stable opening intents | Both | 1–2h | After contracts/probe; can overlap remaining visual work |
| Integrated review, necessary tests, focused fixes and release preparation | Both | 1–2h | After each coherent checkpoint; overlap CI where possible |

Intervals overlap; adding every row is not the elapsed estimate. UI release A alone targets2–3hours of implementation, then30–60minutes of review/verification, and can ship independently. Provider setup or additional safety-critical policy changes require a revised estimate before more scope is added.

Not counted as agent work: waiting for sample photos, provider/payment access, owner feedback, real phone handling or two live shifts. Real device/staff pilot is still required and is recorded separately; waiting for it must not be presented as model development time. Provider/CI outages and unmeasured handwriting quality are explicit uncertainties.

Optional push configuration/N0 targets another1–2agent-hours only if credentials/provider prerequisites are available, plus separate real-device/scheduler delivery verification. Do not imply activation/delivery is complete within that estimate. Re-estimate after the first30–60minutes of implementation using actual completed checkpoints and blockers; avoid repeated exploratory rounds or rebuilding accepted functionality.

## Deliverables and final definition of done

- A consistent working product across inventory, forms, administration, reports and installed PWA, backed by approved responsive visual evidence.
- Explicit manual dates and trusted effective-expiry behavior, backward-compatible records and durable pending actions.
- Optional packaging/staff-label scanning with measured limitations, confirmation, manual fallback, documented cost/privacy and disable switch; or an honest experimental hold if acceptance fails.
- Reviewable branch checkpoints with verified pushes; focused tests, complete CI evidence, dated pilot record and rollback procedure.
- Updated README, RELEASE, PILOT, owner handoffs and short demo script. Explain architecture/tradeoffs and actual verified behavior for portfolio/interview use; do not market experimental OCR or disabled push as live capabilities.
- Final report states deployed source/provider IDs, which tasks are complete, what remains NOT RUN, residual dependency findings, provider cost assumptions and owner follow-ups. Optional push is explicitly enabled-and-verified or still deferred, never silently counted as complete.

## Current execution checkpoint

Alon authorized both agents to begin on2026-11-25. Codex C0a adds isolated date-evidence DTOs and Gregorian/precision validation with targeted regression checks; no inventory persistence or expiry policy has changed. See DATE_SCAN_CONTRACT.md. Claude starts V0 now using CLAUDE_START_PROMPT.md and synthetic fixtures. Next Codex work is the remaining C0 policy/compatibility decision record and S0 evaluation harness; real OCR accuracy requires sample photos and an accessible provider. UI work proceeds independently. Each owner publishes coherent commits and verified remote SHAs per task.

### C0b/S0a progress — 2026-11-25

Runtime result validation and explicit review are implemented without changing C0a DTOs. A provider-neutral recorded-output evaluator and runnable synthetic fixture are available; see SCAN_EVALUATION.md. Real OCR quality/provider access remains NOT RUN. These additive foundations do not write inventory or settle date-only/timezone policy. Claude can complete V0 independently. C0/S0 work is published on a Codex working branch and integrated into core through pinned development PRs if the ref-update connector is unavailable.
