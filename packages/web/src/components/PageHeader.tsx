interface Props {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function PageHeader({ title, subtitle, action }: Props) {
  return (
    <div className="mb-6 flex items-end justify-between">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="rounded-lg bg-lureh-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-lureh-700 active:bg-lureh-800"
        >
          + {action.label}
        </button>
      )}
    </div>
  );
}
