import { Router } from 'express';
import { simulate, type SimulationInput, type SimulationConfig } from '@lureh/engine';
import {
  getAllAccounts,
  getAllEvents,
  getAllGoals,
  getAllDebts,
  getAllScenarios,
  getConfig,
  getPurchasesByDebtId,
} from '../db/database.js';

export const simulationRouter = Router();

simulationRouter.post('/run', (req, res) => {
  const now = new Date();
  const defaultEnd = new Date(now);
  defaultEnd.setFullYear(defaultEnd.getFullYear() + 1);

  const inflationRate = parseFloat(getConfig('inflation_rate') ?? '0.05');
  const periodType = (getConfig('period_type') ?? 'monthly') as 'monthly' | 'biweekly';

  const config: SimulationConfig = {
    startDate: req.body.startDate ?? toISODate(now),
    endDate: req.body.endDate ?? toISODate(defaultEnd),
    inflationRate: req.body.inflationRate ?? inflationRate,
    periodType: req.body.periodType ?? periodType,
  };

  const activeScenarioIds: string[] = req.body.activeScenarioIds ?? [];

  const debts = getAllDebts();

  // Load purchases for each credit card debt
  const purchasesByDebtId: Record<string, any[]> = {};
  for (const debt of debts) {
    if (debt.debtType === 'credit_card') {
      purchasesByDebtId[debt.id] = getPurchasesByDebtId(debt.id);
    }
  }

  const input: SimulationInput = {
    accounts: getAllAccounts(),
    events: getAllEvents(),
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
