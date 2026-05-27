import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { addInvoice, addInvoiceItem, getAllWorkshops, db } from '../db/database';
import type { Workshop } from '../db/database';
import { getCurrentJalaliDate, toMiladi } from '../utils/dateUtils';

const NewInvoice: React.FC = () => {
  const navigate = useNavigate();
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [invoice, setInvoice] = useState({
    invoice_number: '',
    workshop_id: 0,
    date: getCurrentJalaliDate(),
    description: ''
  });
  const [items, setItems] = useState([{
    line_number: 1,
    product_name: '',
    quantity_sent: '',
    weight_sent: '',
    unit_type: 'count' as const,
    operation: '',
    attributes: '',
    status: 'pending' as const,
    remaining_quantity: 0,
    remaining_weight: 0,
    is_settled: false
  }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getAllWorkshops().then(setWorkshops);
  }, []);

  const addItem = () => {
    setItems([...items, {
      line_number: items.length + 1,
      product_name: '',
      quantity_sent: '',
      weight_sent: '',
      unit_type: 'count',
      operation: '',
      attributes: '',
      status: 'pending',
      remaining_quantity: 0,
      remaining_weight: 0,
      is_settled: false
    }]);
  };

  const removeItem = (index: number) => {
    if (items.length === 1) {
      setError('حداقل یک قلم باید وجود داشته باشد');
      return;
    }
    const newItems = [...items];
    newItems.splice(index, 1);
    newItems.forEach((it, idx) => { it.line_number = idx + 1; });
    setItems(newItems);
    setError('');
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
    setError('');
  };

  const validateForm = async (): Promise<boolean> => {
    if (!invoice.invoice_number.trim()) { setError('شماره فاکتور را وارد کنید'); return false; }
    const existing = await db.invoices.where('invoice_number').equals(invoice.invoice_number).first();
    if (existing) { setError(`فاکتور با شماره ${invoice.invoice_number} قبلاً ثبت شده`); return false; }
    if (!invoice.workshop_id) { setError('کارگاه را انتخاب کنید'); return false; }
    const miladi = toMiladi(invoice.date);
    if (!miladi) { setError('تاریخ معتبر نیست (مثال ۱۴۰۳/۰۲/۱۸)'); return false; }
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      if (!it.product_name.trim()) { setError(`قلم ${i+1}: نام کالا را وارد کنید`); return false; }
      const type = it.unit_type as string;
      const qtyNum = parseFloat(it.quantity_sent as string) || 0;
      const wtNum = parseFloat(it.weight_sent as string) || 0;
      const hasQ = (type === 'count' || type === 'both') && qtyNum > 0;
      const hasW = (type === 'weight' || type === 'both') && wtNum > 0;
      if (!hasQ && !hasW) { setError(`قلم ${i+1}: حداقل تعداد یا وزن را وارد کنید`); return false; }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    if (!await validateForm()) { setSaving(false); return; }
    try {
      const miladiDate = toMiladi(invoice.date)!;
      const invoiceId = await addInvoice({
        invoice_number: invoice.invoice_number,
        workshop_id: invoice.workshop_id,
        date: miladiDate,
        description: invoice.description
      });
      for (const it of items) {
        if (!it.product_name.trim()) continue;
        const type = it.unit_type as string;
        const qtyNum = parseFloat(it.quantity_sent as string) || 0;
        const wtNum = parseFloat(it.weight_sent as string) || 0;
        const hasQ = (type === 'count' || type === 'both') && qtyNum > 0;
        const hasW = (type === 'weight' || type === 'both') && wtNum > 0;
        if (!hasQ && !hasW) continue;
        await addInvoiceItem({
          ...it,
          invoice_id: invoiceId,
          quantity_sent: qtyNum,
          weight_sent: wtNum,
          remaining_quantity: qtyNum,
          remaining_weight: wtNum
        });
      }
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">فاکتور جدید</h1>
      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow">
        <input type="text" placeholder="شماره فاکتور" className="border p-2 w-full mb-2" value={invoice.invoice_number} onChange={e => setInvoice({...invoice, invoice_number: e.target.value})} required />
        <select className="border p-2 w-full mb-2" value={invoice.workshop_id} onChange={e => setInvoice({...invoice, workshop_id: parseInt(e.target.value)})} required>
          <option value="">انتخاب کارگاه</option>
          {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
        </select>
        <input type="text" placeholder="تاریخ شمسی (مثال ۱۴۰۳/۰۲/۱۸)" className="border p-2 w-full mb-2" value={invoice.date} onChange={e => setInvoice({...invoice, date: e.target.value})} required />
        <textarea placeholder="توضیحات" className="border p-2 w-full mb-4" value={invoice.description} onChange={e => setInvoice({...invoice, description: e.target.value})} />

        <h2 className="text-xl font-semibold mb-2">قلم‌های فاکتور</h2>
        {items.map((item, idx) => (
          <div key={idx} className="border p-3 mb-3 rounded relative">
            <button type="button" onClick={() => removeItem(idx)} className="absolute top-1 left-1 bg-red-500 text-white rounded-full w-6 h-6 text-sm">✕</button>
            <input type="text" placeholder="نام کالا" className="border p-1 w-full mb-1 mt-4" value={item.product_name} onChange={e => handleItemChange(idx, 'product_name', e.target.value)} required />
            <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="تعداد ارسالی" className="border p-1 w-full mb-1" value={item.quantity_sent} onChange={e => handleItemChange(idx, 'quantity_sent', e.target.value)} />
            <input type="text" inputMode="numeric" pattern="[0-9]*" placeholder="وزن ارسالی (کیلوگرم)" className="border p-1 w-full mb-1" value={item.weight_sent} onChange={e => handleItemChange(idx, 'weight_sent', e.target.value)} />
            <select className="border p-1 w-full mb-1" value={item.unit_type} onChange={e => handleItemChange(idx, 'unit_type', e.target.value)}>
              <option value="count">تعدادی</option>
              <option value="weight">وزنی</option>
              <option value="both">هر دو</option>
            </select>
            <input type="text" placeholder="عملیات (مثل آبکاری مشکی)" className="border p-1 w-full" value={item.operation} onChange={e => handleItemChange(idx, 'operation', e.target.value)} />
          </div>
        ))}
        <button type="button" onClick={addItem} className="bg-gray-500 text-white px-3 py-1 rounded mb-3">➕ افزودن قلم دیگر</button>
        <div><button type="submit" disabled={saving} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">{saving ? 'در حال ذخیره...' : 'ذخیره فاکتور'}</button></div>
      </form>
    </div>
  );
};

export default NewInvoice;