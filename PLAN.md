# APA7 Reference Checker — Implementation Plan

Check off each task as it is completed. Phases are ordered by dependency — complete each
phase before starting the next.

---

## Phase 1 — Repository Scaffolding

- [ ] Create `backend/` directory with `package.json`, `tsconfig.json`, `.env.example`
- [ ] Install backend dependencies: `express`, `multer`, `mammoth`, `docx`, `openai`, `zod`, `dotenv`, `chalk`, `cors`
- [ ] Install backend dev dependencies: `typescript`, `tsx`, `@types/express`, `@types/multer`, `@types/node`, `@types/cors`, `eslint`, `prettier`
- [ ] Create `frontend/` with Vite + React + TypeScript template (`npm create vite`)
- [ ] Install frontend dependencies: `axios`, `papaparse`, `@types/papaparse`
- [ ] Install and configure Tailwind CSS in frontend
- [ ] Add root-level `.gitignore` covering `node_modules`, `.env`, `dist`

---

## Phase 2 — Backend: Types & Schemas

- [ ] Create `backend/src/types/schemas.ts`
  - [ ] Define `Severity` enum: `"error" | "warning" | "ok"`
  - [ ] Define `CitationCandidate` Zod schema
  - [ ] Define `CitationResult` Zod schema
  - [ ] Define `ReferenceEntry` Zod schema
  - [ ] Define `BibliographyResult` Zod schema
  - [ ] Define `CrossReferenceResult` Zod schema
  - [ ] Define `Summary` Zod schema
  - [ ] Define `CheckResponse` Zod schema
  - [ ] Export all inferred TypeScript types (`z.infer<typeof ...>`)

---

## Phase 3 — Backend: Document Parsing

- [ ] Create `backend/src/services/docxParser.ts`
  - [ ] Accept a `Buffer` and return structured paragraphs with approximate page numbers
  - [ ] Use `mammoth` to extract raw text content
  - [ ] Use `docx` (npm) to walk XML and detect `<w:lastRenderedPageBreak>` / `<w:pageBreak>` for page tracking
  - [ ] Detect hanging indent on paragraphs (for bibliography validation)
  - [ ] Return `ParsedParagraph[]` with `{ text, pageNumber, hasHangingIndent, styleId }`
  - [ ] Chalk log: start, page count found, paragraph count, completion

- [ ] Create `backend/src/services/citationExtractor.ts`
  - [ ] Regex patterns for parenthetical citations: `(Author, Year, p. X)`
  - [ ] Regex patterns for narrative citations: `Author (Year, p. X)`
  - [ ] Regex patterns for `et al.`, `&`, `and`, `as cited in`
  - [ ] Capture surrounding sentence context (±1 sentence) for GPT
  - [ ] Return `CitationCandidate[]`
  - [ ] Chalk log: citation count found

- [ ] Create `backend/src/services/bibliographyParser.ts`
  - [ ] Detect `References` or `Bibliography` heading (case-insensitive) to find the section start
  - [ ] Extract each reference entry as a single string
  - [ ] Preserve `hasHangingIndent` flag from `docxParser` output
  - [ ] Return `ReferenceEntry[]` with position index
  - [ ] Chalk log: reference entry count found

---

## Phase 4 — Backend: GPT Validation

- [ ] Create `backend/src/services/gptValidator.ts`
  - [ ] Initialise OpenAI client from env (`OPENAI_API_KEY`, `OPENAI_MODEL`)
  - [ ] `validateCitations(citations: CitationCandidate[]): Promise<CitationResult[]>`
    - [ ] Batch citations into groups of ≤ 20
    - [ ] System prompt: APA7 expert + strict page/section rule (every citation must have `p.`, `pp.`, `para.`, or `Section`)
    - [ ] User prompt: JSON array of `{ citationText, surroundingContext }`
    - [ ] Enable JSON mode: `response_format: { type: "json_object" }`
    - [ ] Parse and validate response with Zod
    - [ ] On API error: log with chalk, return regex-fallback results with `gptUnavailable: true`
  - [ ] `validateBibliography(entries: ReferenceEntry[]): Promise<BibliographyResult[]>`
    - [ ] Batch entries into groups of ≤ 20
    - [ ] System prompt: APA7 expert covering all 10 bibliography rules
    - [ ] User prompt: JSON array of `{ entryText, hasHangingIndent }`
    - [ ] Enable JSON mode
    - [ ] Parse and validate response with Zod
    - [ ] On API error: log with chalk, return fallback results with `gptUnavailable: true`
  - [ ] Chalk log: each batch sent, tokens used, completion

---

## Phase 5 — Backend: Cross-Referencing

- [ ] Create `backend/src/services/crossReferencer.ts`
  - [ ] Extract author-year key from each `CitationResult` (e.g. `"Smith, 2020"`)
  - [ ] Extract author-year key from each `BibliographyResult`
  - [ ] Find citations with no matching bibliography entry
  - [ ] Find bibliography entries with no matching in-text citation
  - [ ] Return `CrossReferenceResult`
  - [ ] Chalk log: mismatch counts

---

## Phase 6 — Backend: Route & Server

