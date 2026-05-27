import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { db, getAllWorkshops, parseWeightAttributes } from '../db/database';
import type { Workshop } from '../db/database';
import { toJalali, toMiladi } from '../utils/dateUtils';

const SearchReports: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [workshopId, setWorkshopId] = useState<number>(0);
  const [settled, setSettled] = useState<'all'|'settled'|'pending'>('all');
  const [productName, setProductName] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);

  useEffect(() => { getAllWorkshops().then(setWorkshops); }, []);

  const search = async () => {
    const miladiStart = startDate ? toMiladi(startDate) : null;
    const miladiEnd = endDate ? toMiladi(endDate) : null;
    const allItems = await db.invoice_items.toArray();
    const filtered: {
      invoice_number: string;
      invoice_id: number;
      invoice_date: string;
      workshop_name?: string;
      product_name: string;
      operation: string;
      quantity_sent: number;
      weight_sent: number;
      total_returned_qty: number;
      total_returned_weight: number;
      total_good_qty: number;
      total_good_weight: number;
      is_settled: boolean;
      status: string;
      weight_total?: number;
      weight_net?: number;
      container_count?: number;
      sample_weight?: number;
      sample_count?: number;
      piece_weight?: string;
    }[] = [];
    for (const item of allItems) {
      const invoice = await db.invoices.get(item.invoice_id);
      if (!invoice) continue;
      if (miladiStart && invoice.date < miladiStart) continue;
      if (miladiEnd && invoice.date > miladiEnd) continue;
      if (workshopId && invoice.workshop_id !== workshopId) continue;
      if (settled === 'settled' && !item.is_settled) continue;
      if (settled === 'pending' && item.is_settled) continue;
      if (productName && !item.product_name.includes(productName)) continue;
      const workshop = await db.workshops.get(invoice.workshop_id);
      const returns = await db.return_invoice_items.where('original_invoice_item_id').equals(item.id!).toArray();
      const totalReturnedQty = returns.reduce((s, r) => s + (r.quantity_returned || 0), 0);
      const totalReturnedWt = returns.reduce((s, r) => s + (r.weight_returned || 0), 0);
      const totalGoodQty = returns.filter(r => r.return_status === 'good').reduce((s, r) => s + (r.quantity_returned || 0), 0);
      const totalGoodWt = returns.filter(r => r.return_status === 'good').reduce((s, r) => s + (r.weight_returned || 0), 0);
      const weightAttrs = parseWeightAttributes(item.attributes);
      filtered.push({
        invoice_number: invoice.invoice_number,
        invoice_id: invoice.id!,
        invoice_date: invoice.date,
        workshop_name: workshop?.name,
        product_name: item.product_name,
        operation: item.operation || '---',
        quantity_sent: item.quantity_sent,
        weight_sent: item.weight_sent,
        total_returned_qty: totalReturnedQty,
        total_returned_weight: totalReturnedWt,
        total_good_qty: totalGoodQty,
        total_good_weight: totalGoodWt,
        is_settled: item.is_settled,
        status: item.is_settled ? 'تسویه شده' : 'در جریان',
        weight_total: weightAttrs?.totalWeight,
        weight_net: weightAttrs?.netWeight,
        container_count: weightAttrs?.containerCount,
        sample_weight: weightAttrs?.sampleWeight,
        sample_count: weightAttrs?.sampleCount,
        piece_weight: weightAttrs ? (weightAttrs.sampleWeight / weightAttrs.sampleCount).toFixed(2) : undefined,
      });
    }
    setResults(filtered);
  };

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">جستجو و گزارش‌گیری</h1>
      <div className="bg-white p-4 rounded shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input type="text" placeholder="از تاریخ شمسی (مثال ۱۴۰۳/۰۱/۰۱)" className="border p-2" value={startDate} onChange={e=>setStartDate(e.target.value)} />
          <input type="text" placeholder="تا تاریخ شمسی (مثال ۱۴۰۳/۱۲/۲۹)" className="border p-2" value={endDate} onChange={e=>setEndDate(e.target.value)} />
          <select className="border p-2" value={workshopId} onChange={e=>setWorkshopId(parseInt(e.target.value))}>
            <option value="0">همه کارگاه‌ها</option>
            {workshops.map(w=> <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <select className="border p-2" value={settled} onChange={e=>setSettled(e.target.value as any)}>
            <option value="all">همه فاکتورها</option>
            <option value="settled">تسویه شده</option>
            <option value="pending">تسویه نشده</option>
          </select>
          <input type="text" className="border p-2" placeholder="جستجوی نام کالا" value={productName} onChange={e=>setProductName(e.target.value)} />
        </div>
        <button onClick={search} className="mt-4 bg-blue-600 text-white px-4 py-2 rounded">جستجو</button>
      </div>
      {results.length>0 && (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border">
            <thead className="bg-gray-100">
              <tr>
                <th className="border px-2 py-1">شماره فاکتور</th>
                <th className="border px-2 py-1">تاریخ</th>
                <th className="border px-2 py-1">کارگاه</th>
                <th className="border px-2 py-1">کالا</th>
                <th className="border px-2 py-1">عملیات</th>
                <th className="border px-2 py-1">تعداد ارسالی</th>
                <th className="border px-2 py-1">وزن خالص(g)</th>
                <th className="border px-2 py-1">برگشت کل(تعداد/وزن)</th>
                <th className="border px-2 py-1">وضعیت</th>
                <th className="border px-2 py-1">وزن کل(g)</th>
               
                <th className="border px-2 py-1">تعداد ظرف</th>
                <th className="border px-2 py-1">وزن نمونه(g)</th>
                <th className="border px-2 py-1">تعداد نمونه</th>
                <th className="border px-2 py-1">وزن هر قطعه(g)</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r,idx)=> (
                <tr key={idx} className={r.is_settled ? 'bg-green-50' : ''}>
                  <td className="border px-2 py-1"><Link to={`/invoice/${r.invoice_id}`} className="text-blue-700 hover:underline">{r.invoice_number}</Link></td>
                  <td className="border px-2 py-1">{toJalali(r.invoice_date)}</td>
                  <td className="border px-2 py-1">{r.workshop_name}</td>
                  <td className="border px-2 py-1">{r.product_name}</td>
                  <td className="border px-2 py-1">{r.operation}</td>
                  <td className="border px-2 py-1">{r.quantity_sent}</td>
                  <td className="border px-2 py-1">{r.weight_sent}</td>
                  <td className="border px-2 py-1">{r.total_returned_qty} / {r.total_returned_weight}</td>
                  <td className="border px-2 py-1">{r.status}</td>
                  <td className="border px-2 py-1">{r.weight_total?.toLocaleString() || '-'}</td>
                  
                  <td className="border px-2 py-1">{r.container_count || '-'}</td>
                  <td className="border px-2 py-1">{r.sample_weight?.toLocaleString() || '-'}</td>
                  <td className="border px-2 py-1">{r.sample_count || '-'}</td>
                  <td className="border px-2 py-1">{r.piece_weight || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SearchReports;