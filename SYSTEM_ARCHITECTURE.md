# APA7 Reference Checker — System Architecture

---

## 1. High-Level Architecture

```mermaid
graph TD
    subgraph Browser["Browser (React + Tailwind)"]
        UI[Upload Zone]
        Results[Results Dashboard]
    end

    subgraph Backend["Backend (Express / TypeScript)"]
        Router[POST /api/check]
        Parser[docxParser.ts\nExtract text + page numbers]
        CitExt[citationExtractor.ts\nRegex: find in-text citations]
        BibParse[bibliographyParser.ts\nExtract References section]
        GPT[gptValidator.ts\nOpenAI GPT-4o validation]
        CrossRef[crossReferencer.ts\nMatch citations ↔ bibliography]
        Schemas[schemas.ts\nZod schemas + TS types]
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
    participant BE as Express Backend (TS)
    participant DP as docxParser
    participant CE as citationExtractor
    participant BP as bibliographyParser
    participant GV as gptValidator
    participant CR as crossReferencer
    participant OA as OpenAI API

    User->>FE: Drops / selects .docx file
    FE->>BE: POST /api/check (multipart)
    BE->>DP: parseDocument(buffer)
    DP-->>BE: paragraphs with page numbers

    BE->>CE: extractCitations(paragraphs)
    CE-->>BE: CitationCandidate[]

    BE->>BP: extractBibliography(paragraphs)
    BP-->>BE: ReferenceEntry[]

    BE->>GV: validateCitations(citations)
    GV->>OA: Chat completion (batch prompt)
    OA-->>GV: JSON validation results
    GV-->>BE: CitationResult[]

    BE->>GV: validateBibliography(references)
    GV->>OA: Chat completion (batch prompt)
    OA-->>GV: JSON validation results
    GV-->>BE: BibliographyResult[]

    BE->>CR: crossReference(citations, references)
    CR-->>BE: CrossReferenceResult

    BE-->>FE: CheckResponse JSON
    FE-->>User: Summary + tables + download
```

---

## 3. Backend Service Layer

```mermaid
graph LR
    subgraph services["services/"]
        A[docxParser.ts\n─────────────\nparseDocument()\ntrack page breaks\nreturn paragraphs+pages]
        B[citationExtractor.ts\n─────────────\nextractCitations()\nregex patterns for\nparenthetical + narrative]
        C[bibliographyParser.ts\n─────────────\nextractBibliography()\ndetect References heading\nparse individual entries]
        D[gptValidator.ts\n─────────────\nvalidateCitations()\nvalidateBibliography()\nbatch GPT calls\nJSON mode output]
        E[crossReferencer.ts\n─────────────\ncrossReference()\nauthor-year key matching\nunmatched detection]
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
        +number pageNumber
        +string citationText
        +string surroundingContext
        +boolean hasPageRef
    }

    class CitationResult {
        +number pageNumber
        +string citationText
        +string issue
        +Severity severity
    }

    class ReferenceEntry {
        +string entryText
        +boolean hasHangingIndent
        +number position
    }

    class BibliographyResult {
        +string entryText
        +string issue
        +Severity severity
    }

    class CrossReferenceResult {
        +string[] citationsWithoutReference
        +string[] referencesWithoutCitation
    }

    class Summary {
        +number totalCitations
        +number citationErrors
        +number citationWarnings
        +number bibliographyErrors
        +number bibliographyWarnings
        +number unmatchedCitations
        +number unmatchedReferences
    }

    class CheckResponse {
        +Summary summary
        +CitationResult[] citations
        +BibliographyResult[] bibliography
        +CrossReferenceResult crossReference
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
        Static["Express serves\n/dist as static files"]
        API["Express\n:3001/api/*"]
        ENV[".env\nOPENAI_API_KEY"]
    end

    Browser["User Browser"] -->|HTTP :3001| Static
    Browser -->|POST /api/check| API
    API --> ENV
    API -->|HTTPS| OA["OpenAI API"]
    FE_Build --> Static
```

> **Note:** For production, place an Nginx reverse proxy in front of the Node server and
> serve the React build from Nginx directly. The Express backend remains an internal service.

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
