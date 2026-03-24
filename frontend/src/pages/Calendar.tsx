import { useEffect, useState } from 'react';
import api from '../api';
import { formatKRW } from '../utils';

interface CalEvent {
  date: string;
  type: string;
  category: string;
  name: string;
  amount: number;
  color: string;
}

const TYPE_LABELS: Record<string, string> = {
  income: '수입', debt: '대출상환', big_expense: '목돈', spending: '지출',
};

export default function Calendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [annualSummary, setAnnualSummary] = useState<any>(null);
  const [tab, setTab] = useState<'calendar' | 'annual'>('calendar');

  const load = async () => {
    try {
      const res = await api.get('/calendar/events', { params: { year, month } });
      setEvents(res.data.events);
    } catch {}
  };

  const loadAnnual = async () => {
    try {
      const res = await api.get('/calendar/annual-summary', { params: { year } });
      setAnnualSummary(res.data);
    } catch {}
  };

  useEffect(() => { if (tab === 'calendar') load(); }, [year, month, tab]);
  useEffect(() => { if (tab === 'annual') loadAnnual(); }, [year, tab]);

  // Build calendar grid
  const firstDay = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return events.filter(e => e.date === dateStr);
  };

  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(year - 1); } else setMonth(month - 1); };
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(year + 1); } else setMonth(month + 1); };

  const totalIncome = events.filter(e => e.type === 'income').reduce((s, e) => s + e.amount, 0);
  const totalExpense = events.filter(e => e.amount < 0).reduce((s, e) => s + Math.abs(e.amount), 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">재무 캘린더</h2>
        <div className="flex gap-2">
          <button onClick={() => setTab('calendar')} className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'calendar' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>월간</button>
          <button onClick={() => setTab('annual')} className={`px-3 py-1.5 rounded-lg text-sm ${tab === 'annual' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 shadow'}`}>연간 결산</button>
        </div>
      </div>

      {tab === 'calendar' && (
        <>
          {/* Month Navigation */}
          <div className="flex justify-between items-center bg-white rounded-xl shadow p-4">
            <button onClick={prevMonth} className="text-slate-400 hover:text-blue-600 text-lg px-3">&lt;</button>
            <span className="text-lg font-bold">{year}년 {month}월</span>
            <button onClick={nextMonth} className="text-slate-400 hover:text-blue-600 text-lg px-3">&gt;</button>
          </div>

          {/* Summary */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <div className="text-xs text-slate-500">수입</div>
              <div className="font-bold text-blue-600">{formatKRW(totalIncome)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-3 text-center">
              <div className="text-xs text-slate-500">지출</div>
              <div className="font-bold text-red-500">{formatKRW(totalExpense)}</div>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="grid grid-cols-7 bg-slate-50">
              {['일', '월', '화', '수', '목', '금', '토'].map(d => (
                <div key={d} className="text-center py-2 text-xs font-medium text-slate-500">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((day, i) => {
                const dayEvents = day ? getEventsForDay(day) : [];
                const isToday = day === new Date().getDate() && month === new Date().getMonth() + 1 && year === new Date().getFullYear();
                return (
                  <div key={i} className={`min-h-[80px] border-t border-r p-1 ${!day ? 'bg-slate-50' : ''} ${isToday ? 'bg-blue-50' : ''}`}>
                    {day && (
                      <>
                        <div className={`text-xs font-medium mb-0.5 ${isToday ? 'text-blue-600 font-bold' : 'text-slate-600'}`}>{day}</div>
                        <div className="space-y-0.5">
                          {dayEvents.slice(0, 3).map((e, j) => (
                            <div key={j} className="text-[10px] px-1 py-0.5 rounded truncate" style={{ backgroundColor: e.color + '20', color: e.color }}>
                              {e.name} {e.amount > 0 ? `+${formatKRW(e.amount)}` : formatKRW(Math.abs(e.amount))}
                            </div>
                          ))}
                          {dayEvents.length > 3 && <div className="text-[10px] text-slate-400">+{dayEvents.length - 3}건</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Event List */}
          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold mb-3">{month}월 일정 ({events.length}건)</h3>
            <div className="space-y-1.5">
              {events.map((e, i) => (
                <div key={i} className="flex justify-between items-center p-2 rounded-lg hover:bg-slate-50">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: e.color }} />
                    <span className="text-xs text-slate-400">{e.date.split('-')[2]}일</span>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: e.color + '15', color: e.color }}>{TYPE_LABELS[e.type] || e.type}</span>
                    <span className="text-sm">{e.name}</span>
                  </div>
                  <span className={`text-sm font-bold ${e.amount > 0 ? 'text-blue-600' : 'text-red-500'}`}>
                    {e.amount > 0 ? '+' : '-'}{formatKRW(Math.abs(e.amount))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {tab === 'annual' && annualSummary && (
        <div className="space-y-4">
          <div className="flex gap-3 items-center">
            <button onClick={() => setYear(year - 1)} className="text-slate-400 hover:text-blue-600">&lt;</button>
            <span className="text-lg font-bold">{annualSummary.year}년 결산</span>
            <button onClick={() => setYear(year + 1)} className="text-slate-400 hover:text-blue-600">&gt;</button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">순자산 변동</div>
              <div className={`text-lg font-bold ${annualSummary.net_worth_change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{annualSummary.net_worth_change >= 0 ? '+' : ''}{formatKRW(annualSummary.net_worth_change)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">연간 수입</div>
              <div className="text-lg font-bold text-blue-600">{formatKRW(annualSummary.annual_income)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">연간 지출</div>
              <div className="text-lg font-bold text-red-500">{formatKRW(annualSummary.annual_expense)}</div>
            </div>
            <div className="bg-white rounded-xl shadow p-4 text-center">
              <div className="text-xs text-slate-500">연간 저축률</div>
              <div className="text-lg font-bold">{annualSummary.savings_rate}%</div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-5">
            <h3 className="font-semibold mb-3">TOP 지출 카테고리</h3>
            <div className="space-y-2">
              {annualSummary.top_expense_categories.map((c: any, i: number) => (
                <div key={i} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg">
                  <span className="font-medium">{i + 1}. {c.category}</span>
                  <span className="font-bold text-red-500">{formatKRW(c.annual)}/년</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            {annualSummary.highlights.filter((h: string) => h).map((h: string, i: number) => (
              <div key={i} className="text-sm text-blue-700">• {h}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
