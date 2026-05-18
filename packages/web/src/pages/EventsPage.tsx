import { useEffect, useState, useCallback } from 'react';
import type { FinancialEvent, Account, EventType, RecurrenceFrequency, PriorityLevel } from '@lureh/engine';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { formatMoney } from '../lib/format.js';
import {
  EVENT_CATEGORIES,
  FREQUENCY_LABELS,
  TYPE_LABELS,
  TYPE_COLORS,
  PRIORITY_LABELS,
} from '../lib/categories.js';

const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function EventsPage() {
  const [events, setEvents] = useState<FinancialEvent[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<EventType | 'all'>('all');

  const load = useCallback(async () => {
    const [evts, accs] = await Promise.all([api.events.list(), api.accounts.list()]);
    setEvents(evts);
    setAccounts(accs);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === 'all' ? events : events.filter((e) => e.type === filter);
  const realEvents = filtered.filter((e) => e.scenarioId === null);

  const handleUpdate = async (id: string, data: Partial<FinancialEvent>) => {
    await api.events.update(id, data);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.events.delete(id);
    load();
  };

  const grouped = groupByCategory(realEvents);

  return (
    <div>
      <PageHeader
        title="Eventos Financieros"
        subtitle={`${realEvents.length} eventos activos`}
        action={{ label: 'Nuevo evento', onClick: () => setShowForm(true) }}
      />

      <div className="mb-4 flex gap-2 flex-wrap">
        {(['all', 'income', 'expense', 'obligation', 'growth'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              filter === t
                ? 'bg-lureh-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {t === 'all' ? 'Todos' : TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {showForm && (
        <NewEventForm
          accounts={accounts}
          onCreated={() => { load(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {grouped.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
          No hay eventos. Crea uno para empezar a simular.
        </p>
      )}

      {grouped.map(([category, catEvents]) => (
        <div key={category} className="mb-5">
          <h3 className="mb-2 text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
            {EVENT_CATEGORIES.find((c) => c.value === category)?.label ?? category}
          </h3>
          <div className="space-y-1.5">
            {catEvents.map((event) => (
              <EventRow
                key={event.id}
                event={event}
                accounts={accounts}
                onUpdate={(data) => handleUpdate(event.id, data)}
                onDelete={() => handleDelete(event.id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const inlineSelectClass = 'rounded border-0 bg-transparent py-0 pl-0 pr-4 text-[11px] hover:text-slate-600 focus:ring-0 cursor-pointer dark:hover:text-slate-300';

function EventRow({ event, accounts, onUpdate, onDelete }: {
  event: FinancialEvent;
  accounts: Account[];
  onUpdate: (data: Partial<FinancialEvent>) => void;
  onDelete: () => void;
}) {
  const typeStyle = TYPE_COLORS[event.type] ?? TYPE_COLORS.expense;
  const sign = event.type === 'income' || event.type === 'growth' ? '+' : '-';
  const catLabel = EVENT_CATEGORIES.find((c) => c.value === event.category)?.label ?? event.category;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <select
        value={event.type}
        onChange={(e) => onUpdate({ type: e.target.value as EventType })}
        className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase cursor-pointer focus:ring-0 ${typeStyle}`}
        title="Cambiar tipo"
      >
        <option value="income">Ingreso</option>
        <option value="expense">Gasto</option>
        <option value="obligation">Obligacion</option>
        <option value="growth">Crecimiento</option>
      </select>
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={event.name}
          onSave={(name) => onUpdate({ name })}
          className="text-sm font-medium text-slate-800 dark:text-slate-100"
        />
        <div className="flex items-center gap-1 mt-0.5 flex-wrap">
          <select
            value={event.recurrence.frequency}
            onChange={(e) => onUpdate({ recurrence: { ...event.recurrence, frequency: e.target.value as RecurrenceFrequency } })}
            className={`${inlineSelectClass} text-slate-400 dark:text-slate-500`}
            title="Frecuencia"
          >
            {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
          <select
            value={event.category}
            onChange={(e) => onUpdate({ category: e.target.value })}
            className={`${inlineSelectClass} text-slate-400 dark:text-slate-500`}
            title="Categoria"
          >
            {EVENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
          <select
            value={event.priorityLevel}
            onChange={(e) => onUpdate({ priorityLevel: e.target.value as PriorityLevel })}
            className={`${inlineSelectClass} text-slate-400 dark:text-slate-500`}
            title="Prioridad"
          >
            {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <span className="text-[11px] text-slate-300 dark:text-slate-600">·</span>
          <select
            value={event.accountId ?? ''}
            onChange={(e) => onUpdate({ accountId: e.target.value || undefined })}
            className={`${inlineSelectClass} text-slate-300 dark:text-slate-600`}
            title="Cuenta"
          >
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="text-right">
        <InlineEdit
          value={String(event.amount)}
          type="number"
          onSave={(val) => onUpdate({ amount: parseFloat(val) || 0 })}
          formatDisplay={(v) => `${sign} ${formatMoney(parseFloat(v) || 0)}`}
          className={`text-sm font-bold ${sign === '+' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}
        />
      </div>
      <button
        onClick={onDelete}
        className="ml-1 rounded p-1 text-slate-300 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        title="Eliminar"
      >
        ✕
      </button>
    </div>
  );
}

function NewEventForm({ accounts, onCreated, onCancel }: {
  accounts: Account[];
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<EventType>('expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('general');
  const [frequency, setFrequency] = useState<RecurrenceFrequency>('monthly');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('personal');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.events.create({
        name: name || 'Nuevo evento',
        type,
        amount: parseFloat(amount) || 0,
        accountId: accountId || undefined,
        startDate,
        recurrence: { frequency, interval: 1 },
        category,
        priorityLevel,
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
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Nombre</label>
          <input
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Arriendo, Netflix, Salario..."
            autoFocus
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Monto (COP)</label>
          <input
            type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="150000"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Tipo</label>
          <select value={type} onChange={(e) => setType(e.target.value as EventType)} className={inputClass}>
            <option value="income">Ingreso</option>
            <option value="expense">Gasto</option>
            <option value="obligation">Obligacion</option>
            <option value="growth">Crecimiento</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Categoria</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Frecuencia</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value as RecurrenceFrequency)} className={inputClass}>
            {Object.entries(FREQUENCY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Cuenta</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            <option value="">Sin cuenta</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Prioridad</label>
          <select value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value as PriorityLevel)} className={inputClass}>
            {Object.entries(PRIORITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400">Fecha inicio</label>
          <input
            type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Crear evento'}
        </button>
      </div>
    </form>
  );
}

function groupByCategory(events: FinancialEvent[]): [string, FinancialEvent[]][] {
  const map = new Map<string, FinancialEvent[]>();
  for (const e of events) {
    const list = map.get(e.category) ?? [];
    list.push(e);
    map.set(e.category, list);
  }
  return Array.from(map.entries());
}
