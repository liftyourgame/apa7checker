# APA7 Reference Checker — Requirements

## Overview

A web application that accepts an uploaded Microsoft Word document (`.docx`) and validates
its APA7 in-text citations and bibliography. No user authentication is required.
GPT (OpenAI API) is used as the validation engine.

---

## 1. Functional Requirements

### 1.1 Document Upload

- The user uploads a single `.docx` file via a drag-and-drop or file-picker interface.
- Maximum file size: **10 MB**.
- Only `.docx` format is accepted (not `.doc`, `.pdf`, etc.).
- The file is processed server-side and **never persisted to disk** beyond the request lifecycle.

### 1.2 In-Text Citation Validation

The app extracts all in-text citations from the document body and evaluates each against
APA7 rules. For each citation found the app records:

| Field | Description |
|---|---|
| `page_number` | Page of the document where the citation appears |
| `citation_text` | The raw citation string as it appears in the document |
| `issue` | Human-readable description of what is wrong, or `"Valid"` |
| `severity` | `error` / `warning` / `ok` |

#### APA7 In-Text Citation Rules Checked

> **Project policy (stricter than APA7 default):** Every in-text citation — whether a
> direct quote, paraphrase, or summary — **must** include either a page number
> (`p. X` / `pp. X–Y`) or a section/paragraph reference (`para. X` / `Section X`).
> Citations that contain only `(Author, Year)` are flagged as **errors**, not warnings.

1. **Basic format** — `(Author, Year)` e.g. `(Smith, 2020)`
2. **Page or section reference required on all citations** — must include `p. X`, `pp. X–Y`,
   `para. X`, or `Section X`; `(Author, Year)` alone is an **error**
3. **Multiple authors** — two authors use `&` inside parentheses, `and` in narrative
4. **Three or more authors** — first author + `et al.` from first citation
5. **No author** — title (shortened, italicised) + year + page/section reference
6. **Organisation as author** — full name on first occurrence, abbreviation thereafter
7. **Year format** — four-digit year; `n.d.` for no date
8. **Secondary sources** — `as cited in` format
9. **Narrative vs. parenthetical** — correct placement of author/year in each form

### 1.3 Bibliography Validation

The app identifies the **References** (bibliography) section and validates each entry:

| Field | Description |
|---|---|
| `entry_text` | The full reference string |
| `issue` | Human-readable description of what is wrong, or `"Valid"` |
| `severity` | `error` / `warning` / `ok` |

#### APA7 Bibliography Rules Checked

1. **Hanging indent** — detected via paragraph formatting metadata in `docx` (npm)
2. **Alphabetical order** — entries sorted by first author surname
3. **Author format** — `Surname, I. I.` (last name, initials)
4. **Year in parentheses** — `(2020).`
5. **Title capitalisation** — sentence case for articles/books; title case for journal names
6. **DOI / URL format** — `https://doi.org/...` preferred; no full stop after URL
7. **Journal article** — author, year, title, journal (italics), volume (italics), issue, pages, DOI
8. **Book** — author, year, title (italics), publisher
9. **Book chapter** — author, year, chapter title, In editor initials surname (Ed./Eds.), book (italics), pages, publisher
10. **Website** — author/organisation, year, title, site name, URL
11. **Cross-reference check** — every in-text citation has a matching bibliography entry and vice versa

### 1.4 Results Display

- A **summary banner** shows counts: total citations, errors, warnings.
- An **In-Text Citations** table lists every citation with page, text, issue, and severity badge.
- A **Bibliography** table lists every reference entry with text, issue, and severity badge.
- A **Cross-Reference** section flags citations with no bibliography entry and bibliography entries with no in-text citation.
- Results are filterable by severity (`errors only`, `warnings only`, `all`).
- A **Download Report** button exports results as a `.csv` file.

### 1.5 Error Handling

- Invalid file type → user-visible error message, no processing.
- File exceeds size limit → user-visible error message.
- GPT API failure → graceful degradation with a plain-text error message; regex-only results still returned.
- Malformed `.docx` → user-visible error message.

---

## 2. Non-Functional Requirements

| Category | Requirement |
|---|---|
| **Performance** | Response within **30 seconds** for a typical 10,000-word document |
| **Security** | Uploaded files held in memory only; no user data stored |
| **Scalability** | Single-server deployment acceptable for academic use |
| **Accessibility** | WCAG 2.1 AA colour contrast for severity badges |
| **Browser support** | Latest versions of Chrome, Firefox, Safari, Edge |

