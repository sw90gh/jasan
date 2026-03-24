import { useEffect, useState } from 'react';
import { fetchDebts, createDebt, deleteDebt, type Debt } from '../api';
import { formatKRW, DEBT_CATEGORY_LABELS } from '../utils';

const categories = ['mortgage', 'credit', 'student', 'car', 'other'] as const;

export default function Debts() {
  const [debts, setDebts] = useState<Debt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    category: 'mortgage' as string,
    name: '',
    institution: '',
    principal: 0,
    remaining: 0,
    interest_rate: 0,
    monthly_payment: 0,
    start_date: '',
    end_date: '',
    memo: '',
  });

  const load = async () => {
    try { setDebts((await fetchDebts()).data); } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createDebt({
      ...form,
      institution: form.institution || null,
      monthly_payment: form.monthly_payment || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      memo: form.memo || null,
    });
    setShowForm(false);
    load();
  };

  const totalRemaining = debts.reduce((s, d) => s + d.remaining, 0);
  const totalMonthly = debts.reduce((s, d) => s + (d.monthly_payment || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">부채 관리</h2>
          <p className="text-sm text-slate-500">총 잔액 {formatKRW(totalRemaining)} / 월 상환 {formatKRW(totalMonthly)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-red-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-red-600">
          {showForm ? '취소' : '+ 부채 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{DEBT_CATEGORY_LABELS[c]}</option>)}
            </select>
            <input placeholder="부채명" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="기관" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="원금" value={form.principal || ''} onChange={e => setForm({ ...form, principal: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="잔액" value={form.remaining || ''} onChange={e => setForm({ ...form, remaining: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" step="0.01" placeholder="금리 (%)" value={form.interest_rate || ''} onChange={e => setForm({ ...form, interest_rate: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="월 상환액" value={form.monthly_payment || ''} onChange={e => setForm({ ...form, monthly_payment: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" placeholder="시작일" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-red-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-red-600">저장</button>
        </form>
      )}

      <div className="space-y-2">
        {debts.map(debt => (
          <div key={debt.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-red-50 text-red-500 px-2 py-0.5 rounded">{DEBT_CATEGORY_LABELS[debt.category] || debt.category}</span>
                <span className="font-medium">{debt.name}</span>
                {debt.institution && <span className="text-xs text-slate-400">{debt.institution}</span>}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                금리 {debt.interest_rate}% | 월 상환 {debt.monthly_payment ? formatKRW(debt.monthly_payment) : '-'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-red-500">{formatKRW(debt.remaining)}</span>
              <button onClick={() => { if (confirm('삭제?')) deleteDebt(debt.id).then(load); }} className="text-red-400 hover:text-red-600 text-sm">삭제</button>
            </div>
          </div>
        ))}
        {debts.length === 0 && <div className="text-center py-8 text-slate-400">등록된 부채가 없습니다</div>}
      </div>
    </div>
  );
}
