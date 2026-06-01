import { formatMoney } from '../lib/format.js';

interface Props {
  total: number;
  reservedForGoals: number;
  committed: number;
  available: number;
}

export function AvailableBalance({ total, reservedForGoals, committed, available }: Props) {
  const liquid = total - reservedForGoals;
  const pctAvailable = liquid > 0 ? (available / liquid) * 100 : 0;
  const pctCommitted = liquid > 0 ? (committed / liquid) * 100 : 0;

  return (
    <div className="rounded-2xl border border-lureh-200 bg-gradient-to-br from-lureh-50 to-white p-6 dark:border-lureh-800 dark:from-lureh-950 dark:to-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-lureh-600 dark:text-lureh-400">Saldo Disponible</p>
          <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">
            Dinero que puedes gastar sin afectar tu futuro proyectado
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400 dark:text-slate-500">Saldo Liquido</p>
          <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">{formatMoney(liquid)}</p>
          {reservedForGoals > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              + {formatMoney(reservedForGoals)} en ahorro metas
            </p>
          )}
        </div>
      </div>

      <p className={`mt-3 text-4xl font-bold ${available > 0 ? 'text-lureh-700 dark:text-lureh-400' : 'text-red-600 dark:text-red-400'}`}>
        {formatMoney(available)}
      </p>

      <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
        <div className="flex h-full">
          <div
            className="h-full bg-lureh-500 transition-all duration-500"
            style={{ width: `${Math.max(0, pctAvailable)}%` }}
            title={`Disponible: ${formatMoney(available)}`}
          />
          <div
            className="h-full bg-slate-300 dark:bg-slate-500 transition-all duration-500"
            style={{ width: `${Math.max(0, pctCommitted)}%` }}
            title={`Comprometido: ${formatMoney(committed)}`}
          />
        </div>
      </div>

      <div className="mt-2 flex justify-between text-xs text-slate-400 dark:text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-lureh-500" />
          Disponible ({pctAvailable.toFixed(0)}%)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-slate-300 dark:bg-slate-500" />
          Comprometido ({pctCommitted.toFixed(0)}%)
        </span>
      </div>
    </div>
  );
}
