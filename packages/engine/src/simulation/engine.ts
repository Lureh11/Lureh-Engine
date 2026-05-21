import type {
  SimulationInput,
  SimulationResult,
  SimulationConfig,
  PeriodSnapshot,
  AccountSnapshot,
  Alert,
  AppliedEvent,
  GoalProgress,
  SimulationSummary,
  FinancialEvent,
  Account,
  FinancialGoal,
  Debt,
  CreditCardPurchase,
  RiskLevel,
} from '../models/types.js';
import { expandRecurrences, type ExpandedOccurrence } from './recurrence.js';
import { adjustForInflation, monthsBetween } from '../rules/inflation.js';
import { generateDebtSchedule, generateCreditCardSchedule } from '../rules/amortization.js';
import { generateVariabilityBands } from './variability.js';

// ── Main Engine ──────────────────────────────────────────────

export function simulate(input: SimulationInput): SimulationResult {
  const { config } = input;

  const events = filterActiveEvents(input);

  const debtEvents = expandDebtsToEvents(input.debts ?? [], config, input.purchasesByDebtId);
  const allEvents = [...events, ...debtEvents];

  const periods = generatePeriods(config);
  const occurrences = expandRecurrences(allEvents, config.startDate, config.endDate);

  const accountBalances = new Map<string, number>();
  for (const account of input.accounts) {
    if (account.isActive) {
      accountBalances.set(account.id, account.balance);
    }
  }

  // ── Pre-apply past events ─────────────────────────────────
  // Events (especially one-time) that already happened before the
  // simulation start date still affected the user's finances.
  // We replay them against account balances so the projection
  // starts from the real current state.
  const pastEvents = collectPastEvents(allEvents, config.startDate, input.accounts);
  for (const pe of pastEvents) {
    const targetId = pe.accountId ?? getDefaultAccountId(input.accounts);
    switch (pe.type) {
      case 'income':
      case 'growth':
        addToAccount(accountBalances, targetId, pe.amount);
        break;
      case 'expense':
      case 'obligation':
        addToAccount(accountBalances, targetId, -pe.amount);
        break;
    }
  }

  const goalAmounts = new Map<string, number>();
  for (const goal of input.goals) {
    goalAmounts.set(goal.id, goal.currentAmount);
  }

  const timeline: PeriodSnapshot[] = [];

  for (const period of periods) {
    const snapshot = processPeriod(
      period,
      periods,
      occurrences,
      accountBalances,
      goalAmounts,
      input,
    );
    timeline.push(snapshot);
  }

  const variabilityBands = generateVariabilityBands(timeline, config);

  return {
    config,
    timeline,
    summary: buildSummary(timeline, input),
    variabilityBands,
    generatedAt: new Date().toISOString(),
  };
}

// ── Incremental Recalculation ────────────────────────────────

export function recalculateFrom(
  previous: SimulationResult,
  changeDate: string,
  input: SimulationInput,
): SimulationResult {
  const changeIndex = previous.timeline.findIndex((s) => s.date >= changeDate);

  if (changeIndex <= 0) {
    return simulate(input);
  }

  const preserved = previous.timeline.slice(0, changeIndex);
  const lastPreserved = preserved[preserved.length - 1];

  const accountBalances = new Map<string, number>();
  for (const snap of lastPreserved.accounts) {
    accountBalances.set(snap.accountId, snap.balance);
  }

  const goalAmounts = new Map<string, number>();
  for (const gp of lastPreserved.goals) {
    goalAmounts.set(gp.goalId, gp.currentAmount);
  }

  const events = filterActiveEvents(input);
  const periods = generatePeriods(input.config).filter((p) => p >= changeDate);
  const allPeriods = generatePeriods(input.config);
  const occurrences = expandRecurrences(events, changeDate, input.config.endDate);

  const newSnapshots: PeriodSnapshot[] = [];
  for (const period of periods) {
    const snapshot = processPeriod(
      period,
      allPeriods,
      occurrences,
      accountBalances,
      goalAmounts,
      input,
    );
    newSnapshots.push(snapshot);
  }

  const timeline = [...preserved, ...newSnapshots];

  return {
    config: input.config,
    timeline,
    summary: buildSummary(timeline, input),
    variabilityBands: generateVariabilityBands(timeline, input.config),
    generatedAt: new Date().toISOString(),
  };
}

