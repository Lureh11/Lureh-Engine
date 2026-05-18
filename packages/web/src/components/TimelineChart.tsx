import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import type { PeriodSnapshot, VariabilityBand } from '@lureh/engine';
import { formatMoney, formatDate } from '../lib/format.js';

interface Props {
  timeline: PeriodSnapshot[];
  variabilityBands?: VariabilityBand[];
  showVariability?: boolean;
}

export function TimelineChart({ timeline, variabilityBands, showVariability = true }: Props) {
  const bandMap = new Map<string, VariabilityBand>();
  if (variabilityBands) {
    for (const b of variabilityBands) bandMap.set(b.date, b);
  }

  const data = timeline.map((s) => {
    const band = bandMap.get(s.date);
    return {
      date: s.date,
      label: formatDate(s.date),
      total: s.totalBalance,
      available: s.availableBalance,
      optimistic: band?.optimistic ?? s.totalBalance,
      pessimistic: band?.pessimistic ?? s.totalBalance,
    };
  });

  const hasBands = showVariability && variabilityBands && variabilityBands.length > 0;

  // Detect dark mode by checking the html class
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-4 text-lg font-semibold text-slate-700 dark:text-slate-200">
        Proyeccion Temporal
      </h2>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
            <defs>
              <linearGradient id="gradTotal" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAvailable" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tickColor }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: tickColor }}
              tickLine={false}
              tickFormatter={(v: number) => formatCompact(v)}
              width={65}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                const labels: Record<string, string> = {
                  total: 'Saldo Total',
                  available: 'Disponible',
                  optimistic: 'Optimista',
                  pessimistic: 'Pesimista',
                };
                return [formatMoney(value), labels[name] ?? name];
              }}
              labelFormatter={(label: string) => label}
              contentStyle={{
                borderRadius: '8px',
                border: `1px solid ${tooltipBorder}`,
                fontSize: '13px',
                backgroundColor: tooltipBg,
                color: isDark ? '#e2e8f0' : '#1e293b',
              }}
            />
            <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />

            {hasBands && (
              <Area
                type="monotone"
                dataKey="optimistic"
                stroke="none"
                fill="#6366f1"
                fillOpacity={0.06}
                name="optimistic"
              />
            )}
            {hasBands && (
              <Area
                type="monotone"
                dataKey="pessimistic"
                stroke="none"
                fill="#ef4444"
                fillOpacity={0.06}
                name="pessimistic"
              />
            )}

            <Area
              type="monotone"
              dataKey="total"
              stroke="#6366f1"
              fill="url(#gradTotal)"
              strokeWidth={2}
              name="total"
            />
            <Area
              type="monotone"
              dataKey="available"
              stroke="#10b981"
              fill="url(#gradAvailable)"
              strokeWidth={2}
              name="available"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 flex gap-5 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-lureh-500" />
          Saldo Total
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
          Disponible
        </span>
        {hasBands && (
          <span className="flex items-center gap-1.5 ml-auto text-slate-400 dark:text-slate-500">
            Bandas de variabilidad = margen de incertidumbre
          </span>
        )}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}
