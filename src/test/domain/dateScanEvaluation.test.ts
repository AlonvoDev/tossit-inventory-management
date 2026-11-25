import { describe, expect, it } from 'vitest';
import { evaluateDateScans } from '../../features/dateScan/evaluation';
import type { ScanEvaluationSample } from '../../features/dateScan/evaluation';

const reading = { precision: 'day' as const, date: { year: 2026, month: 11, day: 28 } };
const valid = () => ({ version: 1, source: 'packaging', outcome: 'candidates', candidates: [{ id: 'one', rawText: '28.11.2026', meaning: 'manufacturer-expiry', reading, issues: [] as string[] }] });
const sample = (id: string): ScanEvaluationSample => ({ id, source: 'packaging', writing: 'printed', expected: { meaning: 'manufacturer-expiry', reading }, result: valid() });

describe('recorded extraction evaluation', () => {
  it('counts wrong suggestions separately from abstentions and invalid responses', () => {
    const wrong = valid(); wrong.candidates[0].meaning = 'opened-at';
    const summary = evaluateDateScans([
      sample('correct'),
      { ...sample('wrong'), result: wrong },
      { ...sample('abstain'), result: { version: 1, source: 'packaging', outcome: 'unreadable', candidates: [] } },
      { ...sample('invalid'), result: { confirmed: true } },
    ]);
    expect(summary.total).toEqual({ samples: 4, datesExpected: 4, exactSuggestions: 1, wrongSuggestions: 1, abstentions: 1, invalidResponses: 1, correctNoDate: 0 });
    expect(summary.timing.medianLatencyMs).toBeNull();
  });

  it('does not credit multiple candidates or an unresolved match as an exact suggestion', () => {
    const multiple = valid(); multiple.candidates.push({ ...multiple.candidates[0], id: 'two' });
    const unresolved = valid(); unresolved.candidates[0].issues = ['ambiguous'];
    expect(evaluateDateScans([{ ...sample('multiple'), result: multiple }, { ...sample('unresolved'), result: unresolved }]).total).toMatchObject({ exactSuggestions: 0, abstentions: 2 });
  });

  it('separates handwriting from print and does not claim unreadable handwriting was recognized', () => {
    const summary = evaluateDateScans([sample('print'), {
      ...sample('hand'), source: 'staff-label', writing: 'handwritten',
      result: { version: 1, source: 'staff-label', outcome: 'unreadable', candidates: [] },
    }]);
    expect(summary.groups['packaging:printed'].exactSuggestions).toBe(1);
    expect(summary.groups['staff-label:handwritten']).toMatchObject({ exactSuggestions: 0, abstentions: 1 });
  });

  it('counts a spurious date on a no-date photo as wrong, not a correct detection', () => {
    const summary = evaluateDateScans([
      { ...sample('no-date'), expected: null },
      { ...sample('correct-no-date'), expected: null, result: { version: 1, source: 'packaging', outcome: 'unreadable', candidates: [] } },
    ]);
    expect(summary.total).toMatchObject({ datesExpected: 0, wrongSuggestions: 1, correctNoDate: 1 });
  });

  it('computes paired end-to-end savings, including a slower scan, without inventing missing timings', () => {
    const summary = evaluateDateScans([
      { ...sample('fast'), latencyMs: 100, manualTaskMs: 1000, scanTaskMs: 500 },
      { ...sample('slow'), latencyMs: 300, manualTaskMs: 1000, scanTaskMs: 1600 },
      { ...sample('unpaired'), manualTaskMs: 5 },
    ]);
    expect(summary.timing).toMatchObject({ medianLatencyMs: 200, p95LatencyMs: 290, pairedTaskMeasurements: 2, medianSavedMs: -50 });
  });

  it('rejects bad human truth, duplicate samples and impossible timings instead of silently excluding them', () => {
    expect(() => evaluateDateScans([sample('same'), sample('same')])).toThrow();
    expect(() => evaluateDateScans([{ ...sample('bad'), latencyMs: NaN }])).toThrow();
    expect(() => evaluateDateScans([{ ...sample('bad'), scanTaskMs: -1 }])).toThrow();
    expect(() => evaluateDateScans([{ ...sample('bad'), expected: { meaning: 'manufacturer-expiry', reading: { precision: 'day', date: { year: 2026, month: 2, day: 30 } } } }])).toThrow();
  });
});
