# APA7 Reference Checker — System Architecture

---

## 1. High-Level Architecture

```mermaid
graph TD
    subgraph Browser["Browser (React + Tailwind)"]
        UI[Upload Zone]
        Results[Results Dashboard]
    end

    subgraph Backend["Backend (FastAPI / Python)"]
        Router[POST /api/check]
        Parser[docx_parser.py\nExtract text + page numbers]
        CitExt[citation_extractor.py\nRegex: find in-text citations]
        BibParse[bibliography_parser.py\nExtract References section]
        GPT[gpt_validator.py\nOpenAI GPT-4o validation]
        CrossRef[cross_referencer.py\nMatch citations ↔ bibliography]
        Schemas[schemas.py\nPydantic models]
    end

    subgraph External["External Services"]
        OpenAI[OpenAI API\nGPT-4o]
    end

    UI -->|multipart/form-data .docx| Router
    Router --> Parser
    Parser --> CitExt
    Parser --> BibParse
    CitExt --> GPT
    BibParse --> GPT
    GPT -->|Structured JSON| CrossRef
    CrossRef --> Schemas
    Schemas -->|JSON response| Results
    GPT <-->|HTTPS| OpenAI
```

---

## 2. Request / Response Flow

```mermaid
sequenceDiagram
    actor User
    participant FE as Frontend (React)
    participant BE as FastAPI Backend
    participant DP as docx_parser
    participant CE as citation_extractor
    participant BP as bibliography_parser
    participant GV as gpt_validator
    participant CR as cross_referencer
    participant OA as OpenAI API

    User->>FE: Drops / selects .docx file
    FE->>BE: POST /api/check (multipart)
    BE->>DP: parse_document(file_bytes)
    DP-->>BE: paragraphs with page numbers

    BE->>CE: extract_citations(paragraphs)
    CE-->>BE: list[CitationCandidate]

    BE->>BP: extract_bibliography(paragraphs)
    BP-->>BE: list[ReferenceEntry]

    BE->>GV: validate_citations(citations)
    GV->>OA: Chat completion (batch prompt)
    OA-->>GV: JSON validation results
    GV-->>BE: list[CitationResult]

    BE->>GV: validate_bibliography(references)
    GV->>OA: Chat completion (batch prompt)
    OA-->>GV: JSON validation results
    GV-->>BE: list[BibliographyResult]

    BE->>CR: cross_reference(citations, references)
    CR-->>BE: CrossReferenceResult

    BE-->>FE: CheckResponse JSON
    FE-->>User: Summary + tables + download
```

---

## 3. Backend Service Layer

```mermaid
graph LR
    subgraph services["services/"]
        A[docx_parser.py\n─────────────\nparse_document()\ntrack page breaks\nreturn paragraphs+pages]
        B[citation_extractor.py\n─────────────\nextract_citations()\nregex patterns for\nparenthetical + narrative]
        C[bibliography_parser.py\n─────────────\nextract_bibliography()\ndetect References heading\nparse individual entries]
        D[gpt_validator.py\n─────────────\nvalidate_citations()\nvalidate_bibliography()\nbatch GPT calls\nJSON mode output]
        E[cross_referencer.py\n─────────────\ncross_reference()\nauthor-year key matching\nunmatched detection]
    end

    A --> B
    A --> C
    B --> D
    C --> D
    D --> E
```

---

## 4. Data Models

```mermaid
classDiagram
    class CitationCandidate {
        +int page_number
        +str citation_text
        +str surrounding_context
        +bool has_page_ref
    }

    class CitationResult {
        +int page_number
        +str citation_text
        +str issue
        +Severity severity
    }

    class ReferenceEntry {
        +str entry_text
        +bool has_hanging_indent
        +int position
    }

    class BibliographyResult {
        +str entry_text
        +str issue
        +Severity severity
    }

    class CrossReferenceResult {
        +list~str~ citations_without_reference
        +list~str~ references_without_citation
    }

    class Summary {
        +int total_citations
        +int citation_errors
        +int citation_warnings
        +int bibliography_errors
        +int bibliography_warnings
        +int unmatched_citations
        +int unmatched_references
    }

    class CheckResponse {
        +Summary summary
        +list~CitationResult~ citations
        +list~BibliographyResult~ bibliography
        +CrossReferenceResult cross_reference
    }

    CheckResponse --> Summary
    CheckResponse --> CitationResult
    CheckResponse --> BibliographyResult
    CheckResponse --> CrossReferenceResult
    CitationCandidate --> CitationResult
    ReferenceEntry --> BibliographyResult
```

---

## 5. Frontend Component Tree

```mermaid
graph TD
    App["App.tsx\n(state: checkResponse, loading, error)"]

    App --> UploadZone["UploadZone.tsx\nDrag-and-drop / file picker\nPOST to /api/check"]
    App --> SummaryBanner["SummaryBanner.tsx\nTotal / Errors / Warnings counts"]
    App --> FilterBar["FilterBar.tsx\nSeverity filter toggle"]
    App --> CitTable["CitationTable.tsx\nPage | Citation | Issue | Severity badge"]
    App --> BibTable["BibliographyTable.tsx\nEntry | Issue | Severity badge"]
    App --> CrossRef["CrossReferencePanel.tsx\nUnmatched citations + references"]
    App --> Download["DownloadButton.tsx\nExport CSV via papaparse"]
```

---

## 6. Deployment Architecture

```mermaid
graph TD
    subgraph Local["Local / Single-Server Deployment"]
        FE_Build["Frontend\nnpm run build → dist/"]
        Static["Uvicorn serves\n/dist as static files"]
        API["FastAPI\n:8000/api/*"]
        ENV[".env\nOPENAI_API_KEY"]
    end

    Browser["User Browser"] -->|HTTP :8000| Static
    Browser -->|POST /api/check| API
    API --> ENV
    API -->|HTTPS| OA["OpenAI API"]
    FE_Build --> Static
```

> **Note:** For production, place an Nginx reverse proxy in front of Uvicorn and serve the
> React build from Nginx directly. The FastAPI backend remains an internal service.

---

## 7. GPT Validation Flow

```mermaid
flowchart TD
    Start([citations list]) --> Batch[Split into batches\nof ≤20 citations]
    Batch --> Prompt[Build system + user prompt\nwith APA7 rules]
    Prompt --> GPT{OpenAI\nGPT-4o}
    GPT -->|Success JSON| Parse[Parse structured results\nper citation]
    GPT -->|API Error / Timeout| Fallback[Return regex-only results\nwith warning flag]
    Parse --> Merge[Merge GPT results\nwith regex candidates]
    Fallback --> Merge
    Merge --> Done([CitationResult list])
```
