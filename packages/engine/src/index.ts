export type {
  EventType,
  RecurrenceFrequency,
  PriorityLevel,
  AccountType,
  AlertSeverity,
  RiskLevel,
  AmortizationType,
  DebtStatus,
  DebtType,
  PaymentFrequency,
  Recurrence,
  FinancialEvent,
  Account,
  FinancialGoal,
  Scenario,
  Debt,
  CreditCardPurchase,
  DebtScheduleEntry,
  VariabilityBand,
  SimulationConfig,
  SimulationInput,
  AccountSnapshot,
  Alert,
  GoalProgress,
  AppliedEvent,
  PeriodSnapshot,
  SimulationSummary,
  SimulationResult,
} from './models/types.js';

export { simulate, recalculateFrom } from './simulation/engine.js';
export { expandRecurrences } from './simulation/recurrence.js';
export {
  calculateFrenchAmortization,
  getMonthlyPayment,
  generateDebtSchedule,
  simulateExtraPayment,
  generateCreditCardSchedule,
} from './rules/amortization.js';
export { adjustForInflation, monthsBetween } from './rules/inflation.js';
export { generateVariabilityBands } from './simulation/variability.js';
