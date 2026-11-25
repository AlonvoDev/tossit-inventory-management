import { parseDateReading } from './dateEvidence';
import type { ConfirmableDateMeaning, ConfirmedDateEvidence, DateReviewIssue, DateScanCandidate, DateScanResult, DetectedDateMeaning } from './dateEvidence';

export type ScanSource = DateScanResult['source'];
export type DateScanErrorCode = 'invalid-scan-result' | 'confirmation-required' | 'candidate-not-found' | 'opening-time-required';
export class DateScanError extends Error {
  constructor(public readonly code: DateScanErrorCode, message: string) {
    super(message);
    this.name = 'DateScanError';
  }
}
const meanings: readonly DetectedDateMeaning[] = ['opened-at', 'manufacturer-expiry', 'label-expiry', 'manufactured-at', 'unknown'];
const issues: readonly DateReviewIssue[] = ['missing-year', 'missing-time', 'ambiguous', 'unreadable'];
function invalid(message: string): never { throw new DateScanError('invalid-scan-result', message); }
function record(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return invalid('Expected a scan object');
  const result = value as Record<string, unknown>;
  const actual = Object.keys(result);
  if (actual.length !== keys.length || actual.some(key => !keys.includes(key))) return invalid('Unexpected scan fields');
  return result;
}
function reading(value: unknown) {
  try { return parseDateReading(value); }
  catch { return invalid('Invalid scan date components'); }
}
function candidate(value: unknown): DateScanCandidate {
  const data = record(value, ['id', 'rawText', 'meaning', 'reading', 'issues']);
  if (typeof data.id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(data.id)) return invalid('Invalid candidate ID');
  if (typeof data.rawText !== 'string' || !data.rawText.trim() || data.rawText.length > 512) return invalid('Invalid candidate text');
  if (typeof data.meaning !== 'string' || !meanings.includes(data.meaning as DetectedDateMeaning)) return invalid('Invalid candidate meaning');
  if (!Array.isArray(data.issues) || data.issues.length > issues.length
      || data.issues.some(value => !issues.includes(value)) || new Set(data.issues).size !== data.issues.length) return invalid('Invalid candidate issues');
  const parsedReading = data.reading === null ? null : reading(data.reading);
  if (parsedReading === null && data.issues.length === 0) return invalid('Missing reading requires an explicit issue');
  if (parsedReading !== null && (data.issues.includes('missing-year') || data.issues.includes('unreadable'))) return invalid('Reading conflicts with unresolved evidence');
  if (parsedReading?.precision === 'minute' && data.issues.includes('missing-time')) return invalid('Written time conflicts with missing time');
  return {
    id: data.id, rawText: data.rawText, meaning: data.meaning as DetectedDateMeaning,
    reading: parsedReading, issues: [...data.issues] as DateReviewIssue[],
  };
}

/** Validate extracted JSON against the source chosen by the caller; never infer confirmation. */
export function parseDateScanResult(value: unknown, expectedSource: ScanSource): DateScanResult {
  if (!['packaging', 'staff-label'].includes(expectedSource)) return invalid('Invalid requested scan source');
  const data = record(value, ['version', 'source', 'outcome', 'candidates']);
  if (data.version !== 1 || data.source !== expectedSource || typeof data.outcome !== 'string' || !['candidates', 'unreadable'].includes(data.outcome)) return invalid('Invalid scan version, source or outcome');
  if (!Array.isArray(data.candidates) || data.candidates.length > 8) return invalid('Invalid candidate count');
  if ((data.outcome === 'unreadable') !== (data.candidates.length === 0)) return invalid('Scan outcome conflicts with candidate count');
  const candidates = data.candidates.map(candidate);
  if (new Set(candidates.map(item => item.id)).size !== candidates.length) return invalid('Duplicate candidate ID');
  return { version: 1, source: expectedSource, outcome: data.outcome as DateScanResult['outcome'], candidates };
}

/** Only call on an explicit review action, with the user's possibly corrected fields. */
export function confirmDateCandidate(rawResult: unknown, expectedSource: ScanSource, candidateId: string, decision: unknown): ConfirmedDateEvidence {
  const result = parseDateScanResult(rawResult, expectedSource);
  if (!result.candidates.some(item => item.id === candidateId)) throw new DateScanError('candidate-not-found', 'Select a current scan candidate');
  const reviewed = record(decision, ['confirmed', 'meaning', 'reading']);
  if (reviewed.confirmed !== true) throw new DateScanError('confirmation-required', 'Explicit user confirmation is required');
  if (typeof reviewed.meaning !== 'string' || !['opened-at', 'manufacturer-expiry', 'label-expiry'].includes(reviewed.meaning)) return invalid('Select an opening or expiry meaning');
  const accepted = reading(reviewed.reading);
  if (reviewed.meaning === 'opened-at' && accepted.precision !== 'minute') throw new DateScanError('opening-time-required', 'Supply the written or manually selected opening time');
  return { source: result.source, meaning: reviewed.meaning as ConfirmableDateMeaning, reading: accepted, confirmed: true };
}
