import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell, LineChart, Line, Legend } from 'recharts';
import api from '../api';
import { formatKRW } from '../utils';

type Tab = 'refinance' | 'retirement' | 'education' | 'return' | 'whatif' | 'invest';

export default function Tools() {
  const [tab, setTab] = useState<Tab>('refinance');
  const tabs: [Tab, string][] = [
    ['refinance', '대출 갈아타기'], ['retirement', '은퇴 시나리오'],
    ['education', '교육비 플래너'], ['return', '세후 수익률'],
    ['whatif', 'What-if'], ['invest', '투자 비교'],
  ];

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">금융 도구</h2>
      <div className="flex gap-2 flex-wrap">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>{label}</button>
        ))}
      </div>
      {tab === 'refinance' && <Refinance />}
      {tab === 'retirement' && <RetirementScenarios />}
      {tab === 'education' && <EducationCost />}
      {tab === 'return' && <AfterTaxReturn />}
      {tab === 'whatif' && <WhatIf />}
      {tab === 'invest' && <InvestCompare />}
    </div>
  );
}

function Refinance() {
  const [form, setForm] = useState({ remaining_balance: 420000000, current_rate: 3.65, new_rate: 3.2, remaining_years: 23, refinance_cost: 3000000 });
  const [result, setResult] = useState<any>(null);
  const calc = async () => { setResult((await api.post('/tools/refinance', form)).data); };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">대출 갈아타기 시뮬레이션</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div><label className="text-xs text-slate-500">대출 잔액</label><input type="number" value={form.remaining_balance} onChange={e => setForm({ ...form, remaining_balance: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">현재 금리 (%)</label><input type="number" step="0.01" value={form.current_rate} onChange={e => setForm({ ...form, current_rate: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">새 금리 (%)</label><input type="number" step="0.01" value={form.new_rate} onChange={e => setForm({ ...form, new_rate: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">남은 기간 (년)</label><input type="number" value={form.remaining_years} onChange={e => setForm({ ...form, remaining_years: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">갈아타기 비용</label><input type="number" value={form.refinance_cost} onChange={e => setForm({ ...form, refinance_cost: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
      </div>
      <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">계산</button>
      {result && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>현재 월 상환액</span><span>{formatKRW(result.current_monthly)}</span></div>
          <div className="flex justify-between"><span>새 월 상환액</span><span className="text-blue-600 font-bold">{formatKRW(result.new_monthly)}</span></div>
          <div className="flex justify-between"><span>월 절약액</span><span className="text-emerald-600 font-bold">{formatKRW(result.monthly_saving)}</span></div>
          <div className="flex justify-between border-t pt-2"><span>총 절약액</span><span>{formatKRW(result.total_saving)}</span></div>
          <div className="flex justify-between"><span>갈아타기 비용</span><span className="text-red-500">-{formatKRW(result.refinance_cost)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>순 절약</span><span className={result.net_saving > 0 ? 'text-emerald-600' : 'text-red-500'}>{formatKRW(result.net_saving)}</span></div>
          {result.breakeven_months && <div className="text-slate-500">손익분기: {result.breakeven_months}개월</div>}
          <div className={`p-2 rounded ${result.net_saving > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{result.recommendation}</div>
        </div>
      )}
    </div>
  );
}

function RetirementScenarios() {
  const [form, setForm] = useState({ current_age: 35, current_net_worth: 1827500000, monthly_saving: 360000, annual_return_rate: 5, monthly_living_cost: 2500000, pension_monthly: 1050000, inflation_rate: 2.5 });
  const [result, setResult] = useState<any[]>([]);
  const calc = async () => { setResult((await api.post('/tools/retirement-scenarios', null, { params: form })).data); };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">은퇴 시나리오 비교</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className="text-xs text-slate-500">현재 나이</label><input type="number" value={form.current_age} onChange={e => setForm({ ...form, current_age: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">현재 순자산</label><input type="number" value={form.current_net_worth} onChange={e => setForm({ ...form, current_net_worth: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">월 저축</label><input type="number" value={form.monthly_saving} onChange={e => setForm({ ...form, monthly_saving: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">목표 월 생활비</label><input type="number" value={form.monthly_living_cost} onChange={e => setForm({ ...form, monthly_living_cost: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
      </div>
      <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">비교</button>
      {result.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50"><tr>
              <th className="px-3 py-2 text-left">은퇴 나이</th><th className="px-3 py-2 text-right">남은 기간</th><th className="px-3 py-2 text-right">월 생활비</th>
              <th className="px-3 py-2 text-right">예상 자산</th><th className="px-3 py-2 text-right">월 부족분</th><th className="px-3 py-2 text-right">총 부족분</th><th className="px-3 py-2 text-center">판정</th>
            </tr></thead>
            <tbody>{result.map((s: any, i: number) => (
              <tr key={i} className="border-t"><td className="px-3 py-2 font-bold">{s.retirement_age}세</td><td className="px-3 py-2 text-right">{s.years_until}년</td>
                <td className="px-3 py-2 text-right">{formatKRW(s.monthly_living_cost)}</td><td className="px-3 py-2 text-right text-blue-600">{formatKRW(s.projected_assets)}</td>
                <td className="px-3 py-2 text-right text-red-500">{formatKRW(s.gap_monthly)}</td><td className="px-3 py-2 text-right">{formatKRW(s.gap_total)}</td>
                <td className={`px-3 py-2 text-center font-bold ${s.feasibility === '가능' ? 'text-emerald-600' : s.feasibility === '주의' ? 'text-amber-600' : 'text-red-500'}`}>{s.feasibility}</td>
              </tr>))}</tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function EducationCost() {
  const [age, setAge] = useState(3);
  const [result, setResult] = useState<any>(null);
  const calc = async () => { setResult((await api.get('/tools/education-cost', { params: { child_age: age } })).data); };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">자녀 교육비 플래너</h3>
      <div className="flex gap-3 items-end">
        <div><label className="text-xs text-slate-500">자녀 나이</label><input type="number" value={age} onChange={e => setAge(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm w-32" /></div>
        <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">계산</button>
      </div>
      {result && (
        <>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-slate-50 rounded-lg p-3"><div className="text-xs text-slate-500">교육비 총액 (현재가)</div><div className="font-bold">{formatKRW(result.total_nominal)}</div></div>
            <div className="bg-amber-50 rounded-lg p-3"><div className="text-xs text-slate-500">물가반영 총액</div><div className="font-bold text-amber-600">{formatKRW(result.total_inflated)}</div></div>
            <div className="bg-blue-50 rounded-lg p-3"><div className="text-xs text-slate-500">월 준비 필요</div><div className="font-bold text-blue-600">{formatKRW(result.monthly_saving_needed)}</div></div>
          </div>
          <div className="space-y-2">{result.stages.map((s: any, i: number) => (
            <div key={i} className={`p-3 rounded-lg flex justify-between items-center ${s.status === '진행중' ? 'bg-blue-50 border border-blue-200' : s.status === '완료' ? 'bg-slate-100' : 'bg-white border'}`}>
              <div><span className="font-medium">{s.stage}</span> <span className="text-xs text-slate-400">{s.age_range}</span>
                {s.status === '진행중' && <span className="text-xs bg-blue-500 text-white px-2 py-0.5 rounded ml-2">진행중</span>}
                {s.years_until > 0 && <span className="text-xs text-slate-400 ml-2">{s.years_until}년 후</span>}
              </div>
              <div className="text-right"><div className="text-sm">현재가 {formatKRW(s.nominal_total)}</div><div className="text-sm font-bold text-amber-600">물가반영 {formatKRW(s.inflated_total)}</div></div>
            </div>
          ))}</div>
        </>
      )}
    </div>
  );
}

function AfterTaxReturn() {
  const [form, setForm] = useState({ investment_amount: 100000000, years: 10, inflation_rate: 2.5 });
  const [result, setResult] = useState<any>(null);
  const calc = async () => { setResult((await api.get('/tools/after-tax-return', { params: form })).data); };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">세후 실질수익률 비교</h3>
      <div className="flex gap-3 items-end flex-wrap">
        <div><label className="text-xs text-slate-500">투자금</label><input type="number" value={form.investment_amount} onChange={e => setForm({ ...form, investment_amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-40" /></div>
        <div><label className="text-xs text-slate-500">기간 (년)</label><input type="number" value={form.years} onChange={e => setForm({ ...form, years: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-24" /></div>
        <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">비교</button>
      </div>
      {result && (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={result.products} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" /><XAxis type="number" tickFormatter={v => `${v}%`} /><YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => `${v}%`} />
              <Bar dataKey="after_tax_return" name="세후 수익률" fill="#60a5fa" />
              <Bar dataKey="real_return" name="실질 수익률">
                {result.products.map((_: any, i: number) => <Cell key={i} fill={result.products[i].real_return > 0 ? '#10b981' : '#ef4444'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50"><tr>
            <th className="px-2 py-1.5 text-left">상품</th><th className="px-2 py-1.5 text-right">세전</th><th className="px-2 py-1.5 text-right">세율</th>
            <th className="px-2 py-1.5 text-right">세후</th><th className="px-2 py-1.5 text-right">실질</th><th className="px-2 py-1.5 text-right">{form.years}년 후 실질수익</th>
          </tr></thead><tbody>{result.products.map((p: any, i: number) => (
            <tr key={i} className="border-t"><td className="px-2 py-1.5 font-medium">{p.name}</td><td className="px-2 py-1.5 text-right">{p.gross_return}%</td>
              <td className="px-2 py-1.5 text-right text-red-400">{p.tax_rate}%</td><td className="px-2 py-1.5 text-right">{p.after_tax_return}%</td>
              <td className={`px-2 py-1.5 text-right font-bold ${p.real_return > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{p.real_return}%</td>
              <td className={`px-2 py-1.5 text-right ${p.profit_real > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatKRW(p.profit_real)}</td>
            </tr>))}</tbody></table></div>
        </>
      )}
    </div>
  );
}

function WhatIf() {
  const [form, setForm] = useState({ current_net_worth: 1827500000, monthly_saving: 360000, annual_return_rate: 5, extra_lump_sum: 0, extra_monthly: 0, rate_change: 0, years: 10 });
  const [result, setResult] = useState<any>(null);
  const calc = async () => { setResult((await api.post('/tools/what-if', null, { params: form })).data); };

  const chartData = result ? result.base_scenario.timeline.map((b: any, i: number) => ({
    year: `${b.year}년`, base: b.value, whatif: result.whatif_scenario.timeline[i].value,
  })) : [];

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">What-if 시뮬레이터</h3>
      <p className="text-xs text-slate-400">변수를 조정하면 기본 대비 얼마나 달라지는지 비교합니다</p>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div><label className="text-xs text-slate-500">추가 일시 투자/상환</label><input type="number" value={form.extra_lump_sum} onChange={e => setForm({ ...form, extra_lump_sum: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">추가 월 저축</label><input type="number" value={form.extra_monthly} onChange={e => setForm({ ...form, extra_monthly: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">수익률 변동 (%p)</label><input type="number" step="0.5" value={form.rate_change} onChange={e => setForm({ ...form, rate_change: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
        <div><label className="text-xs text-slate-500">기간 (년)</label><input type="number" value={form.years} onChange={e => setForm({ ...form, years: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" /></div>
      </div>
      <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">비교</button>
      {result && (
        <>
          <div className={`p-3 rounded-lg text-center font-bold text-lg ${result.diff_final > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {result.diff_description}
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" /><YAxis tickFormatter={v => formatKRW(v)} width={90} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => formatKRW(v)} /><Legend />
              <Line type="monotone" dataKey="base" name="기본" stroke="#94a3b8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="whatif" name="What-if" stroke="#2563eb" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </div>
  );
}

function InvestCompare() {
  const [form, setForm] = useState({ amount: 500000000, years: 10 });
  const [result, setResult] = useState<any>(null);
  const calc = async () => { setResult((await api.get('/tools/invest-compare', { params: form })).data); };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">부동산 vs 금융투자 비교</h3>
      <div className="flex gap-3 items-end">
        <div><label className="text-xs text-slate-500">투자금</label><input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-40" /></div>
        <div><label className="text-xs text-slate-500">기간</label><input type="number" value={form.years} onChange={e => setForm({ ...form, years: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-24" /></div>
        <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">비교</button>
      </div>
      {result && (
        <div className="space-y-3">{result.results.map((r: any, i: number) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg">
            <div className="flex justify-between items-center"><span className="font-semibold">{r.name}</span><span className="text-sm">연 {r.annual_return}%</span></div>
            <div className="grid grid-cols-3 gap-3 mt-2 text-center text-sm">
              <div><div className="text-xs text-slate-500">최종 자산</div><div className="font-bold text-blue-600">{formatKRW(r.final_value)}</div></div>
              <div><div className="text-xs text-slate-500">명목 수익</div><div className="font-bold">{formatKRW(r.profit)}</div></div>
              <div><div className="text-xs text-slate-500">실질 수익</div><div className={`font-bold ${r.real_profit > 0 ? 'text-emerald-600' : 'text-red-500'}`}>{formatKRW(r.real_profit)}</div></div>
            </div>
            <div className="text-xs text-slate-400 mt-1">{r.note}</div>
          </div>
        ))}</div>
      )}
    </div>
  );
}
