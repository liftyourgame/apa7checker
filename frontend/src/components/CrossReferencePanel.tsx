/**
 * Panel showing mismatches between in-text citations and bibliography entries.
 * Hidden entirely when there are no mismatches.
 */
import type { CrossReferenceResult } from '../types/api';

interface Props {
  crossReference: CrossReferenceResult;
}

export function CrossReferencePanel({ crossReference }: Props) {
  const { citationsWithoutReference, referencesWithoutCitation } = crossReference;

  if (citationsWithoutReference.length === 0 && referencesWithoutCitation.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-800">Cross-Reference Issues</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {citationsWithoutReference.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-800">
              <span>⚠️</span>
              Citations missing from References ({citationsWithoutReference.length})
            </h3>
            <ul className="space-y-1">
              {citationsWithoutReference.map((text, i) => (
                <li key={i} className="font-mono text-xs text-red-700 break-all">
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}

        {referencesWithoutCitation.length > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-amber-800">
              <span>📖</span>
              References never cited in text ({referencesWithoutCitation.length})
            </h3>
            <ul className="space-y-1">
              {referencesWithoutCitation.map((text, i) => (
                <li key={i} className="text-xs text-amber-800 break-words leading-relaxed">
                  {text}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