---

## 3. Technology Stack

### Backend

| Component | Technology |
|---|---|
| Language | TypeScript 5+ (Node.js 20+) |
| Framework | Express 4 |
| HTTP server | `tsx` (dev) / compiled JS (prod) |
| File upload | `multer` (multipart/form-data middleware) |
| Word parsing | `mammoth` (text extraction) + `docx` (structural metadata) |
| LLM client | `openai` npm SDK (GPT-4o recommended) |
| Validation | `zod` (request/response schemas) |
| Env config | `dotenv` |
| Logging | `chalk` |

### Frontend

| Component | Technology |
|---|---|
| Framework | React 18 (Vite + TypeScript) |
| Styling | Tailwind CSS |
| HTTP client | Axios |
| Table/filter | React state (no external table library required) |
| Export | `papaparse` (CSV generation in-browser) |

---

## 4. API Contract

### `POST /api/check`

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | `.docx` binary | The Word document to validate |

**Response** — `application/json`

```json
{
  "summary": {
    "total_citations": 12,
    "citation_errors": 3,
    "citation_warnings": 2,
    "bibliography_errors": 1,
    "bibliography_warnings": 0,
    "unmatched_citations": 1,
    "unmatched_references": 0
  },
  "citations": [
    {
      "page_number": 2,
      "citation_text": "(Jones, 2019)",
      "issue": "Direct quote detected but no page number provided.",
      "severity": "error"
    }
  ],
  "bibliography": [
    {
      "entry_text": "Jones, A. (2019). Understanding APA. Academic Press.",
      "issue": "Valid",
      "severity": "ok"
    }
  ],
  "cross_reference": {
    "citations_without_reference": ["(Brown, 2021)"],
    "references_without_citation": []
  }
}
```

---

## 5. Project Structure

```
APA7/
├── backend/
│   ├── src/
│   │   ├── server.ts                   # Express app entry point
│   │   ├── routes/
│   │   │   └── check.ts                # POST /api/check route
│   │   ├── services/
│   │   │   ├── docxParser.ts           # mammoth + docx extraction & page tracking
│   │   │   ├── citationExtractor.ts    # Regex-based in-text citation finder
│   │   │   ├── bibliographyParser.ts   # Reference section extractor
│   │   │   ├── gptValidator.ts         # OpenAI GPT validation calls
│   │   │   └── crossReferencer.ts      # Match citations ↔ bibliography
│   │   └── types/
│   │       └── schemas.ts              # Zod schemas + inferred TS types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   │   ├── UploadZone.tsx
│   │   │   ├── SummaryBanner.tsx
│   │   │   ├── CitationTable.tsx
│   │   │   ├── BibliographyTable.tsx
│   │   │   └── CrossReferencePanel.tsx
│   │   └── api/
│   │       └── checkDocument.ts
│   ├── package.json
│   └── vite.config.ts
├── REQUIREMENTS.md
├── SYSTEM_ARCHITECTURE.md
└── AGENTS.md
```

---

## 6. Environment Variables

```env
# backend/.env
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
MAX_UPLOAD_SIZE_MB=10
PORT=3001
```

---

## 7. GPT Prompt Strategy

- **Citation validation**: Send batches of extracted citation strings + surrounding sentence
  context to GPT with a structured JSON-output prompt. The system prompt must explicitly
  instruct GPT that **every citation requires a page number (`p. X` / `pp. X–Y`) or a
  section/paragraph reference (`para. X` / `Section X`)** — citations with only
  `(Author, Year)` must be returned with `severity: "error"`. Ask GPT to return severity
  and issue description per citation.
- **Bibliography validation**: Send each reference entry individually or in batches to GPT
  with a structured JSON-output prompt.
- **Prompt style**: System prompt sets GPT as an "APA7 citation expert"; user prompt
  provides the citation data. JSON mode (`response_format: { type: "json_object" }`) is
  used for reliable parsing.
- **Fallback**: If GPT call fails or times out, return regex-only results with a warning
  banner in the UI.

---

## 8. Out of Scope (v1)

- User accounts or saved results
- PDF or `.doc` support
- APA6 or other citation styles
- Real-time collaborative review
- Automatic correction / rewriting of citations
