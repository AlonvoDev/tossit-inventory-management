# Codex review — Claude V0, 2026-11-25

Pinned source: 7668e623cb82ee6dd111e0c38bc8855f0b4b57a9 on claude/tossit-ui. It is based on C0a1c18c5c, not the later C0b/S0a integration at core3b08f95. Changes are a self-contained synthetic prototype, captures and Claude handoff only; no production source/dependency/route changes. No reset, deployment or main merge was performed for this review.

## Verdict

**READY FOR ALON'S VISUAL REVIEW.** No production regression is introduced by this isolated prototype. This is not visual approval on Alon's behalf and not permission to implement or deploy unresolved date semantics. V1 inventory styling can start after Alon approves the look; date-review wiring must adopt the newer runtime boundary before V4/C1 integration.

Codex independently ran the exact prototype capture script in a detached worktree with the project's installed Playwright and local Chromium:29/29 PASS, exit0. Environment overrides only: NODE_PATH to the existing node_modules, PW_CHROMIUM to the local executable, and its LD_LIBRARY_PATH. Complete output: tossit-v0-independent.log in the review workspace. Regenerated images are review-only and were not committed back to Claude's branch. Existing application tests were not repeated for this prototype-only review; Claude's381 count is consistent with its older C0a base, while newer core has427.

Viewed busy inventory, empty opening form, incomplete staff-label review and desktop admin combined inventory. The flat row structure and hierarchy materially improve density over the old nested-card screen. Overflow and local interaction evidence pass; real phone/camera/keyboard/VoiceOver remains NOT RUN. The touch-target script computes some hit heights from pseudo-element allowances; it is not a direct physical-device hit-test or accessibility certification.

## Integration item V0-I1 — sync the newer opening-time review boundary before V4

Reproduction in index.html/capture.cjs: choose the staffIncomplete scan fixture, enter year2026, select the day-only checkbox, then confirm. The prototype appends {source:'staff-label',meaning:'opened-at',reading:{precision:'day',...},confirmed:true} to the opening form. The independent capture suite explicitly checks and passes this behavior.

Newer Codex confirmDateCandidate rejects opened-at at day precision with opening-time-required. Its regression is src/test/domain/dateScanReview.test.ts, 'requires an explicit minute for opening'. The prototype intentionally sends no evidence or expiry to persistence, so this is an integration mismatch, not a current inventory write defect. Claude did not have the newer runtime implementation when V0 began.

Required before real wiring: merge the latest published core at a clean task boundary and use parseDateScanResult/confirmDateCandidate rather than duplicate production validation. Expiry evidence may retain day precision pending C1 cutoff policy. Missing opening time can remain an unresolved draft, but must not be promoted to confirmed/applicable opening evidence. Ask for an explicit time or visibly retain an unresolved state; never infer midnight/current time. Update the prototype acceptance check so it does not enshrine unsupported confirmed opening semantics. Preserve missing year, ambiguous selection, cancellation and production-date protections.

Manual-entry prototype fixtures are internal UI state, not DateScanResult payloads. Do not feed its blank rawText/manual candidate into the scan-response parser: use the separate manual date-entry path.

## Product recommendations for Alon's review

1. Keep the full-width bottom opening action on a phone: the label is clear and reachable. Ensure its safe-area padding and keyboard behavior in actual implementation/device checks.
2. Keep three compact lines for long-name inventory rows as the initial limit; make opening timestamps secondary/expandable if the real list feels dense. Avoid shrinking the product name or touch targets to fit more rows.
3. Group by urgency in the combined list; avoid redundant group headings when a single status is filtered. Color remains accompanied by text.
4. Offer optional scan/manual date entry inside every opening form, collapsed by default, so ordinary openings stay short. Product-specific restrictions can follow measured pilot needs, not a new setup burden.

These are recommendations, not answers attributed to Alon. Present the actual phone inventory and opening screenshots for one visual approval rather than making him decide implementation details unseen.

## Next

Alon reviews the look; Claude applies any visual feedback and then starts V1. Codex continues trusted date/persistence design and provider feasibility independently. Printed/handwritten recognition is not implemented by the prototype; real-image examples, label time convention, provider access and date-only cutoff remain distinct inputs for the next checkpoints. No real photos, model calls, paid configuration or production mutations were performed by this review.
