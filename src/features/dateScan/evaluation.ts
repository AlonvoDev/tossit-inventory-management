import { parseDateReading } from '../../domain/dateEvidence';
import type { ConfirmableDateMeaning, DateReading, DateScanResult } from '../../domain/dateEvidence';
import { parseDateScanResult } from '../../domain/dateScanReview';

export interface ScanEvaluationSample {
  id: string;
  source: DateScanResult['source'];
  writing: 'printed' | 'handwritten';
  expected: { meaning: ConfirmableDateMeaning; reading: DateReading } | null;
  result: unknown;
  latencyMs?: number;
  manualTaskMs?: number;
  scanTaskMs?: number;
}
interface Counts {
  samples: number;
  datesExpected: number;
  exactSuggestions: number;
  wrongSuggestions: number;
  abstentions: number;
  invalidResponses: number;
  correctNoDate: number;
}
const counts = (): Counts => ({ samples: 0, datesExpected: 0, exactSuggestions: 0, wrongSuggestions: 0, abstentions: 0, invalidResponses: 0, correctNoDate: 0 });
function quantile(values: number[], proportion: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * proportion;
  const lower = Math.floor(position), upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

/** Score recorded outputs against human truth. Does not call a provider or read images. */
export function evaluateDateScans(samples: ScanEvaluationSample[]) {
  const total = counts();
  const groups: Record<string, Counts> = {};
  const seen = new Set<string>();
  const latency: number[] = [], manual: number[] = [], scanned: number[] = [], savings: number[] = [];
  for (const sample of samples) {
    if (!sample || typeof sample.id !== 'string' || !sample.id || seen.has(sample.id)
        || !['packaging', 'staff-label'].includes(sample.source) || !['printed', 'handwritten'].includes(sample.writing)) throw new Error('Invalid or duplicate evaluation sample');
    seen.add(sample.id);
    const expected = sample.expected === null ? null : {
      meaning: sample.expected?.meaning,
      reading: parseDateReading(sample.expected?.reading),
    };
    if (expected && !['opened-at', 'manufacturer-expiry', 'label-expiry'].includes(expected.meaning)) throw new Error('Invalid ground-truth meaning');
    for (const value of [sample.latencyMs, sample.manualTaskMs, sample.scanTaskMs]) {
      if (value !== undefined && (typeof value !== 'number' || !Number.isFinite(value) || value < 0)) throw new Error('Invalid evaluation timing');
    }
    if (sample.latencyMs !== undefined) latency.push(sample.latencyMs);
    if (sample.manualTaskMs !== undefined && sample.scanTaskMs !== undefined) {
      manual.push(sample.manualTaskMs); scanned.push(sample.scanTaskMs); savings.push(sample.manualTaskMs - sample.scanTaskMs);
    }
    const key = sample.source + ':' + sample.writing;
    const group = groups[key] ?? (groups[key] = counts());
    const scopes = [total, group];
    for (const scope of scopes) { scope.samples++; if (expected) scope.datesExpected++; }
    let result: DateScanResult;
    try { result = parseDateScanResult(sample.result, sample.source); }
    catch { for (const scope of scopes) scope.invalidResponses++; continue; }
    const suggestion = result.candidates.length === 1 && result.candidates[0].issues.length === 0
      && result.candidates[0].reading !== null && ['opened-at', 'manufacturer-expiry', 'label-expiry'].includes(result.candidates[0].meaning)
      ? result.candidates[0] : null;
    if (!suggestion) {
      for (const scope of scopes) {
        scope.abstentions++;
        if (expected === null && result.outcome === 'unreadable') scope.correctNoDate++;
      }
      continue;
    }
    const matches = expected !== null && expected.meaning === suggestion.meaning
      && JSON.stringify(expected.reading) === JSON.stringify(suggestion.reading);
    for (const scope of scopes) if (matches) scope.exactSuggestions++; else scope.wrongSuggestions++;
  }
  return {
    total, groups,
    timing: {
      measuredLatencies: latency.length, medianLatencyMs: quantile(latency, 0.5), p95LatencyMs: quantile(latency, 0.95),
      pairedTaskMeasurements: savings.length, medianManualTaskMs: quantile(manual, 0.5), medianScanTaskMs: quantile(scanned, 0.5), medianSavedMs: quantile(savings, 0.5),
    },
  };
}
