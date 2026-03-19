/**
 * Validates in-text citations and bibliography entries using the OpenAI GPT API.
 *
 * Rules:
 *  • All OpenAI calls are centralised here — no other service imports openai directly.
 *  • JSON mode is used for all calls for reliable structured output.
 *  • Results are validated with Zod before being returned.
 *  • On any API error or schema mismatch, the service falls back to regex-derived
 *    results and sets gptUnavailable: true so the UI can display a warning banner.
 *  • Citations are sent in batches of ≤ BATCH_SIZE to stay within context limits.
 */
import OpenAI from 'openai';
import chalk from 'chalk';
import {
  GptCitationBatchResponseSchema,
  GptBibliographyBatchResponseSchema,
  type CitationCandidate,
  type CitationResult,
  type ReferenceEntry,
  type BibliographyResult,
} from '../types/schemas';

const BATCH_SIZE = 20;

// Lazy-initialised client so the module can be imported without a valid key
let client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

// ---------------------------------------------------------------------------
// System prompts
// ---------------------------------------------------------------------------

const CITATION_SYSTEM_PROMPT = `\
You are an expert APA7 citation checker for academic writing.

STRICT PROJECT POLICY (overrides standard APA7 defaults):
Every in-text citation — whether a direct quote, paraphrase, or summary — MUST include
either a page number (p. X or pp. X–Y) or a section/paragraph reference (para. X or
Section X). Citations that contain only (Author, Year) are ERRORS, not warnings.

For each citation in the input JSON array, evaluate:
1. Missing page or section reference → severity "error"
2. Incorrect author format (& vs "and" inside/outside parens, et al. rules) → severity "error"
3. Invalid year format (must be 4-digit year or n.d.) → severity "error"
4. Punctuation errors (missing comma between author/year, etc.) → severity "warning"
5. Capitalisation issues → severity "warning"
6. Citation is correctly formatted with a valid page/section reference → severity "ok", issue "Valid"

Return ONLY a JSON object with this exact structure (one entry per input citation, same order):
{
  "results": [
    { "citationText": "...", "issue": "...", "severity": "error"|"warning"|"ok" }
  ]
}`;

const BIBLIOGRAPHY_SYSTEM_PROMPT = `\
You are an expert APA7 bibliography (References list) checker.

For each reference entry in the input JSON array, check against APA7 rules:
1. Author format must be Surname, I. I. → severity "error" if wrong
2. Year in parentheses followed by period: (2020). → severity "error" if wrong
3. Article/book title must use sentence case (only first word + proper nouns capitalised) → severity "warning" if wrong
4. Journal name must use title case → severity "warning" if wrong
5. DOI should use https://doi.org/... format → severity "warning" if incorrect
6. No full stop after a URL or DOI → severity "warning" if present
7. hasHangingIndent=false means no hanging indent detected → severity "error"
8. Journal articles need: author, year, title, journal, volume, pages, DOI → severity "error" if major fields missing
9. Books need: author, year, title, publisher → severity "error" if missing
10. Entry is fully correct → severity "ok", issue "Valid"

Return ONLY a JSON object with this exact structure (one entry per input reference, same order):
{
  "results": [
    { "entryText": "...", "issue": "...", "severity": "error"|"warning"|"ok" }
  ]
}`;

// ---------------------------------------------------------------------------
// Fallback helpers (used when GPT is unavailable)
// ---------------------------------------------------------------------------

function fallbackCitation(c: CitationCandidate): CitationResult {
  if (!c.hasPageRef) {
    return {
      pageNumber: c.pageNumber,
      citationText: c.citationText,
      issue:
        'Missing page or section reference. All citations must include p. X, pp. X–Y, para. X, or Section X.',
      severity: 'error',
    };
  }
  return {
    pageNumber: c.pageNumber,
    citationText: c.citationText,
    issue: 'GPT unavailable — basic format appears acceptable but full validation skipped.',
    severity: 'warning',
  };
}

function fallbackBibliography(e: ReferenceEntry): BibliographyResult {
  if (!e.hasHangingIndent) {
    return {
      entryText: e.entryText,
      issue: 'Missing hanging indent. GPT validation also unavailable.',
      severity: 'error',
    };
  }
  return {
    entryText: e.entryText,
    issue: 'GPT unavailable — entry format could not be fully validated.',
    severity: 'warning',
  };
}

// ---------------------------------------------------------------------------
// Public functions
// ---------------------------------------------------------------------------

