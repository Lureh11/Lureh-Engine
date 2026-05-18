import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type {
  Account,
  FinancialEvent,
  FinancialGoal,
  Scenario,
  Debt,
  CreditCardPurchase,
  Recurrence,
  RecurrenceFrequency,
} from '@lureh/engine';

const __dirname = dirname(fileURLToPath(import.meta.url));

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    const dbPath = process.env.LUREH_DB_PATH ?? join(__dirname, '..', '..', 'lureh.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');

    const schema = readFileSync(join(__dirname, '..', '..', 'src', 'db', 'schema.sql'), 'utf-8');
    db.exec(schema);
  }
  return db;
}

// ── Accounts ─────────────────────────────────────────────────

export function getAllAccounts(): Account[] {
  const rows = getDb().prepare('SELECT * FROM accounts ORDER BY created_at').all() as any[];
  return rows.map(rowToAccount);
}

export function getAccountById(id: string): Account | undefined {
  const row = getDb().prepare('SELECT * FROM accounts WHERE id = ?').get(id) as any;
  return row ? rowToAccount(row) : undefined;
}

export function createAccount(account: Account): Account {
  getDb().prepare(`
    INSERT INTO accounts (id, name, type, balance, currency, color, is_active, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    account.id, account.name, account.type, account.balance,
    account.currency, account.color, account.isActive ? 1 : 0,
    account.createdAt, account.updatedAt,
  );
  return account;
}

export function updateAccount(id: string, data: Partial<Account>): Account | undefined {
  const existing = getAccountById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  getDb().prepare(`
    UPDATE accounts SET name=?, type=?, balance=?, currency=?, color=?, is_active=?, updated_at=?
    WHERE id=?
  `).run(
    updated.name, updated.type, updated.balance, updated.currency,
    updated.color, updated.isActive ? 1 : 0, updated.updatedAt, id,
  );
  return updated;
}

export function deleteAccount(id: string): boolean {
  const result = getDb().prepare('DELETE FROM accounts WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Financial Events ─────────────────────────────────────────

export function getAllEvents(): FinancialEvent[] {
  const rows = getDb().prepare('SELECT * FROM financial_events ORDER BY start_date').all() as any[];
  return rows.map(rowToEvent);
}

export function getEventById(id: string): FinancialEvent | undefined {
  const row = getDb().prepare('SELECT * FROM financial_events WHERE id = ?').get(id) as any;
  return row ? rowToEvent(row) : undefined;
}

export function createEvent(event: FinancialEvent): FinancialEvent {
  getDb().prepare(`
    INSERT INTO financial_events (
      id, name, type, amount, account_id, start_date, end_date,
      recurrence_frequency, recurrence_interval, recurrence_day_of_month,
      recurrence_end_date, recurrence_max_occurrences,
      category, priority_level, priority_human, priority_financial,
      interest_rate, total_periods, amortization_type,
      scenario_id, notes, tags, is_active, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    event.id, event.name, event.type, event.amount, event.accountId ?? null,
    event.startDate, event.endDate ?? null,
    event.recurrence.frequency, event.recurrence.interval,
    event.recurrence.dayOfMonth ?? null, event.recurrence.endDate ?? null,
    event.recurrence.maxOccurrences ?? null,
    event.category, event.priorityLevel, event.priorityHuman, event.priorityFinancial,
    event.interestRate ?? null, event.totalPeriods ?? null, event.amortizationType ?? null,
    event.scenarioId, event.notes, JSON.stringify(event.tags),
    event.isActive ? 1 : 0, event.createdAt, event.updatedAt,
  );
  return event;
}

export function updateEvent(id: string, data: Partial<FinancialEvent>): FinancialEvent | undefined {
  const existing = getEventById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  getDb().prepare(`
    UPDATE financial_events SET
      name=?, type=?, amount=?, account_id=?, start_date=?, end_date=?,
      recurrence_frequency=?, recurrence_interval=?, recurrence_day_of_month=?,
      recurrence_end_date=?, recurrence_max_occurrences=?,
      category=?, priority_level=?, priority_human=?, priority_financial=?,
      interest_rate=?, total_periods=?, amortization_type=?,
      scenario_id=?, notes=?, tags=?, is_active=?, updated_at=?
    WHERE id=?
  `).run(
    updated.name, updated.type, updated.amount, updated.accountId ?? null,
    updated.startDate, updated.endDate ?? null,
    updated.recurrence.frequency, updated.recurrence.interval,
    updated.recurrence.dayOfMonth ?? null, updated.recurrence.endDate ?? null,
    updated.recurrence.maxOccurrences ?? null,
    updated.category, updated.priorityLevel, updated.priorityHuman, updated.priorityFinancial,
    updated.interestRate ?? null, updated.totalPeriods ?? null, updated.amortizationType ?? null,
    updated.scenarioId, updated.notes, JSON.stringify(updated.tags),
    updated.isActive ? 1 : 0, updated.updatedAt, id,
  );
  return updated;
}

export function deleteEvent(id: string): boolean {
  const result = getDb().prepare('DELETE FROM financial_events WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Scenarios ────────────────────────────────────────────────

export function getAllScenarios(): Scenario[] {
  const rows = getDb().prepare('SELECT * FROM scenarios ORDER BY created_at').all() as any[];
  return rows.map(rowToScenario);
}

export function createScenario(scenario: Scenario): Scenario {
  getDb().prepare(`
    INSERT INTO scenarios (id, name, description, is_active, color, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    scenario.id, scenario.name, scenario.description,
    scenario.isActive ? 1 : 0, scenario.color, scenario.createdAt, scenario.updatedAt,
  );
  return scenario;
}

export function deleteScenario(id: string): boolean {
  const result = getDb().prepare('DELETE FROM scenarios WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Goals ────────────────────────────────────────────────────

export function getAllGoals(): FinancialGoal[] {
  const rows = getDb().prepare('SELECT * FROM goals ORDER BY target_date').all() as any[];
  return rows.map(rowToGoal);
}

export function createGoal(goal: FinancialGoal): FinancialGoal {
  getDb().prepare(`
    INSERT INTO goals (id, name, target_amount, current_amount, target_date, priority, linked_account_id, monthly_contribution, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    goal.id, goal.name, goal.targetAmount, goal.currentAmount,
    goal.targetDate, goal.priority, goal.linkedAccountId ?? null,
    goal.monthlyContribution, goal.createdAt, goal.updatedAt,
  );
  return goal;
}

export function deleteGoal(id: string): boolean {
  const result = getDb().prepare('DELETE FROM goals WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Debts ────────────────────────────────────────────────────

export function getAllDebts(): Debt[] {
  const rows = getDb().prepare('SELECT * FROM debts ORDER BY start_date').all() as any[];
  return rows.map(rowToDebt);
}

export function getDebtById(id: string): Debt | undefined {
  const row = getDb().prepare('SELECT * FROM debts WHERE id = ?').get(id) as any;
  return row ? rowToDebt(row) : undefined;
}

export function createDebt(debt: Debt): Debt {
  getDb().prepare(`
    INSERT INTO debts (id, name, lender, debt_type, principal_amount, remaining_amount,
      annual_interest_rate, amortization_type, installment_value, total_periods,
      current_period, start_date, end_date, payment_frequency, payment_day_of_month,
      status, account_id, notes, credit_limit, minimum_payment_pct, cut_off_day,
      created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    debt.id, debt.name, debt.lender, debt.debtType ?? 'loan',
    debt.principalAmount, debt.remainingAmount,
    debt.annualInterestRate, debt.amortizationType, debt.installmentValue,
    debt.totalPeriods, debt.currentPeriod, debt.startDate, debt.endDate,
    debt.paymentFrequency, debt.paymentDayOfMonth, debt.status,
    debt.accountId ?? null, debt.notes,
    debt.creditLimit ?? null, debt.minimumPaymentPct ?? null, debt.cutOffDay ?? null,
    debt.createdAt, debt.updatedAt,
  );
  return debt;
}

export function updateDebt(id: string, data: Partial<Debt>): Debt | undefined {
  const existing = getDebtById(id);
  if (!existing) return undefined;

  const updated = { ...existing, ...data, id, updatedAt: new Date().toISOString() };
  getDb().prepare(`
    UPDATE debts SET name=?, lender=?, debt_type=?, principal_amount=?, remaining_amount=?,
      annual_interest_rate=?, amortization_type=?, installment_value=?, total_periods=?,
      current_period=?, start_date=?, end_date=?, payment_frequency=?, payment_day_of_month=?,
      status=?, account_id=?, notes=?, credit_limit=?, minimum_payment_pct=?, cut_off_day=?,
      updated_at=?
    WHERE id=?
  `).run(
    updated.name, updated.lender, updated.debtType ?? 'loan',
    updated.principalAmount, updated.remainingAmount,
    updated.annualInterestRate, updated.amortizationType, updated.installmentValue,
    updated.totalPeriods, updated.currentPeriod, updated.startDate, updated.endDate,
    updated.paymentFrequency, updated.paymentDayOfMonth, updated.status,
    updated.accountId ?? null, updated.notes,
    updated.creditLimit ?? null, updated.minimumPaymentPct ?? null, updated.cutOffDay ?? null,
    updated.updatedAt, id,
  );
  return updated;
}

export function deleteDebt(id: string): boolean {
  const result = getDb().prepare('DELETE FROM debts WHERE id = ?').run(id);
  return result.changes > 0;
}

// ── Config ───────────────────────────────────────────────────

export function getConfig(key: string): string | undefined {
  const row = getDb().prepare('SELECT value FROM config WHERE key = ?').get(key) as any;
  return row?.value;
}

export function setConfig(key: string, value: string): void {
  getDb().prepare('INSERT OR REPLACE INTO config (key, value) VALUES (?, ?)').run(key, value);
}

// ── Row Mappers ──────────────────────────────────────────────

function rowToAccount(row: any): Account {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    balance: row.balance,
    currency: row.currency,
    color: row.color,
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEvent(row: any): FinancialEvent {
  const recurrence: Recurrence = {
    frequency: row.recurrence_frequency as RecurrenceFrequency,
    interval: row.recurrence_interval,
    dayOfMonth: row.recurrence_day_of_month ?? undefined,
    endDate: row.recurrence_end_date ?? undefined,
    maxOccurrences: row.recurrence_max_occurrences ?? undefined,
  };

  return {
    id: row.id,
    name: row.name,
    type: row.type,
    amount: row.amount,
    accountId: row.account_id ?? undefined,
    startDate: row.start_date,
    endDate: row.end_date ?? undefined,
    recurrence,
    category: row.category,
    priorityLevel: row.priority_level,
    priorityHuman: row.priority_human,
    priorityFinancial: row.priority_financial,
    interestRate: row.interest_rate ?? undefined,
    totalPeriods: row.total_periods ?? undefined,
    amortizationType: row.amortization_type ?? undefined,
    scenarioId: row.scenario_id,
    notes: row.notes,
    tags: JSON.parse(row.tags),
    isActive: row.is_active === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToScenario(row: any): Scenario {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: row.is_active === 1,
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToGoal(row: any): FinancialGoal {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    currentAmount: row.current_amount,
    targetDate: row.target_date,
    priority: row.priority,
    linkedAccountId: row.linked_account_id ?? undefined,
    monthlyContribution: row.monthly_contribution,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToDebt(row: any): Debt {
  return {
    id: row.id,
    name: row.name,
    lender: row.lender,
    debtType: row.debt_type ?? 'loan',
    principalAmount: row.principal_amount,
    remainingAmount: row.remaining_amount,
    annualInterestRate: row.annual_interest_rate,
    amortizationType: row.amortization_type,
    installmentValue: row.installment_value,
    totalPeriods: row.total_periods,
    currentPeriod: row.current_period,
    startDate: row.start_date,
    endDate: row.end_date,
    paymentFrequency: row.payment_frequency,
    paymentDayOfMonth: row.payment_day_of_month,
    status: row.status,
    accountId: row.account_id ?? undefined,
    notes: row.notes,
    creditLimit: row.credit_limit ?? undefined,
    minimumPaymentPct: row.minimum_payment_pct ?? undefined,
    cutOffDay: row.cut_off_day ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ── Credit Card Purchases ───────────────────────────────────

export function getPurchasesByDebtId(debtId: string): CreditCardPurchase[] {
  const rows = getDb().prepare('SELECT * FROM credit_card_purchases WHERE debt_id = ? ORDER BY date DESC').all(debtId) as any[];
  return rows.map(rowToPurchase);
}

export function createPurchase(purchase: CreditCardPurchase): CreditCardPurchase {
  getDb().prepare(`
    INSERT INTO credit_card_purchases (id, debt_id, description, amount, date, installments, remaining_installments, interest_rate, is_paid, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    purchase.id, purchase.debtId, purchase.description, purchase.amount,
    purchase.date, purchase.installments, purchase.remainingInstallments,
    purchase.interestRate ?? null, purchase.isPaid ? 1 : 0, purchase.createdAt,
  );
  return purchase;
}

export function deletePurchase(id: string): boolean {
  const result = getDb().prepare('DELETE FROM credit_card_purchases WHERE id = ?').run(id);
  return result.changes > 0;
}

function rowToPurchase(row: any): CreditCardPurchase {
  return {
    id: row.id,
    debtId: row.debt_id,
    description: row.description,
    amount: row.amount,
    date: row.date,
    installments: row.installments,
    remainingInstallments: row.remaining_installments,
    interestRate: row.interest_rate ?? undefined,
    isPaid: row.is_paid === 1,
    createdAt: row.created_at,
  };
}
