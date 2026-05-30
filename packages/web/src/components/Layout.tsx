import type { ReactNode } from 'react';

export type Page = 'dashboard' | 'accounts' | 'events' | 'debts' | 'scenarios' | 'goals';

interface Props {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: ReactNode;
}

const NAV_ITEMS: { page: Page; label: string; icon: string }[] = [
  { page: 'dashboard', label: 'Dashboard', icon: '◈' },
  { page: 'accounts', label: 'Cuentas', icon: '◆' },
  { page: 'events', label: 'Eventos', icon: '◇' },
  { page: 'debts', label: 'Deudas', icon: '◒' },
  { page: 'scenarios', label: 'Escenarios', icon: '◎' },
  { page: 'goals', label: 'Metas', icon: '◉' },
];

export function Layout({ currentPage, onNavigate, children }: Props) {
  return (
    <div className="flex min-h-screen">
      <aside className="fixed left-0 top-0 flex h-screen w-56 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h1 className="text-lg font-bold text-lureh-600 dark:text-lureh-400">Lureh</h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Simulacion Financiera</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-3">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.page}
              onClick={() => onNavigate(item.page)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition ${
                currentPage === item.page
                  ? 'bg-lureh-50 font-medium text-lureh-700 dark:bg-lureh-950 dark:text-lureh-300'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <p className="text-[10px] text-slate-300 dark:text-slate-600">v0.2.0 MVP</p>
        </div>
      </aside>
      <main className="ml-56 flex-1 bg-slate-50 px-8 py-6 dark:bg-slate-950">
        {children}
      </main>
    </div>
  );
}
