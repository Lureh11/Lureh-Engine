import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
} from '../db/database.js';
import type { FinancialEvent } from '@lureh/engine';

export const eventsRouter = Router();

eventsRouter.get('/', (_req, res) => {
  res.json(getAllEvents());
});

eventsRouter.get('/:id', (req, res) => {
  const event = getEventById(req.params.id);
  if (!event) return res.status(404).json({ error: 'Event not found' });
  res.json(event);
});

eventsRouter.post('/', (req, res) => {
  const now = new Date().toISOString();
  const event: FinancialEvent = {
    id: randomUUID(),
    name: req.body.name ?? 'Nuevo evento',
    type: req.body.type ?? 'expense',
    amount: req.body.amount ?? 0,
    accountId: req.body.accountId,
    startDate: req.body.startDate ?? now.slice(0, 10),
    endDate: req.body.endDate,
    recurrence: req.body.recurrence ?? { frequency: 'once', interval: 1 },
    category: req.body.category ?? 'general',
    priorityLevel: req.body.priorityLevel ?? 'personal',
    priorityHuman: req.body.priorityHuman ?? 5,
    priorityFinancial: req.body.priorityFinancial ?? 5,
    interestRate: req.body.interestRate,
    totalPeriods: req.body.totalPeriods,
    amortizationType: req.body.amortizationType,
    scenarioId: req.body.scenarioId ?? null,
    notes: req.body.notes ?? '',
    tags: req.body.tags ?? [],
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  res.status(201).json(createEvent(event));
});

eventsRouter.put('/:id', (req, res) => {
  const updated = updateEvent(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Event not found' });
  res.json(updated);
});

eventsRouter.delete('/:id', (req, res) => {
  const deleted = deleteEvent(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Event not found' });
  res.status(204).end();
});
