import type { Alert } from '@lureh/engine';
import { formatDateShort } from '../lib/format.js';

interface Props {
  alerts: Alert[];
}

export function AlertsList({ alerts }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-800 dark:bg-emerald-950">
        <p className="text-sm text-emerald-700 dark:text-emerald-300">
          Sin alertas — tu proyeccion se ve estable.
        </p>
      </div>
    );
  }

  const sorted = [...alerts].sort((a, b) => a.date.localeCompare(b.date));
  const limited = sorted.slice(0, 10);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
        Alertas ({alerts.length})
      </h2>
      <div className="space-y-2">
        {limited.map((alert, i) => (
          <div
            key={i}
            className={`rounded-lg border px-3 py-2 text-sm ${severityStyles(alert.severity)}`}
          >
            <span className="font-medium">{formatDateShort(alert.date)}</span>
            <span className="mx-2">—</span>
            <span>{alert.message}</span>
          </div>
        ))}
        {alerts.length > 10 && (
          <p className="text-xs text-slate-400 dark:text-slate-500">
            +{alerts.length - 10} alertas mas
          </p>
        )}
      </div>
    </div>
  );
}

function severityStyles(severity: string): string {
  switch (severity) {
    case 'danger': return 'border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300';
    case 'warning': return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300';
    case 'info': return 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-300';
    default: return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
}
