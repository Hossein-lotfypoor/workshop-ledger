// src/App.tsx
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InvoiceDetails from './pages/InvoiceDetails';
import WorkshopsManager from './pages/WorkshopsManager';
import SearchReports from './pages/SearchReports';
import NewInvoice from './pages/NewInvoice';
import WeightCalculator from './pages/WeightCalculator';
import LedgerBook from './pages/LedgerBook'; // ◄ اضافه شدن صفحه جدید سررسید

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-100" dir="rtl">
        <nav className="bg-slate-800 text-white p-3 flex gap-4 justify-center flex-wrap">
          <NavLink to="/" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>داشبورد</NavLink>
          <NavLink to="/new-invoice" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>فاکتور جدید</NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📖 ورود و خروج (سررسید)</NavLink> {/* ◄ لینک جدید */}
          <NavLink to="/workshops" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>کارگاه‌ها</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>گزارش‌ها</NavLink>
          <NavLink to="/weight-calc" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📦 محاسبه وزن</NavLink>
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice/:id" element={<InvoiceDetails />} />
            <Route path="/workshops" element={<WorkshopsManager />} />
            <Route path="/reports" element={<SearchReports />} />
            <Route path="/new-invoice" element={<NewInvoice />} />
            <Route path="/weight-calc" element={<WeightCalculator />} />
            <Route path="/ledger" element={<LedgerBook />} /> {/* ◄ مسیر جدید */}
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;