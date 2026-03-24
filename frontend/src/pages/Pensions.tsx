import { useEffect, useState } from 'react';
import { fetchPensions, createPension, deletePension, type Pension } from '../api';
import { formatKRW, PENSION_TYPE_LABELS } from '../utils';

const pensionTypes = ['national', 'retirement', 'personal'] as const;

export default function Pensions() {
  const [pensions, setPensions] = useState<Pension[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    pension_type: 'national' as string,
    institution: '',
    monthly_contribution: 0,
    total_accumulated: 0,
    expected_monthly: 0,
    start_date: '',
    memo: '',
  });

  const load = async () => {
    try { setPensions((await fetchPensions()).data); } catch {}
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createPension({
      ...form,
      institution: form.institution || null,
      expected_monthly: form.expected_monthly || null,
      start_date: form.start_date || null,
      memo: form.memo || null,
    });
    setShowForm(false);
    load();
  };

  const totalAccumulated = pensions.reduce((s, p) => s + p.total_accumulated, 0);
  const totalExpectedMonthly = pensions.reduce((s, p) => s + (p.expected_monthly || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">연금 관리</h2>
          <p className="text-sm text-slate-500">누적 {formatKRW(totalAccumulated)} / 예상 월수령 {formatKRW(totalExpectedMonthly)}</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="bg-pink-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-pink-600">
          {showForm ? '취소' : '+ 연금 추가'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <select value={form.pension_type} onChange={e => setForm({ ...form, pension_type: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">
              {pensionTypes.map(t => <option key={t} value={t}>{PENSION_TYPE_LABELS[t]}</option>)}
            </select>
            <input placeholder="기관" value={form.institution} onChange={e => setForm({ ...form, institution: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="월 납입액" value={form.monthly_contribution || ''} onChange={e => setForm({ ...form, monthly_contribution: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="누적액" value={form.total_accumulated || ''} onChange={e => setForm({ ...form, total_accumulated: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="number" placeholder="예상 월 수령액" value={form.expected_monthly || ''} onChange={e => setForm({ ...form, expected_monthly: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm" />
            <input type="date" value={form.start_date} onChange={e => setForm({ ...form, start_date: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <button type="submit" className="bg-pink-500 text-white px-6 py-2 rounded-lg text-sm">저장</button>
        </form>
      )}

      <div className="space-y-2">
        {pensions.map(p => (
          <div key={p.id} className="bg-white rounded-xl shadow p-4 flex justify-between items-center">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs bg-pink-50 text-pink-500 px-2 py-0.5 rounded">{PENSION_TYPE_LABELS[p.pension_type] || p.pension_type}</span>
                {p.institution && <span className="text-sm">{p.institution}</span>}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                월 납입 {formatKRW(p.monthly_contribution)} | 예상 월수령 {p.expected_monthly ? formatKRW(p.expected_monthly) : '-'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-bold text-pink-600">{formatKRW(p.total_accumulated)}</span>
              <button onClick={() => { deletePension(p.id).then(load); }} className="text-red-400 text-sm">삭제</button>
            </div>
          </div>
        ))}
        {pensions.length === 0 && <div className="text-center py-8 text-slate-400">등록된 연금이 없습니다</div>}
      </div>
    </div>
  );
}
