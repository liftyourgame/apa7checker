/**
 * Root application component.
 * Manages global state: checkResponse, loading, error, filter.
 * Renders the upload zone always; results section only when a response is present.
 */
import { useState, useCallback } from 'react';
import { checkDocument, DocumentCheckError } from './api/checkDocument';
import type { CheckResponse } from './types/api';
import { UploadZone } from './components/UploadZone';
import { SummaryBanner } from './components/SummaryBanner';
import { FilterBar, type Filter } from './components/FilterBar';
import { CitationTable } from './components/CitationTable';
import { BibliographyTable } from './components/BibliographyTable';
import { CrossReferencePanel } from './components/CrossReferencePanel';
import { DownloadButton } from './components/DownloadButton';

export default function App() {
  const [checkResponse, setCheckResponse] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');

  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setCheckResponse(null);
    setFilter('all');

    try {
      const result = await checkDocument(file);
      setCheckResponse(result);
    } catch (err) {
      if (err instanceof DocumentCheckError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleReset = useCallback(() => {
    setCheckResponse(null);
    setError(null);
    setFilter('all');
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ── */}
      <header className="bg-gray-900 text-white">
        <div className="mx-auto max-w-5xl px-6 py-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl" aria-hidden>📚</span>
            <div>
              <h1 className="text-xl font-bold leading-tight">APA7 Reference Checker</h1>
              <p className="text-sm text-gray-400">
                Validate in-text citations and bibliography entries in your Word documents
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="mx-auto max-w-5xl space-y-8 px-6 py-10">

        {/* Upload */}
        <section>
          {!checkResponse && !loading && (
            <div className="mb-6 text-center">
              <h2 className="text-2xl font-bold text-gray-800">Check your document</h2>
              <p className="mt-1 text-gray-500">
                Upload a <code className="rounded bg-gray-100 px-1 text-sm">.docx</code> file — 
                every in-text citation and bibliography entry will be validated against APA7 rules.
              </p>
            </div>
          )}
          <UploadZone
            onFileSelect={handleFileSelect}
            loading={loading}
            error={error}
            onReset={handleReset}
            hasResults={!!checkResponse}
          />
        </section>

        {/* Results */}
        {checkResponse && (
          <>
            {/* GPT unavailable warning */}
            {checkResponse.gptUnavailable && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <strong>Note:</strong> GPT validation was unavailable. Results are based on
                regex pattern matching only and may be less accurate.
              </div>
            )}

            {/* Summary counts */}
            <SummaryBanner summary={checkResponse.summary} />

            {/* Filter + Download toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <FilterBar active={filter} onChange={setFilter} />
              <DownloadButton checkResponse={checkResponse} />
            </div>

            {/* In-text citations */}
            <CitationTable citations={checkResponse.citations} filter={filter} />

            {/* Bibliography */}
            <BibliographyTable bibliography={checkResponse.bibliography} filter={filter} />

            {/* Cross-reference mismatches */}
            <CrossReferencePanel crossReference={checkResponse.crossReference} />
          </>
        )}
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        APA7 Reference Checker — files are processed in memory and never stored
      </footer>
    </div>
  );
}
