# APA7 Reference Checker

A web application that validates APA7 in-text citations and bibliography entries in Microsoft Word documents (`.docx`). Powered by OpenAI GPT-4o.

---

## Features

- Upload any `.docx` file — no login required
- **In-text citation validation** — every citation must include a page or section reference (`p. X`, `pp. X–Y`, `para. X`, `Section X`)
- **Bibliography validation** — author format, year, title capitalisation, DOI format, hanging indent, and more
- **Cross-reference check** — flags citations missing from the bibliography and vice versa
- Severity filter (All / Errors / Warnings)
- CSV export of the full report
- Graceful fallback to regex-only validation if GPT is unavailable

---

## Prerequisites

| Tool | Version |
|---|---|
| Node.js | 20+ |
| npm | 9+ |
| OpenAI API key | GPT-4o access |

---

## Setup

### 1. Clone and install dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Configure environment variables

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
OPENAI_API_KEY=sk-...       # Required — your OpenAI API key
OPENAI_MODEL=gpt-4o         # Optional — defaults to gpt-4o
MAX_UPLOAD_SIZE_MB=10        # Optional — defaults to 10
PORT=3001                    # Optional — defaults to 3001
```

---

## Development

Run both servers concurrently in separate terminals:

```bash
# Terminal 1 — backend (hot reload via tsx)
cd backend
npm run dev

# Terminal 2 — frontend (Vite HMR on :5173)
cd frontend
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

> The frontend Vite config proxies `/api/*` requests to `http://localhost:3001`, so no CORS issues in development.

---

## Production Build

```bash
# 1. Build the React frontend
cd frontend
npm run build          # outputs to frontend/dist/

# 2. Compile the backend TypeScript
cd ../backend
npm run build          # outputs to backend/dist/

# 3. Start the server (serves both API and frontend static files)
NODE_ENV=production npm run start
```

Open [http://localhost:3001](http://localhost:3001).

---

## Project Structure

```
APA7/
├── backend/
│   ├── src/
│   │   ├── server.ts                    # Express entry point
│   │   ├── routes/check.ts              # POST /api/check
│   │   ├── services/
│   │   │   ├── docxParser.ts            # JSZip + regex XML parser
│   │   │   ├── citationExtractor.ts     # Regex citation finder
│   │   │   ├── bibliographyParser.ts    # References section extractor
│   │   │   ├── gptValidator.ts          # OpenAI GPT-4o validation
│   │   │   └── crossReferencer.ts       # Citation ↔ bibliography matcher
│   │   └── types/schemas.ts             # Zod schemas + TypeScript types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx                      # Root component + state
│   │   ├── api/checkDocument.ts         # Axios API client
│   │   ├── types/api.ts                 # Shared response types
│   │   └── components/
│   │       ├── UploadZone.tsx
│   │       ├── SummaryBanner.tsx
│   │       ├── FilterBar.tsx
│   │       ├── CitationTable.tsx
│   │       ├── BibliographyTable.tsx
│   │       ├── CrossReferencePanel.tsx
│   │       ├── DownloadButton.tsx
│   │       └── SeverityBadge.tsx
│   └── package.json
├── REQUIREMENTS.md
├── SYSTEM_ARCHITECTURE.md
├── AGENTS.md
└── PLAN.md
```

---

## APA7 Rules Enforced

### In-Text Citations
- **Project policy**: every citation (quote, paraphrase, summary) must include `p. X`, `pp. X–Y`, `para. X`, or `Section X` — bare `(Author, Year)` is an error
- Correct author format (`&` inside parens, `and` in narrative text)
- `et al.` usage for 3+ authors
- Four-digit year or `n.d.`
- Parenthetical vs narrative form punctuation

### Bibliography
- `Surname, I. I.` author format
- `(Year).` placement
- Sentence case for article/book titles
- Title case for journal names
- `https://doi.org/...` DOI format (no trailing full stop)
- Hanging indent detection
- Cross-reference against in-text citations

---

## Environment Variables Reference

| Variable | Default | Description |
|---|---|---|
| `OPENAI_API_KEY` | — | **Required.** OpenAI secret key |
| `OPENAI_MODEL` | `gpt-4o` | Model used for validation |
| `MAX_UPLOAD_SIZE_MB` | `10` | Maximum `.docx` upload size in MB |
| `PORT` | `3001` | Port the Express server listens on |
