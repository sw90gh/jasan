import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Treemap, BarChart, Bar,
} from 'recharts';
import { fetchDashboard, fetchHistory, takeSnapshot, type DashboardSummary, type HistoryRecord } from '../api';
import api from '../api';
import { formatKRW, CATEGORY_LABELS, CATEGORY_COLORS } from '../utils';

interface Insight { type: string; icon: string; message: string; detail: string | null; }
interface TreemapItem { name: string; category: string; value: number; color: string; children: { name: string; value: number; pnl: number | null }[]; }
interface DebtItem { name: string; category: string; principal: number; remaining: number; paid: number; progress: number; interest_rate: number; monthly_payment: number | null; }
interface GoalProgress { name: string; target: number; current: number; progress: number; priority: number; days_left: number | null; }
interface UpcomingExpense { name: string; category: string; amount: number; saved_amount: number; planned_date: string; days_left: number; progress: number; }
interface ExpenseBreakdown { total: number; items: { category: string; amount: number; percentage: number }[]; }

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [treemap, setTreemap] = useState<TreemapItem[]>([]);
  const [debts, setDebts] = useState<DebtItem[]>([]);
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [upcoming, setUpcoming] = useState<UpcomingExpense[]>([]);
  const [expenseBreakdown, setExpenseBreakdown] = useState<ExpenseBreakdown | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, h, ins, tm, db_, gp, ue, eb] = await Promise.all([
        fetchDashboard(), fetchHistory(), api.get('/insights/daily'),
        api.get('/dashboard/treemap'), api.get('/dashboard/debt-breakdown'),
        api.get('/dashboard/goals-progress'), api.get('/dashboard/upcoming-expenses'),
        api.get('/dashboard/expense-breakdown'),
      ]);
      setSummary(s.data); setHistory(h.data); setInsights(ins.data);
      setTreemap(tm.data); setDebts(db_.data); setGoals(gp.data);
      setUpcoming(ue.data); setExpenseBreakdown(eb.data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  if (!summary) return <div className="text-center py-12 text-slate-400">서버에 연결할 수 없습니다.</div>;

  const pieData = Object.entries(summary.assets_by_category).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key, value, color: CATEGORY_COLORS[key] || '#999',
  }));

  const savingsRate = summary.monthly_income > 0 ? Math.round(summary.monthly_savings / summary.monthly_income * 100) : 0;
  const debtRatio = summary.total_assets > 0 ? Math.round(summary.total_debts / summary.total_assets * 100) : 0;

  // Treemap용 flat data
  const treemapFlat = treemap.flatMap(cat =>
    cat.children.map(child => ({
      name: child.name,
      size: child.value,
      color: cat.color,
      category: cat.name,
      pnl: child.pnl,
    }))
  );

  return (
    <div className="space-y-6">
      {/* Insights */}
      {insights.length > 0 && (
        <div className="space-y-2">
          {insights.map((ins, i) => (
            <div key={i} className={`rounded-lg px-4 py-2.5 text-sm flex items-start gap-2 ${
              ins.type === 'positive' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
              ins.type === 'warning' ? 'bg-red-50 text-red-700 border border-red-200' :
              ins.type === 'milestone' ? 'bg-amber-50 text-amber-700 border border-amber-300' :
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              <span className="font-bold shrink-0 text-base">{ins.type === 'positive' ? '✓' : ins.type === 'warning' ? '⚠' : ins.type === 'milestone' ? '★' : 'ℹ'}</span>
              <div>
                <div>{ins.message}</div>
                {ins.detail && <div className="text-xs opacity-75 mt-0.5">{ins.detail}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Row 1: Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="총 자산" value={formatKRW(summary.total_assets)} color="text-blue-600" />
        <Card label="총 부채" value={formatKRW(summary.total_debts)} color="text-red-500" />
        <Card label="순자산" value={formatKRW(summary.net_worth)} color="text-emerald-600" />
        <Card label="월 저축액" value={formatKRW(summary.monthly_savings)} color="text-amber-600" />
      </div>

      {/* Row 2: Gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <GaugeCard label="저축률" value={savingsRate} max={50} unit="%" color={savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444'} />
        <GaugeCard label="부채비율" value={debtRatio} max={100} unit="%" color={debtRatio <= 30 ? '#10b981' : debtRatio <= 50 ? '#f59e0b' : '#ef4444'} />
        <GaugeCard label="자산 항목" value={treemapFlat.length} max={30} unit="개" color="#6366f1" />
        <GaugeCard label="목표 달성" value={goals.filter(g => g.progress >= 100).length} max={goals.length || 1} unit={`/${goals.length}`} color="#ec4899" />
      </div>

      {/* Row 3: Treemap + Pie */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Treemap */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">자산 구성 (트리맵)</h2>
          {treemapFlat.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <Treemap
                data={treemapFlat}
                dataKey="size"
                aspectRatio={4 / 3}
                stroke="#fff"
                content={<TreemapContent />}
              />
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-slate-400">자산을 등록해주세요</div>
          )}
          {/* Legend */}
          <div className="flex flex-wrap gap-2 mt-3">
            {treemap.map((cat, i) => (
              <span key={i} className="flex items-center gap-1 text-xs">
                <span className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }} />
                {cat.name} ({formatKRW(cat.value)})
              </span>
            ))}
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">자산 비율</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatKRW(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[320px] flex items-center justify-center text-slate-400">자산을 등록해주세요</div>
          )}
        </div>
      </div>

      {/* Row 4: Net Worth Trend */}
      <div className="bg-white rounded-xl shadow p-5">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">순자산 추이 (12개월)</h2>
          <button onClick={async () => { await takeSnapshot(); load(); }} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100">스냅샷 저장</button>
        </div>
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={history}>
              <defs>
                <linearGradient id="colorNW" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorAsset" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={v => formatKRW(v)} tick={{ fontSize: 11 }} width={85} />
              <Tooltip formatter={(v: number) => formatKRW(v)} />
              <Area type="monotone" dataKey="total_assets" stroke="#10b981" fill="url(#colorAsset)" name="총자산" strokeWidth={1.5} />
              <Area type="monotone" dataKey="net_worth" stroke="#2563eb" fill="url(#colorNW)" name="순자산" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[250px] flex items-center justify-center text-slate-400">스냅샷을 저장하면 추이가 표시됩니다</div>
        )}
      </div>

      {/* Row 5: Expense Waterfall + Cash Flow */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Expense Breakdown */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">월 지출 구성</h2>
          {expenseBreakdown && expenseBreakdown.items.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={expenseBreakdown.items} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tickFormatter={v => formatKRW(v)} tick={{ fontSize: 10 }} />
                  <YAxis type="category" dataKey="category" width={50} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v: number) => formatKRW(v)} />
                  <Bar dataKey="amount" radius={[0, 6, 6, 0]}>
                    {expenseBreakdown.items.map((_, i) => (
                      <Cell key={i} fill={['#ef4444', '#f97316', '#f59e0b', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#a855f7', '#ec4899', '#6b7280'][i % 13]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {expenseBreakdown.items.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span>{item.category}</span>
                    <span className="font-medium">{formatKRW(item.amount)} ({item.percentage}%)</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-slate-400">지출을 등록해주세요</div>
          )}
        </div>

        {/* Cash Flow Summary */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">월간 현금흐름</h2>
          <div className="space-y-4">
            <FlowBar label="수입" amount={summary.monthly_income} max={summary.monthly_income} color="#2563eb" />
            <FlowBar label="지출" amount={summary.monthly_expense} max={summary.monthly_income} color="#ef4444" />
            <FlowBar label="저축" amount={summary.monthly_savings} max={summary.monthly_income} color="#10b981" />
          </div>
          <div className="mt-4 p-3 bg-slate-50 rounded-lg text-center">
            <span className="text-xs text-slate-500">저축률</span>
            <div className="text-2xl font-bold" style={{ color: savingsRate >= 20 ? '#10b981' : savingsRate >= 10 ? '#f59e0b' : '#ef4444' }}>
              {savingsRate}%
            </div>
          </div>
        </div>
      </div>

      {/* Row 6: Debt Progress + Goals */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Debt Progress */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">부채 상환 현황</h2>
          <div className="space-y-3">
            {debts.map((d, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span><span className="text-xs bg-red-50 text-red-500 px-1.5 py-0.5 rounded mr-1">{d.category}</span>{d.name}</span>
                  <span className="text-xs text-slate-400">{d.interest_rate}% | 잔액 {formatKRW(d.remaining)}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 relative">
                  <div className="bg-emerald-500 rounded-full h-3 transition-all" style={{ width: `${d.progress}%` }} />
                  <span className="absolute right-1 top-0 text-[9px] text-slate-500 leading-3">{d.progress}%</span>
                </div>
              </div>
            ))}
            {debts.length === 0 && <div className="text-sm text-slate-400 text-center py-4">부채 없음</div>}
          </div>
        </div>

        {/* Goals */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">목표 달성률</h2>
          <div className="space-y-3">
            {goals.map((g, i) => (
              <div key={i}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{g.name}</span>
                  <span className="text-xs text-slate-400">
                    {g.progress >= 100 ? '달성!' : `${formatKRW(g.target - g.current)} 부족`}
                    {g.days_left !== null && g.days_left > 0 && ` | D-${g.days_left}`}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 relative">
                  <div className={`rounded-full h-3 transition-all ${g.progress >= 100 ? 'bg-emerald-500' : g.progress >= 70 ? 'bg-blue-500' : 'bg-amber-400'}`} style={{ width: `${Math.min(g.progress, 100)}%` }} />
                  <span className="absolute right-1 top-0 text-[9px] text-slate-500 leading-3">{g.progress}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 7: Upcoming Big Expenses */}
      {upcoming.length > 0 && (
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-3">다가오는 목돈 지출 (90일 이내)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcoming.map((e, i) => (
              <div key={i} className={`p-3 rounded-lg border ${e.days_left <= 14 ? 'border-red-300 bg-red-50' : e.days_left <= 30 ? 'border-amber-300 bg-amber-50' : 'border-slate-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-medium text-sm">{e.name}</span>
                  <span className={`text-xs font-bold ${e.days_left <= 14 ? 'text-red-500' : e.days_left <= 30 ? 'text-amber-600' : 'text-slate-500'}`}>D-{e.days_left}</span>
                </div>
                <div className="text-sm font-bold text-violet-600 mt-1">{formatKRW(e.amount)}</div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1">
                  <div className="bg-violet-500 rounded-full h-1.5" style={{ width: `${e.progress}%` }} />
                </div>
                <div className="text-xs text-slate-400 mt-1">준비 {e.progress}%</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-white rounded-xl shadow p-4">
      <div className="text-sm text-slate-500">{label}</div>
      <div className={`text-lg font-bold mt-1 ${color}`}>{value}</div>
    </div>
  );
}

function GaugeCard({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference * 0.75; // 270 degree arc

  return (
    <div className="bg-white rounded-xl shadow p-4 flex flex-col items-center">
      <svg width="100" height="70" viewBox="0 0 100 70">
        <path d="M 10 65 A 40 40 0 1 1 90 65" fill="none" stroke="#e2e8f0" strokeWidth="8" strokeLinecap="round" />
        <path d="M 10 65 A 40 40 0 1 1 90 65" fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={`${circumference * 0.75}`} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div className="text-xl font-bold -mt-3" style={{ color }}>{value}{unit}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}

function FlowBar({ label, amount, max, color }: { label: string; amount: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (amount / max) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-slate-600">{label}</span>
        <span className="font-bold" style={{ color }}>{formatKRW(amount)}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-4">
        <div className="rounded-full h-4 transition-all flex items-center justify-end pr-2" style={{ width: `${pct}%`, backgroundColor: color }}>
          {pct > 15 && <span className="text-[10px] text-white font-medium">{Math.round(pct)}%</span>}
        </div>
      </div>
    </div>
  );
}

// Custom Treemap content renderer
function TreemapContent(props: any) {
  const { x, y, width, height, name, size, color, pnl } = props;
  if (width < 30 || height < 20) return null;

  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={color} stroke="#fff" strokeWidth={2} rx={4} opacity={0.85} />
      {width > 50 && height > 30 && (
        <>
          <text x={x + 6} y={y + 16} fill="#fff" fontSize={width > 100 ? 12 : 10} fontWeight="bold">{name}</text>
          {height > 45 && <text x={x + 6} y={y + 32} fill="rgba(255,255,255,0.85)" fontSize={10}>{formatKRW(size)}</text>}
          {height > 58 && pnl !== null && (
            <text x={x + 6} y={y + 46} fill={pnl >= 0 ? '#bbf7d0' : '#fecaca'} fontSize={10}>
              {pnl >= 0 ? '+' : ''}{pnl}%
            </text>
          )}
        </>
      )}
    </g>
  );
}
