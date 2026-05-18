import type {
  Account,
  FinancialEvent,
  FinancialGoal,
  Scenario,
  Debt,
  CreditCardPurchase,
  DebtScheduleEntry,
  SimulationResult,
} from '@lureh/engine';

const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  accounts: {
    list: () => request<Account[]>('/accounts'),
    create: (data: Partial<Account>) =>
      request<Account>('/accounts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Account>) =>
      request<Account>(`/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/accounts/${id}`, { method: 'DELETE' }),
  },

  events: {
    list: () => request<FinancialEvent[]>('/events'),
    create: (data: Partial<FinancialEvent>) =>
      request<FinancialEvent>('/events', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<FinancialEvent>) =>
      request<FinancialEvent>(`/events/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/events/${id}`, { method: 'DELETE' }),
  },

  scenarios: {
    list: () => request<Scenario[]>('/scenarios'),
    create: (data: Partial<Scenario>) =>
      request<Scenario>('/scenarios', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/scenarios/${id}`, { method: 'DELETE' }),
  },

  goals: {
    list: () => request<FinancialGoal[]>('/goals'),
    create: (data: Partial<FinancialGoal>) =>
      request<FinancialGoal>('/goals', { method: 'POST', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/goals/${id}`, { method: 'DELETE' }),
  },

  debts: {
    list: () => request<Debt[]>('/debts'),
    get: (id: string) => request<Debt>(`/debts/${id}`),
    schedule: (id: string) => request<DebtScheduleEntry[]>(`/debts/${id}/schedule`),
    simulateExtra: (id: string, amount: number, atPeriod: number) =>
      request<{ savedInterest: number; periodsReduced: number; newSchedule: DebtScheduleEntry[] }>(
        `/debts/${id}/simulate-extra`,
        { method: 'POST', body: JSON.stringify({ amount, atPeriod }) },
      ),
    create: (data: Partial<Debt>) =>
      request<Debt>('/debts', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Debt>) =>
      request<Debt>(`/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) =>
      request<void>(`/debts/${id}`, { method: 'DELETE' }),
    purchases: (debtId: string) =>
      request<CreditCardPurchase[]>(`/debts/${debtId}/purchases`),
    addPurchase: (debtId: string, data: Partial<CreditCardPurchase>) =>
      request<CreditCardPurchase>(`/debts/${debtId}/purchases`, { method: 'POST', body: JSON.stringify(data) }),
    deletePurchase: (debtId: string, purchaseId: string) =>
      request<void>(`/debts/${debtId}/purchases/${purchaseId}`, { method: 'DELETE' }),
  },

  simulation: {
    run: (params?: {
      startDate?: string;
      endDate?: string;
      inflationRate?: number;
      periodType?: string;
      activeScenarioIds?: string[];
    }) =>
      request<SimulationResult>('/simulation/run', {
        method: 'POST',
        body: JSON.stringify(params ?? {}),
      }),
  },
};
