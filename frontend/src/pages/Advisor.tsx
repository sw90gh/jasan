import { useState } from 'react';
import api from '../api';
import { formatKRW, CATEGORY_LABELS } from '../utils';

type Tab = 'report' | 'portfolio' | 'policy';

export default function Advisor() {
  const [tab, setTab] = useState<Tab>('report');

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">AI 재무 어드바이저</h2>
      <div className="flex gap-2 flex-wrap">
        {([['report', '월간 리포트'], ['portfolio', '포트폴리오 분석'], ['policy', '정부 정책 가이드']] as [Tab, string][]).map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`px-4 py-2 rounded-lg text-sm ${tab === key ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>{label}</button>
        ))}
      </div>

      {tab === 'report' && <MonthlyReport />}
      {tab === 'portfolio' && <Portfolio />}
      {tab === 'policy' && <PolicyGuide />}
    </div>
  );
}

function MonthlyReport() {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try { setReport((await api.get('/advisor/report')).data); } catch {}
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <button onClick={load} disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm disabled:opacity-50">
        {loading ? '생성 중...' : '리포트 생성'}
      </button>

      {report && (
        <>
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold mb-3">요약 ({report.report_date})</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <div><div className="text-xs text-slate-500">총 자산</div><div className="font-bold text-blue-600">{formatKRW(report.summary.total_assets)}</div></div>
              <div><div className="text-xs text-slate-500">총 부채</div><div className="font-bold text-red-500">{formatKRW(report.summary.total_debts)}</div></div>
              <div><div className="text-xs text-slate-500">순자산</div><div className="font-bold text-emerald-600">{formatKRW(report.summary.net_worth)}</div></div>
              <div><div className="text-xs text-slate-500">저축률</div><div className="font-bold">{report.summary.savings_rate}%</div></div>
              <div><div className="text-xs text-slate-500">부채비율</div><div className="font-bold">{report.summary.debt_ratio}%</div></div>
            </div>
          </div>

          {report.asset_change.prev_date && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-2">변동 사항 (vs {report.asset_change.prev_date})</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>자산 변동: <span className={report.asset_change.asset_diff >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{report.asset_change.asset_diff >= 0 ? '+' : ''}{formatKRW(report.asset_change.asset_diff)}</span></div>
                <div>순자산 변동: <span className={report.asset_change.net_worth_diff >= 0 ? 'text-emerald-600 font-bold' : 'text-red-500 font-bold'}>{report.asset_change.net_worth_diff >= 0 ? '+' : ''}{formatKRW(report.asset_change.net_worth_diff)}</span></div>
              </div>
            </div>
          )}

          {/* Highlights / Warnings / Recommendations */}
          {report.highlights.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
              <h4 className="font-semibold text-emerald-700 mb-2">긍정 포인트</h4>
              {report.highlights.map((h: string, i: number) => <div key={i} className="text-sm text-emerald-700">• {h}</div>)}
            </div>
          )}

          {report.warnings.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <h4 className="font-semibold text-red-700 mb-2">주의 사항</h4>
              {report.warnings.map((w: string, i: number) => <div key={i} className="text-sm text-red-700">• {w}</div>)}
            </div>
          )}

          {report.recommendations.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <h4 className="font-semibold text-blue-700 mb-2">추천 액션</h4>
              {report.recommendations.map((r: string, i: number) => <div key={i} className="text-sm text-blue-700">• {r}</div>)}
            </div>
          )}

          {/* Goal Progress */}
          {report.goal_progress.length > 0 && (
            <div className="bg-white rounded-xl shadow p-5">
              <h3 className="font-semibold mb-3">목표 진행 현황</h3>
              <div className="space-y-3">
                {report.goal_progress.map((g: any, i: number) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span>{g.name}</span>
                      <span>{g.progress}% ({formatKRW(g.gap)} 부족)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div className="bg-blue-600 rounded-full h-2.5" style={{ width: `${g.progress}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Portfolio() {
  const [ageGroup, setAgeGroup] = useState('30s');
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    try { setResult((await api.get('/advisor/portfolio', { params: { age_group: ageGroup } })).data); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-3 items-center">
        <select value={ageGroup} onChange={e => setAgeGroup(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="20s">20대</option>
          <option value="30s">30대</option>
          <option value="40s">40대</option>
          <option value="50s">50대</option>
          <option value="60s">60대</option>
        </select>
        <button onClick={load} className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm">분석</button>
      </div>

      {result && (
        <>
          <div className="bg-white rounded-xl shadow p-5">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-semibold">투자 성향</h3>
              <div className="flex items-center gap-2">
                <div className="text-sm">위험점수: <strong>{result.risk_score}/10</strong></div>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  result.risk_score <= 3 ? 'bg-blue-100 text-blue-700' :
                  result.risk_score <= 6 ? 'bg-amber-100 text-amber-700' :
                  'bg-red-100 text-red-700'
                }`}>{result.risk_label}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">현재 배분</h4>
                {Object.entries(result.current_allocation).map(([cat, pct]) => (
                  <div key={cat} className="flex justify-between text-sm py-1">
                    <span>{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-medium">{pct as number}%</span>
                  </div>
                ))}
                {Object.keys(result.current_allocation).length === 0 && <div className="text-sm text-slate-400">자산을 등록해주세요</div>}
              </div>
              <div>
                <h4 className="text-sm font-medium text-slate-500 mb-2">권장 배분 ({ageGroup})</h4>
                {Object.entries(result.recommended_allocation).map(([cat, pct]) => (
                  <div key={cat} className="flex justify-between text-sm py-1">
                    <span>{CATEGORY_LABELS[cat] || cat}</span>
                    <span className="font-medium text-blue-600">{pct as number}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold mb-3">리밸런싱 제안</h3>
            <div className="space-y-2">
              {result.rebalancing_actions.map((a: any, i: number) => (
                <div key={i} className={`p-3 rounded-lg text-sm ${a.action === '증가' ? 'bg-emerald-50 border border-emerald-200' : a.action === '감소' ? 'bg-red-50 border border-red-200' : 'bg-slate-50'}`}>
                  {a.description || a.action}
                  {a.amount > 0 && <span className="ml-2 font-bold">{formatKRW(a.amount)}</span>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PolicyGuide() {
  const [form, setForm] = useState({ age: 35, annual_income: 50000000, has_house: false, has_pension_saving: false, has_isa: false });
  const [result, setResult] = useState<any>(null);

  const load = async () => {
    try { setResult((await api.get('/advisor/policies', { params: form })).data); } catch {}
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs text-slate-500">나이</label>
            <input type="number" value={form.age} onChange={e => setForm({ ...form, age: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div>
            <label className="text-xs text-slate-500">연 소득</label>
            <input type="number" value={form.annual_income} onChange={e => setForm({ ...form, annual_income: Number(e.target.value) })} className="border rounded-lg px-3 py-2 text-sm w-full" />
          </div>
          <div className="flex flex-col gap-1 justify-center">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_house} onChange={e => setForm({ ...form, has_house: e.target.checked })} /> 주택 보유</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_pension_saving} onChange={e => setForm({ ...form, has_pension_saving: e.target.checked })} /> 연금저축 보유</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.has_isa} onChange={e => setForm({ ...form, has_isa: e.target.checked })} /> ISA 보유</label>
          </div>
        </div>
        <button onClick={load} className="mt-4 bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm">분석</button>
      </div>

      {result && (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="font-semibold text-emerald-700">연간 절세/혜택 가능 금액: {formatKRW(result.total_potential_benefit)}</div>
          </div>

          <div className="space-y-3">
            {result.applicable_policies.map((p: any, i: number) => (
              <div key={i} className="bg-white rounded-xl shadow p-4">
                <div className="font-semibold">{p.name}</div>
                <div className="text-sm text-slate-500 mt-1">{p.condition}</div>
                <div className="text-sm mt-1">{p.benefit}</div>
                {p.annual_benefit > 0 && <div className="text-sm font-bold text-emerald-600 mt-1">연간 혜택: {formatKRW(p.annual_benefit)}</div>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
