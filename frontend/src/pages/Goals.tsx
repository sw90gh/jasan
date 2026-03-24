import { useEffect, useState } from 'react';
import { fetchGoals, createGoal, deleteGoal, fetchDashboard, type Goal, type DashboardSummary } from '../api';
import { formatKRW } from '../utils';

export default function Goals() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', target_amount: 0, target_date: '', priority: 1, memo: '' });

  const load = async () => {
    try {
      const [g, s] = await Promise.all([fetchGoals(), fetchDashboard()]);
      setGoals(g.data);
      setSummary(s.data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createGoal({
      ...form,
      target_date: form.target_date || null,
      memo: form.memo || null,
    });
    setShowForm(false);
    load();
  };

  const netWorth = summary?.net_worth || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">목표 관리</h2>
        <button onClick={() => setShowForm(!showForm)} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-emerald-700">
          {showForm ? '취소' : '+ 목표 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input placeholder="목표명 (내집마련, 노후자금 등)" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="목표 금액" value={form.target_amount || ''} onChange={e => setForm({ ...form, target_amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" placeholder="목표 시점" value={form.target_date} onChange={e => setForm({ ...form, target_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm">
              <option value={1}>높음</option>
              <option value={2}>중간</option>
              <option value={3}>낮음</option>
            </select>
          </div>
          <button type="submit" className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm">저장</button>
        </form>
      )}

      <div className="space-y-3">
        {goals.map(goal => {
          const progress = goal.target_amount > 0 ? Math.min((netWorth / goal.target_amount) * 100, 100) : 0;
          const gap = goal.target_amount - netWorth;
          const monthsLeft = goal.target_date
            ? Math.max(0, Math.round((new Date(goal.target_date).getTime() - Date.now()) / (30.44 * 24 * 60 * 60 * 1000)))
            : null;
          const monthlyNeeded = monthsLeft && monthsLeft > 0 && gap > 0 ? gap / monthsLeft : null;

          return (
            <div key={goal.id} className="bg-white rounded-xl shadow p-5">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded ${goal.priority === 1 ? 'bg-red-50 text-red-500' : goal.priority === 2 ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-500'}`}>
                      {goal.priority === 1 ? '높음' : goal.priority === 2 ? '중간' : '낮음'}
                    </span>
                    <span className="font-semibold">{goal.name}</span>
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    목표: {formatKRW(goal.target_amount)}
                    {goal.target_date && <span className="ml-2">({goal.target_date}까지)</span>}
                  </div>
                </div>
                <button onClick={() => { if (confirm('삭제?')) deleteGoal(goal.id).then(load); }} className="text-red-400 text-sm">삭제</button>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>현재 순자산: {formatKRW(netWorth)}</span>
                  <span>{progress.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-emerald-500 rounded-full h-3 transition-all" style={{ width: `${progress}%` }} />
                </div>
              </div>

              {/* Analysis */}
              {gap > 0 && (
                <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                  <div>부족분: <span className="font-semibold text-red-500">{formatKRW(gap)}</span></div>
                  {monthsLeft !== null && <div>남은 기간: <span className="font-semibold">{monthsLeft}개월</span></div>}
                  {monthlyNeeded && <div>월 필요 저축/투자: <span className="font-semibold text-blue-600">{formatKRW(monthlyNeeded)}</span></div>}
                </div>
              )}
              {gap <= 0 && (
                <div className="mt-3 text-sm text-emerald-600 bg-emerald-50 rounded-lg p-3 font-semibold">
                  목표 달성!
                </div>
              )}
            </div>
          );
        })}
        {goals.length === 0 && <div className="text-center py-8 text-slate-400">목표를 설정해보세요</div>}
      </div>
    </div>
  );
}
