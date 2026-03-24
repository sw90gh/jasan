import { useState } from 'react';
import api from '../api';
import { formatKRW } from '../utils';

type Tab = 'gift' | 'capital' | 'income' | 'advice';

export default function TaxCalc() {
  const [tab, setTab] = useState<Tab>('gift');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">세금 계산기</h2>
      <div className="flex gap-2 flex-wrap">
        {([['gift', '증여세'], ['capital', '양도소득세'], ['income', '종합소득세'], ['advice', '절세 전략']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm ${tab === key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>{label}</button>
        ))}
      </div>

      {tab === 'gift' && <GiftTax />}
      {tab === 'capital' && <CapitalGainsTax />}
      {tab === 'income' && <IncomeTax />}
      {tab === 'advice' && <TaxAdvice />}
    </div>
  );
}

function GiftTax() {
  const [form, setForm] = useState({ gift_amount: 100000000, relationship: 'adult_child', previous_gifts_10yr: 0 });
  const [result, setResult] = useState<any>(null);

  const calc = async () => {
    const res = await api.post('/tax/gift', form);
    setResult(res.data);
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">증여세 계산</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500">증여 금액</label>
          <input type="number" value={form.gift_amount} onChange={e => setForm({ ...form, gift_amount: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">관계</label>
          <select value={form.relationship} onChange={e => setForm({ ...form, relationship: e.target.value })} className="border rounded-lg px-3 py-2 text-sm w-full">
            <option value="spouse">배우자</option>
            <option value="adult_child">성년 자녀</option>
            <option value="minor_child">미성년 자녀</option>
            <option value="parent">부모</option>
            <option value="other_relative">기타 친족</option>
            <option value="non_relative">타인</option>
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-500">10년 내 기증여액</label>
          <input type="number" value={form.previous_gifts_10yr} onChange={e => setForm({ ...form, previous_gifts_10yr: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
      </div>
      <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">계산</button>

      {result && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>증여액</span><span>{formatKRW(result.gift_amount)}</span></div>
          <div className="flex justify-between"><span>면제한도 ({result.relationship_label})</span><span className="text-emerald-600">{formatKRW(result.exemption)}</span></div>
          <div className="flex justify-between"><span>과세표준</span><span>{formatKRW(result.taxable)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>증여세</span><span className="text-red-500">{formatKRW(result.tax)}</span></div>
          <div className="flex justify-between"><span>실효세율</span><span>{result.effective_rate}%</span></div>
          {result.tip && <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700">{result.tip}</div>}
        </div>
      )}
    </div>
  );
}

function CapitalGainsTax() {
  const [form, setForm] = useState({
    sale_price: 1500000000, purchase_price: 900000000, holding_years: 5,
    is_one_house: true, num_houses: 1, is_regulated_area: false, expenses: 10000000,
  });
  const [result, setResult] = useState<any>(null);

  const calc = async () => {
    const res = await api.post('/tax/capital-gains', form);
    setResult(res.data);
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">양도소득세 계산</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500">매도가</label>
          <input type="number" value={form.sale_price} onChange={e => setForm({ ...form, sale_price: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">매수가</label>
          <input type="number" value={form.purchase_price} onChange={e => setForm({ ...form, purchase_price: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">보유 기간 (년)</label>
          <input type="number" value={form.holding_years} onChange={e => setForm({ ...form, holding_years: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">필요경비</label>
          <input type="number" value={form.expenses} onChange={e => setForm({ ...form, expenses: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">보유 주택 수</label>
          <input type="number" value={form.num_houses} onChange={e => setForm({ ...form, num_houses: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div className="flex flex-col gap-2 justify-center">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_one_house} onChange={e => setForm({ ...form, is_one_house: e.target.checked })} /> 1세대 1주택
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={form.is_regulated_area} onChange={e => setForm({ ...form, is_regulated_area: e.target.checked })} /> 조정대상지역
          </label>
        </div>
      </div>
      <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">계산</button>

      {result && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
          {result.is_exempt ? (
            <div className="text-lg font-bold text-emerald-600">{result.details}</div>
          ) : (
            <>
              <div className="flex justify-between"><span>양도차익</span><span>{formatKRW(result.gain)}</span></div>
              <div className="flex justify-between"><span>장기보유공제</span><span className="text-emerald-600">-{formatKRW(result.long_term_deduction)}</span></div>
              <div className="flex justify-between"><span>기본공제</span><span>-{formatKRW(result.basic_deduction)}</span></div>
              <div className="flex justify-between"><span>과세표준</span><span>{formatKRW(result.taxable_gain)}</span></div>
              <div className="flex justify-between font-bold text-lg border-t pt-2"><span>양도소득세</span><span className="text-red-500">{formatKRW(result.tax)}</span></div>
              <div className="flex justify-between"><span>실효세율</span><span>{result.effective_rate}%</span></div>
              <div className="text-slate-500 mt-1">{result.details}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function IncomeTax() {
  const [form, setForm] = useState({
    salary_income: 50000000, business_income: 0, rental_income: 0,
    financial_income: 5000000, pension_income: 0, deductions: 15000000,
  });
  const [result, setResult] = useState<any>(null);

  const calc = async () => {
    const res = await api.post('/tax/income', form);
    setResult(res.data);
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">종합소득세 계산</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className="text-xs text-slate-500">근로소득</label>
          <input type="number" value={form.salary_income} onChange={e => setForm({ ...form, salary_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">사업소득</label>
          <input type="number" value={form.business_income} onChange={e => setForm({ ...form, business_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">임대소득</label>
          <input type="number" value={form.rental_income} onChange={e => setForm({ ...form, rental_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">금융소득 (이자+배당)</label>
          <input type="number" value={form.financial_income} onChange={e => setForm({ ...form, financial_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">연금소득</label>
          <input type="number" value={form.pension_income} onChange={e => setForm({ ...form, pension_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <div>
          <label className="text-xs text-slate-500">소득공제 합계</label>
          <input type="number" value={form.deductions} onChange={e => setForm({ ...form, deductions: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
      </div>
      <button onClick={calc} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">계산</button>

      {result && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span>총 소득</span><span>{formatKRW(result.total_income)}</span></div>
          <div className="flex justify-between"><span>과세표준</span><span>{formatKRW(result.taxable_income)}</span></div>
          <div className="flex justify-between"><span>소득세</span><span>{formatKRW(result.income_tax)}</span></div>
          <div className="flex justify-between"><span>지방소득세</span><span>{formatKRW(result.local_tax)}</span></div>
          <div className="flex justify-between font-bold text-lg border-t pt-2"><span>총 세금</span><span className="text-red-500">{formatKRW(result.total_tax)}</span></div>
          <div className="flex justify-between"><span>실효세율</span><span>{result.effective_rate}%</span></div>
          <div className="mt-2 p-2 bg-blue-50 rounded text-blue-700 text-xs">{result.financial_income_note}</div>
          {result.tips.map((tip: string, i: number) => (
            <div key={i} className="p-2 bg-amber-50 rounded text-amber-700 text-xs">{tip}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaxAdvice() {
  const [form, setForm] = useState({ annual_income: 50000000, has_pension_saving: false, has_irp: false, has_isa: false });
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    const res = await api.get('/tax/saving-advice', { params: form });
    setResult(res.data);
  };

  return (
    <div className="bg-white rounded-xl shadow p-5 space-y-4">
      <h3 className="font-semibold">절세 전략 제안</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="text-xs text-slate-500">연 소득</label>
          <input type="number" value={form.annual_income} onChange={e => setForm({ ...form, annual_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
        </div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_pension_saving} onChange={e => setForm({ ...form, has_pension_saving: e.target.checked })} /> 연금저축 보유</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_irp} onChange={e => setForm({ ...form, has_irp: e.target.checked })} /> IRP 보유</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_isa} onChange={e => setForm({ ...form, has_isa: e.target.checked })} /> ISA 보유</label>
      </div>
      <button onClick={load} className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm">분석</button>

      {result && (
        <>
          <div className="text-sm font-semibold">연간 절세 가능 금액: <span className="text-emerald-600">{formatKRW(result.total_potential_saving)}</span></div>
          <div className="space-y-3">
            {result.strategies.map((s: any, i: number) => (
              <div key={i} className={`p-4 rounded-lg border ${s.priority === '높음' ? 'border-red-200 bg-red-50' : s.priority === '중간' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold">{s.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${s.priority === '높음' ? 'bg-red-200 text-red-700' : s.priority === '중간' ? 'bg-amber-200 text-amber-700' : 'bg-slate-200 text-slate-600'}`}>{s.priority}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{s.description}</p>
                {s.annual_benefit > 0 && <p className="text-sm font-bold text-emerald-600 mt-1">연간 절세: {formatKRW(s.annual_benefit)}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
