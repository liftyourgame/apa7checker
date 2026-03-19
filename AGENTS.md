# AGENTS.md — APA7 Reference Checker

This file guides AI coding agents working on this project. Read it before making any
changes. It references the two primary planning documents and defines how agents should
operate across the codebase.

---

## Project Documents

| Document | Purpose |
|---|---|
| [`REQUIREMENTS.md`](./REQUIREMENTS.md) | Full functional and non-functional requirements, API contract, tech stack, project structure, GPT prompt strategy, and out-of-scope items. **Read this first.** |
| [`SYSTEM_ARCHITECTURE.md`](./SYSTEM_ARCHITECTURE.md) | Mermaid diagrams covering high-level architecture, request/response flow, service layer, data models, frontend component tree, deployment topology, and GPT validation flow. **Reference when making structural decisions.** |

---

## Project Summary

A no-login web application that accepts a `.docx` upload and:

1. Extracts all in-text APA7 citations and validates them (including page-number presence
   for direct quotes) using GPT-4o.
2. Extracts the References/Bibliography section and validates each entry against APA7 rules.
3. Cross-references in-text citations against bibliography entries and flags mismatches.
4. Returns a structured JSON response rendered as filterable tables with CSV export.

---

## Tech Stack at a Glance

- **Backend**: Python 3.11+, FastAPI, Uvicorn, `python-docx`, `openai`, `termcolor`
- **Frontend**: React 18 (Vite), Tailwind CSS, Axios, `papaparse`
- **LLM**: OpenAI GPT-4o via `openai` Python SDK (JSON mode)

---

## Repository Layout

```
APA7/
├── backend/
│   ├── main.py
│   ├── routers/check.py
│   ├── services/
│   │   ├── docx_parser.py
│   │   ├── citation_extractor.py
│   │   ├── bibliography_parser.py
│   │   ├── gpt_validator.py
│   │   └── cross_referencer.py
│   ├── models/schemas.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── api/checkDocument.ts
│   ├── package.json
│   └── vite.config.ts
├── REQUIREMENTS.md
├── SYSTEM_ARCHITECTURE.md
└── AGENTS.md
```

---

## Agent Guidelines

### General

- Follow the separation of concerns described in `REQUIREMENTS.md §5` and `SYSTEM_ARCHITECTURE.md §3`.
- Never persist uploaded files to disk. All document processing happens in memory within the
  request lifecycle.
- All backend services must have docstrings and `try/except` blocks with `termcolor`-coloured
  log output for key steps and errors.
- Use Pydantic models in `schemas.py` for all request/response types.

### Backend

- The single API endpoint is `POST /api/check` — do not add additional endpoints without
  updating `REQUIREMENTS.md`.
- GPT calls go exclusively through `gpt_validator.py`. No other service should import
  `openai` directly.
- Use JSON mode (`response_format={"type": "json_object"}`) for all GPT calls.
- Implement graceful fallback in `gpt_validator.py`: if the OpenAI call fails, return
  regex-only results and set a `gpt_unavailable: true` flag in the response.
- Batch citations in groups of ≤ 20 per GPT call (see `SYSTEM_ARCHITECTURE.md §7`).
- Environment variables are loaded via `python-dotenv` from `backend/.env`.

### Frontend

- All API calls go through `src/api/checkDocument.ts` — components do not call `axios`
  directly.
- Severity badges must meet WCAG 2.1 AA contrast requirements.
- Filtering (errors / warnings / all) is implemented with React state; no external table
  library is needed.
- CSV export uses `papaparse` and runs entirely in the browser.

### Testing

- Backend: use `pytest` with `httpx` async client for endpoint tests.
- Mock OpenAI calls in tests using `unittest.mock.patch`.
- Frontend: use Vitest + React Testing Library.

### Environment Variables

```env
# backend/.env  (never commit this file)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o
MAX_UPLOAD_SIZE_MB=10
```

Copy `backend/.env.example` to `backend/.env` and populate before running.

---

## Definition of Done

A feature or fix is complete when:

- [ ] Functionality matches the relevant section of `REQUIREMENTS.md`
- [ ] Architecture aligns with `SYSTEM_ARCHITECTURE.md`
- [ ] No uploaded file is written to disk
- [ ] Linter passes (`ruff` for backend, `eslint` for frontend)
- [ ] `termcolor` progress/error logging present in all backend service functions
- [ ] Pydantic schemas updated if the API contract changes
- [ ] `REQUIREMENTS.md` and `SYSTEM_ARCHITECTURE.md` updated if scope changes
