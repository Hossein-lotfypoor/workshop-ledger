// src/App.tsx
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import InvoiceDetails from './pages/InvoiceDetails';
import WorkshopsManager from './pages/WorkshopsManager';
import SearchReports from './pages/SearchReports';
import NewInvoice from './pages/NewInvoice';
import WeightCalculator from './pages/WeightCalculator';
import LedgerBook from './pages/LedgerBook'; // ◄ اضافه شدن صفحه جدید سررسید
import LedgerReports from './pages/LedgerReports';
import ContactsBook from './pages/ContactsBook';
import WarehouseMovementPage from './pages/WarehouseMovementPage';
import WarehouseMatrix from './pages/WarehouseMatrix';
import WarehouseProduct from './pages/WarehouseProduct';
import WarehouseInitialStock from './pages/WarehouseInitialStock';

function App() {
  return (
    <HashRouter>
      <div className="min-h-screen bg-gray-100" dir="rtl">
        <nav className="bg-slate-800 text-white p-3 flex gap-4 justify-center flex-wrap">
          <NavLink to="/" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>داشبورد</NavLink>
          <NavLink to="/new-invoice" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>فاکتور جدید</NavLink>
          <NavLink to="/ledger" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📖 ورود و خروج (سررسید)</NavLink>
          <NavLink to="/ledger-reports" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-amber-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📊 گزارش سررسید</NavLink>
          <NavLink to="/workshops" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>کارگاه‌ها</NavLink>
          <NavLink to="/reports" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>گزارش‌ها</NavLink>
          <NavLink to="/weight-calc" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-blue-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📦 محاسبه وزن</NavLink>
          <NavLink to="/contacts" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-violet-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📇 آدرس و تلفن</NavLink>
          <NavLink to="/warehouse" className={({ isActive }) => `px-3 py-1 rounded transition-colors ${isActive ? 'bg-emerald-600 text-white font-bold' : 'hover:bg-slate-700'}`}>📦 انبار</NavLink>
        </nav>
        <main className="p-4">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/invoice/:id" element={<InvoiceDetails />} />
            <Route path="/workshops" element={<WorkshopsManager />} />
            <Route path="/reports" element={<SearchReports />} />
            <Route path="/new-invoice" element={<NewInvoice />} />
            <Route path="/weight-calc" element={<WeightCalculator />} />
            <Route path="/ledger" element={<LedgerBook />} />
            <Route path="/ledger-reports" element={<LedgerReports />} />
            <Route path="/contacts" element={<ContactsBook />} />
            <Route path="/warehouse" element={<WarehouseMatrix />} />
            <Route path="/warehouse/bulk-entry" element={<WarehouseInitialStock />} />
            <Route path="/warehouse/intake" element={<WarehouseMovementPage type="in" />} />
            <Route path="/warehouse/dispatch" element={<WarehouseMovementPage type="out" />} />
            <Route path="/warehouse/product/:model/:color/:item" element={<WarehouseProduct />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;