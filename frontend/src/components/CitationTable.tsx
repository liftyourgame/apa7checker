/**
 * Table of validated in-text citations.
 * Columns: Page | Citation Text | Issue | Severity
 *
 * For error/warning rows the surrounding paragraph context is shown beneath the
 * citation text, with the citation itself highlighted so the user can quickly
 * find it in their document.
 */
import type { CitationResult } from '../types/api';
import type { Filter } from './FilterBar';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  citations: CitationResult[];
  filter: Filter;
}

/**
 * Render the surrounding context paragraph with the citation text highlighted.
 * Splits on the first occurrence of citationText and wraps it in a <mark>.
 */
function ContextSnippet({ context, citationText }: { context: string; citationText: string }) {
  const idx = context.indexOf(citationText);
  if (idx === -1) {
    // Citation not found verbatim in context — just show the raw text
    return <span>{context}</span>;
  }
  return (
    <>
      {context.slice(0, idx)}
      <mark className="rounded bg-yellow-200 px-0.5 text-yellow-900 not-italic">
        {citationText}
      </mark>
      {context.slice(idx + citationText.length)}
    </>
  );
}

export function CitationTable({ citations, filter }: Props) {
  const visible =
    filter === 'all' ? citations : citations.filter((c) => c.severity === filter);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        In-Text Citations
        <span className="ml-2 text-sm font-normal text-gray-400">({visible.length} shown)</span>
      </h2>

      {visible.length === 0 ? (
        <p className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-500">
          No citations match the current filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 w-16">Page</th>
                <th className="px-4 py-3">Citation</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3 w-24 text-center">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((c, i) => (
                <tr
                  key={i}
                  className={`transition-colors hover:bg-gray-50 ${
                    c.severity === 'error'
                      ? 'border-l-4 border-l-red-400'
                      : c.severity === 'warning'
                      ? 'border-l-4 border-l-amber-400'
                      : 'border-l-4 border-l-green-400'
                  }`}
                >
                  <td className="px-4 py-3 font-mono text-gray-500 align-top">{c.pageNumber}</td>
                  <td className="px-4 py-3 align-top">
                    {/* Citation text */}
                    <span className="font-mono text-gray-800 break-all">{c.citationText}</span>

                    {/* Surrounding context — only shown for errors and warnings */}
                    {c.severity !== 'ok' && c.surroundingContext && (
                      <p className="mt-1.5 text-xs text-gray-500 italic leading-relaxed border-l-2 border-gray-200 pl-2">
                        <ContextSnippet
                          context={c.surroundingContext}
                          citationText={c.citationText}
                        />
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 align-top">{c.issue}</td>
                  <td className="px-4 py-3 text-center align-top">
                    <SeverityBadge severity={c.severity} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
