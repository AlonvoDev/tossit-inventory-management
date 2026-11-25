# S1a — client scan lifecycle and transport seam

2026-11-25. This implements the local request controller for optional date extraction. It is not a provider integration, backend endpoint, camera component or deployed feature. Claude owns capture/crop and presentation; Codex owns this controller and the forthcoming server transport. Inventory persistence remains unchanged.

## API available to Claude V4

Import createDateScanController, DateScanRequest and DateScanState from src/features/dateScan/controller.ts. Hebrew bounded error copy is in errorMessages.ts. Existing C0a DTOs and C0b parse/confirmation functions remain unchanged.

```ts
const controller = createDateScanController({
  currentContext: () => activeProfile
    ? { uid: activeProfile.uid, businessId: activeProfile.businessId }
    : null,
  isOnline: () => online,
  extract: async (request, signal) => {
    // Codex's provider transport will live here; V0 mocks can return a synthetic result.
    // Do not send photos to the existing employee/device callable routes.
    return adapter.extract(request, signal);
  },
});
```

Controller methods:

- start(source,image): source is packaging|staff-label; image is a cropped Blob. Returns Promise<void>; ordinary failures are exposed as a bounded error state, not raw exception text. There is no automatic retry.
- getSnapshot()/subscribe(listener): stable store interface suitable for React's useSyncExternalStore. Do not construct a new controller on each render. Keep currentContext/isOnline callbacks current rather than closing over an old profile.
- cancel(): clears the result and aborts the active request; cancellation settles promptly even when the transport ignores abort. A replacement start cancels the prior request automatically.
- refreshContext(): call from the auth/business/connectivity effect. A changed account/business clears existing results as well as pending work. Going offline during extraction aborts it. Reconnect alone does not resend a photo. A ready result for the same account can remain visible offline; confirmation/persistence still follow their own rules.
- dispose(): aborts work, clears listeners/results and prevents reuse. Own one instance per mounted review session; dispose it on final unmount, and create a fresh instance for a new session. Account changes also need refreshContext and reset of UI-owned image previews/drafts as appropriate. React StrictMode setup/cleanup must not reuse an already disposed instance.

State is idle, scanning(requestId), ready(requestId,result), or error(code). It contains no image bytes, provider error message, token or confirmation. Closing/cancelling the scan should return to the unchanged opening draft. This is separate from the existing inventory-submit busy guard and operation ID; cancelling extraction does not cancel a submitted inventory operation.

## Guarantees and explicit limits

- Captures uid/business/source per request. Both a generation token and active-run identity prevent a late result from overwriting a newer photo/source or appearing after cancel/unmount. Scope is checked again before exposing the response.
- Default deadline15seconds, configurable within1–60000ms for tested environments. Abort is forwarded to transport. Timers/listeners are released on success, failure and cancellation; provider rejection messages are not copied to UI or logs.
- Accepts nonempty JPEG/PNG/WebP Blob metadata up to2MiB; rejects unsupported/oversized input before invoking transport. These are client UX checks only: they do not decode the image, prove its MIME signature, strip metadata or replace server-side enforcement. HEIC must be explicitly converted through a verified target-device capture path or fall back to manual entry; no silent support claim.
- Results are validated through parseDateScanResult against the captured source. Confirmation is a later user action through confirmDateCandidate. Nothing here sets confirmed:true, chooses a missing year/time, calculates expiry, enqueues a photo or writes inventory.
- The controller does not create object URLs, persist images or log raw failures. Capture UI owns any preview URL and must revoke it on replacement/cancel/account change/unmount. An external transport/provider can still retain its own data; request abort is not a promise that an already-started provider charge or processing is undone.
- Client scope fields are not authorization. A server adapter must derive verified Auth identity and active profile/business/role, and match expectedActorUid/expectedBusinessId before any expensive image/provider work. Every role's permission must be enforced there. Do not rely on hidden UI controls or the controller.

## Server boundary still to implement (S1b)

The current functions/src/hosting/http.ts JSON reader caps existing employee/device requests at32768bytes. A2MiB photo encoded as base64 is about2.8MiB, so changing a frontend URL or globally increasing that limit would be incorrect.

Reserve a dedicated extraction path, disabled until configured. It needs its own bounded streaming reader, Auth and profile check before body/provider processing, fixed image format/decoded-dimension limits, metadata stripping/crop validation, canonical base64 or multipart handling, per-user/business/global usage controls, deadline and bounded JSON output validation. Keep the existing callable limits, errors and anonymous revoke semantics unchanged. Do not accept remote image URLs or frontend-supplied provider keys.

Proposed private transport payload: requestId, source, expectedActorUid, expectedBusinessId, mimeType and image bytes. The transport returns the unwrapped DateScanResult only; an HTTP/callable envelope is decoded by the adapter, not the controller. Supply Firebase bearer auth through the existing session service, then match the server's verified identity to the expected scope. Bind retry/deduplication to source + scoped request ID + image fingerprint before paid inference. Keep image/token text out of audit logs and persistent receipts. Actual quota numbers, provider/budget and retention terms remain a configuration decision; no service is activated by this code.

S1b also needs canonical shared result validation usable by the functions TypeScript builds. Their rootDir is functions/src; directly importing client files outside it is not a working native-functions build strategy. Reuse a deliberate shared module/build boundary rather than silently duplicating validation or broadening compiler roots during a UI task.

## Pending date policy

An opened-at reading needs an explicit minute and later a valid Jerusalem instant. A day-only expiry can remain evidence, but its actual cutoff is not chosen by the controller. The business convention for date-only expiry and staff labels without a time still needs resolution before C1 writers/rules/replay can apply it. Do not auto-use midnight/current time or extend catalog shelf life. Manual date entry and visual V1 work proceed independently of provider availability.

## Verification

Lifecycle tests cover cancellation, photo/source replacement, timeout, ignored aborts, account/business/sign-out changes, clearing a displayed result, offline/reconnect, invalid images, malformed/mismatched output, synchronous transport failure and disposal/subscriber cancellation. Synthetic bytes are used only to exercise orchestration; real image decoding, camera/HEIC, model accuracy and provider operation remain NOT RUN. Run npm run test:run -- src/test/domain/dateScanController.test.ts for the focused checks.
