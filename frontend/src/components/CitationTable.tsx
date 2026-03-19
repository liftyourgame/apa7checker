/**
 * Table of validated in-text citations.
 * Columns: Page | Citation Text | Issue | Severity
 */
import type { CitationResult } from '../types/api';
import type { Filter } from './FilterBar';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  citations: CitationResult[];
  filter: Filter;
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
                  <td className="px-4 py-3 font-mono text-gray-500">{c.pageNumber}</td>
                  <td className="px-4 py-3 font-mono text-gray-800 break-all">{c.citationText}</td>
                  <td className="px-4 py-3 text-gray-600">{c.issue}</td>
                  <td className="px-4 py-3 text-center">
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
