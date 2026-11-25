# V0 — compact redesign prototype (for visual review)

Status: **READY FOR VISUAL REVIEW**. This is a prototype, not production UI. It is not linked from any app route.

Open `index.html` directly in a browser. It is one self-contained file: no network, no build, no dependencies, synthetic data only. The clock is fixed at 2026-11-25 19:00 Asia/Jerusalem. The dark "בקרי אב־טיפוס" bar at the top is not part of the product. Use it to switch:

- role (staff/bar, department manager/kitchen, admin with a combined "הכל" view);
- data (busy, empty, loading, load error), online/offline, on/off shift;
- send outcome (saved on the server, pending on the device, failed, stuck);
- scan result fixture and camera permission.

## What it shows

- **Inventory:** a flat list with thin separators, grouped urgent first (פג תוקף → עומד לפוג → בתוקף).
  - Each row shows the product, quantity and unit, fridge, opening time, a coloured remaining-time label and the exact expiry.
  - Each row has its own "סגירה" action, named per product.
  - Search, the fridge select and the status chips with counts take about 3 lines on a phone.
  - On desktop the same rows line up as table columns.
  - The admin combined view labels each row with its department, so duplicate names such as "לימון חתוך" stay distinct.
  - Rows show the pending ("ממתין לשליחה") and failed ("נכשלה… נסה שוב") states.
  - Also shown: offline banner, empty, no-matches, load error and skeleton loading.
  - Staff off shift get a "התחלת משמרת" bar instead of the opening button.
- **Opening:**
  - full screen on a phone, a dialog at 600px and wider;
  - type-to-filter product list, a stepper for quantity (kg decimal or whole units), fridge chips, and the catalogue expiry preview;
  - the sticky footer holds the result message and "פתח פריט";
  - an invalid amount is flagged inline and focused;
  - while the send is pending, Escape, the close button and the backdrop are all ignored (UI2-R1 preserved);
  - the result message distinguishes saved-on-server from pending-on-device.
- **Optional date evidence (rows V0/V4):** "סריקת תאריך" or "הזנה ידנית".
  - The scan flow is: choose packaging or staff label → capture (synthetic image, no camera) → processing → review.
  - Review fixtures follow `DateScanResult` v1 from `src/domain/dateEvidence.ts`. `packaging` and `staffIncomplete` are the exact fixtures from `docs/DATE_SCAN_CONTRACT.md`.
  - Other fixtures:
    - an ambiguous `03/04/27`: two readings, nothing preselected;
    - packaging with a manufactured-at date (visible but cannot be selected), an expiry and an unknown batch code;
    - unreadable;
    - camera denied, which offers the gallery or manual entry.
  - A missing year stays empty and blocks confirmation. A missing time stays empty: the user must enter it or explicitly tick "יום בלבד". Only the day and month actually written are carried over. There is no default year, no midnight and no expiry calculation.
  - "אישור התאריך" is a separate explicit action. Cancel, the back arrow or Escape return to the unchanged draft.
  - Confirmed evidence appears in the form but **is not sent** and does not change expiry until C1/date policy exist.
- **Closing:** item summary, then "נגמר" / "נזרק".
  - Discarding asks for the amount (bounded by the item quantity, kg decimal) and a required reason, plus free text for "אחר".
  - Shows the same busy, failed and pending messages as opening.

## Evidence

`node docs/ui-review/v0/capture.cjs` regenerates all PNGs in this folder and runs 29 checks: 31 screenshots, overflow, touch-target size and interactions. 2026-11-25 result: **29/29 PASS** (exit 0).

- No horizontal overflow at 320, 390, 430 and 1280px across 14 states (inventory, offline, error, discarded, open form, close form, every scan fixture, capture, manual entry).
- All interactive targets are at least 44px at 390px. Chips and segment buttons are 34–36px visually, with a hit area extended to 44px.
- Interactions checked:
  - status filter; search keeps focus;
  - invalid amount; pending opening can't be dismissed;
  - scan cancel keeps the draft; no year or time is inferred;
  - confirmation stays blocked until fields are complete; day-only must be explicit;
  - ambiguous: no preselection; manufactured-at can't be selected; unreadable fallbacks;
  - discard needs a reason and a bounded amount;
  - department tags for duplicate names; no page errors.

Screenshot names describe the state and width, for example:

- `390-inventory-busy.png`;
- `390-scan-review-staff-missing-year-time.png`;
- `1280-inventory-admin-all-departments.png`;
- `320-scan-review-staff.png`.

## Not shown, not claimed

- No real camera, photo or OCR.
- No real device, iPhone keyboard, VoiceOver or installed PWA check.
- No change to production source, contracts, rules, queue or dependencies.
- The 72h "עומד לפוג" window mirrors the current policy (follow-up UI1-1).
