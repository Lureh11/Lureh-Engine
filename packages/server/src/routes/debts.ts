import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  getAllDebts,
  getDebtById,
  createDebt,
  updateDebt,
  deleteDebt,
  getPurchasesByDebtId,
  createPurchase,
  deletePurchase,
} from '../db/database.js';
import { generateDebtSchedule, simulateExtraPayment, getMonthlyPayment, generateCreditCardSchedule } from '@lureh/engine';
import type { Debt, CreditCardPurchase } from '@lureh/engine';

export const debtsRouter = Router();

debtsRouter.get('/', (_req, res) => {
  res.json(getAllDebts());
});

debtsRouter.get('/:id', (req, res) => {
  const debt = getDebtById(req.params.id);
  if (!debt) return res.status(404).json({ error: 'Debt not found' });
  res.json(debt);
});

debtsRouter.get('/:id/schedule', (req, res) => {
  const debt = getDebtById(req.params.id);
  if (!debt) return res.status(404).json({ error: 'Debt not found' });

  if (debt.debtType === 'credit_card') {
    const purchases = getPurchasesByDebtId(debt.id);
    const schedule = generateCreditCardSchedule(debt, purchases);
    res.json(schedule);
  } else {
    const schedule = generateDebtSchedule(debt);
    res.json(schedule);
  }
});

debtsRouter.post('/:id/simulate-extra', (req, res) => {
  const debt = getDebtById(req.params.id);
  if (!debt) return res.status(404).json({ error: 'Debt not found' });

  const { amount, atPeriod } = req.body;
  const result = simulateExtraPayment(debt, amount ?? 0, atPeriod ?? debt.currentPeriod + 1);
  res.json(result);
});

// ── Create Debt (loan or credit card) ───────────────────────

debtsRouter.post('/', (req, res) => {
  const now = new Date().toISOString();
  const debtType = req.body.debtType ?? 'loan';
  const totalPeriods = req.body.totalPeriods ?? (debtType === 'credit_card' ? 0 : 12);
  const paymentFrequency = req.body.paymentFrequency ?? 'monthly';
  const periodsPerYear = paymentFrequency === 'weekly' ? 52 : paymentFrequency === 'biweekly' ? 26 : 12;

  const principal = req.body.principalAmount ?? 0;
  const rate = req.body.annualInterestRate ?? 0;

  let installment = 0;
  if (debtType === 'loan' && totalPeriods > 0) {
    installment = getMonthlyPayment({
      principal,
      annualRate: rate,
      totalPeriods,
      periodsPerYear,
    });
  }

  const startDate = req.body.startDate ?? now.slice(0, 10);
  const startD = new Date(startDate + 'T00:00:00');
  let endDate: string;

  if (debtType === 'credit_card') {
    // Credit cards don't have a fixed end date — set far future
    const endD = new Date(startD);
    endD.setFullYear(endD.getFullYear() + 10);
    endDate = toISODate(endD);
  } else {
    const endD = new Date(startD);
    if (paymentFrequency === 'monthly') endD.setMonth(endD.getMonth() + totalPeriods);
    else if (paymentFrequency === 'biweekly') endD.setDate(endD.getDate() + 14 * totalPeriods);
    else endD.setDate(endD.getDate() + 7 * totalPeriods);
    endDate = toISODate(endD);
  }

  const debt: Debt = {
    id: randomUUID(),
    name: req.body.name ?? (debtType === 'credit_card' ? 'Tarjeta de Credito' : 'Nueva deuda'),
    lender: req.body.lender ?? '',
    debtType,
    principalAmount: debtType === 'credit_card' ? (req.body.creditLimit ?? principal) : principal,
    remainingAmount: req.body.remainingAmount ?? (debtType === 'credit_card' ? 0 : principal),
    annualInterestRate: rate,
    amortizationType: 'french',
    installmentValue: installment,
    totalPeriods,
    currentPeriod: req.body.currentPeriod ?? 0,
    startDate,
    endDate,
    paymentFrequency,
    paymentDayOfMonth: req.body.paymentDayOfMonth ?? req.body.cutOffDay ?? 1,
    status: 'active',
    accountId: req.body.accountId,
    notes: req.body.notes ?? '',
    creditLimit: debtType === 'credit_card' ? (req.body.creditLimit ?? 0) : undefined,
    minimumPaymentPct: debtType === 'credit_card' ? (req.body.minimumPaymentPct ?? 0.05) : undefined,
    cutOffDay: debtType === 'credit_card' ? (req.body.cutOffDay ?? 1) : undefined,
    createdAt: now,
    updatedAt: now,
  };

  res.status(201).json(createDebt(debt));
});

debtsRouter.put('/:id', (req, res) => {
  const updated = updateDebt(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Debt not found' });
  res.json(updated);
});

debtsRouter.delete('/:id', (req, res) => {
  const deleted = deleteDebt(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Debt not found' });
  res.status(204).end();
});

// ── Credit Card Purchases ───────────────────────────────────

debtsRouter.get('/:id/purchases', (req, res) => {
  const debt = getDebtById(req.params.id);
  if (!debt) return res.status(404).json({ error: 'Debt not found' });
  if (debt.debtType !== 'credit_card') return res.status(400).json({ error: 'Not a credit card' });
  res.json(getPurchasesByDebtId(debt.id));
});

debtsRouter.post('/:id/purchases', (req, res) => {
  const debt = getDebtById(req.params.id);
  if (!debt) return res.status(404).json({ error: 'Debt not found' });
  if (debt.debtType !== 'credit_card') return res.status(400).json({ error: 'Not a credit card' });

  const amount = req.body.amount ?? 0;
  const installments = req.body.installments ?? 1;

  const purchase: CreditCardPurchase = {
    id: randomUUID(),
    debtId: debt.id,
    description: req.body.description ?? 'Compra',
    amount,
    date: req.body.date ?? new Date().toISOString().slice(0, 10),
    installments,
    remainingInstallments: installments,
    interestRate: req.body.interestRate,
    isPaid: false,
    createdAt: new Date().toISOString(),
  };

  createPurchase(purchase);

  // Update the card's remaining amount (sum of all active purchases)
  const allPurchases = getPurchasesByDebtId(debt.id);
  const newBalance = allPurchases
    .filter((p) => !p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  updateDebt(debt.id, { remainingAmount: newBalance });

  res.status(201).json(purchase);
});

debtsRouter.delete('/:debtId/purchases/:purchaseId', (req, res) => {
  const debt = getDebtById(req.params.debtId);
  if (!debt) return res.status(404).json({ error: 'Debt not found' });

  const deleted = deletePurchase(req.params.purchaseId);
  if (!deleted) return res.status(404).json({ error: 'Purchase not found' });

  // Recalculate balance
  const allPurchases = getPurchasesByDebtId(debt.id);
  const newBalance = allPurchases
    .filter((p) => !p.isPaid)
    .reduce((sum, p) => sum + p.amount, 0);

  updateDebt(debt.id, { remainingAmount: newBalance });

  res.status(204).end();
});

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
