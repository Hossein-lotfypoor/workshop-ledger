import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment-jalaali';
import { db } from '../db/database';
import type { LedgerInput, LedgerOutput } from '../db/database';
import { toJalali, toMiladi, getCurrentJalaliDate } from '../utils/dateUtils';
import { formatInputLedgerLine, formatOutputLedgerLine } from '../utils/ledgerFormat';

type ReportType = 'all' | 'in' | 'out';

export interface LedgerReportRow {
  id: number;
  date: string;
  jalaliDate: string;
  type: 'in' | 'out';
  typeLabel: string;
  product_name: string;
  quantity: number;
  weight?: number;
  invoice_number?: string;
  source?: string;
  destination?: string;
  text: string;
}

function defaultStartDate(): string {
  return moment().startOf('jMonth').format('jYYYY/jMM/jDD');
}

const LedgerReports: React.FC = () => {
  const [startDate, setStartDate] = useState(defaultStartDate);
  const [endDate, setEndDate] = useState(getCurrentJalaliDate);
  const [reportType, setReportType] = useState<ReportType>('all');
  const [productName, setProductName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<LedgerReportRow[]>([]);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    const miladiStart = startDate ? toMiladi(startDate) : null;
    const miladiEnd = endDate ? toMiladi(endDate) : null;
    if (startDate && !miladiStart) return alert('تاریخ شروع نامعتبر است.');
    if (endDate && !miladiEnd) return alert('تاریخ پایان نامعتبر است.');

    const rows: LedgerReportRow[] = [];

    if (reportType === 'all' || reportType === 'in') {
      const inputs = await db.ledger_inputs.toArray();
      for (const item of inputs) {
        if (miladiStart && item.date < miladiStart) continue;
        if (miladiEnd && item.date > miladiEnd) continue;
        if (productName && !item.product_name.includes(productName.trim())) continue;
        if (invoiceNumber && !item.invoice_number?.includes(invoiceNumber.trim())) continue;
        if (keyword) {
          const haystack = [item.source, item.notes, item.product_name].filter(Boolean).join(' ');
          if (!haystack.includes(keyword.trim())) continue;
        }
        rows.push(mapInputRow(item));
      }
    }

    if (reportType === 'all' || reportType === 'out') {
      const outputs = await db.ledger_outputs.toArray();
      for (const item of outputs) {
        if (miladiStart && item.date < miladiStart) continue;
        if (miladiEnd && item.date > miladiEnd) continue;
        if (productName && !item.product_name.includes(productName.trim())) continue;
        if (invoiceNumber && !item.invoice_number?.includes(invoiceNumber.trim())) continue;
        if (keyword) {
          const haystack = [item.source, item.destination, item.notes, item.product_name].filter(Boolean).join(' ');
          if (!haystack.includes(keyword.trim())) continue;
        }
        rows.push(mapOutputRow(item));
      }
    }

    rows.sort((a, b) => {
      const dateDiff = a.date.localeCompare(b.date);
      if (dateDiff !== 0) return dateDiff;
      return a.id - b.id;
    });

    setResults(rows);
    setSearched(true);
  };

  const inputRows = results.filter(r => r.type === 'in');
  const outputRows = results.filter(r => r.type === 'out');
  const totalInputQty = inputRows.reduce((s, r) => s + r.quantity, 0);
  const totalOutputQty = outputRows.reduce((s, r) => s + r.quantity, 0);

  const handlePrint = () => window.print();

  return (
    <div className="container mx-auto p-4 max-w-7xl" dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">گزارش سررسید — ورود و خروج جنس</h1>
          <p className="text-sm text-slate-500 mt-1">جستجو و خلاصه ردیف‌های ثبت‌شده در دفتر سررسید</p>
        </div>
        <div className="flex gap-2">
          <Link to="/ledger" className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-sm font-bold">
            📖 بازگشت به دفتر
          </Link>
          {results.length > 0 && (
            <button onClick={handlePrint} className="bg-slate-700 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold">
              🖨️ چاپ
            </button>
          )}
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 no-print">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">از تاریخ</label>
            <input type="text" placeholder="۱۴۰۳/۰۱/۰۱" className="w-full border rounded-xl p-2.5 text-sm" value={startDate} onChange={e => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">تا تاریخ</label>
            <input type="text" placeholder="۱۴۰۳/۱۲/۲۹" className="w-full border rounded-xl p-2.5 text-sm" value={endDate} onChange={e => setEndDate(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">نوع</label>
            <select className="w-full border rounded-xl p-2.5 text-sm" value={reportType} onChange={e => setReportType(e.target.value as ReportType)}>
              <option value="all">همه (ورود + خروج)</option>
              <option value="in">فقط ورود</option>
              <option value="out">فقط خروج / تحویل</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">نام کالا</label>
            <input type="text" className="w-full border rounded-xl p-2.5 text-sm" placeholder="مثلاً: واشر" value={productName} onChange={e => setProductName(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">شماره فاکتور</label>
            <input type="text" className="w-full border rounded-xl p-2.5 text-sm" placeholder="مثلاً: ۴۰۰۳" value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">مبدا / مقصد / یادداشت</label>
            <input type="text" className="w-full border rounded-xl p-2.5 text-sm" placeholder="مثلاً: انبار، آقای ۵۶" value={keyword} onChange={e => setKeyword(e.target.value)} />
          </div>
        </div>
        <button onClick={search} className="mt-4 bg-amber-600 hover:bg-amber-700 text-white px-6 py-2.5 rounded-xl font-bold text-sm">
          🔍 نمایش گزارش
        </button>
      </div>

      {searched && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <SummaryCard label="کل ردیف‌ها" value={results.length.toLocaleString('fa-IR')} />
            <SummaryCard label="ورود (ردیف / تعداد)" value={`${inputRows.length.toLocaleString('fa-IR')} / ${totalInputQty.toLocaleString('fa-IR')}`} color="emerald" />
            <SummaryCard label="خروج (ردیف / تعداد)" value={`${outputRows.length.toLocaleString('fa-IR')} / ${totalOutputQty.toLocaleString('fa-IR')}`} color="orange" />
            <SummaryCard label="بازه گزارش" value={startDate && endDate ? `${startDate} تا ${endDate}` : '—'} color="slate" />
          </div>

          {results.length === 0 ? (
            <div className="bg-white rounded-2xl border p-10 text-center text-gray-500">
              ردیفی با این فیلترها یافت نشد.
            </div>
          ) : (
            <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-gray-200">
              <table className="min-w-full text-sm">
                <thead className="bg-amber-50 text-slate-700">
                  <tr>
                    <th className="border-b px-3 py-2 text-right">ردیف</th>
                    <th className="border-b px-3 py-2 text-right">تاریخ</th>
                    <th className="border-b px-3 py-2 text-right">نوع</th>
                    <th className="border-b px-3 py-2 text-right">کالا</th>
                    <th className="border-b px-3 py-2 text-right">تعداد</th>
                    <th className="border-b px-3 py-2 text-right">فاکتور</th>
                    <th className="border-b px-3 py-2 text-right">مبدا</th>
                    <th className="border-b px-3 py-2 text-right">مقصد</th>
                    <th className="border-b px-3 py-2 text-right min-w-[260px]">متن دفتر</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, idx) => (
                    <tr key={`${row.type}-${row.id}`} className={row.type === 'in' ? 'bg-emerald-50/40' : 'bg-orange-50/40'}>
                      <td className="border-b px-3 py-2">{idx + 1}</td>
                      <td className="border-b px-3 py-2 whitespace-nowrap">{row.jalaliDate}</td>
                      <td className="border-b px-3 py-2">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${row.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'}`}>
                          {row.typeLabel}
                        </span>
                      </td>
                      <td className="border-b px-3 py-2">{row.product_name}</td>
                      <td className="border-b px-3 py-2 font-bold">{row.quantity.toLocaleString('fa-IR')}</td>
                      <td className="border-b px-3 py-2">{row.invoice_number || '—'}</td>
                      <td className="border-b px-3 py-2">{row.source || '—'}</td>
                      <td className="border-b px-3 py-2">{row.destination || '—'}</td>
                      <td className="border-b px-3 py-2 ledger-handwriting text-base leading-snug">{row.text}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

function mapInputRow(item: LedgerInput): LedgerReportRow {
  return {
    id: item.id!,
    date: item.date,
    jalaliDate: toJalali(item.date),
    type: 'in',
    typeLabel: 'ورود',
    product_name: item.product_name,
    quantity: item.quantity,
    weight: item.weight,
    invoice_number: item.invoice_number,
    source: item.source,
    text: formatInputLedgerLine(item),
  };
}

function mapOutputRow(item: LedgerOutput): LedgerReportRow {
  return {
    id: item.id!,
    date: item.date,
    jalaliDate: toJalali(item.date),
    type: 'out',
    typeLabel: 'خروج',
    product_name: item.product_name,
    quantity: item.quantity,
    weight: item.weight,
    invoice_number: item.invoice_number,
    source: item.source,
    destination: item.destination,
    text: formatOutputLedgerLine(item),
  };
}

function SummaryCard({ label, value, color = 'amber' }: { label: string; value: string; color?: 'amber' | 'emerald' | 'orange' | 'slate' }) {
  const colors = {
    amber: 'bg-amber-50 border-amber-200 text-amber-900',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    orange: 'bg-orange-50 border-orange-200 text-orange-900',
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[color]}`}>
      <div className="text-xs opacity-70 mb-1">{label}</div>
      <div className="text-lg font-black">{value}</div>
    </div>
  );
}

export default LedgerReports;
