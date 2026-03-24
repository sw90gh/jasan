import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import { fetchIncomes, createIncome, deleteIncome, fetchExpenses, createExpense, deleteExpense, type Income, type Expense } from '../api';
import api from '../api';
import { formatKRW } from '../utils';

interface BudgetCategory {
  category: string;
  budget: number;
  actual: number;
  diff: number;
  progress: number;
}

interface BudgetComparison {
  year_month: string;
  total_budget: number;
  total_actual: number;
  total_diff: number;
  savings_rate: number;
  categories: BudgetCategory[];
  spending_items: { id: number; category: string; name: string; amount: number; spend_date: string | null; memo: string | null }[];
}

export default function CashFlow() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeForm, setIncomeForm] = useState({ source: '', amount: 0, is_monthly: true, memo: '' });
  const [expenseForm, setExpenseForm] = useState({ category: '', name: '', amount: 0, is_monthly: true, memo: '' });
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  // Budget tracking
  const [tab, setTab] = useState<'budget' | 'actual'>('budget');
  const [yearMonth, setYearMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
  const [comparison, setComparison] = useState<BudgetComparison | null>(null);
  const [spendForm, setSpendForm] = useState({ category: '', name: '', amount: 0, spend_date: '', memo: '' });
  const [showSpendForm, setShowSpendForm] = useState(false);

  const load = async () => {
    try {
      const [i, e] = await Promise.all([fetchIncomes(), fetchExpenses()]);
      setIncomes(i.data);
      setExpenses(e.data);
    } catch {}
  };

  const loadComparison = async () => {
    try {
      const res = await api.get(`/budget/compare/${yearMonth}`);
      setComparison(res.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (tab === 'actual') loadComparison(); }, [tab, yearMonth]);

  const totalIncome = incomes.filter(i => i.is_monthly).reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.filter(e => e.is_monthly).reduce((s, e) => s + e.amount, 0);

  const handleAddSpending = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/budget/spending', {
      year_month: yearMonth,
      ...spendForm,
      spend_date: spendForm.spend_date || null,
      memo: spendForm.memo || null,
    });
    setSpendForm({ category: '', name: '', amount: 0, spend_date: '', memo: '' });
    setShowSpendForm(false);
    loadComparison();
  };

  const handleDeleteSpending = async (id: number) => {
    await api.delete(`/budget/spending/${id}`);
    loadComparison();
  };

  return (
    <div className="space-y-6">
      {/* Tab Switch */}
      <div className="flex gap-2">
        <button onClick={() => setTab('budget')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'budget' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>예산 관리</button>
        <button onClick={() => setTab('actual')} className={`px-4 py-2 rounded-lg text-sm ${tab === 'actual' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>예산 vs 실적</button>
      </div>

      {tab === 'budget' && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-sm text-slate-500">월 수입</div>
              <div className="text-xl font-bold text-blue-600">{formatKRW(totalIncome)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-sm text-slate-500">월 지출 (예산)</div>
              <div className="text-xl font-bold text-red-500">{formatKRW(totalExpense)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-sm text-slate-500">월 저축</div>
              <div className="text-xl font-bold text-emerald-600">{formatKRW(totalIncome - totalExpense)}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Incomes */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">수입</h2>
                <button onClick={() => setShowIncome(!showIncome)} className="bg-blue-600 text-white px-3 py-1 rounded-lg text-sm">
                  {showIncome ? '취소' : '+ 추가'}
                </button>
              </div>
              {showIncome && (
                <form onSubmit={async (e) => { e.preventDefault(); await createIncome({ ...incomeForm, memo: incomeForm.memo || null }); setShowIncome(false); load(); }} className="bg-white rounded-xl shadow p-4 space-y-3 mb-3">
                  <input placeholder="수입원 (급여, 사업 등)" value={incomeForm.source} onChange={e => setIncomeForm({ ...incomeForm, source: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <input type="number" placeholder="금액" value={incomeForm.amount || ''} onChange={e => setIncomeForm({ ...incomeForm, amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={incomeForm.is_monthly} onChange={e => setIncomeForm({ ...incomeForm, is_monthly: e.target.checked })} /> 월 정기 수입
                  </label>
                  <button type="submit" className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm">저장</button>
                </form>
              )}
              <div className="space-y-2">
                {incomes.map(inc => (
                  <div key={inc.id} className="bg-white rounded-xl shadow p-3 flex justify-between items-center">
                    <div>
                      <span className="font-medium">{inc.source}</span>
                      {inc.is_monthly && <span className="text-xs text-blue-500 ml-2">월정기</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-blue-600">{formatKRW(inc.amount)}</span>
                      <button onClick={() => { deleteIncome(inc.id).then(load); }} className="text-red-400 text-sm">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Expenses */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-lg font-bold">지출 (예산)</h2>
                <button onClick={() => setShowExpense(!showExpense)} className="bg-red-500 text-white px-3 py-1 rounded-lg text-sm">
                  {showExpense ? '취소' : '+ 추가'}
                </button>
              </div>
              {showExpense && (
                <form onSubmit={async (e) => { e.preventDefault(); await createExpense({ ...expenseForm, memo: expenseForm.memo || null }); setShowExpense(false); load(); }} className="bg-white rounded-xl shadow p-4 space-y-3 mb-3">
                  <input placeholder="카테고리 (주거, 식비 등)" value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <input placeholder="항목명" value={expenseForm.name} onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <input type="number" placeholder="금액" value={expenseForm.amount || ''} onChange={e => setExpenseForm({ ...expenseForm, amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={expenseForm.is_monthly} onChange={e => setExpenseForm({ ...expenseForm, is_monthly: e.target.checked })} /> 월 정기 지출
                  </label>
                  <button type="submit" className="bg-red-500 text-white px-4 py-1.5 rounded-lg text-sm">저장</button>
                </form>
              )}
              <div className="space-y-2">
                {expenses.map(exp => (
                  <div key={exp.id} className="bg-white rounded-xl shadow p-3 flex justify-between items-center">
                    <div>
                      <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded mr-2">{exp.category}</span>
                      <span className="font-medium">{exp.name}</span>
                      {exp.is_monthly && <span className="text-xs text-red-400 ml-2">월정기</span>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-red-500">{formatKRW(exp.amount)}</span>
                      <button onClick={() => { deleteExpense(exp.id).then(load); }} className="text-red-400 text-sm">삭제</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {tab === 'actual' && (
        <>
          {/* Month Picker */}
          <div className="flex gap-3 items-center">
            <input type="month" value={yearMonth} onChange={e => setYearMonth(e.target.value)} className="border rounded-lg px-3 py-2 text-sm" />
            <button onClick={() => setShowSpendForm(!showSpendForm)} className="bg-orange-500 text-white px-4 py-2 rounded-lg text-sm">
              {showSpendForm ? '취소' : '+ 실제 지출 기록'}
            </button>
          </div>

          {/* Add Actual Spending Form */}
          {showSpendForm && (
            <form onSubmit={handleAddSpending} className="bg-white rounded-xl shadow p-5 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <input placeholder="카테고리 (식비, 주거 등)" value={spendForm.category} onChange={e => setSpendForm({ ...spendForm, category: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="내역" value={spendForm.name} onChange={e => setSpendForm({ ...spendForm, name: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
                <input type="number" placeholder="금액" value={spendForm.amount || ''} onChange={e => setSpendForm({ ...spendForm, amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
                <input type="date" value={spendForm.spend_date} onChange={e => setSpendForm({ ...spendForm, spend_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
                <input placeholder="메모 (선택)" value={spendForm.memo} onChange={e => setSpendForm({ ...spendForm, memo: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
              </div>
              <button type="submit" className="bg-orange-500 text-white px-6 py-2 rounded-lg text-sm">기록</button>
            </form>
          )}

          {comparison && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow p-4 text-center">
                  <div className="text-xs text-slate-500">예산</div>
                  <div className="text-lg font-bold text-slate-700">{formatKRW(comparison.total_budget)}</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                  <div className="text-xs text-slate-500">실제 지출</div>
                  <div className="text-lg font-bold text-orange-600">{formatKRW(comparison.total_actual)}</div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                  <div className="text-xs text-slate-500">{comparison.total_diff >= 0 ? '절약' : '초과'}</div>
                  <div className={`text-lg font-bold ${comparison.total_diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {comparison.total_diff >= 0 ? '+' : ''}{formatKRW(comparison.total_diff)}
                  </div>
                </div>
                <div className="bg-white rounded-xl shadow p-4 text-center">
                  <div className="text-xs text-slate-500">집행률</div>
                  <div className="text-lg font-bold">{comparison.total_budget > 0 ? Math.round(comparison.total_actual / comparison.total_budget * 100) : 0}%</div>
                </div>
              </div>

              {/* Category Chart */}
              {comparison.categories.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold mb-3">카테고리별 예산 vs 실적</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={comparison.categories} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={v => formatKRW(v)} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="category" width={60} tick={{ fontSize: 12 }} />
                      <Tooltip formatter={(v: number) => formatKRW(v)} />
                      <Bar dataKey="budget" name="예산" fill="#cbd5e1" radius={[0, 4, 4, 0]} />
                      <Bar dataKey="actual" name="실적">
                        {comparison.categories.map((c, i) => (
                          <Cell key={i} fill={c.progress > 100 ? '#ef4444' : c.progress > 80 ? '#f59e0b' : '#10b981'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Category Progress Bars */}
              <div className="bg-white rounded-xl shadow p-5">
                <h3 className="font-semibold mb-3">카테고리별 사용률</h3>
                <div className="space-y-3">
                  {comparison.categories.map((c, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium">{c.category}</span>
                        <span>
                          {formatKRW(c.actual)} / {formatKRW(c.budget)}
                          <span className={`ml-2 font-bold ${c.diff >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                            ({c.diff >= 0 ? `${formatKRW(c.diff)} 절약` : `${formatKRW(Math.abs(c.diff))} 초과`})
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3">
                        <div className={`rounded-full h-3 transition-all ${c.progress > 100 ? 'bg-red-500' : c.progress > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min(c.progress, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Spending Items */}
              {comparison.spending_items.length > 0 && (
                <div className="bg-white rounded-xl shadow p-5">
                  <h3 className="font-semibold mb-3">실제 지출 내역</h3>
                  <div className="space-y-2">
                    {comparison.spending_items.map(item => (
                      <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                        <div>
                          <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded mr-2">{item.category}</span>
                          <span className="font-medium">{item.name}</span>
                          {item.spend_date && <span className="text-xs text-slate-400 ml-2">{item.spend_date}</span>}
                          {item.memo && <span className="text-xs text-slate-400 ml-2">({item.memo})</span>}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-orange-600">{formatKRW(item.amount)}</span>
                          <button onClick={() => handleDeleteSpending(item.id)} className="text-red-400 text-sm">삭제</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {comparison.spending_items.length === 0 && (
                <div className="text-center py-6 text-slate-400 bg-white rounded-xl shadow">
                  {yearMonth}월 실제 지출 기록이 없습니다. 위 '+ 실제 지출 기록' 버튼으로 추가하세요.
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
