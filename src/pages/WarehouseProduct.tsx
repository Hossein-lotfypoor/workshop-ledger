import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getWarehouseCurrentStock, getWarehouseMovements, type WarehouseMovement, type WarehouseStock } from '../db/database';
import { getWarehouseProductKey } from '../utils/warehouseProducts';

const WarehouseProduct: React.FC = () => {
  const { model, color, item } = useParams();
  const [stock, setStock] = useState<WarehouseStock>();
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const productKey = model && color && item ? getWarehouseProductKey(model, color, item) : '';

  useEffect(() => {
    let active = true;
    if (productKey) {
      void Promise.all([getWarehouseCurrentStock(productKey), getWarehouseMovements(productKey)]).then(([value, history]) => {
        if (!active) return;
        setStock(value);
        setMovements(history);
      });
    }
    return () => { active = false; };
  }, [productKey]);

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4" dir="rtl">
      <Link to="/warehouse" className="text-sm font-semibold text-emerald-800 hover:underline">← بازگشت به ماتریس انبار</Link>

      <header className="border-b border-slate-300 pb-4">
        <p className="text-sm font-semibold text-emerald-700">مشخصات محصول</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">{item || 'محصول'}</h1>
        <p className="mt-2 text-sm text-slate-600">{model} <span className="px-1">/</span> {color}</p>
      </header>

      <section className="border-b border-slate-200 pb-5">
        <h2 className="mb-3 text-lg font-bold text-slate-800">شناسه محصول</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div><dt className="text-xs text-slate-500">نام مدل</dt><dd className="mt-1 font-semibold text-slate-800">{model}</dd></div>
          <div><dt className="text-xs text-slate-500">رنگ</dt><dd className="mt-1 font-semibold text-slate-800">{color}</dd></div>
          <div><dt className="text-xs text-slate-500">نوع کالا</dt><dd className="mt-1 font-semibold text-slate-800">{item}</dd></div>
        </dl>
      </section>

      <section className="border-b border-slate-200 pb-5">
        <h2 className="mb-3 text-lg font-bold text-slate-800">موجودی پایه</h2>
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div><dt className="text-xs text-slate-500">موجودی</dt><dd className="mt-1 font-semibold text-slate-800">{(stock?.quantity ?? 0).toLocaleString('fa-IR')}</dd></div>
          <div><dt className="text-xs text-slate-500">نقطه سفارش</dt><dd className="mt-1 font-semibold text-slate-800">{stock?.reorder_point?.toLocaleString('fa-IR') ?? '—'}</dd></div>
        </dl>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-slate-800">گردش کالا</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-slate-500">گردشی برای این محصول ثبت نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse text-right text-sm">
              <thead className="bg-slate-100 text-slate-700"><tr>
                <th className="p-2">تاریخ</th><th className="p-2">نوع</th><th className="p-2">مقدار</th><th className="p-2">مبدا / مقصد</th><th className="p-2">سند</th><th className="p-2">توضیحات</th>
              </tr></thead>
              <tbody>{movements.map(movement => (
                <tr key={movement.id} className="border-b border-slate-200">
                  <td className="p-2 whitespace-nowrap">{movement.date}</td>
                  <td className={`p-2 font-semibold ${movement.type === 'in' ? 'text-emerald-800' : 'text-orange-800'}`}>{movement.type === 'in' ? 'ورود' : 'خروج'}</td>
                  <td className="p-2">{movement.quantity.toLocaleString('fa-IR')}</td>
                  <td className="p-2">{movement.counterparty || '—'}</td>
                  <td className="p-2">{movement.reference_number || '—'}</td>
                  <td className="p-2">{movement.notes || '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};

export default WarehouseProduct;