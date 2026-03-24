/**
 * Shows only the current (most recent) processing step while a document is being validated.
 */
interface Props {
  entries: string[];
}

export function ProgressLog({ entries }: Props) {
  const current = entries[entries.length - 1];
  if (!current) return null;

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-sm shadow-sm">
      <span className="block h-2 w-2 shrink-0 animate-pulse rounded-full bg-blue-500" />
      <span className="font-medium text-gray-700">{current}</span>
    </div>
  );
}
