import type { Debt, DebtScheduleEntry, PaymentFrequency, CreditCardPurchase } from '../models/types.js';

// ── Basic Amortization ───────────────────────────────────────

export interface AmortizationScheduleEntry {
  period: number;
  payment: number;
  principal: number;
  interest: number;
  remainingBalance: number;
}

export interface AmortizationInput {
  principal: number;
  annualRate: number;
  totalPeriods: number;
  periodsPerYear: number;
}

export function calculateFrenchAmortization(
  input: AmortizationInput,
): AmortizationScheduleEntry[] {
  const { principal, annualRate, totalPeriods, periodsPerYear } = input;
  const periodicRate = annualRate / periodsPerYear;

  const payment =
    periodicRate === 0
      ? principal / totalPeriods
      : (principal * (periodicRate * Math.pow(1 + periodicRate, totalPeriods))) /
        (Math.pow(1 + periodicRate, totalPeriods) - 1);

  const schedule: AmortizationScheduleEntry[] = [];
  let remaining = principal;

  for (let i = 1; i <= totalPeriods; i++) {
    const interest = remaining * periodicRate;
    const principalPayment = payment - interest;
    remaining = Math.max(0, remaining - principalPayment);

    schedule.push({
      period: i,
      payment: round2(payment),
      principal: round2(principalPayment),
      interest: round2(interest),
      remainingBalance: round2(remaining),
    });
  }

  return schedule;
}

export function getMonthlyPayment(input: AmortizationInput): number {
  const { principal, annualRate, totalPeriods, periodsPerYear } = input;
  const periodicRate = annualRate / periodsPerYear;

  if (periodicRate === 0) return round2(principal / totalPeriods);

  return round2(
    (principal * (periodicRate * Math.pow(1 + periodicRate, totalPeriods))) /
      (Math.pow(1 + periodicRate, totalPeriods) - 1),
  );
}

// ── Full Debt Schedule with Dates and Extra Payments ─────────

export function generateDebtSchedule(
  debt: Debt,
  extraPayments?: Map<number, number>,
): DebtScheduleEntry[] {
  const periodsPerYear = frequencyToPeriodsPerYear(debt.paymentFrequency);
  const periodicRate = debt.annualInterestRate / periodsPerYear;

  const basePayment =
    periodicRate === 0
      ? debt.principalAmount / debt.totalPeriods
      : (debt.principalAmount * (periodicRate * Math.pow(1 + periodicRate, debt.totalPeriods))) /
        (Math.pow(1 + periodicRate, debt.totalPeriods) - 1);

  const schedule: DebtScheduleEntry[] = [];
  let remaining = debt.remainingAmount;
  const startDate = new Date(debt.startDate + 'T00:00:00');

  for (let i = 1; i <= debt.totalPeriods && remaining > 0.01; i++) {
    const date = advancePeriod(startDate, debt.paymentFrequency, i);
    const interest = remaining * periodicRate;
    const principalPart = Math.min(remaining, basePayment - interest);
    const extra = extraPayments?.get(i) ?? 0;
    const actualExtra = Math.min(extra, remaining - principalPart);

    remaining = Math.max(0, remaining - principalPart - actualExtra);

    schedule.push({
      period: i,
      date: toISODate(date),
      payment: round2(basePayment),
      principal: round2(principalPart),
      interest: round2(interest),
      extraPayment: round2(actualExtra),
      remainingBalance: round2(remaining),
    });

    if (remaining <= 0) break;
  }

  return schedule;
}

export function simulateExtraPayment(
  debt: Debt,
  extraAmount: number,
  atPeriod: number,
): { savedInterest: number; periodsReduced: number; newSchedule: DebtScheduleEntry[] } {
  const baseSchedule = generateDebtSchedule(debt);
  const extras = new Map<number, number>();
  extras.set(atPeriod, extraAmount);
  const newSchedule = generateDebtSchedule(debt, extras);

  const baseTotalInterest = baseSchedule.reduce((s, e) => s + e.interest, 0);
  const newTotalInterest = newSchedule.reduce((s, e) => s + e.interest, 0);

  return {
    savedInterest: round2(baseTotalInterest - newTotalInterest),
    periodsReduced: baseSchedule.length - newSchedule.length,
    newSchedule,
  };
}

