import { Router } from 'express';
import { simulate, expandRecurrences, type SimulationInput, type SimulationConfig } from '@lureh/engine';
import {
  getAllAccounts,
  getAllEvents,
  getAllGoals,
  getAllDebts,
  getAllScenarios,
  getConfig,
  setConfig,
  getPurchasesByDebtId,
  updateAccount,
} from '../db/database.js';

export const simulationRouter = Router();

simulationRouter.post('/run', (req, res) => {
  const now = new Date();
  const today = toISODate(now);
  const defaultEnd = new Date(now);
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);

  const inflationRate = parseFloat(getConfig('inflation_rate') ?? '0.05');
  const periodType = (getConfig('period_type') ?? 'monthly') as 'monthly' | 'biweekly';

  const config: SimulationConfig = {
    startDate: req.body.startDate ?? today,
    endDate: req.body.endDate ?? toISODate(defaultEnd),
    inflationRate: req.body.inflationRate ?? inflationRate,
    periodType: req.body.periodType ?? periodType,
  };

  const activeScenarioIds: string[] = req.body.activeScenarioIds ?? [];

  // ── Sync past events to account balances ──────────────────
  // Apply real (non-scenario) events that already happened to the
  // actual account balances in the DB. Tracked by date to avoid
  // double-application.
  const syncDate = getConfig('balance_synced_until') ?? '1970-01-01';
  const allEvents = getAllEvents();
  const realPastEvents = allEvents.filter(e => !e.scenarioId && e.isActive);

  if (realPastEvents.length > 0 && syncDate < today) {
    const pastOccurrences = expandRecurrences(realPastEvents, syncDate, today);
    const deltas = new Map<string, number>();

    for (const occ of pastOccurrences) {
      // Only apply events strictly after last sync and up to today
      if (occ.date <= syncDate || occ.date > today) continue;

      const accountId = occ.event.accountId;
      if (!accountId) continue;

      const current = deltas.get(accountId) ?? 0;
      switch (occ.event.type) {
        case 'income':
        case 'growth':
          deltas.set(accountId, current + occ.event.amount);
          break;
        case 'expense':
        case 'obligation':
          deltas.set(accountId, current - occ.event.amount);
          break;
      }
    }

    // Write updated balances to DB
    const accounts = getAllAccounts();
    for (const [accountId, delta] of deltas) {
      const account = accounts.find(a => a.id === accountId);
      if (account) {
        updateAccount(accountId, { balance: account.balance + delta });
      }
    }

    setConfig('balance_synced_until', today);
  }

  // ── Build simulation input ────────────────────────────────
  const debts = getAllDebts();
  const purchasesByDebtId: Record<string, any[]> = {};
  for (const debt of debts) {
    if (debt.debtType === 'credit_card') {
      purchasesByDebtId[debt.id] = getPurchasesByDebtId(debt.id);
    }
  }

  const input: SimulationInput = {
    accounts: getAllAccounts(), // Re-read after sync
    events: allEvents,
    goals: getAllGoals(),
    debts,
    purchasesByDebtId,
    scenarios: getAllScenarios(),
    config,
    activeScenarioIds,
  };

  const result = simulate(input);
  res.json(result);
});

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
