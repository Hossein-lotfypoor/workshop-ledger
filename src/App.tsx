// src/App.tsx
import { useState } from 'react';
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
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryLinks = [
    { to: '/', label: 'خانه', icon: '⌂', end: true },
    { to: '/new-invoice', label: 'فاکتور', icon: '▤' },
    { to: '/ledger', label: 'دفتر', icon: '▥' },
    { to: '/warehouse', label: 'انبار', icon: '▦' }
  ];
  const moreLinks = [
    { to: '/ledger-reports', label: 'گزارش سررسید' },
    { to: '/workshops', label: 'کارگاه‌ها' },
    { to: '/reports', label: 'گزارش‌ها' },
    { to: '/weight-calc', label: 'محاسبه وزن' },
    { to: '/contacts', label: 'آدرس و تلفن' },
    { to: '/warehouse/bulk-entry', label: 'ورودی کلی انبار' }
  ];
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `app-nav-link${isActive ? ' app-nav-link--active' : ''}`;

  return (
    <HashRouter>
      <div className="app-shell" dir="rtl">
        <header className="app-header">
          <div className="app-header-inner">
            <NavLink to="/" className="app-brand" aria-label="دفتر کارگاه، صفحه خانه">
              <span className="app-brand-mark" aria-hidden="true"><span /><span /><span /></span>
              <span className="app-brand-copy"><strong>دفتر کارگاه</strong><small>مدیریت روزانه</small></span>
            </NavLink>
            <nav className="app-desktop-nav" aria-label="ناوبری اصلی">
              {primaryLinks.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
                <span className="app-nav-icon" aria-hidden="true">{link.icon}</span>{link.label}
              </NavLink>)}
              {moreLinks.map(link => <NavLink key={link.to} to={link.to} className={navLinkClass}>{link.label}</NavLink>)}
            </nav>
          </div>
        </header>
        <main className="app-main">
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
        <nav className="app-mobile-nav" aria-label="ناوبری موبایل">
          {primaryLinks.map(link => <NavLink key={link.to} to={link.to} end={link.end} className={navLinkClass}>
            <span className="app-nav-icon" aria-hidden="true">{link.icon}</span><span>{link.label}</span>
          </NavLink>)}
          <button type="button" className={`app-nav-link app-more-button${moreOpen ? ' app-nav-link--active' : ''}`} onClick={() => setMoreOpen(true)} aria-expanded={moreOpen} aria-haspopup="dialog">
            <span className="app-nav-icon" aria-hidden="true">•••</span><span>بیشتر</span>
          </button>
        </nav>
        {moreOpen && <div className="app-menu-backdrop" onClick={() => setMoreOpen(false)}>
          <section className="app-mobile-menu" role="dialog" aria-modal="true" aria-labelledby="app-more-title" onClick={event => event.stopPropagation()}>
            <div className="app-mobile-menu-heading">
              <h2 id="app-more-title">بخش‌های دیگر</h2>
              <button type="button" onClick={() => setMoreOpen(false)} aria-label="بستن منو">×</button>
            </div>
            <div className="app-mobile-menu-links">
              {moreLinks.map(link => <NavLink key={link.to} to={link.to} className={navLinkClass} onClick={() => setMoreOpen(false)}>{link.label}<span aria-hidden="true">‹</span></NavLink>)}
            </div>
          </section>
        </div>}
      </div>
    </HashRouter>
  );
}

export default App;