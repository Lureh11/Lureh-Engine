import { useEffect, useState, useCallback } from 'react';
import type { Scenario, FinancialEvent, Account, EventType, RecurrenceFrequency } from '@lureh/engine';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { formatMoney } from '../lib/format.js';
import { TYPE_LABELS, TYPE_COLORS, FREQUENCY_LABELS, EVENT_CATEGORIES } from '../lib/categories.js';

const inputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';
const inputSmClass = 'rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-lureh-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function ScenariosPage() {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [addingEventTo, setAddingEventTo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sc, ev, ac] = await Promise.all([
      api.scenarios.list(), api.events.list(), api.accounts.list(),
    ]);
    setScenarios(sc);
    setEvents(ev);
    setAccounts(ac);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDeleteScenario = async (id: string) => {
    await api.scenarios.delete(id);
    load();
  };

  const handleDeleteEvent = async (id: string) => {
    await api.events.delete(id);
    load();
  };

  return (
    <div>
      <PageHeader
        title="Escenarios"
        subtitle="Simula decisiones: que pasa si...?"
        action={{ label: 'Nuevo escenario', onClick: () => setShowForm(true) }}
      />

      {showForm && (
        <NewScenarioForm
          onCreated={() => { load(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {scenarios.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay escenarios.</p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Crea uno para simular decisiones como "Que pasa si compro una moto?" o "Que pasa si aumento ingresos?"
          </p>
        </div>
      )}

      <div className="space-y-3">
        {scenarios.map((scenario) => {
          const scenarioEvents = events.filter((e) => e.scenarioId === scenario.id);
          const totalMonthly = scenarioEvents.reduce((sum, e) => {
            const sign = e.type === 'income' || e.type === 'growth' ? 1 : -1;
            return sum + sign * e.amount;
          }, 0);
          const isExpanded = expandedId === scenario.id;

          return (
            <div
              key={scenario.id}
              className="rounded-xl border bg-white dark:bg-slate-900"
              style={{ borderColor: scenario.color + '40' }}
            >
              <div
                className="flex items-center gap-3 px-5 py-3 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : scenario.id)}
              >
                <div className="h-3 w-3 rounded-full flex-shrink-0" style={{ backgroundColor: scenario.color }} />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{scenario.name}</p>
                  {scenario.description && (
                    <p className="text-xs text-slate-400 dark:text-slate-500">{scenario.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 dark:text-slate-500">{scenarioEvents.length} eventos</p>
                  <p className={`text-sm font-bold ${totalMonthly >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {totalMonthly >= 0 ? '+' : ''}{formatMoney(totalMonthly)}/mes
                  </p>
                </div>
                <span className={`text-slate-300 dark:text-slate-600 transition ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteScenario(scenario.id); }}
                  className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
                >
                  ✕
                </button>
              </div>

              {isExpanded && (
                <div className="border-t border-slate-100 px-5 py-3 dark:border-slate-800">
                  {scenarioEvents.length === 0 && (
                    <p className="py-2 text-xs text-slate-400 dark:text-slate-500">Sin eventos en este escenario.</p>
                  )}
                  {scenarioEvents.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 py-1.5 border-b border-slate-50 last:border-0 dark:border-slate-800">
                      <span className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold ${TYPE_COLORS[event.type]}`}>
                        {TYPE_LABELS[event.type]}
                      </span>
                      <span className="flex-1 text-sm text-slate-700 dark:text-slate-300">{event.name}</span>
                      <span className="text-xs text-slate-400 dark:text-slate-500">{FREQUENCY_LABELS[event.recurrence.frequency]}</span>
                      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{formatMoney(event.amount)}</span>
                      <button onClick={() => handleDeleteEvent(event.id)} className="text-slate-300 hover:text-red-500 text-xs dark:text-slate-600 dark:hover:text-red-400">✕</button>
                    </div>
                  ))}
                  {addingEventTo === scenario.id ? (
                    <QuickEventForm
                      scenarioId={scenario.id}
                      accounts={accounts}
                      onCreated={() => { load(); setAddingEventTo(null); }}
                      onCancel={() => setAddingEventTo(null)}
                    />
                  ) : (
                    <button
                      onClick={() => setAddingEventTo(scenario.id)}
                      className="mt-2 text-xs font-medium text-lureh-600 hover:text-lureh-700 dark:text-lureh-400 dark:hover:text-lureh-300"
                    >
                      + Agregar evento al escenario
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
}

function NewScenarioForm({ onCreated, onCancel }: { onCreated: () => void; onCancel: () => void }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.scenarios.create({ name: name || 'Nuevo escenario', description });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-lureh-200 bg-lureh-50 p-4 dark:border-lureh-800 dark:bg-lureh-950">
      <div className="grid grid-cols-2 gap-3">
        <input type="text" value={name} onChange={(e) => setName(e.target.value)}
          placeholder="Ej: Comprar moto, Aumentar ingresos..." autoFocus
          className={inputClass} />
        <input type="text" value={description} onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripcion (opcional)"
          className={inputClass} />
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">Cancelar</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700 disabled:opacity-50">
          {saving ? 'Creando...' : 'Crear escenario'}
        </button>
      </div>
    </form>
  );
}

function QuickEventForm({ scenarioId, accounts, onCreated, onCancel }: {
  scenarioId: string; accounts: Account[]; onCreated: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('expense');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.events.create({
        name: name || 'Evento hipotetico',
        type,
        amount: parseFloat(amount) || 0,
        accountId: accounts[0]?.id,
        startDate: new Date().toISOString().slice(0, 10),
        recurrence: { frequency, interval: 1 },
        category: 'general',
        priorityLevel: 'personal',
        scenarioId,
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-2 flex items-end gap-2 rounded-lg bg-slate-50 p-2 dark:bg-slate-800">
      <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre" autoFocus
        className={`flex-1 ${inputSmClass}`} />
      <select value={type} onChange={(e) => setType(e.target.value as EventType)} className={inputSmClass}>
        <option value="expense">Gasto</option>
        <option value="income">Ingreso</option>
        <option value="obligation">Obligacion</option>
        <option value="growth">Crecimiento</option>
      </select>
      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto"
        className={`w-28 ${inputSmClass}`} />
      <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)} className={inputSmClass}>
        <option value="once">Una vez</option>
        <option value="monthly">Mensual</option>
        <option value="annual">Anual</option>
      </select>
      <button type="submit" disabled={saving} className="rounded bg-lureh-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-lureh-700 disabled:opacity-50">
        {saving ? '...' : 'Agregar'}
      </button>
      <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">✕</button>
    </form>
  );
}
