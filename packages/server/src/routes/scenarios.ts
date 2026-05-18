import { Router } from 'express';
import { randomUUID } from 'crypto';
import {
  getAllScenarios,
  createScenario,
  deleteScenario,
} from '../db/database.js';
import type { Scenario } from '@lureh/engine';

export const scenariosRouter = Router();

scenariosRouter.get('/', (_req, res) => {
  res.json(getAllScenarios());
});

scenariosRouter.post('/', (req, res) => {
  const now = new Date().toISOString();
  const scenario: Scenario = {
    id: randomUUID(),
    name: req.body.name ?? 'Nuevo escenario',
    description: req.body.description ?? '',
    isActive: true,
    color: req.body.color ?? '#8b5cf6',
    createdAt: now,
    updatedAt: now,
  };
  res.status(201).json(createScenario(scenario));
});

scenariosRouter.delete('/:id', (req, res) => {
  const deleted = deleteScenario(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Scenario not found' });
  res.status(204).end();
});
