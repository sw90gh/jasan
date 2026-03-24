import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { fetchDashboard, fetchHistory, takeSnapshot, type DashboardSummary, type HistoryRecord } from '../api';
import { formatKRW, CATEGORY_LABELS, CATEGORY_COLORS } from '../utils';

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [s, h] = await Promise.all([fetchDashboard(), fetchHistory()]);
      setSummary(s.data);
      setHistory(h.data);
    } catch {
      // API not available yet
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSnapshot = async () => {
    await takeSnapshot();
    load();
  };

  if (loading) return <div className="text-center py-12 text-slate-400">로딩 중...</div>;
  if (!summary) return <div className="text-center py-12 text-slate-400">서버에 연결할 수 없습니다. Backend를 실행해주세요.</div>;

  const pieData = Object.entries(summary.assets_by_category).map(([key, value]) => ({
    name: CATEGORY_LABELS[key] || key,
    value,
    color: CATEGORY_COLORS[key] || '#999',
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card label="총 자산" value={formatKRW(summary.total_assets)} color="text-blue-600" />
        <Card label="총 부채" value={formatKRW(summary.total_debts)} color="text-red-500" />
        <Card label="순자산" value={formatKRW(summary.net_worth)} color="text-emerald-600" />
        <Card label="월 저축액" value={formatKRW(summary.monthly_savings)} color="text-amber-600" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Pie Chart */}
        <div className="bg-white rounded-xl shadow p-5">
          <h2 className="text-lg font-semibold mb-4">자산 구성</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(v: number) => formatKRW(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400">자산을 등록해주세요</div>
          )}
        </div>

        {/* Area Chart */}
        <div className="bg-white rounded-xl shadow p-5">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">자산 추이</h2>
            <button onClick={handleSnapshot} className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full hover:bg-blue-100">
              스냅샷 저장
            </button>
          </div>
          {history.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => formatKRW(v)} tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => formatKRW(v)} />
                <Area type="monotone" dataKey="net_worth" stroke="#2563eb" fill="#dbeafe" name="순자산" />
                <Area type="monotone" dataKey="total_assets" stroke="#10b981" fill="#d1fae5" name="총자산" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[280px] flex items-center justify-center text-slate-400">스냅샷을 저장하면 추이가 표시됩니다</div>
          )}
        </div>
      </div>

      {/* Monthly Cash Flow */}
      <div className="bg-white rounded-xl shadow p-5">
        <h2 className="text-lg font-semibold mb-3">월간 현금흐름</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-sm text-slate-500">수입</div>
            <div className="text-xl font-bold text-blue-600">{formatKRW(summary.monthly_income)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">지출</div>
            <div className="text-xl font-bold text-red-500">{formatKRW(summary.monthly_expense)}</div>
          </div>
          <div>
            <div className="text-sm text-slate-500">저축</div>
            <div className="text-xl font-bold text-emerald-600">{formatKRW(summary.monthly_savings)}</div>
          </div>
        </div>
      </div>
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
