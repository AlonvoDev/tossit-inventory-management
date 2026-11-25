# C0a — date evidence and scan review contract

2026-11-25. Implementation authorized by Alon. C0a is an additive foundation, not a v2 inventory writer or a deployed scanner. Read with TOSSIT_MASTER_PLAN.md.

## C0b / S0a extension available

`src/domain/dateScanReview.ts` adds `parseDateScanResult(value, expectedSource)` and `confirmDateCandidate(rawResult, expectedSource, candidateId, decision)`. Unknown provider output is runtime-validated, source is matched to the caller, results are bounded/detached, and confirmation is a separate explicit action. Stable DateScanError codes are invalid-scan-result, confirmation-required, candidate-not-found and opening-time-required.

This supersedes C0a's earlier statement that whole-result validation is not implemented. It does not supply authentication, a provider endpoint, request-generation binding or trusted inventory persistence. The UI must discard outdated async responses after cancel/account/source changes; a candidate ID only identifies a candidate in the supplied result. Do not interpret this parser as account authorization or calibrated recognition certainty.

`src/features/dateScan/evaluation.ts`, the synthetic dataset and `scripts/scan-evaluation.test.ts` provide aggregate scoring for recorded outputs; see SCAN_EVALUATION.md. Synthetic checks do not establish real print/handwriting accuracy. The existing C0a DTO/mocks are unchanged, so Claude can continue V0 without a forced mid-task contract migration.

## S1a request lifecycle available

The controller in src/features/dateScan/controller.ts now provides start/cancel/dispose, observable idle/scanning/ready/error states, account/business generation guards, deadlines and source-matched validation. Hebrew bounded messages are in errorMessages.ts. See DATE_SCAN_TRANSPORT.md for the adapter seam and cleanup obligations. No provider/backend endpoint is installed by S1a; the current server32KiB reader must not be reused for large photo payloads. This does not change the review DTOs or inventory writers.

## Available now

Import from `src/domain/dateEvidence.ts`:

- `DateEvidenceSource`: manual, packaging, staff-label.
- `DetectedDateMeaning`: opened-at, manufacturer-expiry, label-expiry, manufactured-at, unknown.
- `DateReading`: day precision with explicit Gregorian year/month/day, or minute precision with hour/minute and Asia/Jerusalem timezone.
- `DateScanCandidate`: id, rawText, meaning, reading (or null), issues.
- `DateScanResult`: version1, packaging/staff-label source, candidates/unreadable outcome, candidates array.
- `ConfirmedDateEvidence`: separate explicit user confirmation with a permitted meaning. A production/unknown reading cannot directly become confirmed opening/expiry evidence.
- `parseCalendarDate` and `parseDateReading`: validate explicit calendar components, preserve precision, reject coercion/missing fields/impossible dates/extra fields and return detached copies.

These types are a UI/adapter contract. Types alone do not validate a provider response or establish authorization. C0b validates result shape/content through parseDateScanResult; S1 still validates request scope, file limits and access before exposing a provider response. Never cast unknown model JSON directly to DateScanResult. A confirmed DTO is not a security capability; later trusted validation still checks every inventory write.

## Synthetic fixture for Claude V0/V4

```ts
import type { DateScanResult } from '../domain/dateEvidence';

const packaging: DateScanResult = {
  version: 1,
  source: 'packaging',
  outcome: 'candidates',
  candidates: [{
    id: 'candidate-1', rawText: 'לשימוש עד 28.11.2026',
    meaning: 'manufacturer-expiry',
    reading: { precision: 'day', date: { year: 2026, month: 11, day: 28 } },
    issues: [],
  }],
};

const incompleteStaffLabel: DateScanResult = {
  version: 1,
  source: 'staff-label',
  outcome: 'candidates',
  candidates: [{
    id: 'candidate-2', rawText: 'נפתח 25/11', meaning: 'opened-at',
    reading: null, issues: ['missing-year', 'missing-time'],
  }],
};
```

This fixture is deliberately missing a year/time. Show editable missing fields, do not choose the current year or midnight. Show more than one candidate when semantics are ambiguous. Manufactured-at stays visible as an unsupported input for the intended action, not an expiry suggestion. Unreadable outcome uses an empty candidates array with manual entry/retake. UI confirmation is a separate button; cancel returns to the unchanged draft.

## Precision and policy boundary

parseDateReading validates calendar/time components only. A Jerusalem local minute during a DST gap/repeated hour is not thereby a resolved instant. There is no default date-only expiry cutoff, missing-year inference or local-time-to-epoch conversion in C0a.

Before C1 introduces writers, settle the business convention for date-only expiry, missing label time, DST ambiguity and later corrections. The proposed effective expiry is the earliest applicable manufacturer/label cap and catalog-derived expiry. This policy is not implemented here. Staff-written expiry cannot lengthen catalog policy. Preserve original separate source meanings and audit metadata.

Existing OpenInventoryItemInput, InventoryItem, inventory builders/readers, Firestore rules and offline schema are untouched. Do not place these new DTOs into inventory writes or queue previews and assume they persist. C1 must implement readers/rules/fingerprints/replay/idempotency/version compatibility together. Until then a prototype may show date evidence, but actual production saves use the existing contract.

## Ownership and next tasks

Claude: V0 static/local interactive prototypes first, then presentation files after visual review. Use the above synthetic mocks; no real-image provider traffic, new server client or persistence fields. Ask for adapter changes through CLAUDE_REQUESTS.md.

Codex: finish C0 policy/compatibility design and S0 feasibility harness; later implement C1/S1 behind the agreed adapter. Actual packaging/handwriting accuracy cannot be measured until representative images and an accessible provider are available. Synthetic fixtures validate plumbing only, not recognition quality.
