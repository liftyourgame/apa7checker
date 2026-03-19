/** Severity filter toggle used above both result tables. */

export type Filter = 'all' | 'error' | 'warning';

interface Props {
  active: Filter;
  onChange: (f: Filter) => void;
}

const OPTIONS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'error', label: 'Errors only' },
  { value: 'warning', label: 'Warnings only' },
];

export function FilterBar({ active, onChange }: Props) {
  return (
    <div className="flex items-center gap-1 rounded-lg bg-gray-100 p-1 w-fit">
      {OPTIONS.map(({ value, label }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={`rounded-md px-3 py-1.5 text-sm font-medium transition-all
            ${
              active === value
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }
          `}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
