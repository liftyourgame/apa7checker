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
 * Extract the plain text of a paragraph by collecting all <w:t> content.
 * Handles both plain <w:t>text</w:t> and <w:t xml:space="preserve"> forms.
 */
function extractText(paraXml: string): string {
  const parts: string[] = [];
  const re = /<w:t(?:[^>]*)>([\s\S]*?)<\/w:t>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(paraXml)) !== null) {
    parts.push(m[1]);
  }
  return parts.join('');
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

      // Paragraph style (e.g. "Heading1", "ListParagraph", "Normal")
      const styleMatch = /<w:pStyle\b[^>]*w:val=["']([^"']+)["']/.exec(paraXml);
      const styleId = styleMatch?.[1] ?? '';

      // Hanging indent — presence of w:hanging or w:hangingChars attribute on w:ind
      const hasHangingIndent = /<w:ind\b[^>]*w:hanging(?:Chars)?=["']\d/.test(paraXml);

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
