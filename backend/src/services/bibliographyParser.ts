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
 * Determines if a paragraph is an actual References/Bibliography section heading
 * rather than, e.g., a table column header labelled "Reference".
 *
 * Rules:
 *   - Explicitly plural forms ("References", "Bibliography", "Works Cited") are always
 *     accepted regardless of styleId.
 *   - Singular "Reference" is only accepted when the paragraph carries a heading style,
 *     preventing table cell headers (styleId="") from triggering false section detection.
 */
function isReferencesHeading(para: ParsedParagraph): boolean {
  const text = para.text.trim();
  if (/^(?:references|bibliography|works?\s+cited)$/i.test(text)) return true;
  const hasHeadingStyle = /heading|title|section/i.test(para.styleId);
  return /^reference$/i.test(text) && hasHeadingStyle;
}

/**
 * A heuristic check: does this paragraph text look like a bibliography entry?
 * Entries are at least 20 characters and contain a year in parentheses.
 */
function looksLikeEntry(text: string): boolean {
  // Must be long enough and contain a year in parens like (2020) or (2020a) or n.d.
  return text.length >= 20 && /\(\d{4}[a-z]?\)|n\.d\./.test(text);
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
    if (isReferencesHeading(para)) {
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
    console.warn(chalk.dim('  Tip: the heading must say "References", "Bibliography", or "Works Cited"'));
  }

  if (inSection && entries.length === 0) {
    console.warn(chalk.yellow('[bibliographyParser] Section found but 0 entries matched. Sample paragraphs after heading:'));
    const afterHeading = paragraphs.slice(
      paragraphs.findIndex((p) => isReferencesHeading(p)) + 1
    );
    afterHeading.slice(0, 5).forEach((p, i) =>
      console.warn(chalk.dim(`  [${i}] indent=${p.hasHangingIndent} text="${p.text.slice(0, 120)}"`))
    );
  }

  console.log(chalk.green(`[bibliographyParser] Found ${entries.length} reference entry/entries`));
  return entries;
}
