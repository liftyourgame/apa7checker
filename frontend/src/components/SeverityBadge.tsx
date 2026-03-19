/** Reusable severity badge used across Citation and Bibliography tables. */
import type { Severity } from '../types/api';

const CONFIG: Record<Severity, { label: string; className: string }> = {
  error: {
    label: 'Error',
    className: 'bg-red-100 text-red-700 ring-1 ring-red-600/30',
  },
  warning: {
    label: 'Warning',
    className: 'bg-amber-100 text-amber-700 ring-1 ring-amber-600/30',
  },
  ok: {
    label: 'Valid',
    className: 'bg-green-100 text-green-700 ring-1 ring-green-600/30',
  },
};

interface Props {
  severity: Severity;
}

export function SeverityBadge({ severity }: Props) {
  const { label, className } = CONFIG[severity];
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