// ── Period Processing ────────────────────────────────────────

function processPeriod(
  periodDate: string,
  allPeriods: string[],
  occurrences: ExpandedOccurrence[],
  accountBalances: Map<string, number>,
  goalAmounts: Map<string, number>,
  input: SimulationInput,
): PeriodSnapshot {
  const periodIndex = allPeriods.indexOf(periodDate);
  const nextPeriod = allPeriods[periodIndex + 1] ?? '9999-12-31';

  const periodOccurrences = occurrences.filter(
    (o) => o.date >= periodDate && o.date < nextPeriod,
  );

  let periodIncome = 0;
  let periodExpenses = 0;
  let periodObligations = 0;
  let periodSavings = 0;
  const appliedEvents: AppliedEvent[] = [];
  const alerts: Alert[] = [];

  const monthsFromStart = monthsBetween(input.config.startDate, periodDate);

  for (const occ of periodOccurrences) {
    const { event } = occ;
    const inflatedAmount =
      input.config.inflationRate > 0 && event.type === 'expense'
        ? adjustForInflation(event.amount, input.config.inflationRate, monthsFromStart)
        : event.amount;

    const targetAccountId = event.accountId ?? getDefaultAccountId(input.accounts);

    switch (event.type) {
      case 'income':
        addToAccount(accountBalances, targetAccountId, inflatedAmount);
        periodIncome += inflatedAmount;
        break;
      case 'expense':
        addToAccount(accountBalances, targetAccountId, -inflatedAmount);
        periodExpenses += inflatedAmount;
        break;
      case 'obligation':
        addToAccount(accountBalances, targetAccountId, -inflatedAmount);
        periodObligations += inflatedAmount;
        break;
      case 'growth':
        addToAccount(accountBalances, targetAccountId, inflatedAmount);
        periodSavings += inflatedAmount;
        break;
      case 'transfer':
        break;
    }

    appliedEvents.push({
      eventId: event.id,
      name: event.name,
      type: event.type,
      amount: inflatedAmount,
      accountId: targetAccountId,
    });
  }

  for (const goal of input.goals) {
    if (goal.monthlyContribution > 0) {
      const current = goalAmounts.get(goal.id) ?? goal.currentAmount;
      goalAmounts.set(goal.id, current + goal.monthlyContribution);
    }
  }

  const totalBalance = sumBalances(accountBalances);

  const committedBalance = calculateCommittedBalance(
    occurrences,
    periodDate,
    input.config.endDate,
    input.goals,
    goalAmounts,
  );

  const availableBalance = Math.max(0, totalBalance - committedBalance);

  if (totalBalance < 0) {
    alerts.push({
      severity: 'danger',
      message: `Saldo negativo proyectado: ${formatMoney(totalBalance)}`,
      date: periodDate,
    });
  } else if (availableBalance <= 0) {
    alerts.push({
      severity: 'warning',
      message: 'Sin saldo disponible — todo el dinero está comprometido',
      date: periodDate,
    });
  }

  const accounts: AccountSnapshot[] = [];
  for (const [accountId, balance] of accountBalances) {
    accounts.push({ accountId, balance: round2(balance) });
  }

  const goals: GoalProgress[] = input.goals.map((g) => {
    const current = goalAmounts.get(g.id) ?? g.currentAmount;
    const remaining = g.targetAmount - current;
    const monthsLeft = monthsBetween(periodDate, g.targetDate);
    const projectedAmount =
      monthsLeft > 0 ? current + g.monthlyContribution * monthsLeft : current;
    return {
      goalId: g.id,
      currentAmount: round2(current),
      projectedAmount: round2(projectedAmount),
      onTrack: projectedAmount >= g.targetAmount,
      completionDate:
        g.monthlyContribution > 0 && remaining > 0
          ? estimateCompletionDate(periodDate, remaining, g.monthlyContribution)
          : current >= g.targetAmount
            ? periodDate
            : null,
    };
  });

  return {
    date: periodDate,
    totalBalance: round2(totalBalance),
    committedBalance: round2(committedBalance),
    availableBalance: round2(availableBalance),
    periodIncome: round2(periodIncome),
    periodExpenses: round2(periodExpenses),
    periodObligations: round2(periodObligations),
    periodSavings: round2(periodSavings),
    appliedEvents,
    accounts,
    goals,
    alerts,
  };
}

