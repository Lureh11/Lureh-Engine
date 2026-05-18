import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from 'recharts';
import type { Scenario, SimulationResult } from '@lureh/engine';
import { api } from '../api/client.js';
import { formatMoney, formatDate } from '../lib/format.js';

interface Props {
  scenarios: Scenario[];
  horizon?: number;
}

interface ComparisonPoint {
  date: string;
  label: string;
  base: number;
  [key: string]: number | string; // scenario lines
}

const SCENARIO_COLORS = ['#f59e0b', '#10b981', '#8b5cf6', '#ec4899', '#06b6d4', '#ef4444'];

export function ScenarioComparisonChart({ scenarios, horizon = 12 }: Props) {
  const [data, setData] = useState<ComparisonPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeScenarios, setActiveScenarios] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (scenarios.length === 0) return;
    // By default, show all scenarios
    setActiveScenarios(new Set(scenarios.map((s) => s.id)));
  }, [scenarios]);

  useEffect(() => {
    loadComparison();
  }, [activeScenarios, horizon]);

  const loadComparison = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + horizon);
      const startDate = toISO(now);
      const endDate = toISO(end);

      // Run base simulation (no scenarios)
      const baseResult = await api.simulation.run({ startDate, endDate, activeScenarioIds: [] });

      // Run each active scenario individually
      const scenarioResults: { id: string; result: SimulationResult }[] = [];
      for (const sc of scenarios) {
        if (!activeScenarios.has(sc.id)) continue;
        const r = await api.simulation.run({ startDate, endDate, activeScenarioIds: [sc.id] });
        scenarioResults.push({ id: sc.id, result: r });
      }

      // Build comparison data
      const points: ComparisonPoint[] = baseResult.timeline.map((snapshot) => {
        const point: ComparisonPoint = {
          date: snapshot.date,
          label: formatDate(snapshot.date),
          base: snapshot.availableBalance,
        };

        for (const { id, result } of scenarioResults) {
          const match = result.timeline.find((s) => s.date === snapshot.date);
          point[id] = match?.availableBalance ?? snapshot.availableBalance;
        }

        return point;
      });

      setData(points);
    } catch (e) {
      console.error('Failed to load comparison:', e);
    } finally {
      setLoading(false);
    }
  };

  const toggleScenario = (id: string) => {
    setActiveScenarios((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (scenarios.length === 0) return null;

  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');
  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const tickColor = isDark ? '#64748b' : '#94a3b8';
  const tooltipBg = isDark ? '#1e293b' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
          Comparacion de Escenarios
        </h2>
        <div className="flex gap-2">
          {scenarios.map((sc, i) => (
            <button
              key={sc.id}
              onClick={() => toggleScenario(sc.id)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium border transition ${
                activeScenarios.has(sc.id)
                  ? 'border-transparent text-white'
                  : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700'
              }`}
              style={activeScenarios.has(sc.id)
                ? { backgroundColor: sc.color || SCENARIO_COLORS[i % SCENARIO_COLORS.length] }
                : {}
              }
            >
              {sc.name}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-56">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-lureh-200 border-t-lureh-600 dark:border-lureh-800 dark:border-t-lureh-400" />
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
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
                  if (name === 'base') return [formatMoney(value), 'Base (sin escenarios)'];
                  const sc = scenarios.find((s) => s.id === name);
                  return [formatMoney(value), sc?.name ?? name];
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

              {/* Base line */}
              <Line
                type="monotone"
                dataKey="base"
                stroke="#6366f1"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={false}
                name="base"
              />

              {/* Scenario lines */}
              {scenarios.filter((sc) => activeScenarios.has(sc.id)).map((sc, i) => (
                <Line
                  key={sc.id}
                  type="monotone"
                  dataKey={sc.id}
                  stroke={sc.color || SCENARIO_COLORS[i % SCENARIO_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  name={sc.id}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="mt-3 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 border-t-2 border-dashed border-lureh-500" />
          Base (sin escenarios)
        </span>
        {scenarios.filter((sc) => activeScenarios.has(sc.id)).map((sc, i) => (
          <span key={sc.id} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: sc.color || SCENARIO_COLORS[i % SCENARIO_COLORS.length] }}
            />
            {sc.name}
          </span>
        ))}
      </div>
    </div>
  );
}

function formatCompact(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
