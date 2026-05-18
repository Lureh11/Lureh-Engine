import { useState } from 'react';
import { api } from '../api/client.js';

interface Props {
  onComplete: () => void;
}

const inputClass = 'mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

export function QuickSetup({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [accountName, setAccountName] = useState('Cuenta principal');
  const [balance, setBalance] = useState('');
  const [income, setIncome] = useState('');
  const [incomeName, setIncomeName] = useState('Salario');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const account = await api.accounts.create({
        name: accountName,
        type: 'checking',
        balance: parseFloat(balance) || 0,
        currency: 'COP',
      });

      if (income && parseFloat(income) > 0) {
        await api.events.create({
          name: incomeName,
          type: 'income',
          amount: parseFloat(income),
          accountId: account.id,
          startDate: new Date().toISOString().slice(0, 10),
          recurrence: { frequency: 'monthly', interval: 1 },
          category: 'salario',
          priorityLevel: 'survival',
        });
      }

      onComplete();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Bienvenido a Lureh</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          Configuremos tu estado financiero actual para empezar a simular.
        </p>

        {step === 0 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Nombre de tu cuenta principal
              </label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Saldo actual (COP)
              </label>
              <input
                type="number"
                value={balance}
                onChange={(e) => setBalance(e.target.value)}
                placeholder="1500000"
                className={inputClass}
              />
            </div>
            <button
              onClick={() => setStep(1)}
              className="w-full rounded-lg bg-lureh-600 py-2 text-sm font-medium text-white transition hover:bg-lureh-700"
            >
              Siguiente
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Fuente de ingreso principal
              </label>
              <input
                type="text"
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ingreso mensual (COP)
              </label>
              <input
                type="number"
                value={income}
                onChange={(e) => setIncome(e.target.value)}
                placeholder="3000000"
                className={inputClass}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setStep(0)}
                className="flex-1 rounded-lg border border-slate-300 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Atras
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-lg bg-lureh-600 py-2 text-sm font-medium text-white transition hover:bg-lureh-700 disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Iniciar Simulacion'}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-center gap-2">
          {[0, 1].map((s) => (
            <div
              key={s}
              className={`h-1.5 w-8 rounded-full ${s === step ? 'bg-lureh-500' : 'bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