/**
 * Validate a list of in-text citation candidates via GPT.
 * Returns CitationResult[] and a flag indicating whether GPT was unavailable.
 */
export async function validateCitations(
  citations: CitationCandidate[]
): Promise<{ results: CitationResult[]; gptUnavailable: boolean }> {
  if (citations.length === 0) return { results: [], gptUnavailable: false };

  console.log(chalk.blue(`[gptValidator] Validating ${citations.length} citation(s)...`));

  const allResults: CitationResult[] = [];
  let gptUnavailable = false;

  const batches: CitationCandidate[][] = [];
  for (let i = 0; i < citations.length; i += BATCH_SIZE) {
    batches.push(citations.slice(i, i + BATCH_SIZE));
  }

  for (let idx = 0; idx < batches.length; idx++) {
    const batch = batches[idx];
    console.log(chalk.cyan(`[gptValidator] Citation batch ${idx + 1}/${batches.length}`));

    try {
      const payload = batch.map((c) => ({
        citationText: c.citationText,
        surroundingContext: c.surroundingContext,
      }));

      const completion = await getClient().chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: CITATION_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Validate these APA7 in-text citations:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = GptCitationBatchResponseSchema.safeParse(JSON.parse(raw));

      if (!parsed.success) {
        console.warn(chalk.yellow('[gptValidator] Unexpected citation response shape — using fallback'));
        allResults.push(...batch.map(fallbackCitation));
        gptUnavailable = true;
        continue;
      }

      // Merge GPT issue/severity with page numbers from our candidates
      for (let i = 0; i < batch.length; i++) {
        const gpt = parsed.data.results[i];
        allResults.push(
          gpt
            ? { pageNumber: batch[i].pageNumber, citationText: gpt.citationText, issue: gpt.issue, severity: gpt.severity }
            : fallbackCitation(batch[i])
        );
      }

      console.log(chalk.green(`[gptValidator] Citation batch ${idx + 1} complete`));
    } catch (err) {
      console.error(chalk.red(`[gptValidator] Citation batch ${idx + 1} failed:`), err);
      allResults.push(...batch.map(fallbackCitation));
      gptUnavailable = true;
    }
  }

  return { results: allResults, gptUnavailable };
}

/**
 * Validate a list of bibliography entries via GPT.
 * Returns BibliographyResult[] and a flag indicating whether GPT was unavailable.
 */
export async function validateBibliography(
  entries: ReferenceEntry[]
): Promise<{ results: BibliographyResult[]; gptUnavailable: boolean }> {
  if (entries.length === 0) return { results: [], gptUnavailable: false };

  console.log(chalk.blue(`[gptValidator] Validating ${entries.length} bibliography entry/entries...`));

  const allResults: BibliographyResult[] = [];
  let gptUnavailable = false;

  const batches: ReferenceEntry[][] = [];
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    batches.push(entries.slice(i, i + BATCH_SIZE));
  }

  for (let idx = 0; idx < batches.length; idx++) {
    const batch = batches[idx];
    console.log(chalk.cyan(`[gptValidator] Bibliography batch ${idx + 1}/${batches.length}`));

    try {
      const payload = batch.map((e) => ({
        entryText: e.entryText,
        hasHangingIndent: e.hasHangingIndent,
        position: e.position,
      }));

      const completion = await getClient().chat.completions.create({
        model: process.env.OPENAI_MODEL ?? 'gpt-4o',
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: BIBLIOGRAPHY_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Validate these APA7 bibliography entries:\n${JSON.stringify(payload, null, 2)}`,
          },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '{}';
      const parsed = GptBibliographyBatchResponseSchema.safeParse(JSON.parse(raw));

      if (!parsed.success) {
        console.warn(chalk.yellow('[gptValidator] Unexpected bibliography response shape — using fallback'));
        allResults.push(...batch.map(fallbackBibliography));
        gptUnavailable = true;
        continue;
      }

      for (let i = 0; i < batch.length; i++) {
        const gpt = parsed.data.results[i];
        allResults.push(
          gpt
            ? { entryText: gpt.entryText, issue: gpt.issue, severity: gpt.severity }
            : fallbackBibliography(batch[i])
        );
      }

      console.log(chalk.green(`[gptValidator] Bibliography batch ${idx + 1} complete`));
    } catch (err) {
      console.error(chalk.red(`[gptValidator] Bibliography batch ${idx + 1} failed:`), err);
      allResults.push(...batch.map(fallbackBibliography));
      gptUnavailable = true;
    }
  }

  return { results: allResults, gptUnavailable };
}
