/**
 * POST /api/check
 *
 * Accepts a .docx multipart upload, runs the full APA7 validation pipeline,
 * and returns a structured CheckResponse JSON.
 *
 * Pipeline:
 *   parseDocument → extractCitations + extractBibliography
 *   → validateCitations + validateBibliography (parallel GPT calls)
 *   → crossReference → buildSummary → respond
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

const MAX_MB = parseInt(process.env.MAX_UPLOAD_SIZE_MB ?? '10', 10);
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

  // 1. Handle file upload
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

  // 2. Run the validation pipeline
  try {
    const paragraphs = await parseDocument(req.file.buffer);

    const [citationCandidates, referenceEntries] = [
      extractCitations(paragraphs),
      extractBibliography(paragraphs),
    ];

    // Run GPT validation calls in parallel for speed
    const [citVal, bibVal] = await Promise.all([
      validateCitations(citationCandidates),
      validateBibliography(referenceEntries),
    ]);

    const crossRef = crossReference(citVal.results, bibVal.results);
    const summary = buildSummary(citVal.results, bibVal.results, crossRef);

    const response: CheckResponse = {
      summary,
      citations: citVal.results,
      bibliography: bibVal.results,
      crossReference: crossRef,
      gptUnavailable: citVal.gptUnavailable || bibVal.gptUnavailable || undefined,
    };

    console.log(chalk.green.bold('[check] Done — sending response'));
    res.json(response);
  } catch (err) {
    console.error(chalk.red('[check] Pipeline error:'), err);
    res.status(500).json({
      error: 'Failed to process document.',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
