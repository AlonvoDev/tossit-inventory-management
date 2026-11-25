# S0a — extraction evaluation harness (not an OCR benchmark)

The provider-neutral review boundary is implemented in src/domain/dateScanReview.ts. The evaluation engine is src/features/dateScan/evaluation.ts. No provider or real-image accuracy test has run yet.

## Run now, without credentials

```sh
npm run test:run -- scripts/scan-evaluation.test.ts
```

This uses docs/scan-evaluation/synthetic.json, explicitly reports mode:synthetic and recognitionQualityValidated:false, and does not make network calls or read images. It verifies the pipeline and metrics, not OCR quality. No latency values are fabricated for the synthetic fixture.

## Evaluate recorded provider outputs later

Create an untracked/private JSON file following the synthetic shape, set mode:recorded, label the run, and supply samples with human ground truth plus raw provider-adapter results. Keep provider/model version, prompt version and capture device metadata with the private experiment record. Run:

```sh
TOSSIT_SCAN_EVALUATION_FILE=/absolute/private/evaluation.json npm run test:run -- scripts/scan-evaluation.test.ts
```

The command reads recorded results only; it does not invoke a model, upload photos or incur provider charges. A passed harness run does not mean the recognition targets passed. Real-provider evaluation remains NOT RUN until real recorded samples exist and the complete report is assessed.

Each sample has unique id, source:packaging|staff-label, writing:printed|handwritten, expected:{meaning,reading}|null, result:unknown, and optionally measured latencyMs/manualTaskMs/scanTaskMs. Truth uses explicit year/time from the human labeler and the actual source, never an OCR-generated guess. null means no usable target date in the photo. Keep some images out of prompt adjustment. No staff/customer photos or private recorded outputs belong in public Git.

## What is counted

- Results remain separated by source and printed/handwritten writing. Totals include invalid results and abstentions; do not remove hard examples from the denominator.
- An exact suggestion requires one candidate, an applicable date meaning, an explicit complete reading, no unresolved issues, and exact matching meaning/precision/components/timezone. One lucky match among several candidates is not credited as a precise suggestion.
- Wrong suggestions include a wrong meaning and spurious dates on a no-date photo. Unreadable/ambiguous results count as abstentions. Invalid shapes count separately. Correct no-date responses are separate from correctly recognized dates.
- Latency medians/p95 use supplied finite nonnegative measurements. End-to-end savings use paired manualTaskMs/scanTaskMs and include capture, crop, review and corrections. Negative savings means scanning was slower. Missing timing stays null, not zero.
- Output is aggregate counts/timings only, not raw image text. Meanings and source are not inferred by the evaluator. Human correction rate should be recorded in the pilot separately; the harness does not fabricate it.

Use the proposed master-plan thresholds only after the sample composition and decision rules are agreed.20–30 examples are feasibility evidence, not a broad handwriting accuracy guarantee. Provider selection and real-photo use remain dependent on available access, cost/payment feasibility and data handling terms.

## UI boundary for Claude

parseDateScanResult(value, expectedSource) rejects extra/model-authority fields, source substitution, more than8 candidates, duplicate IDs/issues, text over512 characters and contradictory/malformed dates. It creates detached outputs. Raw text remains text; it must be rendered escaped, not inserted as HTML or interpreted as instructions.

confirmDateCandidate(result, expectedSource, candidateId, decision) requires a candidate in the supplied result and an explicit {confirmed:true,meaning,reading} decision. It accepts corrected user values, preserves source and rejects production/unknown meaning. Opening requires explicit minute precision. It does not resolve DST or assign a date-only cutoff and does not write inventory. Confirmation DTOs do not replace server/rules validation. Request-generation/account binding belongs to the UI/server orchestration; this pure parser cannot detect an old result supplied as current.

The C0a fixture shape remains compatible. Do not auto-call confirmation on extraction completion or preselect ambiguous evidence. Cancelling must preserve the manual draft. The forthcoming trusted expiry policy/persistence change is a separate C1 checkpoint.
