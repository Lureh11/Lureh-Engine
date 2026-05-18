import express from 'express';
import cors from 'cors';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { accountsRouter } from './routes/accounts.js';
import { eventsRouter } from './routes/events.js';
import { scenariosRouter } from './routes/scenarios.js';
import { goalsRouter } from './routes/goals.js';
import { simulationRouter } from './routes/simulation.js';
import { debtsRouter } from './routes/debts.js';
import { getDb } from './db/database.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

// ── API routes ──────────────────────────────────────────────
app.use('/api/accounts', accountsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/debts', debtsRouter);
app.use('/api/simulation', simulationRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Serve frontend in production ────────────────────────────
const webDist = join(__dirname, '..', '..', 'web', 'dist');
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get('*', (_req, res) => {
    res.sendFile(join(webDist, 'index.html'));
  });
  console.log(`Serving frontend from ${webDist}`);
}

getDb();
console.log(`Lureh server running on http://localhost:${PORT}`);
app.listen(PORT);
