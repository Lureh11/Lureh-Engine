import type { SimulationSummary } from '@lureh/engine';
import { formatMoney, riskColor, riskBg } from '../lib/format.js';

interface Props {
  summary: SimulationSummary;
  reservedForGoals?: number;
}

export function BalanceCards({ summary, reservedForGoals = 0 }: Props) {
  const liquidBalance = summary.currentTotalBalance - reservedForGoals;
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card
        label="Saldo Liquido"
        value={formatMoney(liquidBalance)}
        sub="Dinero disponible (sin ahorro metas)"
        color="text-lureh-600 dark:text-lureh-400"
        bg="bg-lureh-50 border-lureh-200 dark:bg-lureh-950 dark:border-lureh-800"
      />
      <Card
        label="Saldo Proyectado"
        value={formatMoney(summary.projectedEndBalance)}
        sub="Al final del horizonte"
        color={summary.projectedEndBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
        bg={summary.projectedEndBalance >= 0
          ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800'
          : 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'}
      />
      <Card
        label="Nivel de Riesgo"
        value={riskLabel(summary.riskLevel)}
        sub={`Min: ${formatMoney(summary.minBalance)}`}
        color={riskColor(summary.riskLevel)}
        bg={riskBg(summary.riskLevel)}
      />
    </div>
  );
}

function Card({ label, value, sub, color, bg }: {
  label: string;
  value: string;
  sub: string;
  color: string;
  bg: string;
}) {
  return (
    <div className={`rounded-xl border p-5 ${bg}`}>
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{sub}</p>
    </div>
  );
}

function riskLabel(level: string): string {
  switch (level) {
    case 'low': return 'Bajo';
    case 'medium': return 'Medio';
    case 'high': return 'Alto';
    case 'critical': return 'Critico';
    default: return level;
  }
}
