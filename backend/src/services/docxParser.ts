/**
 * Parses a .docx buffer into structured paragraphs with approximate page numbers,
 * hanging-indent detection, and paragraph style IDs.
 *
 * A .docx file is a ZIP archive. We unzip it with JSZip, read word/document.xml,
 * and walk the <w:p> elements using regex, tracking explicit page-break markers
 * for page numbering.
 *
 * Note: Page numbers are approximate. Word computes them during rendering but
 * embeds two reliable markers we use:
 *   • <w:br w:type="page"/>        — hard (manual) page break
 *   • <w:lastRenderedPageBreak/>   — soft break Word inserted during last render
 */
import JSZip from 'jszip';
import chalk from 'chalk';

export interface ParsedParagraph {
  text: string;
  pageNumber: number;
  hasHangingIndent: boolean;
  styleId: string;
}

/**
 * Count explicit page-break signals within a paragraph XML chunk.
 * Each signal increments the running page counter.
 */
function countPageBreaks(paraXml: string): number {
  const hard = (paraXml.match(/<w:br\b[^>]*w:type=["']page["'][^/]*/g) ?? []).length;
  const soft = (paraXml.match(/<w:lastRenderedPageBreak\s*\/?>/g) ?? []).length;
  return hard + soft;
}

/**
 * Decode XML character entities back to their Unicode equivalents.
 * This is necessary because Word stores text like "&amp;" in the XML
 * which must be decoded to "&" for regex matching to work correctly.
 */
function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9A-Fa-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

/**
 * Extract the plain text of a paragraph by collecting all <w:t> content.
 * Handles both plain <w:t>text</w:t> and <w:t xml:space="preserve"> forms.
 *
 * IMPORTANT: uses <w:t\b (word boundary) so that <w:tab/>, <w:tbl>, <w:tc>
 * and other elements whose names start with "t" are NOT mistakenly matched.
 * Without the \b, <w:tab/> would be treated as an opening <w:t> tag, causing
 * the regex to slurp up all XML between a tab character and the next real
 * </w:t> close tag — completely scrambling the extracted paragraph text.
 */
function extractText(paraXml: string): string {
  const parts: string[] = [];
  // \b after w:t ensures we only match <w:t> and <w:t ...> but NOT <w:tab/>, <w:tbl>, etc.
  const re = /<w:t\b(?:[^>]*)>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paraXml)) !== null) {
    parts.push(decodeXmlEntities(m[1]));
  }
  return parts.join('');
}

/**
 * Parse word/styles.xml and return a Set of styleIds that define a hanging indent
 * at the style level (i.e. in <w:pPr> inside a <w:style> block).
 *
 * This is necessary because paragraph XML only contains explicit overrides —
 * inherited properties (like the hanging indent defined on the "Bibliography" style)
 * are NOT repeated in every paragraph. Without this, paragraphs that use a
 * Bibliography style appear to have no hanging indent even though they do.
 */
async function stylesWithHangingIndent(zip: JSZip): Promise<Set<string>> {
  const styleIds = new Set<string>();
  const stylesEntry = zip.file('word/styles.xml');
  if (!stylesEntry) return styleIds;

  const xml = await stylesEntry.async('string');

  // Walk every <w:style> block and check if its <w:pPr> defines w:hanging / w:hangingChars
  const styleRe = /<w:style\b[\s\S]*?<\/w:style>/g;
  let match: RegExpExecArray | null;
  while ((match = styleRe.exec(xml)) !== null) {
    const styleXml = match[0];
    const idMatch = /w:styleId=["']([^"']+)["']/.exec(styleXml);
    if (!idMatch) continue;
    if (/<w:ind\b[^>]*w:hanging(?:Chars)?=["']\d/.test(styleXml)) {
      styleIds.add(idMatch[1]);
    }
  }

  return styleIds;
}

/**
 * Parse a .docx Buffer and return structured paragraphs.
 * Paragraphs inside tables are also included.
 */
export async function parseDocument(buffer: Buffer): Promise<ParsedParagraph[]> {
  console.log(chalk.blue('[docxParser] Parsing document...'));

  try {
    const zip = await JSZip.loadAsync(buffer);
    const docEntry = zip.file('word/document.xml');

    if (!docEntry) {
      throw new Error('Invalid .docx: could not locate word/document.xml');
    }

    // Pre-load which styles define a hanging indent so we can use that
    // as a fallback when the paragraph XML has no explicit w:ind/@w:hanging.
    const hangingStyles = await stylesWithHangingIndent(zip);

    const xml = await docEntry.async('string');
    const paragraphs: ParsedParagraph[] = [];
    let currentPage = 1;

    // Walk every <w:p>...</w:p> block in document order.
    // This naturally captures body text AND table cells.
    const paraRe = /<w:p[ >][\s\S]*?<\/w:p>/g;
    let match: RegExpExecArray | null;

    while ((match = paraRe.exec(xml)) !== null) {
      const paraXml = match[0];

      // Advance page counter for any breaks found in this paragraph
      currentPage += countPageBreaks(paraXml);

      // Paragraph style (e.g. "Heading1", "ListParagraph", "Bibliography")
      const styleMatch = /<w:pStyle\b[^>]*w:val=["']([^"']+)["']/.exec(paraXml);
      const styleId = styleMatch?.[1] ?? '';

      // Hanging indent: check the paragraph's own <w:ind> first, then fall back
      // to whether the applied style defines a hanging indent in styles.xml.
      const explicitHang = /<w:ind\b[^>]*w:hanging(?:Chars)?=["']\d/.test(paraXml);
      const hasHangingIndent = explicitHang || hangingStyles.has(styleId);

      const text = extractText(paraXml).trim();
      if (text) {
        paragraphs.push({ text, pageNumber: currentPage, hasHangingIndent, styleId });
      }
    }

    console.log(
      chalk.green(
        `[docxParser] Done — ${paragraphs.length} paragraphs across ~${currentPage} page(s)`
      )
    );
    return paragraphs;
  } catch (error) {
    console.error(chalk.red('[docxParser] Error:'), error);
    throw error;
  }
}
