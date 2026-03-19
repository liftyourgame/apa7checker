/**
 * Parser unit tests — uses test_artifacts/test.docx as the test fixture.
 *
 * These tests serve two purposes:
 *  1. Correctness assertions (text is clean, citations/entries are found)
 *  2. Diagnostic dumps (console.log output shows the full paragraph list
 *     so you can see exactly what is being extracted from the document)
 *
 * Run:   npm test
 * Watch: npm run test:watch
 */
import fs from 'fs';
import path from 'path';
import { parseDocument, type ParsedParagraph } from '../services/docxParser';
import { extractCitations } from '../services/citationExtractor';
import { extractBibliography } from '../services/bibliographyParser';

// Resolve path relative to this file — works regardless of cwd
const DOC_PATH = path.resolve(__dirname, '../../../test_artifacts/test.docx');

// ---------------------------------------------------------------------------
// Shared setup — parse the document once for all tests in this suite
// ---------------------------------------------------------------------------
let paragraphs: ParsedParagraph[] = [];

beforeAll(async () => {
  if (!fs.existsSync(DOC_PATH)) {
    throw new Error(`Test fixture not found: ${DOC_PATH}`);
  }
  const buffer = fs.readFileSync(DOC_PATH);
  paragraphs = await parseDocument(buffer);
});

// ---------------------------------------------------------------------------
// docxParser tests
// ---------------------------------------------------------------------------
describe('docxParser', () => {
  test('extracts at least 10 paragraphs', () => {
    expect(paragraphs.length).toBeGreaterThan(10);
  });

  test('paragraph texts are readable strings — no raw XML leaked', () => {
    const leakedXml = paragraphs.filter((p) => p.text.includes('<w:'));
    if (leakedXml.length > 0) {
      console.error('Paragraphs containing raw XML:');
      leakedXml.forEach((p) => console.error(' ', JSON.stringify(p.text.slice(0, 120))));
    }
    expect(leakedXml).toHaveLength(0);
  });

  test('all paragraph texts are non-empty strings', () => {
    const empty = paragraphs.filter((p) => p.text.trim() === '');
    // Parser already filters empty strings, so this should always pass
    expect(empty).toHaveLength(0);
  });

  test('DIAGNOSTIC — dump all extracted paragraphs', () => {
    // This "test" always passes but its console output is the key diagnostic.
    // Run `npm test -- --verbose` to see the full list in your terminal.
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`EXTRACTED PARAGRAPHS (${paragraphs.length} total)`);
    console.log('═'.repeat(70));
    paragraphs.forEach((p, i) => {
      const indent = p.hasHangingIndent ? ' [hang]' : '';
      const style  = p.styleId ? ` [${p.styleId}]` : '';
      console.log(`[${String(i).padStart(3)}] pg${p.pageNumber}${indent}${style}`);
      console.log(`       "${p.text.slice(0, 120)}${p.text.length > 120 ? '…' : ''}"`);
    });
    console.log('═'.repeat(70) + '\n');
    expect(paragraphs.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// citationExtractor tests
// ---------------------------------------------------------------------------
describe('citationExtractor', () => {
  test('DIAGNOSTIC — shows all citations found (or why none matched)', () => {
    const citations = extractCitations(paragraphs);

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`CITATIONS FOUND (${citations.length} total)`);
    console.log('═'.repeat(70));
    if (citations.length === 0) {
      // Help diagnose by printing any paragraph that looks like it SHOULD
      // contain a citation (has digits and parentheses)
      console.log('No citations matched the regex. Paragraphs containing "(" and digits:');
      paragraphs
        .filter((p) => p.text.includes('(') && /\d/.test(p.text))
        .forEach((p, i) =>
          console.log(`  [${i}] pg${p.pageNumber}: "${p.text.slice(0, 150)}"`)
        );
    } else {
      citations.forEach((c, i) =>
        console.log(
          `  [${i}] pg${c.pageNumber} hasPageRef=${c.hasPageRef}: "${c.citationText}"`
        )
      );
    }
    console.log('═'.repeat(70) + '\n');

    // Hard assertion — the test document contains real APA7 citations.
    expect(citations.length).toBeGreaterThan(0);
  });

  test('hasPageRef flag is set correctly for citations with page numbers', () => {
    const citations = extractCitations(paragraphs);
    const withPage = citations.filter((c) => /\bp{1,2}\.\s*\d/.test(c.citationText));
    withPage.forEach((c) => {
      expect(c.hasPageRef).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// bibliographyParser tests
// ---------------------------------------------------------------------------
describe('bibliographyParser', () => {
  test('DIAGNOSTIC — shows all bibliography entries found', () => {
    const entries = extractBibliography(paragraphs);

    console.log(`\n${'═'.repeat(70)}`);
    console.log(`BIBLIOGRAPHY ENTRIES (${entries.length} total)`);
    console.log('═'.repeat(70));
    if (entries.length === 0) {
      console.log('No entries matched. Paragraphs after the References heading:');
      const refIdx = paragraphs.findIndex((p) =>
        /^(?:references?|bibliography|works?\s+cited)$/i.test(p.text.trim())
      );
      if (refIdx === -1) {
        console.log('  ⚠  Could not find a References heading in the document.');
        console.log('  Headings present:');
        paragraphs
          .filter((p) => /^heading/i.test(p.styleId))
          .forEach((p) => console.log(`    styleId="${p.styleId}" text="${p.text}"`));
      } else {
        paragraphs.slice(refIdx + 1, refIdx + 20).forEach((p, i) =>
          console.log(
            `  [${i}] indent=${p.hasHangingIndent} style="${p.styleId}" text="${p.text.slice(0, 120)}"`
          )
        );
      }
    } else {
      entries.forEach((e, i) =>
        console.log(`  [${i}] pos=${e.position} hang=${e.hasHangingIndent}: "${e.entryText.slice(0, 100)}"`)
      );
    }
    console.log('═'.repeat(70) + '\n');

    // Hard assertion — the test document has a References section with real entries.
    expect(entries.length).toBeGreaterThan(0);
  });
});
