# APA7 Reference Checker — Implementation Plan

Check off each task as it is completed. Phases are ordered by dependency — complete each
phase before starting the next.

---

## Phase 1 — Repository Scaffolding

- [x] Create `backend/` directory with `package.json`, `tsconfig.json`, `.env.example`
- [x] Install backend dependencies: `express`, `multer`, `mammoth`, `docx`, `openai`, `zod`, `dotenv`, `chalk`, `cors`
- [x] Install backend dev dependencies: `typescript`, `tsx`, `@types/express`, `@types/multer`, `@types/node`, `@types/cors`, `eslint`, `prettier`
- [x] Create `frontend/` with Vite + React + TypeScript template (`npm create vite`)
- [x] Install frontend dependencies: `axios`, `papaparse`, `@types/papaparse`
- [x] Install and configure Tailwind CSS in frontend
- [x] Add root-level `.gitignore` covering `node_modules`, `.env`, `dist`

---

## Phase 2 — Backend: Types & Schemas

- [x] Create `backend/src/types/schemas.ts`
  - [x] Define `Severity` enum: `"error" | "warning" | "ok"`
  - [x] Define `CitationCandidate` Zod schema
  - [x] Define `CitationResult` Zod schema
  - [x] Define `ReferenceEntry` Zod schema
  - [x] Define `BibliographyResult` Zod schema
  - [x] Define `CrossReferenceResult` Zod schema
  - [x] Define `Summary` Zod schema
  - [x] Define `CheckResponse` Zod schema
  - [x] Export all inferred TypeScript types (`z.infer<typeof ...>`)

---

## Phase 3 — Backend: Document Parsing

- [x] Create `backend/src/services/docxParser.ts`
  - [x] Accept a `Buffer` and return structured paragraphs with approximate page numbers
  - [x] Use JSZip + regex XML walking for page tracking and text extraction
  - [x] Detect hanging indent on paragraphs (for bibliography validation)
  - [x] Return `ParsedParagraph[]` with `{ text, pageNumber, hasHangingIndent, styleId }`
  - [x] Chalk log: start, page count found, paragraph count, completion

- [x] Create `backend/src/services/citationExtractor.ts`
  - [x] Regex patterns for parenthetical citations: `(Author, Year, p. X)`
  - [x] Regex patterns for narrative citations: `Author (Year, p. X)`
  - [x] Regex patterns for `et al.`, `&`, `and`, `as cited in`
  - [x] Capture surrounding sentence context for GPT
  - [x] Return `CitationCandidate[]`
  - [x] Chalk log: citation count found

- [x] Create `backend/src/services/bibliographyParser.ts`
  - [x] Detect `References` or `Bibliography` heading (case-insensitive) to find the section start
  - [x] Extract each reference entry as a single string
  - [x] Preserve `hasHangingIndent` flag from `docxParser` output
  - [x] Return `ReferenceEntry[]` with position index
  - [x] Chalk log: reference entry count found

---

## Phase 4 — Backend: GPT Validation

- [x] Create `backend/src/services/gptValidator.ts`
  - [x] Initialise OpenAI client from env (`OPENAI_API_KEY`, `OPENAI_MODEL`)
  - [x] `validateCitations(citations: CitationCandidate[]): Promise<CitationResult[]>`
    - [x] Batch citations into groups of ≤ 20
    - [x] System prompt: APA7 expert + strict page/section rule
    - [x] User prompt: JSON array of `{ citationText, surroundingContext }`
    - [x] Enable JSON mode: `response_format: { type: "json_object" }`
    - [x] Parse and validate response with Zod
    - [x] On API error: log with chalk, return regex-fallback results with `gptUnavailable: true`
  - [x] `validateBibliography(entries: ReferenceEntry[]): Promise<BibliographyResult[]>`
    - [x] Batch entries into groups of ≤ 20
    - [x] System prompt: APA7 expert covering all 10 bibliography rules
    - [x] User prompt: JSON array of `{ entryText, hasHangingIndent }`
    - [x] Enable JSON mode
    - [x] Parse and validate response with Zod
    - [x] On API error: log with chalk, return fallback results with `gptUnavailable: true`
  - [x] Chalk log: each batch sent, completion

---

## Phase 5 — Backend: Cross-Referencing

- [x] Create `backend/src/services/crossReferencer.ts`
  - [x] Extract author-year key from each `CitationResult` (e.g. `"Smith, 2020"`)
  - [x] Extract author-year key from each `BibliographyResult`
  - [x] Find citations with no matching bibliography entry
  - [x] Find bibliography entries with no matching in-text citation
  - [x] Return `CrossReferenceResult`
  - [x] Chalk log: mismatch counts

---

## Phase 6 — Backend: Route & Server

