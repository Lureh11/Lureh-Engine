import type { PeriodSnapshot } from '@lureh/engine';
import { formatMoney, formatDateShort } from '../lib/format.js';

interface Props {
  timeline: PeriodSnapshot[];
  startingBalance: number;
  limit?: number;
}

interface Movement {
  date: string;
  eventName: string;
  type: string;
  amount: number;
  balanceAfter: number;
}

export function MovementsLog({ timeline, startingBalance, limit = 30 }: Props) {
  // Extract individual events with their real dates
  const rawMovements: Omit<Movement, 'balanceAfter'>[] = [];

  for (const snapshot of timeline) {
    if (snapshot.appliedEvents && snapshot.appliedEvents.length > 0) {
      for (const evt of snapshot.appliedEvents) {
        rawMovements.push({
          date: evt.date ?? snapshot.date,
          eventName: evt.name,
          type: evt.type,
          amount: evt.amount,
        });
      }
    }
  }

  // Sort by date so we can calculate running balance correctly
  rawMovements.sort((a, b) => a.date.localeCompare(b.date));

  // Calculate running balance event by event
  let runningBalance = startingBalance;
  const movements: Movement[] = rawMovements.map((mov) => {
    const isPositive = mov.type === 'income' || mov.type === 'growth';
    runningBalance += isPositive ? mov.amount : -mov.amount;
    return { ...mov, balanceAfter: Math.round(runningBalance * 100) / 100 };
  });

  const limited = movements.slice(0, limit);

  if (limited.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-3 text-lg font-semibold text-slate-700 dark:text-slate-200">
          Movimientos Proyectados
        </h2>
        <p className="text-sm text-slate-400 dark:text-slate-500">
          No hay movimientos en el horizonte actual.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <h2 className="mb-3 text-lg font-semibold text-slate-700 dark:text-slate-200">
        Movimientos Proyectados
      </h2>
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs table-fixed">
          <thead className="sticky top-0 bg-white dark:bg-slate-900">
            <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <th className="pb-2 pr-2 font-medium w-[90px]">Fecha</th>
              <th className="pb-2 pr-2 font-medium">Evento</th>
              <th className="pb-2 pr-2 text-right font-medium w-[110px]">Monto</th>
              <th className="pb-2 text-right font-medium w-[120px]">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {limited.map((mov, i) => {
              const isPositive = mov.type === 'income' || mov.type === 'growth';
              return (
                <tr
                  key={`${mov.date}-${mov.eventName}-${i}`}
                  className="border-b border-slate-50 last:border-0 dark:border-slate-800/50"
                >
                  <td className="py-1.5 pr-2 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                    {formatDateShort(mov.date)}
                  </td>
                  <td className="py-1.5 pr-2 truncate">
                    <div className="flex items-center gap-1.5">
                      <span className={`flex-shrink-0 inline-block h-1.5 w-1.5 rounded-full ${typeColor(mov.type)}`} />
                      <span className="text-slate-700 dark:text-slate-300 truncate">{mov.eventName}</span>
                    </div>
                  </td>
                  <td className={`py-1.5 pr-2 text-right font-medium whitespace-nowrap ${
                    isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                  }`}>
                    {isPositive ? '+' : '-'}{formatMoney(mov.amount)}
                  </td>
                  <td className={`py-1.5 text-right font-medium whitespace-nowrap ${
                    mov.balanceAfter >= 0
                      ? 'text-slate-700 dark:text-slate-300'
                      : 'text-red-600 dark:text-red-400'
                  }`}>
                    {formatMoney(mov.balanceAfter)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {movements.length > limit && (
        <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500">
          Mostrando {limit} de {movements.length} movimientos
        </p>
      )}
    </div>
  );
}

function typeColor(type: string): string {
  switch (type) {
    case 'income': return 'bg-emerald-500';
    case 'expense': return 'bg-orange-500';
    case 'obligation': return 'bg-red-500';
    case 'growth': return 'bg-blue-500';
    default: return 'bg-slate-400';
  }
}
