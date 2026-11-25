# C1a — inclusive staff-label calendar review

2026-11-25. Branch: codex/tossit-staff-calendar-days. Additive domain checkpoint; no deployment or production persistence change.

Alon confirmed that the staff label's handwritten date is opening/preparation, and +N counts that day as day 1. The final usable date is opening date + N - 1 calendar days. See DATE_SCAN_CONTRACT.md for the review seam and integration checklist.

## Available for Claude

Import calculateLastUsableDate and reviewStaffLabelUsage from src/domain/staffLabelUsage.ts. The review accepts exactly confirmed:true, a complete openingDate, and numeric usageDays. The result preserves these fields and supplies lastUsableDate. Present the dates and day count for a separate explicit confirmation. The draft accepts day precision without inventing an hour. Version 1 scan output and the existing minute-only confirmed opening contract remain unchanged. No automatic model confirmation and no inventory payload extension.

## Validation

- 38 new tests pass: +1/+2/+3, month/year rollovers, Gregorian leap-year rules, DST-adjacent dates, years 1/99/9999, catalog limit, unsupported date overflow, missing year, invalid/coerced durations, detached results, explicit confirmation and derived-date injection.
- Full client suite: 484/484 tests, 47/47 files, Node 22.23.4.
- npm run build passes; npm run lint has 0 errors and 7 existing warnings.
- Initial full-suite run under host Node 24 had 483 passes and one existing service-worker redirected-response test failure ([object Blob] versus expected response text). Re-running the full suite under Node 22 passes all 484. No test weakened or skipped.
- Browser/emulator suites were not re-run: this checkpoint has no runtime imports, UI, storage, server or rules changes. Those suites are required when persistence integration changes these paths.

## Next implementation boundary

Implement a versioned Jerusalem calendar-day expiry policy in the trusted writer and rules, with backward-compatible readers, offline intent fingerprints/replay and online idempotency. Existing stored expiries/queued operations retain their original semantics. Resolve the next-local-day boundary across DST independently of this date-only helper; never substitute N times 24 hours. Define catalog/manufacturer caps explicitly before wiring staff-label evidence into writes. Actual provider recognition remains unmeasured; user photos are private examples, not a scored dataset.
