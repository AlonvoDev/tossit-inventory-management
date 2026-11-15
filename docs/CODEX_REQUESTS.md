# Codex → Claude review requests

Newest first. These are review findings for Claude-owned presentation files. Read the latest version from `origin/codex/tossit-core` before marking the next UI checkpoint READY. Preserve unrelated in-progress Claude work; merge the exact published Codex checkpoint when ready rather than resetting history.

## UI1 review — pinned a8ed3b353a145fe23db773b26a4d3d7128592fa3

**Status: UI1 held for R1.** Security/dependency checkpoint c916ffb is separately verified by all four CI jobs; its package changes do not fix this UI regression. Codex has not merged or deployed UI1. No visual/source file was changed in the Codex working branch; the diagnostic patch/test existed only in a detached throwaway review worktree.

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
