import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

// --- Types ---
export interface Asset {
  id: number;
  category: string;
  name: string;
  institution: string | null;
  amount: number;
  purchase_price: number | null;
  quantity: number | null;
  currency: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Debt {
  id: number;
  category: string;
  name: string;
  institution: string | null;
  principal: number;
  remaining: number;
  interest_rate: number;
  monthly_payment: number | null;
  start_date: string | null;
  end_date: string | null;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Income {
  id: number;
  source: string;
  amount: number;
  is_monthly: boolean;
  memo: string | null;
}

export interface Expense {
  id: number;
  category: string;
  name: string;
  amount: number;
  is_monthly: boolean;
  memo: string | null;
}

export interface Pension {
  id: number;
  pension_type: string;
  institution: string | null;
  monthly_contribution: number;
  total_accumulated: number;
  expected_monthly: number | null;
  start_date: string | null;
  memo: string | null;
}

export interface Goal {
  id: number;
  name: string;
  target_amount: number;
  target_date: string | null;
  priority: number;
  memo: string | null;
}

export interface DashboardSummary {
  total_assets: number;
  total_debts: number;
  net_worth: number;
  assets_by_category: Record<string, number>;
  monthly_income: number;
  monthly_expense: number;
  monthly_savings: number;
}

export interface HistoryRecord {
  date: string;
  total_assets: number;
  total_debts: number;
  net_worth: number;
  breakdown: Record<string, number>;
}

// --- API calls ---
export const fetchDashboard = () => api.get<DashboardSummary>('/dashboard/summary');
export const fetchHistory = (months?: number) => api.get<HistoryRecord[]>('/history', { params: { months } });

export const fetchAssets = (category?: string) => api.get<Asset[]>('/assets', { params: { category } });
export const createAsset = (data: Omit<Asset, 'id' | 'created_at' | 'updated_at'>) => api.post<Asset>('/assets', data);
export const updateAsset = (id: number, data: Partial<Asset>) => api.put<Asset>(`/assets/${id}`, data);
export const deleteAsset = (id: number) => api.delete(`/assets/${id}`);

export const fetchDebts = () => api.get<Debt[]>('/debts');
export const createDebt = (data: Omit<Debt, 'id' | 'created_at' | 'updated_at'>) => api.post<Debt>('/debts', data);
export const updateDebt = (id: number, data: Partial<Debt>) => api.put<Debt>(`/debts/${id}`, data);
export const deleteDebt = (id: number) => api.delete(`/debts/${id}`);

export const fetchIncomes = () => api.get<Income[]>('/incomes');
export const createIncome = (data: Omit<Income, 'id'>) => api.post<Income>('/incomes', data);
export const deleteIncome = (id: number) => api.delete(`/incomes/${id}`);

export const fetchExpenses = () => api.get<Expense[]>('/expenses');
export const createExpense = (data: Omit<Expense, 'id'>) => api.post<Expense>('/expenses', data);
export const deleteExpense = (id: number) => api.delete(`/expenses/${id}`);

export const fetchPensions = () => api.get<Pension[]>('/pensions');
export const createPension = (data: Omit<Pension, 'id'>) => api.post<Pension>('/pensions', data);
export const deletePension = (id: number) => api.delete(`/pensions/${id}`);

export const fetchGoals = () => api.get<Goal[]>('/goals');
export const createGoal = (data: Omit<Goal, 'id'>) => api.post<Goal>('/goals', data);
export const deleteGoal = (id: number) => api.delete(`/goals/${id}`);

export const takeSnapshot = () => api.post('/history/snapshot');

export default api;
