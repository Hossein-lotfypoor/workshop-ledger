import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { addWarehouseModel, getWarehouseCurrentStock, getWarehouseCurrentStocks, getWarehouseModels, type WarehouseStock } from '../db/database';
import WarehouseVoiceAssistant from '../components/WarehouseVoiceAssistant';
import {
  getWarehouseProductKey,
  multiUseSinkTypes,
  showerSinkTypes,
  warehouseColors as colors,
  warehouseModelNames as modelNames,
  warehouseProductTypes as products
} from '../utils/warehouseProducts';

const WarehouseMatrix: React.FC = () => {
  const [customModels, setCustomModels] = useState<string[]>([]);
  const [stocks, setStocks] = useState<Record<string, WarehouseStock>>({});
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [modelError, setModelError] = useState('');
  const [savingModel, setSavingModel] = useState(false);
  const models = [...modelNames, ...customModels].map((name, id) => ({ name, id: id + 1 }));

  useEffect(() => {
    void Promise.all([getWarehouseModels(), getWarehouseCurrentStocks()]).then(([savedModels, items]) => {
      setCustomModels(savedModels.map(model => model.name));
      setStocks(Object.fromEntries(items.map(stock => [stock.product_key, stock])));
    });
  }, []);

  const refreshStocks = async (productKeys: string[]) => {
    const refreshedStocks = await Promise.all(productKeys.map(productKey => getWarehouseCurrentStock(productKey)));
    setStocks(current => {
      const next = { ...current };
      productKeys.forEach((productKey, index) => {
        const stock = refreshedStocks[index];
        if (stock) next[productKey] = stock;
        else delete next[productKey];
      });
      return next;
    });
  };

  const handleVoiceModelAdded = (name: string) => {
    setCustomModels(current => current.includes(name) ? current : [...current, name].sort((a, b) => a.localeCompare(b, 'fa')));
  };

  const handleAddModel = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedName = newModelName.trim();
    if (!normalizedName) return setModelError('نام مدل را وارد کنید.');
    const existingModels = [...modelNames, ...customModels];
    if (existingModels.some(name => name.toLocaleLowerCase('fa') === normalizedName.toLocaleLowerCase('fa'))) {
      return setModelError('این مدل از قبل وجود دارد.');
    }

    setSavingModel(true);
    setModelError('');
    try {
      const savedModel = await addWarehouseModel(normalizedName);
      setCustomModels(current => [...current, savedModel.name].sort((a, b) => a.localeCompare(b, 'fa')));
      setNewModelName('');
      setModelModalOpen(false);
    } catch (error) {
      setModelError(error instanceof Error ? error.message : 'ذخیره مدل انجام نشد.');
    } finally {
      setSavingModel(false);
    }
  };

  return (
    <div className="mx-auto max-w-full space-y-5 p-2" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">مدیریت موجودی <span className="px-1 text-slate-400">/</span> {models.length} مدل، ۷ رنگ و ۵ گروه کالا</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">ماتریس محصولات انبار</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/warehouse/bulk-entry" className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">ورودی کلی</Link>
          <Link to="/warehouse/intake" className="rounded border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">ثبت ورود کالا</Link>
          <Link to="/warehouse/dispatch" className="rounded border border-orange-700 bg-white px-4 py-2 text-sm font-semibold text-orange-800 transition hover:bg-orange-50">ثبت خروج کالا</Link>
          <button type="button" onClick={() => { setModelError(''); setModelModalOpen(true); }} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">＋ افزودن مدل جدید</button>
        </div>
      </header>

      <WarehouseVoiceAssistant customModels={customModels} onModelAdded={handleVoiceModelAdded} onInventoryChanged={refreshStocks} />

      <div className="warehouse-matrix-shell overflow-hidden rounded-lg bg-white shadow-sm">
        <table className="warehouse-matrix w-full table-fixed border-separate border-spacing-0 text-center">
          <colgroup>
            <col className="warehouse-model-column" />
            {Array.from({ length: colors.length * products.length }, (_, index) => <col key={index} />)}
          </colgroup>
          <thead>
            <tr className="bg-slate-800 text-white">
              <th rowSpan={2} className="sticky right-0 z-20 border-b border-l border-slate-600 bg-slate-800 px-2 py-3 text-right text-sm">نام مدل</th>
              {colors.map((color, colorIndex) => <th key={color} colSpan={products.length} className={`border-b border-l border-slate-600 px-3 py-3 text-sm font-bold ${colorIndex === 0 ? '' : 'warehouse-group-start'}`}>
                <span className="inline-flex items-center justify-center gap-2">
                  <span aria-hidden="true" className={`h-2.5 w-2.5 rounded-full ring-1 ring-white/50 ${['bg-slate-300', 'bg-amber-300', 'bg-sky-200', 'bg-yellow-200', 'bg-stone-950', 'bg-zinc-400', 'bg-amber-500'][colorIndex]}`} />
                  {color}
                </span>
              </th>)}
            </tr>
            <tr className="bg-slate-100 text-slate-700">
              {colors.flatMap((color, colorIndex) => products.map((product, productIndex) => (
                <th key={`${color}-${product}`} className={`border-b border-l border-slate-300 px-0.5 py-2 text-[9px] font-semibold leading-tight ${productIndex === 0 && colorIndex > 0 ? 'warehouse-group-start' : ''}`}>{product}</th>
              )))}
            </tr>
          </thead>
          <tbody>
            {models.map((model, rowIndex) => (
              <tr key={model.id} className={rowIndex % 2 ? 'bg-slate-50' : 'bg-white'}>
                <th className={`sticky right-0 z-10 border-b border-l border-slate-300 p-2 align-middle ${rowIndex % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                  <span className="block whitespace-normal px-1.5 py-2 text-right text-[13px] font-bold leading-snug text-slate-800">{model.name || 'مدل جدید'}</span>
                </th>
                {colors.flatMap((color, colorIndex) => products.map((product, productIndex) => (
                  <td key={`${color}-${product}`} className={`border-b border-l border-slate-300 p-1 ${productIndex === 0 && colorIndex > 0 ? 'warehouse-group-start' : ''}`}>
                    {(() => {
                      const modelName = model.name;
                      const stock = stocks[getWarehouseProductKey(modelName, color, product)];
                      const quantity = stock?.quantity ?? 0;
                      const needsReorder = stock?.reorder_point !== undefined && quantity <= stock.reorder_point;
                      return <Link
                        to={`/warehouse/product/${encodeURIComponent(modelName)}/${encodeURIComponent(color)}/${encodeURIComponent(product)}`}
                        aria-label={`${modelName}, ${color}, ${product}: موجودی ${quantity}، نقطه سفارش ${stock?.reorder_point ?? 'ثبت نشده'}`}
                        title={`موجودی: ${quantity.toLocaleString('fa-IR')} | نقطه سفارش: ${stock?.reorder_point?.toLocaleString('fa-IR') ?? 'ثبت نشده'}`}
                        className={`flex min-h-8 items-center justify-center rounded-sm px-0.5 text-[10px] font-bold tabular-nums transition-colors hover:bg-emerald-100 hover:text-emerald-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-700 ${needsReorder ? 'bg-rose-200 text-rose-900' : 'text-slate-600'}`}
                      >{quantity.toLocaleString('fa-IR')}</Link>;
                    })()}
                  </td>
                )))}
              </tr>
            ))}
            <tr>
              <th colSpan={1 + colors.length * products.length} className="warehouse-section-row px-3 py-2 text-right text-xs font-bold">سینک‌های شاوری</th>
            </tr>
            {showerSinkTypes.map(sink => (
              <tr key={sink} className="bg-white">
                <th className="border-b border-l border-slate-300 px-2 py-2 text-right text-[10px]">{sink}</th>
                {colors.map((color, colorIndex) => <td key={color} colSpan={products.length} className={`border-b border-l border-slate-300 p-1 ${colorIndex > 0 ? 'warehouse-group-start' : ''}`}>
                  <Link to={`/warehouse/product/${encodeURIComponent('سینک شاوری')}/${encodeURIComponent(color)}/${encodeURIComponent(sink)}`} aria-label={`${sink}، ${color}: موجودی ${stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.quantity ?? 0}، نقطه سفارش ${stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.reorder_point ?? 'ثبت نشده'}`} title={`موجودی: ${(stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.quantity ?? 0).toLocaleString('fa-IR')} | نقطه سفارش: ${stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.reorder_point?.toLocaleString('fa-IR') ?? 'ثبت نشده'}`} className={`flex min-h-8 items-center justify-center rounded-sm text-[10px] font-bold hover:bg-emerald-100 ${stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.reorder_point !== undefined && (stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.quantity ?? 0) <= stocks[getWarehouseProductKey('سینک شاوری', color, sink)]!.reorder_point! ? 'bg-rose-200 text-rose-900' : 'text-slate-600'}`}>{(stocks[getWarehouseProductKey('سینک شاوری', color, sink)]?.quantity ?? 0).toLocaleString('fa-IR')}</Link>
                </td>)}
              </tr>
            ))}
            <tr>
              <th colSpan={1 + colors.length * products.length} className="warehouse-section-row px-3 py-2 text-right text-xs font-bold">سینک‌های تک و دومنظوره</th>
            </tr>
            {multiUseSinkTypes.map(sink => (
              <tr key={sink} className="bg-white">
                <th className="border-b border-l border-slate-300 px-2 py-2 text-right text-[10px]">{sink}</th>
                {colors.map((color, colorIndex) => <td key={color} colSpan={products.length} className={`border-b border-l border-slate-300 p-1 ${colorIndex > 0 ? 'warehouse-group-start' : ''}`}>
                  <Link to={`/warehouse/product/${encodeURIComponent('سینک تک و دومنظوره')}/${encodeURIComponent(color)}/${encodeURIComponent(sink)}`} aria-label={`${sink}، ${color}: موجودی ${stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.quantity ?? 0}، نقطه سفارش ${stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.reorder_point ?? 'ثبت نشده'}`} title={`موجودی: ${(stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.quantity ?? 0).toLocaleString('fa-IR')} | نقطه سفارش: ${stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.reorder_point?.toLocaleString('fa-IR') ?? 'ثبت نشده'}`} className={`flex min-h-8 items-center justify-center rounded-sm text-[10px] font-bold hover:bg-emerald-100 ${stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.reorder_point !== undefined && (stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.quantity ?? 0) <= stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]!.reorder_point! ? 'bg-rose-200 text-rose-900' : 'text-slate-600'}`}>{(stocks[getWarehouseProductKey('سینک تک و دومنظوره', color, sink)]?.quantity ?? 0).toLocaleString('fa-IR')}</Link>
                </td>)}
              </tr>
            ))}
            <tr className="bg-white">
              <th className="border-b border-l border-slate-300 px-2 py-2 text-right text-[10px]">سینک دیواری</th>
              {colors.map((color, colorIndex) => <td key={color} colSpan={products.length} className={`border-b border-l border-slate-300 p-1 ${colorIndex > 0 ? 'warehouse-group-start' : ''}`}>
                <Link to={`/warehouse/product/${encodeURIComponent('سینک دیواری')}/${encodeURIComponent(color)}/${encodeURIComponent('سینک دیواری')}`} aria-label={`سینک دیواری، ${color}: موجودی ${stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.quantity ?? 0}، نقطه سفارش ${stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.reorder_point ?? 'ثبت نشده'}`} title={`موجودی: ${(stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.quantity ?? 0).toLocaleString('fa-IR')} | نقطه سفارش: ${stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.reorder_point?.toLocaleString('fa-IR') ?? 'ثبت نشده'}`} className={`flex min-h-8 items-center justify-center rounded-sm text-[10px] font-bold hover:bg-emerald-100 ${stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.reorder_point !== undefined && (stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.quantity ?? 0) <= stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]!.reorder_point! ? 'bg-rose-200 text-rose-900' : 'text-slate-600'}`}>{(stocks[getWarehouseProductKey('سینک دیواری', color, 'سینک دیواری')]?.quantity ?? 0).toLocaleString('fa-IR')}</Link>
              </td>)}
            </tr>
          </tbody>
        </table>
      </div>
      {modelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={event => { if (event.target === event.currentTarget) setModelModalOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="add-model-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 id="add-model-title" className="text-lg font-bold text-slate-900">افزودن مدل جدید</h2>
              <button type="button" onClick={() => setModelModalOpen(false)} aria-label="بستن" className="flex h-9 w-9 items-center justify-center rounded bg-slate-100 text-xl text-slate-600">×</button>
            </div>
            <form onSubmit={handleAddModel} className="space-y-4">
              <div>
                <label htmlFor="new-warehouse-model" className="mb-1 block text-sm font-medium text-slate-700">نام مدل *</label>
                <input id="new-warehouse-model" autoFocus className="w-full rounded border border-slate-300 px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600" value={newModelName} onChange={event => { setNewModelName(event.target.value); setModelError(''); }} placeholder="نام مدل را بنویسید" required />
              </div>
              {modelError && <p role="alert" className="text-sm text-red-700">{modelError}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModelModalOpen(false)} className="rounded border border-slate-300 px-4 py-2 text-sm text-slate-700">انصراف</button>
                <button type="submit" disabled={savingModel} className="rounded bg-emerald-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{savingModel ? 'در حال ذخیره...' : 'ذخیره مدل'}</button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
};

export default WarehouseMatrix;