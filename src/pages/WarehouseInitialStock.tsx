import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  getWarehouseModels,
  getWarehouseStock,
  getWarehouseStocks,
  saveWarehouseInitialStocks,
  type WarehouseStock
} from '../db/database';
import WarehouseVoiceAssistant from '../components/WarehouseVoiceAssistant';
import { getWarehouseCatalogProducts } from '../utils/warehouseProducts';

type StockFields = { quantity: string; reorder_point: string };

const WarehouseInitialStock: React.FC = () => {
  const [values, setValues] = useState<Record<string, StockFields>>({});
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const catalogProducts = getWarehouseCatalogProducts(customModels);

  const refreshVoiceStock = async (productKeys: string[]) => {
    const stocks = await Promise.all(productKeys.map(productKey => getWarehouseStock(productKey)));
    setValues(current => {
      const next = { ...current };
      productKeys.forEach((productKey, index) => {
        const stock = stocks[index];
        next[productKey] = {
          quantity: String(stock?.quantity ?? 0),
          reorder_point: stock?.reorder_point === undefined ? '' : String(stock.reorder_point)
        };
      });
      return next;
    });
  };

  const handleVoiceModelAdded = (name: string) => {
    setCustomModels(current => current.includes(name) ? current : [...current, name].sort((a, b) => a.localeCompare(b, 'fa')));
  };

  useEffect(() => {
    let active = true;
    void Promise.all([getWarehouseStocks(), getWarehouseModels()]).then(([stocks, models]) => {
      if (!active) return;
      setCustomModels(models.map(model => model.name));
      setValues(Object.fromEntries(stocks.map(stock => [stock.product_key, {
        quantity: String(stock.quantity),
        reorder_point: stock.reorder_point === undefined ? '' : String(stock.reorder_point)
      }])));
    }).catch(() => {
      if (active) setError('خواندن موجودی‌های ثبت‌شده انجام نشد.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  const handleChange = (productKey: string, field: keyof StockFields, value: string) => {
    setValues(current => ({
      ...current,
      [productKey]: { ...(current[productKey] ?? { quantity: '', reorder_point: '' }), [field]: value }
    }));
    setError('');
    setNotice('');
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');

    const stocks: WarehouseStock[] = [];
    for (const product of catalogProducts) {
      const fields = values[product.key];
      if (!fields || (fields.quantity === '' && fields.reorder_point === '')) continue;
      const quantity = fields.quantity === '' ? 0 : Number(fields.quantity);
      const reorderPoint = fields.reorder_point === '' ? undefined : Number(fields.reorder_point);
      if (!Number.isFinite(quantity) || quantity < 0) {
        setError(`موجودی «${product.model} / ${product.color} / ${product.item}» باید صفر یا بیشتر باشد.`);
        setSaving(false);
        return;
      }
      if (reorderPoint !== undefined && (!Number.isFinite(reorderPoint) || reorderPoint < 0)) {
        setError(`نقطه سفارش «${product.model} / ${product.color} / ${product.item}» باید صفر یا بیشتر باشد.`);
        setSaving(false);
        return;
      }
      stocks.push({
        product_key: product.key,
        model: product.model,
        color: product.color,
        item: product.item,
        quantity,
        reorder_point: reorderPoint
      });
    }

    if (stocks.length === 0) {
      setError('موجودی یا نقطه سفارش حداقل یک محصول را وارد کنید.');
      setSaving(false);
      return;
    }

    try {
      await saveWarehouseInitialStocks(stocks);
      setValues(current => ({
        ...current,
        ...Object.fromEntries(stocks.map(stock => [stock.product_key, {
          quantity: String(stock.quantity),
          reorder_point: stock.reorder_point === undefined ? '' : String(stock.reorder_point)
        }]))
      }));
      setNotice(`موجودی پایهٔ ${stocks.length.toLocaleString('fa-IR')} محصول ذخیره شد.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'ذخیره موجودی‌ها انجام نشد.');
    } finally {
      setSaving(false);
    }
  };

  const normalizedSearch = search.trim().toLocaleLowerCase('fa');
  const visibleProducts = catalogProducts.filter(product =>
    [product.model, product.color, product.item].some(value => value.toLocaleLowerCase('fa').includes(normalizedSearch))
  );
  const inputClass = 'w-full rounded border border-slate-300 bg-white px-2 py-1.5 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600';

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-4" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <Link to="/warehouse" className="text-xs font-semibold text-emerald-800 hover:underline">← بازگشت به ماتریس انبار</Link>
          <p className="mt-3 text-sm font-semibold text-emerald-700">مدیریت موجودی</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">ورودی کلی | موجودی پایه</h1>
        </div>
        <p className="text-sm text-slate-600">{catalogProducts.length.toLocaleString('fa-IR')} محصول</p>
      </header>

      <WarehouseVoiceAssistant customModels={customModels} onModelAdded={handleVoiceModelAdded} onInventoryChanged={refreshVoiceStock} />

      <form onSubmit={handleSave} className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <input
            aria-label="جستجوی محصول"
            className={`${inputClass} max-w-sm px-3 py-2`}
            value={search}
            onChange={event => setSearch(event.target.value)}
            placeholder="جستجوی مدل، رنگ یا نوع کالا"
          />
          <button type="submit" disabled={loading || saving} className="rounded bg-emerald-700 px-5 py-2 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
            {loading ? 'در حال بارگذاری...' : saving ? 'در حال ذخیره...' : 'ذخیره موجودی‌های پایه'}
          </button>
        </div>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        {notice && <p role="status" className="text-sm text-emerald-800">{notice}</p>}

        <div className="max-h-[70vh] overflow-auto border border-slate-300">
          <table className="w-full min-w-[720px] border-collapse text-right text-sm">
            <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
              <tr>
                <th className="border-b border-slate-300 px-3 py-2">مدل</th>
                <th className="border-b border-slate-300 px-3 py-2">رنگ</th>
                <th className="border-b border-slate-300 px-3 py-2">نوع کالا</th>
                <th className="w-36 border-b border-slate-300 px-3 py-2">موجودی</th>
                <th className="w-36 border-b border-slate-300 px-3 py-2">نقطه سفارش</th>
              </tr>
            </thead>
            <tbody>
              {visibleProducts.map(product => (
                <tr key={product.key} className="odd:bg-white even:bg-slate-50">
                  <td className="border-b border-slate-200 px-3 py-1.5">{product.model}</td>
                  <td className="border-b border-slate-200 px-3 py-1.5">{product.color}</td>
                  <td className="border-b border-slate-200 px-3 py-1.5">{product.item}</td>
                  <td className="border-b border-slate-200 px-2 py-1">
                    <input
                      aria-label={`موجودی ${product.model} ${product.color} ${product.item}`}
                      className={inputClass}
                      type="number"
                      min="0"
                      step="any"
                      value={values[product.key]?.quantity ?? ''}
                      onChange={event => handleChange(product.key, 'quantity', event.target.value)}
                      disabled={loading}
                    />
                  </td>
                  <td className="border-b border-slate-200 px-2 py-1">
                    <input
                      aria-label={`نقطه سفارش ${product.model} ${product.color} ${product.item}`}
                      className={inputClass}
                      type="number"
                      min="0"
                      step="any"
                      value={values[product.key]?.reorder_point ?? ''}
                      onChange={event => handleChange(product.key, 'reorder_point', event.target.value)}
                      disabled={loading}
                    />
                  </td>
                </tr>
              ))}
              {visibleProducts.length === 0 && (
                <tr><td colSpan={5} className="px-3 py-8 text-center text-slate-500">محصولی با این جستجو پیدا نشد.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </form>
    </div>
  );
};

export default WarehouseInitialStock;