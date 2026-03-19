/** Summary stat cards displayed after a successful document check. */
import type { Summary } from '../types/api';

interface StatCardProps {
  label: string;
  value: number;
  variant: 'neutral' | 'error' | 'warning' | 'ok';
}

function StatCard({ label, value, variant }: StatCardProps) {
  const styles: Record<StatCardProps['variant'], string> = {
    neutral: 'bg-blue-50 text-blue-800',
    error:   value > 0 ? 'bg-red-50 text-red-800'     : 'bg-gray-50 text-gray-600',
    warning: value > 0 ? 'bg-amber-50 text-amber-800' : 'bg-gray-50 text-gray-600',
    ok:      'bg-green-50 text-green-800',
  };

  return (
    <div className={`rounded-xl p-4 ${styles[variant]}`}>
      <p className="text-3xl font-bold">{value}</p>
      <p className="mt-1 text-xs font-medium uppercase tracking-wide opacity-80">{label}</p>
    </div>
  );
}

interface Props {
  summary: Summary;
}

export function SummaryBanner({ summary }: Props) {
  const {
    totalCitations,
    citationErrors,
    citationWarnings,
    bibliographyErrors,
    bibliographyWarnings,
    unmatchedCitations,
    unmatchedReferences,
  } = summary;

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
        Summary
      </h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        <StatCard label="Citations" value={totalCitations} variant="neutral" />
        <StatCard label="Cit. Errors" value={citationErrors} variant="error" />
        <StatCard label="Cit. Warnings" value={citationWarnings} variant="warning" />
        <StatCard label="Bib. Errors" value={bibliographyErrors} variant="error" />
        <StatCard label="Bib. Warnings" value={bibliographyWarnings} variant="warning" />
        <StatCard label="Unmatched Cit." value={unmatchedCitations} variant="error" />
        <StatCard label="Unmatched Ref." value={unmatchedReferences} variant="error" />
      </div>
    </div>
  );
}
