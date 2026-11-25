// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, it } from 'vitest';
import { evaluateDateScans } from '../src/features/dateScan/evaluation';

it('evaluates an explicit recorded dataset or the labeled synthetic plumbing fixture', () => {
  const path = process.env.TOSSIT_SCAN_EVALUATION_FILE ?? resolve('docs/scan-evaluation/synthetic.json');
  const dataset = JSON.parse(readFileSync(path, 'utf8'));
  if (dataset.version !== 1 || !['synthetic', 'recorded'].includes(dataset.mode)
      || typeof dataset.label !== 'string' || dataset.label.length > 80
      || !Array.isArray(dataset.samples) || dataset.samples.length === 0) throw new Error('Invalid evaluation dataset');
  const summary = evaluateDateScans(dataset.samples);
  expect(summary.total.samples).toBe(dataset.samples.length);
  if (!process.env.TOSSIT_SCAN_EVALUATION_FILE) {
    expect(summary.total).toEqual({ samples: 3, datesExpected: 2, exactSuggestions: 1, wrongSuggestions: 0, abstentions: 2, invalidResponses: 0, correctNoDate: 1 });
    expect(summary.timing.measuredLatencies).toBe(0);
  }
  // Aggregate metadata only: never print image content, raw readings or provider credentials.
  console.log(JSON.stringify({ mode: dataset.mode, label: dataset.label, recognitionQualityValidated: false, ...summary }));
});
