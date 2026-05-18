import { useState } from 'react';
import { Layout, type Page } from './components/Layout.js';
import { DashboardPage } from './pages/DashboardPage.js';
import { AccountsPage } from './pages/AccountsPage.js';
import { EventsPage } from './pages/EventsPage.js';
import { DebtsPage } from './pages/DebtsPage.js';
import { ScenariosPage } from './pages/ScenariosPage.js';
import { GoalsPage } from './pages/GoalsPage.js';

export function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <Layout currentPage={page} onNavigate={setPage}>
      {page === 'dashboard' && <DashboardPage onNavigate={setPage} />}
      {page === 'accounts' && <AccountsPage />}
      {page === 'events' && <EventsPage />}
      {page === 'debts' && <DebtsPage />}
      {page === 'scenarios' && <ScenariosPage />}
      {page === 'goals' && <GoalsPage />}
    </Layout>
  );
}
