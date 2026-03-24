/**
 * Zod schemas and inferred TypeScript types for the APA7 checker API.
 * Single source of truth for all data shapes used across backend services.
 */
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Primitives
// ---------------------------------------------------------------------------

export const SeveritySchema = z.enum(['error', 'warning', 'ok']);
export type Severity = z.infer<typeof SeveritySchema>;

// ---------------------------------------------------------------------------
// Pipeline internals (parser → validator)
// ---------------------------------------------------------------------------

/** An in-text citation candidate extracted from the document body. */
export const CitationCandidateSchema = z.object({
  pageNumber: z.number().int().positive(),
  citationText: z.string(),
  surroundingContext: z.string(),
  hasPageRef: z.boolean(),
});
export type CitationCandidate = z.infer<typeof CitationCandidateSchema>;

/** A single entry from the References / Bibliography section. */
export const ReferenceEntrySchema = z.object({
  entryText: z.string(),
  hasHangingIndent: z.boolean(),
  position: z.number().int().nonnegative(),
});
export type ReferenceEntry = z.infer<typeof ReferenceEntrySchema>;

// ---------------------------------------------------------------------------
// API response types
// ---------------------------------------------------------------------------

/** Validated result for a single in-text citation. */
export const CitationResultSchema = z.object({
  pageNumber: z.number().int().positive(),
  citationText: z.string(),
  /** The paragraph text surrounding the citation — shown in the UI to help
   *  the user locate the citation in their document. */
  surroundingContext: z.string().optional(),
  issue: z.string(),
  severity: SeveritySchema,
});
export type CitationResult = z.infer<typeof CitationResultSchema>;

/** Validated result for a single bibliography entry. */
export const BibliographyResultSchema = z.object({
  entryText: z.string(),
  issue: z.string(),
  severity: SeveritySchema,
  /** GPT-generated corrected version of the entry (omitted when severity is "ok"). */
  suggestedFix: z.string().nullish().transform((v) => v ?? undefined),
});
export type BibliographyResult = z.infer<typeof BibliographyResultSchema>;

/** Cross-reference mismatches between citations and bibliography. */
export const CrossReferenceResultSchema = z.object({
  citationsWithoutReference: z.array(z.string()),
  referencesWithoutCitation: z.array(z.string()),
});
export type CrossReferenceResult = z.infer<typeof CrossReferenceResultSchema>;

/** Aggregate counts shown in the summary banner. */
export const SummarySchema = z.object({
  totalCitations: z.number().int().nonnegative(),
  citationErrors: z.number().int().nonnegative(),
  citationWarnings: z.number().int().nonnegative(),
  bibliographyErrors: z.number().int().nonnegative(),
  bibliographyWarnings: z.number().int().nonnegative(),
  unmatchedCitations: z.number().int().nonnegative(),
  unmatchedReferences: z.number().int().nonnegative(),
});
export type Summary = z.infer<typeof SummarySchema>;

/** Full response returned by POST /api/check. */
export const CheckResponseSchema = z.object({
  summary: SummarySchema,
  citations: z.array(CitationResultSchema),
  bibliography: z.array(BibliographyResultSchema),
  crossReference: CrossReferenceResultSchema,
  /** Set to true when GPT was unavailable and regex-only fallback was used. */
  gptUnavailable: z.boolean().optional(),
});
export type CheckResponse = z.infer<typeof CheckResponseSchema>;

// ---------------------------------------------------------------------------
// GPT batch response shapes (used only inside gptValidator.ts)
// ---------------------------------------------------------------------------

export const GptCitationBatchResponseSchema = z.object({
  results: z.array(
    z.object({
      citationText: z.string(),
      issue: z.string(),
      severity: SeveritySchema,
    })
  ),
});
export type GptCitationBatchResponse = z.infer<typeof GptCitationBatchResponseSchema>;

export const GptBibliographyBatchResponseSchema = z.object({
  results: z.array(
    z.object({
      entryText: z.string(),
      issue: z.string(),
      severity: SeveritySchema,
      /** Corrected entry text — GPT may return null or omit it entirely when valid. */
      suggestedFix: z.string().nullish().transform((v) => v ?? undefined),
    })
  ),
});
export type GptBibliographyBatchResponse = z.infer<typeof GptBibliographyBatchResponseSchema>;
