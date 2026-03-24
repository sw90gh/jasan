import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api';
import { formatKRW } from '../utils';

const categories = ['의료', '교육', '경조사', '여행', '자동차', '주거', '가전', '세금', '기타'];

interface BigExpenseItem {
  id: number;
  name: string;
  category: string;
  amount: number;
  saved_amount: number;
  gap: number;
  planned_date: string;
  days_left: number;
  progress: number;
  monthly_needed: number;
  is_overdue: boolean;
  memo: string | null;
}

interface Summary {
  total_planned: number;
  total_saved: number;
  total_gap: number;
  count: number;
  monthly_breakdown: Record<string, number>;
  items: BigExpenseItem[];
}

export default function BigExpenses() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    name: '', category: '의료', amount: 0, planned_date: '', saved_amount: 0, memo: '',
  });

  const load = async () => {
    try { setSummary((await api.get('/big-expenses/summary')).data); } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/big-expenses', { ...form, memo: form.memo || null });
    setForm({ name: '', category: '의료', amount: 0, planned_date: '', saved_amount: 0, memo: '' });
    setShowForm(false);
    load();
  };

  const handleUpdateSaved = async (id: number, saved: number) => {
    await api.put(`/big-expenses/${id}`, { saved_amount: saved });
    load();
  };

  const handleComplete = async (id: number) => {
    await api.put(`/big-expenses/${id}`, { is_completed: true });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/big-expenses/${id}`);
    load();
  };

  const monthlyChart = summary
    ? Object.entries(summary.monthly_breakdown)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, amount]) => ({ month, amount }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">목돈 지출 계획</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-violet-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-violet-700">
          {showForm ? '취소' : '+ 지출 계획 추가'}
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-xs text-slate-500">예정 지출 총액</div>
            <div className="text-lg font-bold text-violet-600">{formatKRW(summary.total_planned)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-xs text-slate-500">준비 완료</div>
            <div className="text-lg font-bold text-emerald-600">{formatKRW(summary.total_saved)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-xs text-slate-500">부족분</div>
            <div className="text-lg font-bold text-red-500">{formatKRW(summary.total_gap)}</div>
          </div>
          <div className="bg-white rounded-xl shadow p-4 text-center">
            <div className="text-xs text-slate-500">예정 건수</div>
            <div className="text-lg font-bold">{summary.count}건</div>
          </div>
        </div>
      )}

      {/* Monthly Chart */}
      {monthlyChart.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h3 className="text-lg font-semibold mb-3">월별 예정 지출</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyChart}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatKRW(v)} width={80} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatKRW(v)} />
              <Bar dataKey="amount" name="예정 지출" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input placeholder="항목명 (예: 산후조리원)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input type="number" placeholder="예상 금액" value={form.amount || ''} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={form.planned_date} onChange={e => setForm({ ...form, planned_date: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="이미 준비한 금액" value={form.saved_amount || ''} onChange={e => setForm({ ...form, saved_amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input placeholder="메모 (선택)" value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-violet-600 text-white px-6 py-2 rounded-lg text-sm">저장</button>
        </form>
      )}

      {/* Expense Items */}
      <div className="space-y-3">
        {summary?.items.map(item => (
          <div key={item.id} className={`bg-white rounded-xl shadow p-5 ${item.is_overdue ? 'border-l-4 border-red-500' : item.days_left <= 30 ? 'border-l-4 border-amber-400' : ''}`}>
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-violet-50 text-violet-600 px-2 py-0.5 rounded">{item.category}</span>
                  <span className="font-semibold">{item.name}</span>
                  {item.is_overdue && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded">기한 초과</span>}
                  {!item.is_overdue && item.days_left <= 30 && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded">임박</span>}
                </div>
                <div className="text-sm text-slate-500 mt-1">
                  {item.planned_date} ({item.is_overdue ? `${Math.abs(item.days_left)}일 초과` : `D-${item.days_left}`})
                </div>
                {item.memo && <div className="text-xs text-slate-400 mt-1">{item.memo}</div>}
              </div>
              <div className="text-right">
                <div className="font-bold text-violet-600">{formatKRW(item.amount)}</div>
                <div className="flex gap-2 mt-1">
                  <button onClick={() => handleComplete(item.id)} className="text-xs text-emerald-500 hover:text-emerald-700">완료</button>
                  <button onClick={() => handleDelete(item.id)} className="text-xs text-red-400 hover:text-red-600">삭제</button>
                </div>
              </div>
            </div>

            {/* Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-slate-500 mb-1">
                <span>준비: {formatKRW(item.saved_amount)} / {formatKRW(item.amount)}</span>
                <span>{item.progress}%</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2.5">
                <div className={`rounded-full h-2.5 transition-all ${item.progress >= 100 ? 'bg-emerald-500' : item.progress >= 50 ? 'bg-violet-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(item.progress, 100)}%` }} />
              </div>
            </div>

            {/* Gap info */}
            {item.gap > 0 && (
              <div className="mt-2 flex justify-between items-center text-sm bg-slate-50 rounded-lg p-2">
                <span className="text-slate-500">부족: <strong className="text-red-500">{formatKRW(item.gap)}</strong></span>
                {item.monthly_needed > 0 && <span className="text-slate-500">월 <strong className="text-blue-600">{formatKRW(item.monthly_needed)}</strong> 준비 필요</span>}
                <button
                  onClick={() => {
                    const add = prompt(`${item.name}에 추가할 준비 금액:`, '0');
                    if (add && Number(add) > 0) handleUpdateSaved(item.id, item.saved_amount + Number(add));
                  }}
                  className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100"
                >
                  + 금액 추가
                </button>
              </div>
            )}
            {item.gap <= 0 && (
              <div className="mt-2 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-2 font-medium">준비 완료!</div>
            )}
          </div>
        ))}
        {summary?.items.length === 0 && <div className="text-center py-8 text-slate-400">등록된 목돈 지출 계획이 없습니다</div>}
      </div>
    </div>
  );
}
