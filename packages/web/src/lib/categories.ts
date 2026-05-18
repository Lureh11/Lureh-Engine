export const EVENT_CATEGORIES = [
  { value: 'salario', label: 'Salario / Ingreso', group: 'income' },
  { value: 'freelance', label: 'Freelance / Extra', group: 'income' },
  { value: 'dividendos', label: 'Dividendos / Rentas', group: 'income' },
  { value: 'suscripcion', label: 'Suscripcion', group: 'expense' },
  { value: 'gasto_fijo', label: 'Gasto Fijo', group: 'expense' },
  { value: 'gasto_variable', label: 'Gasto Variable', group: 'expense' },
  { value: 'gasto_especial', label: 'Gasto Especial', group: 'expense' },
  { value: 'deuda', label: 'Deuda / Credito', group: 'obligation' },
  { value: 'tarjeta', label: 'Tarjeta de Credito', group: 'obligation' },
  { value: 'impuesto', label: 'Impuesto', group: 'obligation' },
  { value: 'ahorro', label: 'Ahorro', group: 'growth' },
  { value: 'inversion', label: 'Inversion', group: 'growth' },
  { value: 'general', label: 'General', group: 'expense' },
] as const;

export const FREQUENCY_LABELS: Record<string, string> = {
  once: 'Una vez',
  daily: 'Diario',
  weekly: 'Semanal',
  biweekly: 'Quincenal',
  monthly: 'Mensual',
  quarterly: 'Trimestral',
  semiannual: 'Semestral',
  annual: 'Anual',
};

export const TYPE_LABELS: Record<string, string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  obligation: 'Obligacion',
  growth: 'Crecimiento',
  transfer: 'Transferencia',
};

export const TYPE_COLORS: Record<string, string> = {
  income: 'text-emerald-600 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950 dark:border-emerald-800',
  expense: 'text-orange-600 bg-orange-50 border-orange-200 dark:text-orange-400 dark:bg-orange-950 dark:border-orange-800',
  obligation: 'text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800',
  growth: 'text-blue-600 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950 dark:border-blue-800',
  transfer: 'text-slate-600 bg-slate-50 border-slate-200 dark:text-slate-400 dark:bg-slate-800 dark:border-slate-700',
};

export const PRIORITY_LABELS: Record<string, string> = {
  survival: 'Supervivencia',
  security: 'Seguridad',
  growth: 'Crecimiento',
  personal: 'Personal',
};
