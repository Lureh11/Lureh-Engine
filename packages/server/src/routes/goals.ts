import { Router } from 'express';
import { randomUUID } from 'crypto';
import { getAllGoals, createGoal, updateGoal, deleteGoal } from '../db/database.js';
import type { FinancialGoal } from '@lureh/engine';

export const goalsRouter = Router();

goalsRouter.get('/', (_req, res) => {
  res.json(getAllGoals());
});

goalsRouter.post('/', (req, res) => {
  const now = new Date().toISOString();
  const goal: FinancialGoal = {
    id: randomUUID(),
    name: req.body.name ?? 'Nueva meta',
    targetAmount: req.body.targetAmount ?? 0,
    currentAmount: req.body.currentAmount ?? 0,
    targetDate: req.body.targetDate ?? '',
    priority: req.body.priority ?? 'personal',
    linkedAccountId: req.body.linkedAccountId,
    monthlyContribution: req.body.monthlyContribution ?? 0,
    createdAt: now,
    updatedAt: now,
  };
  res.status(201).json(createGoal(goal));
});

goalsRouter.put('/:id', (req, res) => {
  const updated = updateGoal(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Goal not found' });
  res.json(updated);
});

goalsRouter.delete('/:id', (req, res) => {
  const deleted = deleteGoal(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Goal not found' });
  res.status(204).end();
});
