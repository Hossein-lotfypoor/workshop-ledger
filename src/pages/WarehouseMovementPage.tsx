import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  addWarehouseMovement,
  getWarehouseCurrentStock,
  getWarehouseModels,
  getWarehouseMovements,
  type WarehouseMovement,
  type WarehouseStock
} from '../db/database';
import { getCurrentJalaliDate, toJalali, toMiladi } from '../utils/dateUtils';
import {
  getWarehouseItemsForModel,
  getWarehouseCatalogProducts,
  getWarehouseProductKey,
  warehouseColors,
  getWarehouseModelOptions
} from '../utils/warehouseProducts';

type MovementType = 'in' | 'out';

interface WarehouseMovementPageProps {
  type: MovementType;
}

const emptyForm = () => ({
  date: getCurrentJalaliDate(),
  quantity: '',
  counterparty: '',
  reference_number: '',
  notes: ''
});

const WarehouseMovementPage: React.FC<WarehouseMovementPageProps> = ({ type }) => {
  const isIncoming = type === 'in';
  const [model, setModel] = useState('');
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [color, setColor] = useState('');
  const [item, setItem] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [stock, setStock] = useState<WarehouseStock>();
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const productKey = model && color && item ? getWarehouseProductKey(model, color, item) : '';
  const catalogProducts = getWarehouseCatalogProducts(customModels);
  const selectedProduct = productKey
    ? catalogProducts.find(product => product.key === productKey)
    : undefined;
  const modelOptions = getWarehouseModelOptions(customModels);
  const itemOptions = model ? getWarehouseItemsForModel(model) : [];
  const inputClass = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

  const loadMovements = async () => setMovements(await getWarehouseMovements());

  useEffect(() => {
    void loadMovements();
    void getWarehouseModels().then(models => setCustomModels(models.map(savedModel => savedModel.name)));
  }, []);

  useEffect(() => {
    let active = true;
    if (!productKey) {
      setStock(undefined);
      return () => { active = false; };
    }
    void getWarehouseCurrentStock(productKey).then(value => {
      if (active) setStock(value);
    });
    return () => { active = false; };
  }, [productKey]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const quantity = Number(form.quantity);
    const date = toMiladi(form.date);
    if (!selectedProduct) return setError('مدل، رنگ و نام کالا را انتخاب کنید.');
    if (!date) return setError('تاریخ شمسی معتبر وارد کنید.');
    if (!Number.isFinite(quantity) || quantity <= 0) return setError('مقدار باید بیشتر از صفر باشد.');

    setSaving(true);
    setError('');
    try {
      await addWarehouseMovement({
        product_key: selectedProduct.key,
        model: selectedProduct.model,
        color: selectedProduct.color,
        item: selectedProduct.item,
        type,
        quantity,
        date,
        counterparty: form.counterparty.trim() || undefined,
        reference_number: form.reference_number.trim() || undefined,
        notes: form.notes.trim() || undefined
      });
      setForm(current => ({ ...current, quantity: '', counterparty: '', reference_number: '', notes: '' }));
      setStock(await getWarehouseCurrentStock(selectedProduct.key));
      await loadMovements();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ثبت گردش انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <Link to="/warehouse" className="text-xs font-semibold text-emerald-800 hover:underline">← بازگشت به ماتریس انبار</Link>
          <p className="mt-3 text-sm font-semibold text-emerald-700">مدیریت موجودی</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">ثبت {isIncoming ? 'ورود' : 'خروج'} کالا</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/warehouse/intake" aria-current={isIncoming ? 'page' : undefined} className={`rounded border px-4 py-2 text-sm font-semibold ${isIncoming ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-emerald-700 bg-white text-emerald-800 hover:bg-emerald-50'}`}>ثبت ورود کالا</Link>
          <Link to="/warehouse/dispatch" aria-current={!isIncoming ? 'page' : undefined} className={`rounded border px-4 py-2 text-sm font-semibold ${!isIncoming ? 'border-orange-700 bg-orange-700 text-white' : 'border-orange-700 bg-white text-orange-800 hover:bg-orange-50'}`}>ثبت خروج کالا</Link>
        </div>
      </header>

      <section aria-labelledby="warehouse-movement-title">
        <h2 id="warehouse-movement-title" className="mb-4 text-lg font-bold text-slate-800">مشخصات گردش</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="movement-model">مدل / گروه کالا *</label>
            <select id="movement-model" className={inputClass} value={model} onChange={event => { setModel(event.target.value); setColor(''); setItem(''); setError(''); }} required>
              <option value="">انتخاب مدل</option>
              {modelOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="movement-color">رنگ *</label>
            <select id="movement-color" className={inputClass} value={color} onChange={event => { setColor(event.target.value); setItem(''); setError(''); }} disabled={!model} required>
              <option value="">انتخاب رنگ</option>
              {warehouseColors.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <div>
            <label className={labelClass} htmlFor="movement-item">نام کالا *</label>
            <select id="movement-item" className={inputClass} value={item} onChange={event => { setItem(event.target.value); setError(''); }} disabled={!color} required>
              <option value="">انتخاب کالا</option>
              {itemOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          {selectedProduct && (
            <div className="flex items-center border-r-2 border-emerald-600 bg-emerald-50 px-3 py-2 text-sm text-slate-700 md:col-span-2 lg:col-span-3">
              <span className="font-semibold">موجودی فعلی:</span>
              <span className="mr-2 tabular-nums">{(stock?.quantity ?? 0).toLocaleString('fa-IR')}</span>
              {stock?.reorder_point !== undefined && <span className="mr-4 text-slate-500">نقطه سفارش: {stock.reorder_point.toLocaleString('fa-IR')}</span>}
            </div>
          )}
          <div>
            <label className={labelClass} htmlFor="movement-date">تاریخ شمسی *</label>
            <input id="movement-date" className={inputClass} value={form.date} onChange={event => setForm(current => ({ ...current, date: event.target.value }))} placeholder="۱۴۰۵/۰۷/۰۶" required />
          </div>
          <div>
            <label className={labelClass} htmlFor="movement-quantity">مقدار *</label>
            <input id="movement-quantity" className={inputClass} type="number" min="0.01" step="any" value={form.quantity} onChange={event => setForm(current => ({ ...current, quantity: event.target.value }))} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="movement-counterparty">{isIncoming ? 'مبدا / فروشنده' : 'مقصد / تحویل‌گیرنده'}</label>
            <input id="movement-counterparty" className={inputClass} value={form.counterparty} onChange={event => setForm(current => ({ ...current, counterparty: event.target.value }))} />
          </div>
          <div>
            <label className={labelClass} htmlFor="movement-reference">شماره فاکتور یا سند</label>
            <input id="movement-reference" className={inputClass} value={form.reference_number} onChange={event => setForm(current => ({ ...current, reference_number: event.target.value }))} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className={labelClass} htmlFor="movement-notes">توضیحات</label>
            <textarea id="movement-notes" className={inputClass} rows={2} value={form.notes} onChange={event => setForm(current => ({ ...current, notes: event.target.value }))} />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 lg:col-span-3">
            <button type="submit" disabled={saving} className={`rounded px-5 py-2 text-sm font-bold text-white disabled:opacity-60 ${isIncoming ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-orange-700 hover:bg-orange-800'}`}>
              {saving ? 'در حال ثبت...' : `ثبت ${isIncoming ? 'ورود' : 'خروج'} کالا`}
            </button>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          </div>
        </form>
      </section>

      <section aria-labelledby="movement-history-title">
        <div className="mb-3 flex items-center justify-between border-b border-slate-300 pb-3">
          <h2 id="movement-history-title" className="text-lg font-bold text-slate-800">آخرین گردش‌ها <span className="text-sm font-normal text-slate-500">({movements.length})</span></h2>
        </div>
        {movements.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">هنوز گردش انباری ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-right text-sm">
              <thead className="bg-slate-100 text-slate-700"><tr>
                <th className="p-3">تاریخ</th><th className="p-3">نوع</th><th className="p-3">محصول</th><th className="p-3">مقدار</th><th className="p-3">مبدا / مقصد</th><th className="p-3">سند</th><th className="p-3">توضیحات</th>
              </tr></thead>
              <tbody>{movements.slice(0, 50).map(movement => (
                <tr key={movement.id} className="border-b border-slate-200">
                  <td className="p-3 whitespace-nowrap">{toJalali(movement.date)}</td>
                  <td className={`p-3 font-semibold ${movement.type === 'in' ? 'text-emerald-800' : 'text-orange-800'}`}>{movement.type === 'in' ? 'ورود' : 'خروج'}</td>
                  <td className="p-3">{movement.model} / {movement.color} / {movement.item}</td>
                  <td className="p-3 tabular-nums">{movement.quantity.toLocaleString('fa-IR')}</td>
                  <td className="p-3">{movement.counterparty || '—'}</td>
                  <td className="p-3">{movement.reference_number || '—'}</td>
                  <td className="p-3">{movement.notes || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default WarehouseMovementPage;