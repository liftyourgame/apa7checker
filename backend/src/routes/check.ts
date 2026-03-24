/**
 * POST /api/check
 *
 * Accepts a .docx multipart upload and streams the APA7 validation pipeline
 * back to the client as Server-Sent Events (SSE).
 *
 * Event types:
 *   progress  { message: string }          — human-readable step update
 *   result    CheckResponse                — final validated payload
 *   error     { error: string }            — pipeline failure (after SSE headers sent)
 *
 * HTTP errors that occur *before* SSE headers are set (multer failures) are
 * returned as plain JSON with the appropriate status code.
 *
 * Pipeline:
 *   parseDocument → extractCitations + extractBibliography
 *   → validateCitations + validateBibliography (parallel GPT calls, each streaming batch progress)
 *   → crossReference → buildSummary → send result event
 */
import { Router, Request, Response } from 'express';
import multer from 'multer';
import chalk from 'chalk';
import { parseDocument } from '../services/docxParser';
import { extractCitations } from '../services/citationExtractor';
import { extractBibliography } from '../services/bibliographyParser';
import { validateCitations, validateBibliography } from '../services/gptValidator';
import { crossReference } from '../services/crossReferencer';
import type { CheckResponse, Summary } from '../types/schemas';

const router = Router();

const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '50', 10);
const DOCX_MIME =
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// ---------------------------------------------------------------------------
// Multer — memory storage, size limit, .docx filter
// ---------------------------------------------------------------------------

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: MAX_MB * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok =
      file.mimetype === DOCX_MIME ||
      file.originalname.toLowerCase().endsWith('.docx');
    ok ? cb(null, true) : cb(new Error('Only .docx files are accepted.'));
  },
});

/**
 * Promisify the multer single-file middleware so we can use async/await
 * and handle errors (wrong type, too large) in the same try/catch.
 */
function runUpload(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single('file')(req, res, (err) => (err ? reject(err) : resolve()));
  });
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSummary(
  citations: CheckResponse['citations'],
  bibliography: CheckResponse['bibliography'],
  crossRef: CheckResponse['crossReference']
): Summary {
  return {
    totalCitations: citations.length,
    citationErrors: citations.filter((c) => c.severity === 'error').length,
    citationWarnings: citations.filter((c) => c.severity === 'warning').length,
    bibliographyErrors: bibliography.filter((b) => b.severity === 'error').length,
    bibliographyWarnings: bibliography.filter((b) => b.severity === 'warning').length,
    unmatchedCitations: crossRef.citationsWithoutReference.length,
    unmatchedReferences: crossRef.referencesWithoutCitation.length,
  };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

router.post('/check', async (req: Request, res: Response): Promise<void> => {
  console.log(chalk.blue.bold('[check] POST /api/check'));

  // 1. Handle file upload — must happen BEFORE setting SSE headers so that
  //    multer errors can still be returned as regular HTTP error responses.
  try {
    await runUpload(req, res);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('large') || msg.includes('LIMIT_FILE_SIZE')) {
      res.status(413).json({ error: `File too large. Maximum size is ${MAX_MB} MB.` });
    } else {
      res.status(400).json({ error: msg });
    }
    return;
  }

  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded. Please attach a .docx file.' });
    return;
  }

  // 2. Switch response to Server-Sent Events mode.
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  /** Write a single SSE event frame. */
  const send = (event: string, data: unknown): void => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  const progress = (message: string): void => {
    console.log(chalk.cyan(`[check] ${message}`));
    send('progress', { message });
  };

  // 3. Run the validation pipeline, emitting progress at each step.
  try {
    progress('Parsing document…');
    const paragraphs = await parseDocument(req.file.buffer);
    const pageCount = paragraphs.reduce((m, p) => Math.max(m, p.pageNumber ?? 0), 0);
    progress(`Parsed — ${paragraphs.length} paragraphs, ~${pageCount} page(s)`);

    progress('Extracting in-text citations…');
    const citationCandidates = extractCitations(paragraphs);
    progress(`Found ${citationCandidates.length} citation(s)`);

    progress('Locating References section…');
    const referenceEntries = extractBibliography(paragraphs);
    progress(`Found ${referenceEntries.length} reference entry/entries`);

    // Run GPT validation calls in parallel for speed; each call streams its
    // own batch progress back through the shared `progress` callback.
    const [citVal, bibVal] = await Promise.all([
      validateCitations(citationCandidates, progress),
      validateBibliography(referenceEntries, progress),
    ]);

    progress('Cross-referencing citations and bibliography…');
    const crossRef = crossReference(citVal.results, bibVal.results);

    const summary = buildSummary(citVal.results, bibVal.results, crossRef);

    const response: CheckResponse = {
      summary,
      citations: citVal.results,
      bibliography: bibVal.results,
      crossReference: crossRef,
      gptUnavailable: citVal.gptUnavailable || bibVal.gptUnavailable || undefined,
    };

    progress('Complete — sending results');
    console.log(chalk.green.bold('[check] Done — sending result event'));
    send('result', response);
    res.end();
  } catch (err) {
    console.error(chalk.red('[check] Pipeline error:'), err);
    send('error', {
      error: 'Failed to process document.',
      details: err instanceof Error ? err.message : String(err),
    });
    res.end();
  }
});

export default router;