- [x] Create `backend/src/routes/check.ts`
  - [x] `POST /api/check` handler
  - [x] Validate file presence, MIME type, and size (≤ `MAX_UPLOAD_SIZE_MB`)
  - [x] Call services in order: `parseDocument` → `extractCitations` + `extractBibliography` → `validateCitations` + `validateBibliography` → `crossReference`
  - [x] Build `Summary` counts from results
  - [x] Return `CheckResponse` JSON
  - [x] Wrap entire handler in try/catch; return structured error JSON on failure

- [x] Create `backend/src/server.ts`
  - [x] Initialise Express app
  - [x] Apply `cors`, `express.json()`, multer memory storage
  - [x] Mount `/api/check` route
  - [x] Serve `../frontend/dist` as static files in production
  - [x] Start listening on `PORT` from env (default `3001`)
  - [x] Chalk log: server start, port, environment

- [x] Add `dev` script to `backend/package.json`: `tsx watch src/server.ts`
- [x] Add `build` script: `tsc` output to `dist/`
- [x] Add `start` script: `node dist/server.js`

---

## Phase 7 — Frontend: API Layer & Types

- [x] Copy / import shared types into `frontend/src/types/api.ts` (mirroring backend Zod inferred types)
- [x] Create `frontend/src/api/checkDocument.ts`
  - [x] `checkDocument(file: File): Promise<CheckResponse>` using Axios
  - [x] POST to `/api/check` as `multipart/form-data`
  - [x] Throw typed error on non-2xx response

---

## Phase 8 — Frontend: Components

- [x] Create `frontend/src/components/UploadZone.tsx`
  - [x] Drag-and-drop area + fallback file input
  - [x] Accept `.docx` only; show error for wrong type or oversized file
  - [x] Loading spinner while awaiting API response
  - [x] Display API/network error message

- [x] Create `frontend/src/components/SummaryBanner.tsx`
  - [x] Display total citations, citation errors, citation warnings
  - [x] Display bibliography errors, bibliography warnings
  - [x] Display unmatched citation/reference counts
  - [x] Colour-coded cards (red/amber/green) meeting WCAG 2.1 AA

- [x] Create `frontend/src/components/FilterBar.tsx`
  - [x] Toggle buttons: `All` / `Errors` / `Warnings`
  - [x] Emit selected filter to parent via callback prop

- [x] Create `frontend/src/components/CitationTable.tsx`
  - [x] Columns: Page | Citation Text | Issue | Severity badge
  - [x] Accept `citations: CitationResult[]` and `filter` props
  - [x] Severity badge colours: red (error), amber (warning), green (ok)

- [x] Create `frontend/src/components/BibliographyTable.tsx`
  - [x] Columns: Reference Entry | Issue | Severity badge
  - [x] Accept `bibliography: BibliographyResult[]` and `filter` props

- [x] Create `frontend/src/components/CrossReferencePanel.tsx`
  - [x] Two lists: "Citations missing from References" and "References never cited"
  - [x] Hidden when both lists are empty

- [x] Create `frontend/src/components/DownloadButton.tsx`
  - [x] Use `papaparse` to serialise citations + bibliography results to CSV
  - [x] Trigger browser download; filename `apa7-report.csv`

---

## Phase 9 — Frontend: App Assembly

- [x] Wire all components together in `frontend/src/App.tsx`
  - [x] State: `checkResponse`, `loading`, `error`, `filter`
  - [x] Render `UploadZone` always
  - [x] Render results section only when `checkResponse` is set
  - [x] Pass `filter` state to `CitationTable` and `BibliographyTable`
  - [x] Show `gptUnavailable` warning banner if flag is set in response

- [x] Style global layout: centered container, max-width, readable font, dark header
- [x] Add page title, subtitle, and brief instructions above the upload zone

---

## Phase 10 — Integration & Local Testing

- [x] Start backend dev server (`npm run dev` in `backend/`)
- [x] Start frontend dev server (`npm run dev` in `frontend/`) with Vite proxy to `:3001`
- [x] Configure `vite.config.ts` proxy: `/api` → `http://localhost:3001` ✓ (done in Phase 1)
- [ ] Upload a sample `.docx` with known APA7 errors and verify end-to-end
- [ ] Test edge cases: wrong file type, oversized file, empty document

---

## Phase 11 — Production Build

- [x] Run `npm run build` in `frontend/` — clean ✓
- [x] Run `npm run build` in `backend/` — clean ✓
- [ ] End-to-end test of production build (`NODE_ENV=production npm run start`)

---

## Phase 12 — Polish & README

- [x] Write `README.md` with prerequisites, setup, env vars, dev and prod commands
- [x] `.env.example` in `backend/` with placeholder values
- [x] Commit completed implementation
