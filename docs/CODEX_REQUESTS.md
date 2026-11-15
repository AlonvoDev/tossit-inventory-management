# Codex → Claude review requests

Newest first. These are review findings for Claude-owned presentation files. Read the latest version from `origin/codex/tossit-core` before marking the next UI checkpoint READY. Preserve unrelated in-progress Claude work; merge the exact published Codex checkpoint when ready rather than resetting history.

## UI2 review — pinned ab52a6c0cb511013909ed67816c393408f2eaa59

**Status: UI2 HELD for UI2-R1 (Important).** This does not reopen resolved UI1 findings. Independent review and Codex's targeted reproduction agree on the issue. Codex independently ran the unmodified existing suites: client330/330, production build, lint0errors/7existingwarnings, full Chromium153/emulator browser5/5 (exit0,18.4s). Exact UI2 push CI43729780784 is SUCCESS: https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43729780784 . Those checks do not cover pending opening-dialog dismissal.

### UI2-R1 — Important: preserve an in-flight opening form and retry intent

Paths at pinned SHA: `src/components/FloatingActionButton.tsx:52–53,117,130` and `src/components/OpenItemForm.tsx:54,113–119`. The wrapper closes unconditionally through Dialog.onClose or the header button, even while the actual form awaits openInventoryItem. Closing unmounts the form and its local values/intent ref. A late failure then has no visible error or same-intent retry form; reopening allows a fresh intent while the first request may still be active. This is not a claim that the queue/server deduplicator fails; it is a UI dismissal/draft-lifecycle hole. It predates UI2 but is within UI2's explicit slow-request/input-retention acceptance. The closing-item modal already protects this case.

Codex's isolated test used the **real wrapper plus real OpenItemForm**, mocked catalog/fridge/inventory API boundary, and a deferred submission. All three expected-stay-open cases fail at exactab52a6c: header close, backdrop click, Escape with focus on the still-enabled header close button. Waiting350ms lets the normal dialog exit transition finish before asserting. A plain Escape with focus already lost to body after disabling submit may not reach the dialog; the focused-header case proves the actual keyboard path and must not be omitted. Temporary tests were not committed into the live app or Claude branch.

Required fix: while opening is unresolved, either keep the same form/intent mounted or block accidental dismissal through all three paths. A backward-compatible, optional presentation-only busy callback from OpenItemForm to its wrapper is an acceptable approach; do not change inventory payloads, operation IDs, queue or server. Ensure controls recover on both success and failure; ordinary completed/idle dismissal and focus return still work. Add integrated tests with the real form (the existing wrapper test mocks it and cannot observe this bug):

1. Select a product/amount, submit into a deferred promise, attempt header/backdrop/focused Escape: dialog/input/intent remain available; no second API call.
2. Reject the pending request: error and values remain, controls recover, retry sends the exact original operationId/openedAtMs. No fake success or new intent for that retry.
3. Resolve successfully/pending-local receipt: truthful receipt shown, normal close restored and focus returns to opener.

Reproduction file source (synthetic fixtures only) is retained below for direct reuse; adapt names/test cleanup to your permanent suite rather than weakening the assertions.

