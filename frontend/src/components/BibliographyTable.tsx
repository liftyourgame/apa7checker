/**
 * Table of validated bibliography / References entries.
 * Columns: Reference Entry | Issue + Suggested Fix | Severity
 */
import type { BibliographyResult } from '../types/api';
import type { Filter } from './FilterBar';
import { SeverityBadge } from './SeverityBadge';

interface Props {
  bibliography: BibliographyResult[];
  filter: Filter;
}

export function BibliographyTable({ bibliography, filter }: Props) {
  const visible =
    filter === 'all' ? bibliography : bibliography.filter((b) => b.severity === filter);

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">
        Bibliography / References
        <span className="ml-2 text-sm font-normal text-gray-400">({visible.length} shown)</span>
      </h2>

      {visible.length === 0 ? (
        <p className="rounded-lg bg-gray-50 py-6 text-center text-sm text-gray-500">
          No bibliography entries match the current filter.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Reference Entry</th>
                <th className="px-4 py-3">Issue</th>
                <th className="px-4 py-3 w-24 text-center">Severity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {visible.map((b, i) => (
                <tr
                  key={i}
                  className={`transition-colors hover:bg-gray-50 ${
                    b.severity === 'error'
                      ? 'border-l-4 border-l-red-400'
                      : b.severity === 'warning'
                      ? 'border-l-4 border-l-amber-400'
                      : 'border-l-4 border-l-green-400'
                  }`}
                >
                  <td className="px-4 py-3 text-gray-800 max-w-xl break-words leading-relaxed">
                    {b.entryText}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    <span>{b.issue}</span>
                    {b.suggestedFix && (
                      <div className="mt-2 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-xs text-green-800">
                        <span className="mb-1 block font-semibold uppercase tracking-wide text-green-600">
                          Suggested fix
                        </span>
                        {b.suggestedFix}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SeverityBadge severity={b.severity} />
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
