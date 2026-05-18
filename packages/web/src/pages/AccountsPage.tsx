import { useEffect, useState, useCallback } from 'react';
import type { Account, AccountType } from '@lureh/engine';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { formatMoney } from '../lib/format.js';

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Corriente' },
  { value: 'savings', label: 'Ahorros' },
  { value: 'cash', label: 'Efectivo' },
  { value: 'investment', label: 'Inversion' },
  { value: 'credit', label: 'Credito' },
  { value: 'loan', label: 'Prestamo' },
];

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

const inputClass = 'rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [showForm, setShowForm] = useState(false);

  const load = useCallback(async () => {
    setAccounts(await api.accounts.list());
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUpdate = async (id: string, data: Partial<Account>) => {
    await api.accounts.update(id, data);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.accounts.delete(id);
    load();
  };

  const totalBalance = accounts.reduce((sum, a) => sum + a.balance, 0);

  return (
    <div>
      <PageHeader
        title="Cuentas"
        subtitle={`${accounts.length} cuentas — Total: ${formatMoney(totalBalance)}`}
        action={{ label: 'Nueva cuenta', onClick: () => setShowForm(true) }}
      />

      {showForm && (
        <NewAccountForm
          onCreated={() => { load(); setShowForm(false); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      <div className="space-y-2">
        {accounts.map((account) => (
          <AccountRow
            key={account.id}
            account={account}
            onUpdate={(data) => handleUpdate(account.id, data)}
            onDelete={() => handleDelete(account.id)}
          />
        ))}
        {accounts.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
            No hay cuentas. Crea una para empezar.
          </p>
        )}
      </div>
    </div>
  );
}

function AccountRow({ account, onUpdate, onDelete }: {
  account: Account;
  onUpdate: (data: Partial<Account>) => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white px-5 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div
        className="h-3 w-3 rounded-full flex-shrink-0"
        style={{ backgroundColor: account.color }}
      />
      <div className="flex-1 min-w-0">
        <InlineEdit
          value={account.name}
          onSave={(name) => onUpdate({ name })}
          className="font-medium text-slate-800 dark:text-slate-100"
        />
        <div className="mt-0.5 flex items-center gap-2">
          <select
            value={account.type}
            onChange={(e) => onUpdate({ type: e.target.value as AccountType })}
            className="rounded border-0 bg-transparent py-0 pl-0 pr-5 text-xs text-slate-400 hover:text-slate-600 focus:ring-0 cursor-pointer dark:text-slate-500 dark:hover:text-slate-300"
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="text-right">
        <InlineEdit
          value={String(account.balance)}
          type="number"
          onSave={(val) => onUpdate({ balance: parseFloat(val) || 0 })}
          formatDisplay={(v) => formatMoney(parseFloat(v) || 0)}
          className={`text-lg font-bold ${parseFloat(String(account.balance)) >= 0 ? 'text-slate-800 dark:text-slate-100' : 'text-red-600 dark:text-red-400'}`}
        />
      </div>
      <button
        onClick={onDelete}
        className="ml-2 rounded p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400"
        title="Eliminar cuenta"
      >
        ✕
      </button>
    </div>
  );
}

function NewAccountForm({ onCreated, onCancel }: {
  onCreated: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [balance, setBalance] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.accounts.create({
        name: name || 'Nueva cuenta',
        type,
        balance: parseFloat(balance) || 0,
        currency: 'COP',
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-4 rounded-xl border border-lureh-200 bg-lureh-50 p-4 dark:border-lureh-800 dark:bg-lureh-950">
      <div className="grid grid-cols-3 gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la cuenta"
          autoFocus
          className={inputClass}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AccountType)}
          className={inputClass}
        >
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
        <input
          type="number"
          value={balance}
          onChange={(e) => setBalance(e.target.value)}
          placeholder="Saldo"
          className={inputClass}
        />
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800">
          Cancelar
        </button>
        <button type="submit" disabled={saving} className="rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Crear'}
        </button>
      </div>
    </form>
  );
}
