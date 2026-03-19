/**
 * Extracts APA7 in-text citations from parsed document paragraphs.
 *
 * Handles:
 *   Parenthetical  — (Smith, 2020, p. 45), (Smith & Jones, 2020, pp. 3–5)
 *   Narrative      — Smith (2020, p. 45), Smith and Jones (2020, p. 45)
 *   et al.         — (Smith et al., 2020, p. 12)
 *   No date        — (Smith, n.d., p. 3)
 *   Secondary      — (Smith, 2020, as cited in Jones, 2021, p. 5)
 *
 * PROJECT POLICY: every citation must include a page or section reference.
 * The hasPageRef flag lets the GPT validator and fallback logic apply this rule.
 */
import chalk from 'chalk';
import type { ParsedParagraph } from './docxParser';
import type { CitationCandidate } from '../types/schemas';

/**
 * Broad parenthetical pattern: opening paren, at least one capital letter
 * (author name start), a 4-digit year or n.d., then closing paren.
 * Intentionally permissive — GPT validates correctness; regex just finds candidates.
 */
const PARENTHETICAL_RE = /\(\s*[A-Z""][^()]{1,150}(?:\d{4}|n\.d\.)[^()]{0,100}\)/g;

/**
 * Narrative citation pattern: Capitalised surname (optionally "and Surname"
 * or "et al.") followed by a parenthetical year block.
 */
const NARRATIVE_RE =
  /\b[A-Z][a-zA-ZÀ-ÿ'\-]+(?:\s+(?:and|&)\s+[A-Z][a-zA-ZÀ-ÿ'\-]+)?(?:\s+et\s+al\.)?(?:,?\s+[A-Z][a-zA-ZÀ-ÿ'\-]+)?\s+\(\d{4}[^)]{0,100}\)/g;

/**
 * Returns true if the citation string contains a valid APA7 page or section locator:
 *   p. X | pp. X–Y | para. X | Section X
 */
function hasPageReference(text: string): boolean {
  return /\b(?:pp?\.\s*\d|para\.\s*\d|Section\s+\S)/i.test(text);
}

/**
 * Return up to 400 characters of paragraph text as surrounding context for GPT.
 */
function surroundingContext(paragraphText: string): string {
  return paragraphText.length > 400 ? paragraphText.slice(0, 397) + '...' : paragraphText;
}

/**
 * Find all in-text citation candidates in the document paragraphs.
 * Skips the References / Bibliography section (paragraphs that are reference entries
 * themselves start with "Author, I." pattern followed by a year in parens).
 */
export function extractCitations(paragraphs: ParsedParagraph[]): CitationCandidate[] {
  console.log(chalk.blue('[citationExtractor] Extracting citations...'));

  const candidates: CitationCandidate[] = [];
  let inReferencesSection = false;

  for (const para of paragraphs) {
    // Stop processing once we hit the References heading
    if (/^(?:references?|bibliography|works?\s+cited)$/i.test(para.text.trim())) {
      inReferencesSection = true;
      continue;
    }
    if (inReferencesSection) continue;

    const seen = new Set<string>();

    // Parenthetical citations
    for (const m of para.text.matchAll(PARENTHETICAL_RE)) {
      const raw = m[0].trim();
      if (!seen.has(raw)) {
        seen.add(raw);
        candidates.push({
          pageNumber: para.pageNumber,
          citationText: raw,
          surroundingContext: surroundingContext(para.text),
          hasPageRef: hasPageReference(raw),
        });
      }
    }

    // Narrative citations (only add if not already captured by parenthetical)
    for (const m of para.text.matchAll(NARRATIVE_RE)) {
      const raw = m[0].trim();
      if (!seen.has(raw)) {
        seen.add(raw);
        candidates.push({
          pageNumber: para.pageNumber,
          citationText: raw,
          surroundingContext: surroundingContext(para.text),
          hasPageRef: hasPageReference(raw),
        });
      }
    }
  }

  console.log(chalk.green(`[citationExtractor] Found ${candidates.length} citation(s)`));
  return candidates;
}
