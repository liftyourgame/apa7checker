/**
 * Cross-references validated in-text citations against validated bibliography entries.
 *
 * Matching strategy:
 *   Normalise both sides to a "surname_year" key (lowercase first author surname + year).
 *   e.g. "(Smith & Jones, 2020, p. 3)"              → "smith_2020"
 *        "Smith, J., & Jones, A. (2020). Title ..."  → "smith_2020"
 *
 * Limitations: same-author same-year works (Smith, 2020a / 2020b) may collide —
 * this is an acceptable approximation for v1.
 */
import chalk from 'chalk';
import type { CitationResult, BibliographyResult, CrossReferenceResult } from '../types/schemas';

/**
 * Extract a normalised "surname_year" key from an in-text citation string.
 * Returns null if the year cannot be found.
 */
function citationKey(text: string): string | null {
  const year = /\b(\d{4})\b/.exec(text)?.[1];
  if (!year) return null;
  // First capital-letter word before the year is taken as the surname
  const surname = /\b([A-Z][a-zA-ZÀ-ÿ'\-]+)/.exec(text)?.[1];
  if (!surname) return null;
  return `${surname.toLowerCase()}_${year}`;
}

/**
 * Extract a normalised "surname_year" key from a bibliography entry string.
 * Year is expected in the form "(2020)" as per APA7.
 */
function bibliographyKey(text: string): string | null {
  const year = /\((\d{4})\)/.exec(text)?.[1];
  if (!year) return null;
  const surname = /^([A-Z][a-zA-ZÀ-ÿ'\-]+)/.exec(text.trim())?.[1];
  if (!surname) return null;
  return `${surname.toLowerCase()}_${year}`;
}

/**
 * Compare citation keys against bibliography keys and return mismatches in both directions.
 */
export function crossReference(
  citations: CitationResult[],
  bibliography: BibliographyResult[]
): CrossReferenceResult {
  console.log(chalk.blue('[crossReferencer] Cross-referencing citations and bibliography...'));

  // Build key → display text maps (last-seen wins for duplicates)
  const citKeys = new Map<string, string>();
  for (const c of citations) {
    const k = citationKey(c.citationText);
    if (k) citKeys.set(k, c.citationText);
  }

  const bibKeys = new Map<string, string>();
  for (const b of bibliography) {
    const k = bibliographyKey(b.entryText);
    if (k) bibKeys.set(k, b.entryText);
  }

  const citationsWithoutReference: string[] = [];
  for (const [k, text] of citKeys) {
    if (!bibKeys.has(k)) citationsWithoutReference.push(text);
  }

  const referencesWithoutCitation: string[] = [];
  for (const [k, text] of bibKeys) {
    if (!citKeys.has(k)) referencesWithoutCitation.push(text);
  }

  console.log(
    chalk.green(
      `[crossReferencer] Done — ${citationsWithoutReference.length} unmatched citation(s), ` +
        `${referencesWithoutCitation.length} unmatched reference(s)`
    )
  );

  return { citationsWithoutReference, referencesWithoutCitation };
}