// ── Helpers ──────────────────────────────────────────────────

function expandDebtsToEvents(
  debts: Debt[],
  config: SimulationConfig,
  purchasesByDebtId?: Record<string, CreditCardPurchase[]>,
): FinancialEvent[] {
  const events: FinancialEvent[] = [];

  for (const debt of debts) {
    if (debt.status !== 'active') continue;

    let schedule;
    if (debt.debtType === 'credit_card') {
      const purchases = purchasesByDebtId?.[debt.id] ?? [];
      const monthsInRange = monthsBetween(config.startDate, config.endDate);
      schedule = generateCreditCardSchedule(debt, purchases, Math.max(12, monthsInRange + 1));
    } else {
      schedule = generateDebtSchedule(debt);
    }

    const isCC = debt.debtType === 'credit_card';
    for (const entry of schedule) {
      if (entry.date < config.startDate || entry.date > config.endDate) continue;

      events.push({
        id: `debt-${debt.id}-p${entry.period}`,
        name: isCC
          ? `${debt.name} — Pago mes ${entry.period}`
          : `${debt.name} — Cuota ${entry.period}`,
        type: 'obligation',
        amount: entry.payment,
        accountId: debt.accountId,
        startDate: entry.date,
        recurrence: { frequency: 'once', interval: 1 },
        category: isCC ? 'tarjeta' : 'deuda',
        priorityLevel: 'security',
        priorityHuman: 8,
        priorityFinancial: 9,
        scenarioId: null,
        notes: `Int: ${formatMoney(entry.interest)} | Cap: ${formatMoney(entry.principal)} | Saldo: ${formatMoney(entry.remainingBalance)}`,
        tags: ['debt', debt.id],
        isActive: true,
        createdAt: debt.createdAt,
        updatedAt: debt.updatedAt,
      });
    }
  }

  return events;
}

function filterActiveEvents(input: SimulationInput): FinancialEvent[] {
  const activeScenarios = new Set(input.activeScenarioIds);
  return input.events.filter((e) => {
    if (!e.isActive) return false;
    if (e.scenarioId === null) return true;
    return activeScenarios.has(e.scenarioId);
  });
}

/**
 * Collect events that already occurred before the simulation start date.
 * These need to be applied to account balances so the projection
 * reflects their impact. Uses expandRecurrences to catch recurring
 * events that had occurrences in the past window.
 */
function collectPastEvents(
  events: FinancialEvent[],
  simulationStart: string,
  accounts: Account[],
): { type: string; amount: number; accountId?: string }[] {
  const results: { type: string; amount: number; accountId?: string }[] = [];

  // Find the earliest event date to know how far back to look
  let earliest = simulationStart;
  for (const e of events) {
    if (e.startDate < earliest) earliest = e.startDate;
  }

  if (earliest >= simulationStart) return results; // nothing in the past

  // Expand all occurrences from the earliest event to just before today
  const pastOccurrences = expandRecurrences(events, earliest, simulationStart);

  // Only include occurrences strictly before the simulation start
  for (const occ of pastOccurrences) {
    if (occ.date < simulationStart) {
      results.push({
        type: occ.event.type,
        amount: occ.event.amount,
        accountId: occ.event.accountId,
      });
    }
  }

  return results;
}

