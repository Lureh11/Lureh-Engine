import { useEffect, useState, useCallback } from 'react';
import type { SimulationResult, Scenario, Account } from '@lureh/engine';
import type { Page } from '../components/Layout.js';
import { api } from '../api/client.js';
import { BalanceCards } from '../components/BalanceCards.js';
import { TimelineChart } from '../components/TimelineChart.js';
import { FlowSummary } from '../components/FlowSummary.js';
import { AlertsList } from '../components/AlertsList.js';
import { MovementsLog } from '../components/MovementsLog.js';
import { AvailableBalance } from '../components/AvailableBalance.js';
import { BalanceReminder } from '../components/BalanceReminder.js';
import { QuickSetup } from '../components/QuickSetup.js';
import { PageHeader } from '../components/PageHeader.js';

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export function DashboardPage({ onNavigate }: DashboardProps) {
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [accountsList, setAccountsList] = useState<Account[]>([]);
  const [activeScenarioIds, setActiveScenarioIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState<boolean | null>(null);
  const [horizon, setHorizon] = useState<number>(12);

  const runSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const accounts = await api.accounts.list();
      setAccountsList(accounts);
      if (accounts.length === 0) {
        setHasData(false);
        setLoading(false);
        return;
      }
      setHasData(true);

      const sc = await api.scenarios.list();
      setScenarios(sc);

      const now = new Date();
      const end = new Date(now);
      end.setMonth(end.getMonth() + horizon);

      const sim = await api.simulation.run({
        startDate: toISO(now),
        endDate: toISO(end),
        activeScenarioIds,
      });
      setResult(sim);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al conectar con el servidor');
    } finally {
      setLoading(false);
    }
  }, [activeScenarioIds, horizon]);

  useEffect(() => { runSimulation(); }, [runSimulation]);

  const toggleScenario = (id: string) => {
    setActiveScenarioIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-lureh-200 border-t-lureh-600 dark:border-lureh-800 dark:border-t-lureh-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
        <p className="font-medium">Error</p>
        <p className="mt-1">{error}</p>
        <p className="mt-2 text-xs text-red-500 dark:text-red-400">
          Asegurate de que el servidor este corriendo en el puerto 3001.
        </p>
      </div>
    );
  }

  if (hasData === false) {
    return <QuickSetup onComplete={runSimulation} />;
  }

  if (!result) return null;

  const firstSnapshot = result.timeline[0];

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Tu situacion financiera proyectada" />

      <BalanceReminder accounts={accountsList} onNavigateToAccounts={() => onNavigate('accounts')} />

      {firstSnapshot && (
        <AvailableBalance
          total={firstSnapshot.totalBalance}
          committed={firstSnapshot.committedBalance}
          available={firstSnapshot.availableBalance}
        />
      )}

      <div className="mt-6">
        <BalanceCards summary={result.summary} />
      </div>

      <div className="mt-6 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400">Horizonte:</label>
          {[3, 6, 12, 24, 36, 60].map((m) => (
            <button
              key={m}
              onClick={() => setHorizon(m)}
              className={`rounded px-2.5 py-1 text-xs font-medium transition ${
                horizon === m
                  ? 'bg-lureh-600 text-white'
                  : 'bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {m < 12 ? `${m}m` : `${m / 12}a`}
            </button>
          ))}
        </div>

        {scenarios.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Escenarios:</span>
            {scenarios.map((sc) => (
              <button
                key={sc.id}
                onClick={() => toggleScenario(sc.id)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium border transition ${
                  activeScenarioIds.includes(sc.id)
                    ? 'border-transparent text-white'
                    : 'border-slate-200 text-slate-500 bg-white hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:bg-slate-800 dark:hover:bg-slate-700'
                }`}
                style={activeScenarioIds.includes(sc.id) ? { backgroundColor: sc.color } : {}}
              >
                {sc.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6">
        <TimelineChart
          timeline={result.timeline}
          variabilityBands={result.variabilityBands}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <FlowSummary summary={result.summary} />
        <AlertsList alerts={result.summary.alerts} />
      </div>

      <div className="mt-6">
        <MovementsLog timeline={result.timeline} />
      </div>
    </div>
  );
}

function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