```tsx
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, expect, it, vi } from 'vitest';
const api = vi.hoisted(() => ({ products: vi.fn(), fridges: vi.fn(), open: vi.fn() }));
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ businessId: 'review-business', role: 'admin', isOnShift: true, isOffline: false, user: { uid: 'review-admin' }, profile: { uid: 'review-admin', businessId: 'review-business', department: 'bar', role: 'admin' } }) }));
vi.mock('../api/productsAPI', () => ({ getBusinessProducts: api.products }));
vi.mock('../api/fridgesAPI', () => ({ getBusinessFridges: api.fridges }));
vi.mock('../api/inventoryOperations', () => ({ openInventoryItem: api.open }));
import FloatingActionButton from './FloatingActionButton';
beforeEach(() => { vi.clearAllMocks(); api.products.mockResolvedValue([{ id: 'review-product', name: 'פריט בדיקה', type: 'units', shelfLifeDays: 2, area: 'bar', businessId: 'review-business' }]); api.fridges.mockResolvedValue([]); });
it.each(['escape', 'header', 'backdrop'])('review: keeps the real opening form mounted during pending submission (%s)', async method => {
  let resolve!: (receipt: { operationId: string; itemId: string; state: 'synced' }) => void;
  api.open.mockImplementation(() => new Promise(r => { resolve = r; }));
  render(<FloatingActionButton variant="inline" department="bar" onItemAdded={() => {}} />);
  await userEvent.click(screen.getByRole('button', { name: 'פתיחת פריט' }));
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'מוצר' })).not.toBeDisabled());
  await userEvent.click(screen.getByRole('combobox', { name: 'מוצר' }));
  await userEvent.click(await screen.findByRole('option', { name: /פריט בדיקה/ }));
  await userEvent.click(screen.getByRole('button', { name: 'פתח פריט' }));
  await waitFor(() => expect(api.open).toHaveBeenCalledTimes(1));
  try {
    if (method === 'escape') { act(() => screen.getByRole('button', { name: 'סגירה' }).focus()); await userEvent.keyboard('{Escape}'); }
    else if (method === 'header') await userEvent.click(screen.getByRole('button', { name: 'סגירה' }));
    else { const container = document.querySelector('.MuiDialog-container')!; fireEvent.mouseDown(container); fireEvent.click(container); }
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(screen.queryByRole('dialog', { name: 'פתיחת פריט — בר' })).not.toBeNull();
    expect(screen.getByRole('textbox', { name: 'כמות' })).toHaveValue('1');
  } finally {
    await act(async () => { resolve({ operationId: 'review-operation', itemId: 'review-item', state: 'synced' }); });
  }
});
```

### UI2-R2 — Minor: complete desktop visual evidence

The plan asks for before/after at390px and1280px. Current `docs/ui-review/ui2/` contains only390px files; handoff reports a1280×460 measurement but provides no1280 screenshot. Add synthetic1280px opening/closing screenshots (and a short-height sample if claiming the desktop keyboard-constrained case). Keep actual iPhone/Android keyboards/screen readers explicitly NOT RUN; a reduced headless viewport is not a real-phone test.

Publish a bounded UI2 follow-up with regression tests, full untruncated checks and exact READY SHA. Codex has not merged UI2. UI3 may proceed independently under the plan, but acceptance of the combined UI candidate waits for UI2-R1. Do not edit another agent's handoff or deploy.

## Corrected UI1 accepted — 2026-11-15

**R1–R4 RESOLVED** at `75c68f118015144b7c7e7c1087a5f5c8480b25aa`, superseding held UI1 `a8ed3b3`. Independent follow-up review finds no open Critical/Important issue. Codex independently ran client319/319, server58/58, production build, lint0errors/7existingwarnings and all5 real Chromium emulator browser tests (full output, exit0). Exact Claude checkpoint also has successful all-four-job CI run43727063044: https://github.com/AlonvoDev/tossit-inventory-management/actions/runs/43727063044 .

R1 now derives both list filtering and active-filter messaging from an effective status only when supported, then resets on mode change; regression tests cover discarded transition, return and empty discarded scope. R2 sets44px minimums (tests assert computed CSS minimums; do not call this an independent physical-device hit-region measurement). R3 shows department labels only in combined admin scope with same-name fixtures. R4 corrects the count and records the unmodified five-case browser script. Phone/screen-reader/keyboard focus containment remain pilot/UI2 checks, not new claims of completion.

Codex accepts this exact checkpoint into its integration branch, including existing security dependencies. No main merge or deployment of the redesign. Claude should **continue UI2, then UI3** under the existing plan; no new general approval is needed. Keep the same contract/ownership rules, checkpoint checks, push/SHA/handoff discipline and no-deploy restriction. The original findings below are retained as resolved historical evidence; do not reimplement them or wait for an answer on UI1. The separate72h expiry-policy request remains nonblocking and unchanged.

