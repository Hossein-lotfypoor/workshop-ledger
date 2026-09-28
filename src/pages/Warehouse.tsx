import React, { useEffect, useState } from 'react';
import {
  addWarehouseEntry,
  getWarehouseEntries,
  type WarehouseEntry
} from '../db/database';
import { getCurrentJalaliDate, toJalali, toMiladi } from '../utils/dateUtils';

const emptyForm = () => ({
  date: getCurrentJalaliDate(),
  product_name: '',
  category: '',
  quantity: '',
  unit: 'عدد',
  source: '',
  reference_number: '',
  notes: ''
});

const Warehouse: React.FC = () => {
  const [entries, setEntries] = useState<WarehouseEntry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEntries = async () => setEntries(await getWarehouseEntries());

  useEffect(() => {
    void loadEntries();
  }, []);

  const setField = (field: keyof ReturnType<typeof emptyForm>, value: string) => {
    setForm(current => ({ ...current, [field]: value }));
    setError('');
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const date = toMiladi(form.date);
    const quantity = Number(form.quantity);
    if (!form.product_name.trim()) return setError('نام کالا را وارد کنید.');
    if (!date) return setError('تاریخ شمسی معتبر وارد کنید.');
    if (!Number.isFinite(quantity) || quantity <= 0) return setError('مقدار باید بیشتر از صفر باشد.');

    setSaving(true);
    try {
      await addWarehouseEntry({
        date,
        product_name: form.product_name.trim(),
        category: form.category.trim() || undefined,
        quantity,
        unit: form.unit.trim(),
        source: form.source.trim() || undefined,
        reference_number: form.reference_number.trim() || undefined,
        notes: form.notes.trim() || undefined
      });
      setForm(emptyForm());
      await loadEntries();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'ثبت کالا انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredEntries = entries.filter(entry =>
    [entry.product_name, entry.category, entry.source, entry.reference_number, entry.notes]
      .some(value => value?.toLocaleLowerCase().includes(normalizedSearch))
  );

  const inputClass = 'w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600';
  const labelClass = 'mb-1 block text-sm font-medium text-slate-700';

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-4" dir="rtl">
      <header className="border-b border-slate-300 pb-4">
        <p className="text-sm font-semibold text-emerald-700">مدیریت موجودی</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">انبار | ورود اقلام</h1>
      </header>

      <section aria-labelledby="warehouse-entry-title">
        <h2 id="warehouse-entry-title" className="mb-4 text-lg font-bold text-slate-800">ثبت ورود کالا</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelClass} htmlFor="warehouse-product">نام کالا *</label>
            <input id="warehouse-product" className={inputClass} value={form.product_name} onChange={event => setField('product_name', event.target.value)} required />
          </div>
          <div>
            <label className={labelClass} htmlFor="warehouse-category">گروه کالا</label>
            <input id="warehouse-category" className={inputClass} value={form.category} onChange={event => setField('category', event.target.value)} placeholder="مثلاً مواد اولیه" />
          </div>
          <div>
            <label className={labelClass} htmlFor="warehouse-date">تاریخ ورود شمسی *</label>
            <input id="warehouse-date" className={inputClass} value={form.date} onChange={event => setField('date', event.target.value)} placeholder="۱۴۰۵/۰۷/۰۶" required />
          </div>
          <div className="grid grid-cols-[1fr_120px] gap-2">
            <div>
              <label className={labelClass} htmlFor="warehouse-quantity">مقدار *</label>
              <input id="warehouse-quantity" className={inputClass} type="number" min="0" step="any" value={form.quantity} onChange={event => setField('quantity', event.target.value)} required />
            </div>
            <div>
              <label className={labelClass} htmlFor="warehouse-unit">واحد</label>
              <select id="warehouse-unit" className={inputClass} value={form.unit} onChange={event => setField('unit', event.target.value)}>
                <option>عدد</option>
                <option>گرم</option>
                <option>کیلوگرم</option>
                <option>متر</option>
                <option>بسته</option>
                <option>سایر</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="warehouse-source">مبدا / فروشنده</label>
            <input id="warehouse-source" className={inputClass} value={form.source} onChange={event => setField('source', event.target.value)} />
          </div>
          <div>
            <label className={labelClass} htmlFor="warehouse-reference">شماره فاکتور یا سند</label>
            <input id="warehouse-reference" className={inputClass} value={form.reference_number} onChange={event => setField('reference_number', event.target.value)} />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <label className={labelClass} htmlFor="warehouse-notes">توضیحات</label>
            <textarea id="warehouse-notes" className={inputClass} rows={2} value={form.notes} onChange={event => setField('notes', event.target.value)} />
          </div>
          <div className="flex flex-wrap items-center gap-3 md:col-span-2 lg:col-span-3">
            <button type="submit" disabled={saving} className="rounded bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
              {saving ? 'در حال ثبت...' : 'ثبت ورود کالا'}
            </button>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          </div>
        </form>
      </section>

      <section aria-labelledby="warehouse-history-title">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-slate-300 pb-3">
          <h2 id="warehouse-history-title" className="text-lg font-bold text-slate-800">سوابق ورود <span className="text-sm font-normal text-slate-500">({entries.length})</span></h2>
          <input aria-label="جستجو در سوابق ورود" className={`${inputClass} max-w-sm`} value={search} onChange={event => setSearch(event.target.value)} placeholder="جستجو در کالا، گروه، مبدا یا سند" />
        </div>
        {filteredEntries.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">{entries.length ? 'موردی با این جستجو پیدا نشد.' : 'هنوز ورودی‌ای ثبت نشده است.'}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-right text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">تاریخ</th>
                  <th className="p-3">کالا</th>
                  <th className="p-3">گروه</th>
                  <th className="p-3">مقدار</th>
                  <th className="p-3">مبدا</th>
                  <th className="p-3">شماره سند</th>
                  <th className="p-3">توضیحات</th>
                </tr>
              </thead>
              <tbody>
                {filteredEntries.map(entry => (
                  <tr key={entry.id} className="border-b border-slate-200">
                    <td className="p-3 whitespace-nowrap">{toJalali(entry.date)}</td>
                    <td className="p-3 font-semibold">{entry.product_name}</td>
                    <td className="p-3">{entry.category || '—'}</td>
                    <td className="p-3 whitespace-nowrap">{entry.quantity} {entry.unit}</td>
                    <td className="p-3">{entry.source || '—'}</td>
                    <td className="p-3">{entry.reference_number || '—'}</td>
                    <td className="p-3">{entry.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default Warehouse;