function generatePeriods(config: SimulationConfig): string[] {
  const periods: string[] = [];
  const current = new Date(config.startDate + 'T00:00:00');
  const end = new Date(config.endDate + 'T00:00:00');

  while (current <= end) {
    periods.push(toISODate(current));
    if (config.periodType === 'monthly') {
      current.setMonth(current.getMonth() + 1);
    } else {
      current.setDate(current.getDate() + 14);
    }
  }

  return periods;
}

function calculateCommittedBalance(
  futureOccurrences: ExpandedOccurrence[],
  fromDate: string,
  toDate: string,
  goals: FinancialGoal[],
  goalAmounts: Map<string, number>,
): number {
  let committed = 0;

  const futureObligations = futureOccurrences.filter(
    (o) =>
      o.date > fromDate &&
      o.date <= toDate &&
      (o.event.type === 'obligation'),
  );

  for (const occ of futureObligations) {
    committed += occ.event.amount;
  }

  for (const goal of goals) {
    const current = goalAmounts.get(goal.id) ?? goal.currentAmount;
    const remaining = Math.max(0, goal.targetAmount - current);
    committed += remaining;
  }

  return committed;
}

function addToAccount(
  balances: Map<string, number>,
  accountId: string | undefined,
  amount: number,
): void {
  if (!accountId) return;
  const current = balances.get(accountId) ?? 0;
  balances.set(accountId, current + amount);
}

function getDefaultAccountId(accounts: Account[]): string | undefined {
  const active = accounts.find((a) => a.isActive);
  return active?.id;
}

function sumBalances(balances: Map<string, number>): number {
  let total = 0;
  for (const balance of balances.values()) {
    total += balance;
  }
  return total;
}

function buildSummary(
  timeline: PeriodSnapshot[],
  input: SimulationInput,
): SimulationSummary {
  const first = timeline[0];
  const last = timeline[timeline.length - 1];

  let minBalance = Infinity;
  let minBalanceDate = '';
  let totalIncome = 0;
  let totalExpenses = 0;
  let totalObligations = 0;
  let totalSavings = 0;
  const allAlerts: Alert[] = [];

  for (const snap of timeline) {
    if (snap.totalBalance < minBalance) {
      minBalance = snap.totalBalance;
      minBalanceDate = snap.date;
    }
    totalIncome += snap.periodIncome;
    totalExpenses += snap.periodExpenses;
    totalObligations += snap.periodObligations;
    totalSavings += snap.periodSavings;
    allAlerts.push(...snap.alerts);
  }

  const lastGoals = last?.goals ?? [];
  const goalsOnTrack = lastGoals.filter((g) => g.onTrack).length;
  const goalsAtRisk = lastGoals.filter((g) => !g.onTrack).length;

  const dangerAlerts = allAlerts.filter((a) => a.severity === 'danger').length;
  const warningAlerts = allAlerts.filter((a) => a.severity === 'warning').length;

  let riskLevel: RiskLevel = 'low';
  if (dangerAlerts > 3 || minBalance < 0) riskLevel = 'critical';
  else if (dangerAlerts > 0) riskLevel = 'high';
  else if (warningAlerts > 3) riskLevel = 'medium';

  return {
    currentTotalBalance: first?.totalBalance ?? 0,
    projectedEndBalance: last?.totalBalance ?? 0,
    minBalance,
    minBalanceDate,
    totalProjectedIncome: round2(totalIncome),
    totalProjectedExpenses: round2(totalExpenses),
    totalProjectedObligations: round2(totalObligations),
    totalProjectedSavings: round2(totalSavings),
    goalsOnTrack,
    goalsAtRisk,
    riskLevel,
    alerts: allAlerts,
  };
}

function estimateCompletionDate(
  fromDate: string,
  remaining: number,
  monthly: number,
): string {
  const monthsNeeded = Math.ceil(remaining / monthly);
  const d = new Date(fromDate + 'T00:00:00');
  d.setMonth(d.getMonth() + monthsNeeded);
  return toISODate(d);
}

function formatMoney(n: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(n);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
