import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import Debts from './pages/Debts';
import CashFlow from './pages/CashFlow';
import Pensions from './pages/Pensions';
import Goals from './pages/Goals';
import Simulation from './pages/Simulation';
import PensionCalc from './pages/PensionCalc';
import TaxCalc from './pages/TaxCalc';
import RealEstate from './pages/RealEstate';
import Sync from './pages/Sync';
import Advisor from './pages/Advisor';
import BigExpenses from './pages/BigExpenses';
import RealValue from './pages/RealValue';

const navItems = [
  { to: '/', label: '대시보드' },
  { to: '/assets', label: '자산' },
  { to: '/debts', label: '부채' },
  { to: '/cashflow', label: '수입/지출' },
  { to: '/big-expenses', label: '목돈계획' },
  { to: '/pensions', label: '연금' },
  { to: '/goals', label: '목표' },
  { to: '/simulation', label: '시뮬레이션' },
  { to: '/pension-calc', label: '연금추정' },
  { to: '/realvalue', label: '실질가치' },
  { to: '/tax', label: '세금' },
  { to: '/realestate', label: '부동산' },
  { to: '/advisor', label: '어드바이저' },
  { to: '/sync', label: '동기화' },
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
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/pension-calc" element={<PensionCalc />} />
            <Route path="/tax" element={<TaxCalc />} />
            <Route path="/realestate" element={<RealEstate />} />
            <Route path="/big-expenses" element={<BigExpenses />} />
            <Route path="/realvalue" element={<RealValue />} />
            <Route path="/advisor" element={<Advisor />} />
            <Route path="/sync" element={<Sync />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
