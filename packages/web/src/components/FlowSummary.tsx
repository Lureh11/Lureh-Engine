import type { SimulationSummary } from '@lureh/engine';
import { formatMoney } from '../lib/format.js';

interface Props {
  summary: SimulationSummary;
}

export function FlowSummary({ summary }: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
        Flujo Proyectado
      </h2>
      <div className="space-y-3">
        <Row label="Ingresos totales" value={summary.totalProjectedIncome} positive />
        <Row label="Gastos totales" value={summary.totalProjectedExpenses} />
        <Row label="Obligaciones totales" value={summary.totalProjectedObligations} />
        <Row label="Ahorro / Inversion" value={summary.totalProjectedSavings} positive />
        <div className="border-t border-slate-100 pt-3 dark:border-slate-800">
          <Row
            label="Balance neto"
            value={
              summary.totalProjectedIncome +
              summary.totalProjectedSavings -
              summary.totalProjectedExpenses -
              summary.totalProjectedObligations
            }
            bold
          />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, positive, bold }: {
  label: string;
  value: number;
  positive?: boolean;
  bold?: boolean;
}) {
  const color = bold
    ? value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'
    : positive
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-slate-700 dark:text-slate-200';

  return (
    <div className="flex items-center justify-between">
      <span className={`text-sm ${bold ? 'font-semibold text-slate-700 dark:text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
        {label}
      </span>
      <span className={`text-sm font-medium ${color}`}>
        {positive && value > 0 ? '+' : ''}{formatMoney(value)}
      </span>
    </div>
  );
}
