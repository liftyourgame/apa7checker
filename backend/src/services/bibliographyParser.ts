/**
 * Extracts individual reference entries from the References / Bibliography section
 * of a parsed document.
 *
 * Detection strategy:
 *   1. Find the first paragraph whose text matches the References heading pattern.
 *   2. Collect subsequent paragraphs that look like reference entries (≥20 chars,
 *      contain a year in parentheses).
 *   3. Stop if another major heading is encountered.
 */
import chalk from 'chalk';
import type { ParsedParagraph } from './docxParser';
import type { ReferenceEntry } from '../types/schemas';

/** Matches common References section headings (case-insensitive). */
const HEADING_RE = /^(?:references?|bibliography|works?\s+cited)$/i;

/**
 * A heuristic check: does this paragraph text look like a bibliography entry?
 * Entries are at least 20 characters and contain a year in parentheses.
 */
function looksLikeEntry(text: string): boolean {
  return text.length >= 20 && /\(\d{4}\b|n\.d\./.test(text);
}

/**
 * Extract all reference entries from the document paragraphs.
 * Returns entries in document order with position index and hanging-indent flag.
 */
export function extractBibliography(paragraphs: ParsedParagraph[]): ReferenceEntry[] {
  console.log(chalk.blue('[bibliographyParser] Locating References section...'));

  let inSection = false;
  const entries: ReferenceEntry[] = [];
  let position = 0;

  for (const para of paragraphs) {
    const trimmed = para.text.trim();
    const isHeading =
      /^heading/i.test(para.styleId) || /^(title|subtitle)$/i.test(para.styleId);

    // Detect start of References section
    if (HEADING_RE.test(trimmed)) {
      inSection = true;
      console.log(chalk.cyan(`[bibliographyParser] References heading found: "${trimmed}"`));
      continue;
    }

    // Stop on the next heading after the section starts
    if (inSection && isHeading) break;

    if (inSection && looksLikeEntry(trimmed)) {
      entries.push({
        entryText: trimmed,
        hasHangingIndent: para.hasHangingIndent,
        position: position++,
      });
    }
  }

  if (!inSection) {
    console.warn(chalk.yellow('[bibliographyParser] No References section heading found'));
  }

  console.log(chalk.green(`[bibliographyParser] Found ${entries.length} reference entry/entries`));
  return entries;
}
