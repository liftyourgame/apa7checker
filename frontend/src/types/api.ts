/**
 * TypeScript types mirroring the backend Zod schemas.
 * These are the shapes returned by POST /api/check.
 */

export type Severity = 'error' | 'warning' | 'ok';

export interface CitationResult {
  pageNumber: number;
  citationText: string;
  issue: string;
  severity: Severity;
}

export interface BibliographyResult {
  entryText: string;
  issue: string;
  severity: Severity;
}

export interface CrossReferenceResult {
  citationsWithoutReference: string[];
  referencesWithoutCitation: string[];
}

export interface Summary {
  totalCitations: number;
  citationErrors: number;
  citationWarnings: number;
  bibliographyErrors: number;
  bibliographyWarnings: number;
  unmatchedCitations: number;
  unmatchedReferences: number;
}

export interface CheckResponse {
  summary: Summary;
  citations: CitationResult[];
  bibliography: BibliographyResult[];
  crossReference: CrossReferenceResult;
  /** Present and true when GPT was unavailable and regex fallback was used. */
  gptUnavailable?: boolean;
}

export interface ApiErrorResponse {
  error: string;
  details?: string;
}
