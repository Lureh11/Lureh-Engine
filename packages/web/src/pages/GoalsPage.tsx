import { useEffect, useState, useCallback } from 'react';
import type { FinancialGoal, PriorityLevel } from '@lureh/engine';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { formatMoney, formatDateShort } from '../lib/format.js';
import { PRIORITY_LABELS } from '../lib/categories.js';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function GoalsPage() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setGoals(await api.goals.list());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: string) => {
    await api.goals.delete(id);
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
        {goals.map((goal) => {
          const progress = goal.targetAmount > 0
            ? Math.min(100, (goal.currentAmount / goal.targetAmount) * 100)
            : 0;
          const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
          const monthsNeeded = goal.monthlyContribution > 0
            ? Math.ceil(remaining / goal.monthlyContribution)
            : null;

          return (
            <div key={goal.id} className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">{goal.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    {PRIORITY_LABELS[goal.priority]} · Fecha objetivo: {formatDateShort(goal.targetDate)}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(goal.id)}
                  className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">{formatMoney(goal.currentAmount)}</span>
                  <span className="font-medium text-slate-700 dark:text-slate-200">{formatMoney(goal.targetAmount)}</span>
                </div>
                <div className="mt-1.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-lureh-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                  {progress.toFixed(0)}% completado — Faltan {formatMoney(remaining)}
                </p>
              </div>

              <div className="mt-3 flex gap-4 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Aporte mensual: <strong className="text-slate-700 dark:text-slate-200">{formatMoney(goal.monthlyContribution)}</strong></span>
                {monthsNeeded !== null && (
                  <span>Estimado: <strong className="text-slate-700 dark:text-slate-200">{monthsNeeded} meses</strong></span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NewGoalForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [monthlyContribution, setMonthlyContribution] = useState('');
  const [priority, setPriority] = useState<PriorityLevel>('personal');
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
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Crear meta'}
        </button>
      </div>
    </form>
  );
}
