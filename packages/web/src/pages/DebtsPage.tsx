import { useEffect, useState, useCallback } from 'react';
import type { Debt, DebtScheduleEntry, Account, CreditCardPurchase } from '@lureh/engine';
import { api } from '../api/client.js';
import { PageHeader } from '../components/PageHeader.js';
import { InlineEdit } from '../components/InlineEdit.js';
import { formatMoney, formatDateShort } from '../lib/format.js';

const FREQ_LABELS: Record<string, string> = { monthly: 'Mensual', biweekly: 'Quincenal', weekly: 'Semanal' };
const inputClass = 'w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-lureh-500 focus:outline-none focus:ring-1 focus:ring-lureh-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';
const labelClass = 'block text-xs font-medium text-slate-600 mb-1 dark:text-slate-400';
const btnCancel = 'rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-400 dark:hover:bg-slate-800';
const btnPrimary = 'rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700 disabled:opacity-50';

type FormMode = null | 'loan' | 'credit_card';

export function DebtsPage() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [d, a] = await Promise.all([api.debts.list(), api.accounts.list()]);
    setDebts(d);
    setAccounts(a);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeDebts = debts.filter((d) => d.status === 'active');
  const loans = debts.filter((d) => d.debtType !== 'credit_card');
  const cards = debts.filter((d) => d.debtType === 'credit_card');
  const totalDebt = activeDebts.reduce((s, d) => s + d.remainingAmount, 0);

  return (
    <div>
      <PageHeader
        title="Deudas y Tarjetas"
        subtitle={`${debts.length} registros — Saldo total: ${formatMoney(totalDebt)}`}
      />

      {/* Action buttons */}
      <div className="mb-5 flex gap-2">
        <button
          onClick={() => setFormMode('loan')}
          className="rounded-lg bg-lureh-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-lureh-700"
        >
          + Nueva deuda
        </button>
        <button
          onClick={() => setFormMode('credit_card')}
          className="rounded-lg border border-lureh-300 px-4 py-2 text-sm font-medium text-lureh-700 shadow-sm transition hover:bg-lureh-50 dark:border-lureh-700 dark:text-lureh-400 dark:hover:bg-lureh-950"
        >
          + Nueva tarjeta de credito
        </button>
      </div>

      {formMode === 'loan' && (
        <NewDebtForm accounts={accounts} onCreated={() => { load(); setFormMode(null); }} onCancel={() => setFormMode(null)} />
      )}
      {formMode === 'credit_card' && (
        <NewCreditCardForm accounts={accounts} onCreated={() => { load(); setFormMode(null); }} onCancel={() => setFormMode(null)} />
      )}

      {debts.length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-500 dark:text-slate-400">No hay deudas ni tarjetas registradas.</p>
        </div>
      )}

      {/* Credit Cards Section */}
      {cards.length > 0 && (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
            Tarjetas de Credito
          </h3>
          <div className="space-y-3">
            {cards.map((card) => (
              <CreditCardCard
                key={card.id}
                debt={card}
                isExpanded={expandedId === card.id}
                onToggle={() => setExpandedId(expandedId === card.id ? null : card.id)}
                onUpdate={async (data) => { await api.debts.update(card.id, data); load(); }}
                onDelete={async () => { await api.debts.delete(card.id); load(); }}
                onPurchaseChange={load}
              />
            ))}
          </div>
        </div>
      )}

      {/* Loans Section */}
      {loans.length > 0 && (
        <div>
          {cards.length > 0 && (
            <h3 className="mb-3 text-sm font-semibold text-slate-500 uppercase tracking-wide dark:text-slate-400">
              Creditos y Prestamos
            </h3>
          )}
          <div className="space-y-3">
            {loans.map((debt) => (
              <LoanCard
                key={debt.id}
                debt={debt}
                isExpanded={expandedId === debt.id}
                onToggle={() => setExpandedId(expandedId === debt.id ? null : debt.id)}
                onUpdate={async (data) => { await api.debts.update(debt.id, data); load(); }}
                onDelete={async () => { await api.debts.delete(debt.id); load(); }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Credit Card ─────────────────────────────────────────────

function CreditCardCard({ debt, isExpanded, onToggle, onUpdate, onDelete, onPurchaseChange }: {
  debt: Debt; isExpanded: boolean; onToggle: () => void;
  onUpdate: (data: Partial<Debt>) => void; onDelete: () => void;
  onPurchaseChange: () => void;
}) {
  const [purchases, setPurchases] = useState<CreditCardPurchase[]>([]);
  const [showPurchaseForm, setShowPurchaseForm] = useState(false);
  const [loadedPurchases, setLoadedPurchases] = useState(false);

  const usedPct = debt.creditLimit && debt.creditLimit > 0
    ? (debt.remainingAmount / debt.creditLimit) * 100
    : 0;
  const available = (debt.creditLimit ?? 0) - debt.remainingAmount;

  const loadPurchases = async () => {
    if (!loadedPurchases) {
      const p = await api.debts.purchases(debt.id);
      setPurchases(p);
      setLoadedPurchases(true);
    }
  };

  const handleToggle = () => {
    if (!isExpanded) loadPurchases();
    onToggle();
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    await api.debts.deletePurchase(debt.id, purchaseId);
    const p = await api.debts.purchases(debt.id);
    setPurchases(p);
    onPurchaseChange();
  };

  const handleAddPurchase = async (data: { description: string; amount: number; installments: number; date: string; interestRate?: number }) => {
    await api.debts.addPurchase(debt.id, data);
    const p = await api.debts.purchases(debt.id);
    setPurchases(p);
    setShowPurchaseForm(false);
    onPurchaseChange();
  };

  return (
    <div className="rounded-xl border border-purple-200 bg-white dark:border-purple-900 dark:bg-slate-900">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={handleToggle}>
        <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-lg bg-purple-100 text-purple-600 text-lg dark:bg-purple-950 dark:text-purple-400">
          💳
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span onClick={(e) => e.stopPropagation()}>
              <InlineEdit
                value={debt.name}
                onSave={(name) => onUpdate({ name })}
                className="font-semibold text-slate-800 dark:text-slate-100"
              />
            </span>
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-semibold text-purple-600 dark:bg-purple-950 dark:text-purple-400">
              Tarjeta
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 dark:text-slate-500">
            {debt.lender && `${debt.lender} · `}
            Cupo: {formatMoney(debt.creditLimit ?? 0)} · Tasa {(debt.annualInterestRate * 100).toFixed(1)}% anual
          </p>
          {/* Usage bar */}
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div
              className={`h-full rounded-full transition-all ${usedPct > 80 ? 'bg-red-400 dark:bg-red-500' : usedPct > 50 ? 'bg-amber-400 dark:bg-amber-500' : 'bg-purple-400 dark:bg-purple-500'}`}
              style={{ width: `${Math.min(100, usedPct)}%` }}
            />
          </div>
          <p className="text-[11px] text-slate-400 mt-1 dark:text-slate-500">{usedPct.toFixed(0)}% utilizado</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400 dark:text-slate-500">Saldo usado</p>
          <p className="text-xl font-bold text-purple-600 dark:text-purple-400">{formatMoney(debt.remainingAmount)}</p>
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">
            Disponible: <strong className="text-emerald-600 dark:text-emerald-400">{formatMoney(Math.max(0, available))}</strong>
          </p>
        </div>
        <span className={`text-slate-300 dark:text-slate-600 transition ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400">✕</button>
      </div>

      {isExpanded && (
        <div className="border-t border-purple-100 px-5 py-4 dark:border-purple-900">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">Compras ({purchases.length})</h4>
            <button
              onClick={() => setShowPurchaseForm(!showPurchaseForm)}
              className="text-xs font-medium text-lureh-600 hover:text-lureh-700 dark:text-lureh-400 dark:hover:text-lureh-300"
            >
              + Agregar compra
            </button>
          </div>

          {showPurchaseForm && (
            <PurchaseForm defaultRate={debt.annualInterestRate} onAdd={handleAddPurchase} onCancel={() => setShowPurchaseForm(false)} />
          )}

          {purchases.length === 0 && !showPurchaseForm && (
            <p className="py-2 text-xs text-slate-400 dark:text-slate-500">No hay compras registradas.</p>
          )}

          {purchases.length > 0 && (
            <div className="max-h-48 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2">Descripcion</th>
                    <th className="px-3 py-2 text-right">Monto</th>
                    <th className="px-3 py-2 text-center">Cuotas</th>
                    <th className="px-3 py-2 w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {purchases.map((p) => (
                    <tr key={p.id} className="border-t border-slate-100 dark:border-slate-800 dark:text-slate-300">
                      <td className="px-3 py-1.5 whitespace-nowrap">{formatDateShort(p.date)}</td>
                      <td className="px-3 py-1.5">{p.description}</td>
                      <td className="px-3 py-1.5 text-right font-medium text-red-500 dark:text-red-400">{formatMoney(p.amount)}</td>
                      <td className="px-3 py-1.5 text-center">
                        {p.installments > 1
                          ? <span className="text-purple-600 dark:text-purple-400">{p.remainingInstallments}/{p.installments}</span>
                          : <span className="text-emerald-500 dark:text-emerald-400" title="Sin interes">1 ✓</span>
                        }
                      </td>
                      <td className="px-3 py-1.5">
                        <button onClick={() => handleDeletePurchase(p.id)} className="text-slate-300 hover:text-red-500 dark:text-slate-600 dark:hover:text-red-400">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex gap-4 text-xs text-slate-400 dark:text-slate-500">
            <span>Tasa: <strong className="text-slate-700 dark:text-slate-200">{(debt.annualInterestRate * 100).toFixed(1)}% EA</strong></span>
            <span>Dia de corte: <strong className="text-slate-700 dark:text-slate-200">{debt.cutOffDay ?? 1}</strong></span>
            <span className="text-[10px] italic">Compras a 1 cuota = sin interes</span>
          </div>
        </div>
      )}
    </div>
  );
}

function PurchaseForm({ defaultRate, onAdd, onCancel }: {
  defaultRate: number;
  onAdd: (data: { description: string; amount: number; installments: number; date: string; interestRate?: number }) => void;
  onCancel: () => void;
}) {
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [installments, setInstallments] = useState('1');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rate, setRate] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const customRate = parseFloat(rate);
    onAdd({
      description: desc || 'Compra',
      amount: parseFloat(amount) || 0,
      installments: parseInt(installments) || 1,
      date,
      interestRate: customRate > 0 ? customRate / 100 : undefined,
    });
  };

  const smallInput = 'rounded border border-slate-300 px-2 py-1.5 text-xs focus:border-lureh-500 focus:outline-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder-slate-500';

  return (
    <form onSubmit={handleSubmit} className="mb-3 rounded-lg bg-purple-50 p-2 dark:bg-purple-950/50">
      <div className="flex items-end gap-2">
        <input type="text" value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripcion" autoFocus
          className={`flex-1 ${smallInput}`} />
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Monto"
          className={`w-28 ${smallInput}`} />
        <input type="number" value={installments} onChange={(e) => setInstallments(e.target.value)} placeholder="Cuotas" min="1"
          className={`w-16 ${smallInput}`} title="Numero de cuotas" />
        <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} step="0.1"
          placeholder={`${(defaultRate * 100).toFixed(1)}%`}
          className={`w-20 ${smallInput}`} title="Tasa anual % (vacio = tasa de la tarjeta)" />
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className={`w-32 ${smallInput}`} />
        <button type="submit" className="rounded bg-purple-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-purple-700">
          Agregar
        </button>
        <button type="button" onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300">✕</button>
      </div>
      <p className="mt-1 text-[10px] text-slate-400 dark:text-slate-500 italic pl-1">
        Tasa: si se deja vacio usa la tasa general de la tarjeta ({(defaultRate * 100).toFixed(1)}%)
      </p>
    </form>
  );
}

// ── Loan Card (existing behavior) ───────────────────────────

function LoanCard({ debt, isExpanded, onToggle, onUpdate, onDelete }: {
  debt: Debt; isExpanded: boolean; onToggle: () => void; onUpdate: (data: Partial<Debt>) => void; onDelete: () => void;
}) {
  const [schedule, setSchedule] = useState<DebtScheduleEntry[] | null>(null);
  const [extraAmount, setExtraAmount] = useState('');
  const [extraResult, setExtraResult] = useState<{ savedInterest: number; periodsReduced: number } | null>(null);

  const progress = debt.principalAmount > 0
    ? ((debt.principalAmount - debt.remainingAmount) / debt.principalAmount) * 100
    : 0;

  const loadSchedule = async () => {
    if (!schedule) {
      const s = await api.debts.schedule(debt.id);
      setSchedule(s);
    }
  };

  const handleToggle = () => {
    if (!isExpanded) loadSchedule();
    onToggle();
  };

  const simulateExtra = async () => {
    const amt = parseFloat(extraAmount);
    if (!amt || amt <= 0) return;
    const result = await api.debts.simulateExtra(debt.id, amt, debt.currentPeriod + 1);
    setExtraResult({ savedInterest: result.savedInterest, periodsReduced: result.periodsReduced });
  };

  const totalInterest = schedule?.reduce((s, e) => s + e.interest, 0) ?? 0;

  return (
    <div className="rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-4 px-5 py-4 cursor-pointer" onClick={handleToggle}>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span onClick={(e) => e.stopPropagation()}>
              <InlineEdit
                value={debt.name}
                onSave={(name) => onUpdate({ name })}
                className="font-semibold text-slate-800 dark:text-slate-100"
              />
            </span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              debt.status === 'active'
                ? 'bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400'
                : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400'
            }`}>
              {debt.status === 'active' ? 'Activa' : 'Pagada'}
            </span>
          </div>
          <div className="flex items-center gap-1 mt-0.5 text-xs text-slate-400 dark:text-slate-500" onClick={(e) => e.stopPropagation()}>
            {debt.lender && (
              <>
                <InlineEdit
                  value={debt.lender}
                  onSave={(lender) => onUpdate({ lender })}
                  className="text-xs text-slate-400 dark:text-slate-500"
                />
                <span>·</span>
              </>
            )}
            <select
              value={debt.paymentFrequency}
              onChange={(e) => { e.stopPropagation(); onUpdate({ paymentFrequency: e.target.value as any }); }}
              className="rounded border-0 bg-transparent py-0 pl-0 pr-4 text-xs text-slate-400 hover:text-slate-600 focus:ring-0 cursor-pointer dark:text-slate-500 dark:hover:text-slate-300"
            >
              <option value="monthly">Mensual</option>
              <option value="biweekly">Quincenal</option>
              <option value="weekly">Semanal</option>
            </select>
            <span>· {debt.totalPeriods} cuotas · Tasa {(debt.annualInterestRate * 100).toFixed(1)}% anual</span>
          </div>
          <div className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
            <div className="h-full rounded-full bg-red-400 dark:bg-red-500 transition-all" style={{ width: `${100 - progress}%` }} />
          </div>
          <p className="text-[11px] text-slate-400 mt-1 dark:text-slate-500">{progress.toFixed(0)}% pagado</p>
        </div>
        <div className="text-right" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs text-slate-400 dark:text-slate-500">Saldo pendiente</p>
          <InlineEdit
            value={String(debt.remainingAmount)}
            type="number"
            onSave={(val) => onUpdate({ remainingAmount: parseFloat(val) || 0 })}
            formatDisplay={(v) => formatMoney(parseFloat(v) || 0)}
            className="text-xl font-bold text-red-600 dark:text-red-400"
          />
          <p className="text-xs text-slate-400 mt-1 dark:text-slate-500">Cuota: <strong className="text-slate-600 dark:text-slate-300">{formatMoney(debt.installmentValue)}</strong></p>
        </div>
        <span className={`text-slate-300 dark:text-slate-600 transition ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="rounded p-1 text-slate-300 hover:bg-red-50 hover:text-red-500 dark:text-slate-600 dark:hover:bg-red-950 dark:hover:text-red-400">✕</button>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 px-5 py-4 dark:border-slate-800">
          <div className="mb-4 flex gap-6 text-sm">
            <div>
              <span className="text-slate-400 dark:text-slate-500">Monto original: </span>
              <strong className="text-slate-700 dark:text-slate-200">{formatMoney(debt.principalAmount)}</strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Total intereses: </span>
              <strong className="text-orange-600 dark:text-orange-400">{formatMoney(totalInterest)}</strong>
            </div>
            <div>
              <span className="text-slate-400 dark:text-slate-500">Total a pagar: </span>
              <strong className="text-slate-700 dark:text-slate-200">{formatMoney(debt.principalAmount + totalInterest)}</strong>
            </div>
          </div>

          <div className="mb-4 flex items-end gap-2 rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
            <div className="flex-1">
              <label className={labelClass}>Simular abono extra</label>
              <input
                type="number" value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)}
                placeholder="Monto del abono extra"
                className="w-full rounded border border-slate-300 px-3 py-1.5 text-sm focus:border-lureh-500 focus:outline-none dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:placeholder-slate-500"
              />
            </div>
            <button onClick={simulateExtra} className="rounded-lg bg-lureh-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-lureh-700">
              Simular
            </button>
          </div>

          {extraResult && (
            <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm dark:border-emerald-800 dark:bg-emerald-950">
              <p className="text-emerald-800 dark:text-emerald-300">
                Con un abono de <strong>{formatMoney(parseFloat(extraAmount))}</strong>:
              </p>
              <p className="mt-1 text-emerald-700 dark:text-emerald-400">
                Ahorrarias <strong>{formatMoney(extraResult.savedInterest)}</strong> en intereses
                y terminarias <strong>{extraResult.periodsReduced} cuotas antes</strong>.
              </p>
            </div>
          )}

          {schedule && (
            <div className="max-h-64 overflow-auto rounded-lg border border-slate-200 dark:border-slate-700">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-slate-50 dark:bg-slate-800">
                  <tr className="text-left text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Fecha</th>
                    <th className="px-3 py-2 text-right">Cuota</th>
                    <th className="px-3 py-2 text-right">Capital</th>
                    <th className="px-3 py-2 text-right">Interes</th>
                    <th className="px-3 py-2 text-right">Saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((entry) => (
                    <tr key={entry.period} className={`border-t border-slate-100 dark:border-slate-800 ${entry.period <= debt.currentPeriod ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600' : 'dark:text-slate-300'}`}>
                      <td className="px-3 py-1.5">{entry.period}</td>
                      <td className="px-3 py-1.5">{formatDateShort(entry.date)}</td>
                      <td className="px-3 py-1.5 text-right">{formatMoney(entry.payment)}</td>
                      <td className="px-3 py-1.5 text-right text-emerald-600 dark:text-emerald-400">{formatMoney(entry.principal)}</td>
                      <td className="px-3 py-1.5 text-right text-orange-500 dark:text-orange-400">{formatMoney(entry.interest)}</td>
                      <td className="px-3 py-1.5 text-right font-medium">{formatMoney(entry.remainingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Forms ────────────────────────────────────────────────────

function NewDebtForm({ accounts, onCreated, onCancel }: {
  accounts: Account[]; onCreated: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [principal, setPrincipal] = useState('');
  const [rate, setRate] = useState('');
  const [periods, setPeriods] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.debts.create({
        name: name || 'Nueva deuda',
        lender,
        debtType: 'loan',
        principalAmount: parseFloat(principal) || 0,
        annualInterestRate: (parseFloat(rate) || 0) / 100,
        totalPeriods: parseInt(periods) || 12,
        paymentFrequency: frequency as any,
        accountId: accountId || undefined,
      } as any);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-5 rounded-xl border border-lureh-200 bg-lureh-50 p-4 dark:border-lureh-800 dark:bg-lureh-950">
      <h3 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-300">Nuevo Credito / Prestamo</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Nombre</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Moto, Credito educativo..." autoFocus className={inputClass} /></div>
        <div><label className={labelClass}>Acreedor</label>
          <input type="text" value={lender} onChange={(e) => setLender(e.target.value)} placeholder="Banco, persona..." className={inputClass} /></div>
        <div><label className={labelClass}>Monto total (COP)</label>
          <input type="number" value={principal} onChange={(e) => setPrincipal(e.target.value)} placeholder="50000000" className={inputClass} /></div>
        <div><label className={labelClass}>Tasa anual (%)</label>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} step="0.1" placeholder="18.5" className={inputClass} /></div>
        <div><label className={labelClass}>Numero de cuotas</label>
          <input type="number" value={periods} onChange={(e) => setPeriods(e.target.value)} placeholder="48" className={inputClass} /></div>
        <div><label className={labelClass}>Frecuencia de pago</label>
          <select value={frequency} onChange={(e) => setFrequency(e.target.value)} className={inputClass}>
            <option value="monthly">Mensual</option><option value="biweekly">Quincenal</option><option value="weekly">Semanal</option>
          </select></div>
        <div><label className={labelClass}>Cuenta de pago</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            <option value="">Sin cuenta</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></div>
      </div>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnCancel}>Cancelar</button>
        <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Guardando...' : 'Crear deuda'}</button>
      </div>
    </form>
  );
}

function NewCreditCardForm({ accounts, onCreated, onCancel }: {
  accounts: Account[]; onCreated: () => void; onCancel: () => void;
}) {
  const [name, setName] = useState('');
  const [lender, setLender] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [rate, setRate] = useState('');
  const [cutOffDay, setCutOffDay] = useState('1');
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.debts.create({
        name: name || 'Tarjeta de Credito',
        lender,
        debtType: 'credit_card',
        creditLimit: parseFloat(creditLimit) || 0,
        remainingAmount: 0,
        annualInterestRate: (parseFloat(rate) || 0) / 100,
        cutOffDay: parseInt(cutOffDay) || 1,
        accountId: accountId || undefined,
      } as any);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mb-5 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-900 dark:bg-purple-950/30">
      <h3 className="mb-3 text-sm font-semibold text-purple-700 dark:text-purple-300">Nueva Tarjeta de Credito</h3>
      <div className="grid grid-cols-2 gap-3">
        <div><label className={labelClass}>Nombre de la tarjeta</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Visa Bancolombia, Mastercard Nu..." autoFocus className={inputClass} /></div>
        <div><label className={labelClass}>Banco / Entidad</label>
          <input type="text" value={lender} onChange={(e) => setLender(e.target.value)} placeholder="Bancolombia, Nu, Rappi..." className={inputClass} /></div>
        <div><label className={labelClass}>Cupo total (COP)</label>
          <input type="number" value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="5000000" className={inputClass} /></div>
        <div><label className={labelClass}>Tasa anual (%)</label>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} step="0.1" placeholder="28.0" className={inputClass} /></div>
        <div><label className={labelClass}>Dia de corte</label>
          <input type="number" value={cutOffDay} onChange={(e) => setCutOffDay(e.target.value)} min="1" max="31" placeholder="15" className={inputClass} /></div>
        <div><label className={labelClass}>Cuenta de pago</label>
          <select value={accountId} onChange={(e) => setAccountId(e.target.value)} className={inputClass}>
            <option value="">Sin cuenta</option>
            {accounts.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select></div>
      </div>
      <p className="mt-2 text-[11px] text-slate-400 dark:text-slate-500 italic">
        El saldo se calcula automaticamente de las compras. Compras a 1 cuota no generan interes.
      </p>
      <div className="mt-3 flex gap-2 justify-end">
        <button type="button" onClick={onCancel} className={btnCancel}>Cancelar</button>
        <button type="submit" disabled={saving} className="rounded-lg bg-purple-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50">
          {saving ? 'Guardando...' : 'Crear tarjeta'}
        </button>
      </div>
    </form>
  );
}
