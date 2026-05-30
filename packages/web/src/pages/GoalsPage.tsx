import { useEffect, useState, useCallback } from 'react';
import type { FinancialGoal, Account, PriorityLevel } from '@lureh/engine';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { formatMoney, formatDateShort } from '../lib/format.js';
import { PRIORITY_LABELS } from '../lib/categories.js';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function GoalsPage() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    const [g, a] = await Promise.all([api.goals.list(), api.accounts.list()]);
    setGoals(g);
    setAccounts(a);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await api.goals.delete(id);
    load();
  };

  const handleUpdate = async (id: string, data: Partial<FinancialGoal>) => {
    await api.goals.update(id, data);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Metas Financieras"
        subtitle="Define objetivos y rastrea tu progreso"
        action={{ label: 'Nueva meta', onClick: () => setShowForm(true) }}
      />

      {showForm && (
        <NewGoalForm
          accounts={accounts}
          onCreated={() => { load(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {goals.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay metas definidas.</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Crea una meta para ver cuanto falta y cuando la alcanzaras.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goals.map((goal) => (
          <GoalCard key={goal.id} goal={goal} accounts={accounts} onUpdate={handleUpdate} onDelete={handleDelete} />
        ))}
      </div>
    </div>
  );
}

function GoalCard({ goal, accounts, onUpdate, onDelete }: {
  goal: FinancialGoal;
  accounts: Account[];
  onUpdate: (id: string, data: Partial<FinancialGoal>) => void;
  onDelete: (id: string) => void;
}) {
  const linkedAccount = accounts.find(a => a.id === goal.linkedAccountId);
  const [showAbono, setShowAbono] = useState(false);
  const [abonoAmount, setAbonoAmount] = useState('');

  const progress = goal.targetAmount > 0
    ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
    : 0;
  const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
  const monthsNeeded = goal.monthlyContribution > 0
    ? Math.ceil(remaining / goal.monthlyContribution)
    : null;

  const handleAbono = () => {
    const amount = parseFloat(abonoAmount);
    if (!amount || amount <= 0) return;
    onUpdate(goal.id, { currentAmount: goal.currentAmount + amount });
    setAbonoAmount('');
    setShowAbono(false);
  };

  const handleSetAmount = (newAmount: number) => {
    onUpdate(goal.id, { currentAmount: newAmount });
  };

  const smallInput = 'rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-lureh-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-slate-800 dark:text-slate-100">{goal.name}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            {PRIORITY_LABELS[goal.priority]} · Fecha objetivo: {formatDateShort(goal.targetDate)}
            {linkedAccount && (
              <span className="ml-1">· Cuenta: <strong className="text-lureh-600 dark:text-lureh-400">{linkedAccount.name}</strong></span>
            )}
          </p>
          {!goal.linkedAccountId && (
            <select
              value=""
              onChange={(e) => { if (e.target.value) onUpdate(goal.id, { linkedAccountId: e.target.value }); }}
              className="mt-1 rounded border border-dashed border-slate-300 px-2 py-0.5 text-[11px] text-slate-400 hover:border-lureh-400 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500"
            >
              <option value="">Asociar cuenta de ahorro...</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          )}
        </div>
        <button
          onClick={() => onDelete(goal.id)}
          className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        >
          ✕
        </button>
      </div>

      <div className="mt-4">
        <div className="flex justify-between items-center text-sm">
          <span
            className="text-lureh-600 dark:text-lureh-400 font-medium cursor-pointer hover:underline"
            title="Click para editar el saldo actual"
            onClick={() => {
              const val = prompt('Nuevo saldo actual:', String(goal.currentAmount));
              if (val !== null) handleSetAmount(parseFloat(val) || 0);
            }}
          >
            {formatMoney(goal.currentAmount)}
          </span>
          <span className="font-medium text-slate-700 dark:text-slate-200">{formatMoney(goal.targetAmount)}</span>
        </div>
        <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress >= 100 ? 'bg-emerald-500' : 'bg-lureh-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
          {progress >= 100
            ? 'Meta completada!'
            : `${progress.toFixed(0)}% completado — Faltan ${formatMoney(remaining)}`
          }
        </p>
      </div>

      {/* Abono section */}
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
        {showAbono ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={abonoAmount}
              onChange={(e) => setAbonoAmount(e.target.value)}
              placeholder="Monto del abono"
              autoFocus
              className={`flex-1 ${smallInput}`}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAbono(); if (e.key === 'Escape') setShowAbono(false); }}
            />
            <button onClick={handleAbono} className="rounded bg-lureh-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lureh-700">
              Abonar
            </button>
            <button onClick={() => setShowAbono(false)} className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">
              ✕
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs text-slate-500 dark:text-slate-400">
              <span>Aporte mensual: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(goal.monthlyContribution)}</strong></span>
              {monthsNeeded !== null && (
                <span>Estimado: <strong className="text-slate-700 dark:text-slate-200">{monthsNeeded} meses</strong></span>
              )}
            </div>
            <button
              onClick={() => setShowAbono(true)}
              className="rounded-lg border border-lureh-200 px-3 py-1 text-xs font-medium text-lureh-600 hover:bg-lureh-50 dark:border-lureh-800 dark:text-lureh-400 dark:hover:bg-lureh-950"
            >
              + Abonar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function NewGoalForm({ accounts, onCreated, onCancel }: { accounts: Account[]; onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('personal');
  const [linkedAccountId, setLinkedAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.goals.create({
        name: name || 'Nueva meta',
        targetAmount: parseFloat(targetAmount) || 0,
        currentAmount: parseFloat(currentAmount) || 0,
        targetDate: targetDate || new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
        monthlyContribution: parseFloat(monthlyContribution) || 0,
        priority,
        linkedAccountId: linkedAccountId || undefined,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-5 rounded-xl border border-lureh-200 bg-lureh-50 p-4 dark:border-lureh-800 dark:bg-lureh-950">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Nombre de la meta</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Fondo de emergencia, Viaje, Vehiculo..." autoFocus
            className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Monto objetivo (COP)</label>
          <input type="number" value={targetAmount} onChange={(e) => setTargetAmount(e.target.value)}
            placeholder="10000000"
            className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Monto actual</label>
          <input type="number" value={currentAmount} onChange={(e) => setCurrentAmount(e.target.value)}
            placeholder="500000"
            className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Aporte mensual</label>
          <input type="number" value={monthlyContribution} onChange={(e) => setMonthlyContribution(e.target.value)}
            placeholder="200000"
            className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Fecha objetivo</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
            className={inputClass} />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Prioridad</label>
          <select value={priority} onChange={(e) => setPriority(e.target.value as PriorityLevel)} className={inputClass}>
            {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Cuenta de ahorro (opcional)</label>
          <select value={linkedAccountId} onChange={(e) => setLinkedAccountId(e.target.value)} className={inputClass}>
            <option value="">Sin cuenta asociada</option>
            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">
        Si asocias una cuenta, su saldo no contara como disponible en la simulacion.
      </p>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Crear meta'}
        </button>
      </div>
    </form>
  );
}