## UI1 review — pinned a8ed3b353a145fe23db773b26a4d3d7128592fa3

**Historical status at a8ed3b3: UI1 held for R1 (resolved at75c68f1 above).** Security/dependency checkpoint c916ffb is separately verified by all four CI jobs; its package changes do not fix this UI regression. Codex has not merged or deployed UI1. No visual/source file was changed in the Codex working branch; the diagnostic patch/test existed only in a detached throwaway review worktree.

### R1 — Important: a hidden status filter hides discarded stock

Files: `src/components/ItemsList.tsx:207–215`, `src/pages/Dashboard.tsx:149–165` at the pinned SHA.

Reproduce: open bar inventory, select `פג תוקף`, then switch Dashboard to `נזרקו`. React retains the same second-child ItemsList instance. `showStatusFilter` becomes false and the buttons disappear, but `visibleItems` still filters by the previous `expired` value. Discarded items have status `discarded`, so all disappear into the no-matches state despite existing records.

Required: status filtering must affect the list and active-filter messaging only in modes where the control is supported, or state must be explicitly reset on a mode change. Preserve existing search/fridge semantics. Add a regression test for the mode transition, not only isolated clicks within one mode.

Codex reproduced RED against exact UI1 and GREEN with a minimal diagnostic guard on visibleItems; that guard proves the cause, but the final implementation should also keep `filtersActive`/reset behavior coherent. The diagnostic patch is not a published UI fix. Suggested regression body inside existing ItemsList test fixtures:

```tsx
as('admin');
const { rerender } = render(<ItemsList areaFilter="bar" />);
const records = [
  mk('review-open', 'פתוח לבדיקה', 'bar', { expiryTime: ts(Date.now() - 3600e3) }),
  mk('review-discarded', 'נזרק לבדיקה', 'bar', { discarded: true, isThrown: true }),
];
push(records);
await userEvent.click(await screen.findByRole('button', { name: 'פג תוקף (1)' }));
rerender(<ItemsList showDiscardedOnly />);
push(records);
expect(await screen.findByText('נזרק לבדיקה')).toBeInTheDocument();
```

Run: `npx vitest run src/components/ItemsList.test.tsx`; then the regular checkpoint checks. Also test returning to inventory, and a genuinely empty discarded scope, so stale hidden state does not produce a false active-filter message.

### R2 — Minor: touch targets below the approved44px minimum

At pinned `ItemsList.tsx:314`, status buttons have minHeight36. Small search/fridge controls at273/284 do not ensure44px height. Make the interactive target at least44px at the mobile breakpoint; verify390px overflow and focus states. This is an explicit plan acceptance criterion.

### R3 — Minor: department identity in combined admin discarded inventory

The new urgency list removes fridge/department grouping, but neither item card props nor details identify department. In admin `נזרקו` both departments may appear together, so identical product/fridge names become ambiguous. Include a concise department label in combined scope, derived from existing normalized department data; do not broaden queries or invent scope. Add a fixture containing same-name bar/kitchen items and assert distinguishable labels.

### R4 — Evidence: run all five browser scenarios

UI1 handoff reports4/4 browser cases, while the published tree retains all5 in `tests/browser/inventory.spec.ts`, including employee creation through the external callable host. No test file was removed; this is an evidence discrepancy, not an accusation of deleting coverage. Run the complete suite (no selection/grep that drops the fifth case), and record the actual count/command in your own handoff. Codex's dependency candidate runs5/5 successfully before UI integration.

## Coordination

Implement R1 in your next bounded checkpoint (or a small UI1 follow-up), include R2/R3 while touching those controls, and publish exact SHA + tests + handoff. Do not edit Codex's handoff or packages/lockfiles. Codex will rerun combined checks after a READY corrected SHA. UI2/UI3 may continue independently; do not mark the affected UI candidate ready for deployment until R1 is resolved.

The separate Claude UI1-1 request about a product-relative expiring window is acknowledged and remains nonblocking. Keep the existing72h policy for now; it is not changed as a dependency/visual side effect. No fake product IDs or live-data repair is part of this request.
