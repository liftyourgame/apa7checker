/**
 * Live processing log shown while a document is being validated.
 * Each entry appears as it arrives from the SSE stream.
 * The last entry has a pulsing indicator; all previous entries show a checkmark.
 */
interface Props {
  entries: string[];
}

export function ProgressLog({ entries }: Props) {
  if (entries.length === 0) return null;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
        Processing
      </h2>
      <ul className="space-y-2">
        {entries.map((entry, i) => {
          const isLast = i === entries.length - 1;
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              {/* Status icon */}
              <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                {isLast ? (
                  <span className="block h-2 w-2 animate-pulse rounded-full bg-blue-500" />
                ) : (
                  <svg
                    className="h-4 w-4 text-green-500"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle cx="8" cy="8" r="7" className="fill-green-100" />
                    <path
                      d="M5 8l2 2 4-4"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                )}
              </span>
              {/* Message text */}
              <span className={isLast ? 'font-medium text-gray-800' : 'text-gray-500'}>
                {entry}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
