import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getWarehouseCurrentStocks, type WarehouseStock } from '../db/database';
import {
  getWarehouseProductKey,
  multiUseSinkTypes,
  showerSinkTypes,
  warehouseColors as colors,
  warehouseModelNames as modelNames,
  warehouseProductTypes as products
} from '../utils/warehouseProducts';

type ModelRow = {
  id: number;
  name: string;
};

const startingModels = [
  ...modelNames.map((name, index) => ({ id: index + 1, name })),
  ...Array.from({ length: 3 }, (_, index) => ({ id: modelNames.length + index + 1, name: '' }))
];

const WarehouseMatrix: React.FC = () => {
  const [models, setModels] = useState<ModelRow[]>(startingModels);
  const [stocks, setStocks] = useState<Record<string, WarehouseStock>>({});

  useEffect(() => {
    void getWarehouseCurrentStocks().then(items => {
      setStocks(Object.fromEntries(items.map(stock => [stock.product_key, stock])));
    });
  }, []);

  const addModel = () => {
    setModels(current => {
      const id = Math.max(0, ...current.map(model => model.id)) + 1;
      return [...current, { id, name: '' }];
    });
  };

  return (
    <div className="mx-auto max-w-full space-y-5 p-2" dir="rtl">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-slate-300 pb-4">
        <div>
          <p className="text-xs font-semibold text-emerald-700">مدیریت موجودی <span className="px-1 text-slate-400">/</span> ۲۱ مدل، ۷ رنگ و ۵ گروه کالا</p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">ماتریس محصولات انبار</h1>
        </div>
        <div className="flex gap-2">
          <Link to="/warehouse/bulk-entry" className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">ورودی کلی</Link>
          <Link to="/warehouse/intake" className="rounded border border-emerald-700 bg-white px-4 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-50">ثبت ورود کالا</Link>
          <Link to="/warehouse/dispatch" className="rounded border border-orange-700 bg-white px-4 py-2 text-sm font-semibold text-orange-800 transition hover:bg-orange-50">ثبت خروج کالا</Link>
          <button type="button" onClick={addModel} className="rounded bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800">＋ افزودن مدل خالی</button>
        </div>
      </header>

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
                      const modelName = model.name || `مدل جدید ${model.id - modelNames.length}`;
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
    </div>
  );
};

export default WarehouseMatrix;