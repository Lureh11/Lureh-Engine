import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  getAllAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  deleteAccount,
} from '../db/database.js';
import type { Account } from '@lureh/engine';

export const accountsRouter = Router();

accountsRouter.get('/', (_req, res) => {
  res.json(getAllAccounts());
});

accountsRouter.get('/:id', (req, res) => {
  const account = getAccountById(req.params.id);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  res.json(account);
});

accountsRouter.post('/', (req, res) => {
  const now = new Date().toISOString();
  const account: Account = {
    id: randomUUID(),
    name: req.body.name ?? 'Nueva cuenta',
    type: req.body.type ?? 'checking',
    balance: req.body.balance ?? 0,
    currency: req.body.currency ?? 'COP',
    color: req.body.color ?? '#6366f1',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
  res.status(201).json(createAccount(account));
});

accountsRouter.put('/:id', (req, res) => {
  const updated = updateAccount(req.params.id, req.body);
  if (!updated) return res.status(404).json({ error: 'Account not found' });
  res.json(updated);
});

accountsRouter.delete('/:id', (req, res) => {
  const deleted = deleteAccount(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Account not found' });
  res.status(204).end();
});
