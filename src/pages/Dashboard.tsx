import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPendingInvoices, getAllInvoicesWithWorkshop } from '../db/database';
import type { InvoiceItem } from '../db/database';
import ReturnModal from '../components/ReturnModal';
import { toJalali } from '../utils/dateUtils';

const Dashboard: React.FC = () => {
  const [pending, setPending] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);

  const loadData = async () => {
    const pendingList = await getPendingInvoices();
    setPending(pendingList);
    const invoices = await getAllInvoicesWithWorkshop();
    setAllInvoices(invoices);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleReturn = (item: InvoiceItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const onReturnSaved = () => {
    setShowModal(false);
    loadData();
  };

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-6">داشبورد مدیریت کارگاه</h1>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">📌 در حال پیگیری (تسویه نشده)</h2>
        {pending.length === 0 && <p className="text-gray-500">هیچ فاکتور در حال پیگیری نیست.</p>}
        <div className="grid gap-4">
          {pending.map(p => (
            <div key={p.item.id} className="border rounded-lg p-4 shadow-sm bg-white">
              <div><strong>شماره فاکتور:</strong> {p.invoice.invoice_number}</div>
              <div><strong>کارگاه:</strong> {p.workshop.name}</div>
              <div><strong>کالا:</strong> {p.item.product_name}</div>
              <div><strong>عملیات:</strong> {p.item.operation || '---'}</div>
              <div><strong>تعداد ارسالی:</strong> {p.item.quantity_sent || '-'} ({p.item.unit_type})</div>
              <div><strong>باقیمانده:</strong> {p.remainingQty} عدد / {p.remainingWeight} کیلو</div>
              <div><strong>تاریخ ارسال:</strong> {toJalali(p.invoice.date)}</div>
              <div className="mt-2 flex gap-2">
                <button onClick={() => handleReturn(p.item)} className="bg-green-600 text-white px-3 py-1 rounded">➕ ثبت برگشت</button>
                <Link to={`/invoice/${p.invoice.id}`} className="bg-blue-600 text-white px-3 py-1 rounded">🔍 مشاهده فاکتور</Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <hr className="my-6" />

      <section>
        <h2 className="text-xl font-semibold mb-3">📄 همه فاکتورها</h2>
        <ul className="space-y-2">
          {allInvoices.map(inv => (
            <li key={inv.id}>
              <Link to={`/invoice/${inv.id}`} className="text-blue-700 hover:underline">
                فاکتور {inv.invoice_number} - {inv.workshopName} - {toJalali(inv.date)}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {showModal && selectedItem && (
        <ReturnModal item={selectedItem} onClose={() => setShowModal(false)} onSave={onReturnSaved} />
      )}
    </div>
  );
};

export default Dashboard;