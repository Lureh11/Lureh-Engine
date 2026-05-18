import type { Account } from '@lureh/engine';
import { daysSince } from '../lib/format.js';

interface Props {
  accounts: Account[];
  onNavigateToAccounts: () => void;
}

export function BalanceReminder({ accounts, onNavigateToAccounts }: Props) {
  if (accounts.length === 0) return null;

  const staleAccounts = accounts.filter((a) => daysSince(a.updatedAt) > 7);

  if (staleAccounts.length === 0) return null;

  const oldest = staleAccounts.reduce((prev, curr) =>
    daysSince(curr.updatedAt) > daysSince(prev.updatedAt) ? curr : prev
  );
  const oldestDays = daysSince(oldest.updatedAt);

  return (
    <div className="mb-4 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-800 dark:bg-amber-950">
      <span className="text-lg">⚠️</span>
      <div className="flex-1 text-sm">
        <p className="font-medium text-amber-800 dark:text-amber-300">
          {staleAccounts.length === 1
            ? `La cuenta "${staleAccounts[0].name}" no se actualiza hace ${oldestDays} dias`
            : `${staleAccounts.length} cuentas no se actualizan hace mas de 7 dias`
          }
        </p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
          Tu simulacion es tan precisa como tus datos. Actualiza tus saldos reales.
        </p>
      </div>
      <button
        onClick={onNavigateToAccounts}
        className="rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition"
      >
        Actualizar
      </button>
    </div>
  );
}