- [ ] Create `backend/src/routes/check.ts`
  - [ ] `POST /api/check` handler
  - [ ] Validate file presence, MIME type (`application/vnd.openxmlformats-officedocument.wordprocessingml.document`), and size (≤ `MAX_UPLOAD_SIZE_MB`)
  - [ ] Call services in order: `parseDocument` → `extractCitations` + `extractBibliography` → `validateCitations` + `validateBibliography` → `crossReference`
  - [ ] Build `Summary` counts from results
  - [ ] Return `CheckResponse` JSON; validate with Zod before sending
  - [ ] Wrap entire handler in try/catch; return structured error JSON on failure

- [ ] Create `backend/src/server.ts`
  - [ ] Initialise Express app
  - [ ] Apply `cors`, `express.json()`, multer memory storage
  - [ ] Mount `/api/check` route
  - [ ] Serve `../frontend/dist` as static files in production
  - [ ] Start listening on `PORT` from env (default `3001`)
  - [ ] Chalk log: server start, port, environment

- [ ] Add `dev` script to `backend/package.json`: `tsx watch src/server.ts`
- [ ] Add `build` script: `tsc` output to `dist/`
- [ ] Add `start` script: `node dist/server.js`

---

## Phase 7 — Frontend: API Layer & Types

- [ ] Copy / import shared types into `frontend/src/types/api.ts` (mirroring backend Zod inferred types)
- [ ] Create `frontend/src/api/checkDocument.ts`
  - [ ] `checkDocument(file: File): Promise<CheckResponse>` using Axios
  - [ ] POST to `/api/check` as `multipart/form-data`
  - [ ] Throw typed error on non-2xx response

---

## Phase 8 — Frontend: Components

- [ ] Create `frontend/src/components/UploadZone.tsx`
  - [ ] Drag-and-drop area + fallback file input
  - [ ] Accept `.docx` only; show error for wrong type or oversized file
  - [ ] Loading spinner while awaiting API response
  - [ ] Display API/network error message

- [ ] Create `frontend/src/components/SummaryBanner.tsx`
  - [ ] Display total citations, citation errors, citation warnings
  - [ ] Display bibliography errors, bibliography warnings
  - [ ] Display unmatched citation/reference counts
  - [ ] Colour-coded cards (red/amber/green) meeting WCAG 2.1 AA

- [ ] Create `frontend/src/components/FilterBar.tsx`
  - [ ] Toggle buttons: `All` / `Errors` / `Warnings`
  - [ ] Emit selected filter to parent via callback prop

- [ ] Create `frontend/src/components/CitationTable.tsx`
  - [ ] Columns: Page | Citation Text | Issue | Severity badge
  - [ ] Accept `citations: CitationResult[]` and `filter: Severity | "all"` props
  - [ ] Severity badge colours: red (error), amber (warning), green (ok)

- [ ] Create `frontend/src/components/BibliographyTable.tsx`
  - [ ] Columns: Reference Entry | Issue | Severity badge
  - [ ] Accept `bibliography: BibliographyResult[]` and `filter` props

- [ ] Create `frontend/src/components/CrossReferencePanel.tsx`
  - [ ] Two lists: "Citations missing from References" and "References never cited"
  - [ ] Hidden when both lists are empty

- [ ] Create `frontend/src/components/DownloadButton.tsx`
  - [ ] Use `papaparse` to serialise citations + bibliography results to CSV
  - [ ] Trigger browser download; filename `apa7-report.csv`

---

## Phase 9 — Frontend: App Assembly

- [ ] Wire all components together in `frontend/src/App.tsx`
  - [ ] State: `checkResponse`, `loading`, `error`, `filter`
  - [ ] Render `UploadZone` always
  - [ ] Render results section only when `checkResponse` is set
  - [ ] Pass `filter` state to `CitationTable` and `BibliographyTable`
  - [ ] Show `gptUnavailable` warning banner if flag is set in response

- [ ] Style global layout: centered container, max-width, readable font, dark header
- [ ] Add page title, subtitle, and brief instructions above the upload zone

---

## Phase 10 — Integration & Local Testing

- [ ] Start backend dev server (`npm run dev` in `backend/`)
- [ ] Start frontend dev server (`npm run dev` in `frontend/`) with Vite proxy to `:3001`
- [ ] Configure `vite.config.ts` proxy: `/api` → `http://localhost:3001`
- [ ] Upload a sample `.docx` with known APA7 errors and verify:
  - [ ] Citations without page numbers flagged as errors
  - [ ] Bibliography entries with formatting issues flagged correctly
  - [ ] Cross-reference mismatches surfaced
  - [ ] CSV export contains correct data
- [ ] Test edge cases: wrong file type, oversized file, empty document, GPT unavailable (mock with bad API key)

---

## Phase 11 — Production Build

- [ ] Run `npm run build` in `frontend/` to generate `dist/`
- [ ] Run `npm run build` in `backend/` to compile TypeScript to `dist/`
- [ ] Verify Express serves frontend static files correctly at root
- [ ] Verify `POST /api/check` still works against the compiled build
- [ ] Document `npm run start` command and required env vars in a `README.md`

---

## Phase 12 — Polish & README

- [ ] Write `README.md` with: prerequisites, setup steps, env var reference, dev and prod run commands
- [ ] Add `.env.example` to `backend/` with placeholder values
- [ ] Final lint pass: `eslint` + `prettier` on both workspaces
- [ ] Commit completed implementation
