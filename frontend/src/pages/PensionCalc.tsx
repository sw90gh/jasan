import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import api from '../api';
import { formatKRW } from '../utils';

interface PensionSummary {
  national: { monthly_pension_estimate: number; total_contribution_years: number; replacement_rate: number } | null;
  retirement: { final_balance: number; monthly_pension_20yr: number; monthly_pension_30yr: number } | null;
  personal: { final_balance: number; monthly_pension_20yr: number; annual_tax_benefit: number; total_tax_benefit: number } | null;
  total_monthly_pension: number;
  income_replacement_rate: number;
  pension_gap: number;
  recommended_additional_saving: number;
}

export default function PensionCalc() {
  const [form, setForm] = useState({
    current_age: 35,
    retirement_age: 65,
    monthly_income: 3000000,
    target_monthly_living: 2500000,
  });
  const [result, setResult] = useState<PensionSummary | null>(null);
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      const res = await api.get('/pension-calc/summary', { params: form });
      setResult(res.data);
    } catch {}
    setLoading(false);
  };

  const chartData = result ? [
    { name: '국민연금', value: result.national?.monthly_pension_estimate || 0 },
    { name: '퇴직연금', value: result.retirement?.monthly_pension_20yr || 0 },
    { name: '개인연금', value: result.personal?.monthly_pension_20yr || 0 },
  ] : [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">연금 추정</h2>

      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-slate-500">현재 나이</label>
            <input type="number" value={form.current_age} onChange={e => setForm({ ...form, current_age: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">은퇴 나이</label>
            <input type="number" value={form.retirement_age} onChange={e => setForm({ ...form, retirement_age: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">월 소득</label>
            <input type="number" value={form.monthly_income} onChange={e => setForm({ ...form, monthly_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">목표 월 생활비</label>
            <input type="number" value={form.target_monthly_living} onChange={e => setForm({ ...form, target_monthly_living: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
        </div>
        <button onClick={run} disabled={loading} className="mt-4 bg-pink-500 text-white px-6 py-2 rounded-lg text-sm hover:bg-pink-600 disabled:opacity-50">
          {loading ? '계산 중...' : '연금 추정 실행'}
        </button>
        <p className="text-xs text-slate-400 mt-2">* 연금 관리 탭에서 연금 정보를 먼저 등록해주세요</p>
      </div>

      {result && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">예상 월 수령액</div>
              <div className="text-xl font-bold text-pink-600">{formatKRW(result.total_monthly_pension)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">소득대체율</div>
              <div className="text-xl font-bold text-blue-600">{result.income_replacement_rate}%</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">월 부족분</div>
              <div className="text-xl font-bold text-red-500">{formatKRW(result.pension_gap)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">추가 월 저축 필요</div>
              <div className="text-xl font-bold text-amber-600">{formatKRW(result.recommended_additional_saving)}</div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="text-lg font-semibold mb-3">연금 구성</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={v => formatKRW(v)} width={80} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatKRW(v)} />
                <Bar dataKey="value" name="월 수령액" fill="#ec4899" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detail Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {result.national && (
              <div className="bg-white rounded-xl shadow p-4">
                <h4 className="font-semibold text-pink-600 mb-2">국민연금</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">예상 가입기간</span><span>{result.national.total_contribution_years}년</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">예상 월 수령액</span><span className="font-bold">{formatKRW(result.national.monthly_pension_estimate)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">소득대체율</span><span>{result.national.replacement_rate}%</span></div>
                </div>
              </div>
            )}
            {result.retirement && (
              <div className="bg-white rounded-xl shadow p-4">
                <h4 className="font-semibold text-blue-600 mb-2">퇴직연금</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">예상 적립금</span><span className="font-bold">{formatKRW(result.retirement.final_balance)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">월 수령(20년)</span><span>{formatKRW(result.retirement.monthly_pension_20yr)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">월 수령(30년)</span><span>{formatKRW(result.retirement.monthly_pension_30yr)}</span></div>
                </div>
              </div>
            )}
            {result.personal && (
              <div className="bg-white rounded-xl shadow p-4">
                <h4 className="font-semibold text-emerald-600 mb-2">개인연금</h4>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">예상 적립금</span><span className="font-bold">{formatKRW(result.personal.final_balance)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">월 수령(20년)</span><span>{formatKRW(result.personal.monthly_pension_20yr)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">연 세액공제</span><span className="text-emerald-600">{formatKRW(result.personal.annual_tax_benefit)}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">누적 세액공제</span><span className="text-emerald-600">{formatKRW(result.personal.total_tax_benefit)}</span></div>
                </div>
              </div>
            )}
          </div>

          {result.pension_gap > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm">
              <strong>제안:</strong> 목표 월 생활비 대비 <strong className="text-red-500">{formatKRW(result.pension_gap)}</strong>이 부족합니다.
              매월 <strong className="text-blue-600">{formatKRW(result.recommended_additional_saving)}</strong>을 추가로 저축/투자하면 은퇴 후 부족분을 채울 수 있습니다.
            </div>
          )}
        </>
      )}
    </div>
  );
}
