import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from 'recharts';
import api from '../api';
import { formatKRW } from '../utils';

interface RealValueReport {
  inflation_rate: number;
  pension_analysis: { type: string; institution: string; nominal_monthly: number; real_monthly: number; years_until: number; loss_pct: number; note: string }[];
  goal_analysis: { name: string; target_nominal: number; target_real_today: number; inflation_adjusted_need: number; years: number; note: string }[];
  big_expense_analysis: { name: string; planned_amount: number; inflation_adjusted: number; extra_needed: number; years: number }[];
  net_worth_future: { years: number; nominal: number; real_value: number; loss_pct: number; note: string }[];
}

const PENSION_LABELS: Record<string, string> = { national: '국민연금', retirement: '퇴직연금', personal: '개인연금' };

export default function RealValue() {
  const [form, setForm] = useState({ current_age: 35, retirement_age: 65, inflation_rate: 2.5 });
  const [report, setReport] = useState<RealValueReport | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.get('/realvalue/report', { params: form });
      setReport(res.data);
    } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">실질가치 분석 (물가 반영)</h2>
      <p className="text-sm text-slate-500">미래 금액이 지금 기준으로 실제 얼마의 가치인지 분석합니다.</p>

      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500">현재 나이</label>
            <input type="number" value={form.current_age} onChange={e => setForm({ ...form, current_age: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">은퇴 나이</label>
            <input type="number" value={form.retirement_age} onChange={e => setForm({ ...form, retirement_age: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">물가상승률 (%)</label>
            <input type="number" step="0.1" value={form.inflation_rate} onChange={e => setForm({ ...form, inflation_rate: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
        </div>
        <button onClick={load} disabled={loading} className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50">
          {loading ? '분석 중...' : '실질가치 분석'}
        </button>
      </div>

      {report && (
        <>
          {/* Net Worth Future */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold mb-3">현재 순자산의 미래 체감가치</h3>
            <p className="text-xs text-slate-400 mb-3">물가상승률 연 {report.inflation_rate}% 가정</p>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={report.net_worth_future}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="years" tickFormatter={v => `${v}년후`} />
                <YAxis tickFormatter={v => formatKRW(v)} width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatKRW(v)} labelFormatter={v => `${v}년 후`} />
                <Bar dataKey="nominal" name="명목 (액면)" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="real_value" name="실질 (체감)">
                  {report.net_worth_future.map((_, i) => (
                    <Cell key={i} fill="#6366f1" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-3 space-y-1">
              {report.net_worth_future.map((item, i) => (
                <div key={i} className="text-sm flex justify-between p-2 bg-slate-50 rounded">
                  <span>{item.years}년 후</span>
                  <span>
                    명목 <strong>{formatKRW(item.nominal)}</strong> → 체감 <strong className="text-indigo-600">{formatKRW(item.real_value)}</strong>
                    <span className="text-red-400 ml-2">(-{item.loss_pct}%)</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Pension Real Value */}
          {report.pension_analysis.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-3">연금 실질가치</h3>
              <p className="text-xs text-slate-400 mb-3">은퇴 시점({form.retirement_age}세) 기준 체감 수령액</p>
              <div className="space-y-3">
                {report.pension_analysis.map((p, i) => (
                  <div key={i} className="p-4 bg-gradient-to-r from-indigo-50 to-pink-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-semibold">{PENSION_LABELS[p.type] || p.type}</span>
                        {p.institution && <span className="text-xs text-slate-400 ml-2">{p.institution}</span>}
                      </div>
                      <span className="text-xs text-red-400">구매력 -{p.loss_pct}%</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <div>
                        <div className="text-xs text-slate-500">명목 월 수령액</div>
                        <div className="text-lg font-bold">{formatKRW(p.nominal_monthly)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">체감 월 수령액 (현재 가치)</div>
                        <div className="text-lg font-bold text-indigo-600">{formatKRW(p.real_monthly)}</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-500 mt-2">{p.note}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Goals Real Value */}
          {report.goal_analysis.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-3">목표 금액 실질가치</h3>
              <p className="text-xs text-slate-400 mb-3">목표 시점에 같은 구매력을 유지하려면 실제 필요한 금액</p>
              <div className="space-y-3">
                {report.goal_analysis.map((g, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-lg">
                    <div className="font-semibold">{g.name} <span className="text-xs text-slate-400">({g.years}년 후)</span></div>
                    <div className="grid grid-cols-3 gap-4 mt-2 text-center">
                      <div>
                        <div className="text-xs text-slate-500">설정 목표</div>
                        <div className="font-bold">{formatKRW(g.target_nominal)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">체감 가치</div>
                        <div className="font-bold text-amber-600">{formatKRW(g.target_real_today)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500">물가 반영 실제 필요액</div>
                        <div className="font-bold text-red-500">{formatKRW(g.inflation_adjusted_need)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Big Expense Real Value */}
          {report.big_expense_analysis.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-3">목돈 지출 물가 반영</h3>
              <div className="space-y-2">
                {report.big_expense_analysis.map((e, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg">
                    <div>
                      <span className="font-medium">{e.name}</span>
                      <span className="text-xs text-slate-400 ml-2">({e.years}년 후)</span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm">계획: {formatKRW(e.planned_amount)} → 물가반영: <strong className="text-red-500">{formatKRW(e.inflation_adjusted)}</strong></div>
                      <div className="text-xs text-red-400">+{formatKRW(e.extra_needed)} 추가 필요</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 text-sm">
            <strong>물가상승률 {report.inflation_rate}% 기준:</strong>
            <ul className="mt-1 space-y-1 text-indigo-700">
              <li>10년 후 100만원의 체감가치: {formatKRW(Math.round(1000000 / Math.pow(1 + report.inflation_rate / 100, 10)))}</li>
              <li>20년 후 100만원의 체감가치: {formatKRW(Math.round(1000000 / Math.pow(1 + report.inflation_rate / 100, 20)))}</li>
              <li>30년 후 100만원의 체감가치: {formatKRW(Math.round(1000000 / Math.pow(1 + report.inflation_rate / 100, 30)))}</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
