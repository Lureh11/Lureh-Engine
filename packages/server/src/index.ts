import express from 'express';
import cors from 'cors';
import { accountsRouter } from './routes/accounts.js';
import { eventsRouter } from './routes/events.js';
import { scenariosRouter } from './routes/scenarios.js';
import { goalsRouter } from './routes/goals.js';
import { simulationRouter } from './routes/simulation.js';
import { debtsRouter } from './routes/debts.js';
import { getDb } from './db/database.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

app.use('/api/accounts', accountsRouter);
app.use('/api/events', eventsRouter);
app.use('/api/scenarios', scenariosRouter);
app.use('/api/goals', goalsRouter);
app.use('/api/debts', debtsRouter);
app.use('/api/simulation', simulationRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

getDb();
console.log(`Lureh server running on http://localhost:${PORT}`);
app.listen(PORT);