// ── Credit Card Schedule ─────────────────────────────────────

/**
 * Generates a payment schedule for a credit card based on its individual purchases.
 *
 * Colombian credit card model:
 * - 1 cuota  → full amount due next billing cycle, ZERO interest
 * - N cuotas → each month you pay (amount / N) capital + interest on remaining
 *              balance of THAT purchase
 * - Total monthly payment = sum of all individual purchase payments
 * - Interest is calculated PER PURCHASE, not on the global balance
 */
export function generateCreditCardSchedule(
  debt: Debt,
  purchases: CreditCardPurchase[],
  horizonMonths: number = 24,
): DebtScheduleEntry[] {
  const defaultAnnualRate = debt.annualInterestRate;

  // For each period, accumulate capital + interest from all purchases
  const periodPayments = new Map<number, { capital: number; interest: number }>();

  const ensurePeriod = (p: number) => {
    if (!periodPayments.has(p)) periodPayments.set(p, { capital: 0, interest: 0 });
    return periodPayments.get(p)!;
  };

  for (const purchase of purchases) {
    if (purchase.isPaid) continue;

    if (purchase.installments <= 1) {
      // ── Single installment: pay full amount next cycle, NO interest ──
      const pp = ensurePeriod(1);
      pp.capital += purchase.amount;
    } else {
      // ── Multi-installment: capital/cuotas + interest on remaining per-purchase balance ──
      const annualRate = purchase.interestRate ?? defaultAnnualRate;
      const monthlyRate = annualRate / 12;
      const capitalPerPeriod = purchase.amount / purchase.installments;
      let purchaseRemaining = purchase.amount;

      for (let i = 0; i < purchase.remainingInstallments; i++) {
        const period = i + 1;
        const pp = ensurePeriod(period);
        const purchaseInterest = purchaseRemaining * monthlyRate;
        pp.capital += capitalPerPeriod;
        pp.interest += purchaseInterest;
        purchaseRemaining = Math.max(0, purchaseRemaining - capitalPerPeriod);
      }
    }
  }

  // Build the schedule entries
  const schedule: DebtScheduleEntry[] = [];
  let balance = debt.remainingAmount;
  const startDate = new Date(debt.startDate + 'T00:00:00');

  const maxPeriod = periodPayments.size > 0
    ? Math.max(...Array.from(periodPayments.keys()))
    : 0;
  const periods = Math.min(Math.max(maxPeriod, balance > 0.01 ? 1 : 0), horizonMonths);

  for (let i = 1; i <= periods && balance > 0.01; i++) {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + i);

    const pp = periodPayments.get(i) ?? { capital: 0, interest: 0 };
    const interest = round2(pp.interest);
    const principal = round2(Math.min(pp.capital, balance));
    const payment = round2(principal + interest);
    balance = Math.max(0, round2(balance - principal));

    schedule.push({
      period: i,
      date: toISODate(date),
      payment,
      principal,
      interest,
      extraPayment: 0,
      remainingBalance: balance,
    });
  }

  return schedule;
}

// ── Helpers ──────────────────────────────────────────────────

function frequencyToPeriodsPerYear(freq: PaymentFrequency): number {
  switch (freq) {
    case 'weekly': return 52;
    case 'biweekly': return 26;
    case 'monthly': return 12;
    default: return 12;
  }
}

function advancePeriod(start: Date, freq: PaymentFrequency, periods: number): Date {
  const d = new Date(start);
  switch (freq) {
    case 'weekly':
      d.setDate(d.getDate() + 7 * periods);
      break;
    case 'biweekly':
      d.setDate(d.getDate() + 14 * periods);
      break;
    case 'monthly':
      d.setMonth(d.getMonth() + periods);
      break;
  }
  return d;
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
