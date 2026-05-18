// ── Event Types ──────────────────────────────────────────────

export type EventType =
  | 'income'
  | 'expense'
  | 'obligation'
  | 'growth'
  | 'transfer';

export type RecurrenceFrequency =
  | 'once'
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'semiannual'
  | 'annual';

export type PriorityLevel =
  | 'survival'
  | 'security'
  | 'growth'
  | 'personal';

export type AccountType =
  | 'checking'
  | 'savings'
  | 'cash'
  | 'investment'
  | 'credit'
  | 'loan';

export type AlertSeverity = 'danger' | 'warning' | 'info';

export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

export type AmortizationType = 'french';

// ── Recurrence ───────────────────────────────────────────────

export interface Recurrence {
  frequency: RecurrenceFrequency;
  interval: number;
  dayOfMonth?: number;
  endDate?: string;
  maxOccurrences?: number;
}

// ── Financial Event ──────────────────────────────────────────

export interface FinancialEvent {
  id: string;
  name: string;
  type: EventType;
  amount: number;
  accountId?: string;

  startDate: string;
  endDate?: string;
  recurrence: Recurrence;

  category: string;
  priorityLevel: PriorityLevel;
  priorityHuman: number;
  priorityFinancial: number;

  interestRate?: number;
  totalPeriods?: number;
  amortizationType?: AmortizationType;

  scenarioId: string | null;

  notes: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Account ──────────────────────────────────────────────────

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  currency: string;
  color: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Goal ─────────────────────────────────────────────────────

export interface FinancialGoal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  priority: PriorityLevel;
  linkedAccountId?: string;
  monthlyContribution: number;
  createdAt: string;
  updatedAt: string;
}

// ── Scenario ─────────────────────────────────────────────────

export interface Scenario {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ── Debt ─────────────────────────────────────────────────────

export type DebtStatus = 'active' | 'paid_off' | 'defaulted';
export type PaymentFrequency = 'monthly' | 'biweekly' | 'weekly';
export type DebtType = 'loan' | 'credit_card';

export interface Debt {
  id: string;
  name: string;
  lender: string;
  debtType: DebtType;
  principalAmount: number;
  remainingAmount: number;
  annualInterestRate: number;
  amortizationType: AmortizationType;
  installmentValue: number;
  totalPeriods: number;
  currentPeriod: number;
  startDate: string;
  endDate: string;
  paymentFrequency: PaymentFrequency;
  paymentDayOfMonth: number;
  status: DebtStatus;
  accountId?: string;
  notes: string;
  // Credit card specific
  creditLimit?: number;
  minimumPaymentPct?: number; // e.g. 0.05 = 5%
  cutOffDay?: number; // day of month for billing cycle
  createdAt: string;
  updatedAt: string;
}

export interface CreditCardPurchase {
  id: string;
  debtId: string;
  description: string;
  amount: number;
  date: string;
  installments: number; // 1 = single payment, >1 = cuotas
  remainingInstallments: number;
  interestRate?: number; // override per-purchase (null = use card default)
  isPaid: boolean;
  createdAt: string;
}

export interface DebtScheduleEntry {
  period: number;
  date: string;
  payment: number;
  principal: number;
  interest: number;
  extraPayment: number;
  remainingBalance: number;
}

// ── Variability ──────────────────────────────────────────────

export interface VariabilityBand {
  date: string;
  optimistic: number;
  expected: number;
  pessimistic: number;
}

// ── Simulation Config ────────────────────────────────────────

export interface SimulationConfig {
  startDate: string;
  endDate: string;
  inflationRate: number;
  periodType: 'monthly' | 'biweekly';
}

// ── Simulation Input ─────────────────────────────────────────

export interface SimulationInput {
  accounts: Account[];
  events: FinancialEvent[];
  goals: FinancialGoal[];
  debts: Debt[];
  /** Purchases indexed by debt ID — only needed for credit_card debts */
  purchasesByDebtId?: Record<string, CreditCardPurchase[]>;
  scenarios: Scenario[];
  config: SimulationConfig;
  activeScenarioIds: string[];
}

// ── Simulation Output ────────────────────────────────────────

export interface AccountSnapshot {
  accountId: string;
  balance: number;
}

export interface Alert {
  severity: AlertSeverity;
  message: string;
  date: string;
  relatedEventId?: string;
}

export interface GoalProgress {
  goalId: string;
  currentAmount: number;
  projectedAmount: number;
  onTrack: boolean;
  completionDate: string | null;
}

export interface PeriodSnapshot {
  date: string;
  totalBalance: number;
  committedBalance: number;
  availableBalance: number;
  periodIncome: number;
  periodExpenses: number;
  periodObligations: number;
  periodSavings: number;
  appliedEvents: AppliedEvent[];
  accounts: AccountSnapshot[];
  goals: GoalProgress[];
  alerts: Alert[];
}

export interface AppliedEvent {
  eventId: string;
  name: string;
  type: EventType;
  amount: number;
  accountId?: string;
}

export interface SimulationSummary {
  currentTotalBalance: number;
  projectedEndBalance: number;
  minBalance: number;
  minBalanceDate: string;
  totalProjectedIncome: number;
  totalProjectedExpenses: number;
  totalProjectedObligations: number;
  totalProjectedSavings: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  riskLevel: RiskLevel;
  alerts: Alert[];
}

export interface SimulationResult {
  config: SimulationConfig;
  timeline: PeriodSnapshot[];
  summary: SimulationSummary;
  variabilityBands: VariabilityBand[];
  generatedAt: string;
}
