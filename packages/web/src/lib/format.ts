const moneyFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export function formatMoney(n: number): string {
  return moneyFmt.format(n);
}

/** "may 2026" — for chart axis labels */
export function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { month: 'short', year: 'numeric' });
}

/** "17/05/2026" — dd/mm/yyyy */
export function formatDateShort(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** "17 de mayo de 2026" */
export function formatDateFull(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Days since a given ISO date */
export function daysSince(iso: string): number {
  const then = new Date(iso + 'T00:00:00');
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - then.getTime()) / 86400000);
}

export function riskColor(level: string): string {
  switch (level) {
    case 'low': return 'text-emerald-600 dark:text-emerald-400';
    case 'medium': return 'text-amber-500 dark:text-amber-400';
    case 'high': return 'text-orange-500 dark:text-orange-400';
    case 'critical': return 'text-red-600 dark:text-red-400';
    default: return 'text-slate-500 dark:text-slate-400';
  }
}

export function riskBg(level: string): string {
  switch (level) {
    case 'low': return 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950 dark:border-emerald-800';
    case 'medium': return 'bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800';
    case 'high': return 'bg-orange-50 border-orange-200 dark:bg-orange-950 dark:border-orange-800';
    case 'critical': return 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800';
    default: return 'bg-slate-50 border-slate-200 dark:bg-slate-800 dark:border-slate-700';
  }
}
