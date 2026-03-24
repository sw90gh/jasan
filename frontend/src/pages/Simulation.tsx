import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import api from '../api';
import { formatKRW } from '../utils';

interface SimYear {
  year: number;
  age_label: string;
  total_invested: number;
  investment_return: number;
  total_value: number;
  real_value: number;
}

interface SimResult {
  current_net_worth: number;
  monthly_saving_used: number;
  target_amount: number;
  target_reached_year: number | null;
  yearly_projection: SimYear[];
  scenarios: { rate: number; label: string; final_value: number; reaches_target: boolean }[];
}

interface GapResult {
  target_amount: number;
  current_net_worth: number;
  gap: number;
  monthly_saving: number;
  annual_return_rate: number;
  years_to_goal: number | null;
  required_monthly_saving: number;
  required_return_rate: number | null;
}

export default function Simulation() {
  const [form, setForm] = useState({
    target_amount: 500000000,
    target_years: 20,
    monthly_saving: '',
    annual_return_rate: 5,
    inflation_rate: 2.5,
  });
  const [result, setResult] = useState<SimResult | null>(null);
  const [gap, setGap] = useState<GapResult | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        monthly_saving: form.monthly_saving ? Number(form.monthly_saving) : null,
      };
      const [simRes, gapRes] = await Promise.all([
        api.post('/simulation/project', payload),
        api.post('/simulation/gap', payload),
      ]);
      setResult(simRes.data);
      setGap(gapRes.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">목표 시뮬레이션</h2>

      {/* Input Form */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500">목표 금액</label>
            <input type="number" value={form.target_amount} onChange={e => setForm({ ...form, target_amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">목표 기간 (년)</label>
            <input type="number" value={form.target_years} onChange={e => setForm({ ...form, target_years: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">월 저축액 (빈칸=현재 저축액)</label>
            <input type="number" value={form.monthly_saving} onChange={e => setForm({ ...form, monthly_saving: e.target.value })} placeholder="자동" className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">예상 연수익률 (%)</label>
            <input type="number" step="0.5" value={form.annual_return_rate} onChange={e => setForm({ ...form, annual_return_rate: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">물가상승률 (%)</label>
            <input type="number" step="0.5" value={form.inflation_rate} onChange={e => setForm({ ...form, inflation_rate: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div className="flex items-end">
            <button onClick={run} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm hover:bg-blue-700 w-full disabled:opacity-50">
              {loading ? '계산 중...' : '시뮬레이션 실행'}
            </button>
          </div>
        </div>
      </div>

      {result && gap && (
        <>
          {/* Gap Analysis */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-lg font-semibold mb-3">갭 분석</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-500">현재 순자산</div>
                <div className="text-lg font-bold text-blue-600">{formatKRW(gap.current_net_worth)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">부족분</div>
                <div className="text-lg font-bold text-red-500">{formatKRW(gap.gap)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">목표 도달 예상</div>
                <div className="text-lg font-bold text-emerald-600">
                  {gap.years_to_goal ? `${gap.years_to_goal}년 후` : '도달 어려움'}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">필요 월 저축액</div>
                <div className="text-lg font-bold text-amber-600">{formatKRW(gap.required_monthly_saving)}</div>
              </div>
            </div>
            {gap.required_return_rate !== null && (
              <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
                현재 월 저축액({formatKRW(gap.monthly_saving)})으로 {form.target_years}년 안에 목표 달성하려면 <strong>연 {gap.required_return_rate}%</strong> 수익률이 필요합니다.
              </div>
            )}
          </div>

          {/* Projection Chart */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-lg font-semibold mb-3">자산 성장 예측</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={result.yearly_projection}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="age_label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={v => formatKRW(v)} tick={{ fontSize: 11 }} width={90} />
                <Tooltip formatter={(v: number) => formatKRW(v)} />
                <Area type="monotone" dataKey="total_value" stroke="#2563eb" fill="#dbeafe" name="예상 자산" />
                <Area type="monotone" dataKey="real_value" stroke="#10b981" fill="#d1fae5" name="실질 가치" />
                <Area type="monotone" dataKey="total_invested" stroke="#f59e0b" fill="#fef3c7" name="투자 원금" />
              </AreaChart>
            </ResponsiveContainer>
            {result.target_reached_year && (
              <div className="mt-2 text-sm text-emerald-600 font-semibold">
                목표 {formatKRW(result.target_amount)} 도달: {result.target_reached_year}년차
              </div>
            )}
          </div>

          {/* Scenarios */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-lg font-semibold mb-3">수익률별 시나리오</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={result.scenarios}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={v => formatKRW(v)} width={90} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatKRW(v)} />
                <Bar dataKey="final_value" name="예상 최종 자산">
                  {result.scenarios.map((s, i) => (
                    <Cell key={i} fill={s.reaches_target ? '#10b981' : '#f59e0b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-2 text-xs text-slate-500">
              녹색: 목표 달성 / 주황: 목표 미달
            </div>
          </div>
        </>
      )}
    </div>
  );
}
