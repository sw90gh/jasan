import { useEffect, useState } from 'react';
import { fetchIncomes, createIncome, deleteIncome, fetchExpenses, createExpense, deleteExpense, type Income, type Expense } from '../api';
import { formatKRW } from '../utils';

export default function CashFlow() {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [incomeForm, setIncomeForm] = useState({ source: '', amount: 0, is_monthly: true, memo: '' });
  const [expenseForm, setExpenseForm] = useState({ category: '', name: '', amount: 0, is_monthly: true, memo: '' });
  const [showIncome, setShowIncome] = useState(false);
  const [showExpense, setShowExpense] = useState(false);

  const load = async () => {
    try {
      const [i, e] = await Promise.all([fetchIncomes(), fetchExpenses()]);
      setIncomes(i.data);
      setExpenses(e.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const totalIncome = incomes.filter(i => i.is_monthly).reduce((s, i) => s + i.amount, 0);
  const totalExpense = expenses.filter(e => e.is_monthly).reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-sm text-slate-500">월 수입</div>
          <div className="text-xl font-bold text-blue-600">{formatKRW(totalIncome)}</div>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <div className="text-sm text-slate-500">월 지출</div>
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
            <h2 className="text-lg font-bold">지출</h2>
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
    </div>
  );
}
