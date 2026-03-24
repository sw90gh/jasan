import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Debts from './pages/Debts';
import CashFlow from './pages/CashFlow';
import Pensions from './pages/Pensions';
import Goals from './pages/Goals';

const navItems = [
  { to: '/', label: '대시보드' },
  { to: '/assets', label: '자산' },
  { to: '/debts', label: '부채' },
  { to: '/cashflow', label: '수입/지출' },
  { to: '/pensions', label: '연금' },
  { to: '/goals', label: '목표' },
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <header className="bg-blue-600 text-white shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <h1 className="text-xl font-bold tracking-tight">JASAN 자산관리</h1>
          </div>
        </header>

        {/* Navigation */}
        <nav className="bg-white border-b shadow-sm sticky top-0 z-10 overflow-x-auto">
          <div className="max-w-7xl mx-auto px-4 flex gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-600 hover:text-blue-600'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/debts" element={<Debts />} />
            <Route path="/cashflow" element={<CashFlow />} />
            <Route path="/pensions" element={<Pensions />} />
            <Route path="/goals" element={<Goals />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
