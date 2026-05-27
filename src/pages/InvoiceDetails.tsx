import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInvoiceWithItems, db, getReturnsForItem, deleteInvoiceFully, parseWeightAttributes } from '../db/database';
import type { InvoiceItem, Workshop } from '../db/database';
import ReturnModal from '../components/ReturnModal';
import { toJalali } from '../utils/dateUtils';

const InvoiceDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState<{ invoice: any; items: InvoiceItem[] } | null>(null);
  const [workshop, setWorkshop] = useState<Workshop | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);
  const [returnsMap, setReturnsMap] = useState<Map<number, any[]>>(new Map());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [expandedWeightItems, setExpandedWeightItems] = useState<Set<number>>(new Set());

  const load = async () => {
    if (!id) return;
    const data = await getInvoiceWithItems(parseInt(id));
    if (data) {
      setInvoiceData(data);
      const ws = await db.workshops.get(data.invoice.workshop_id);
      setWorkshop(ws || null);
      const retMap = new Map();
      for (const item of data.items) {
        const returns = await getReturnsForItem(item.id!);
        retMap.set(item.id!, returns);
      }
      setReturnsMap(retMap);
    }
  };

  useEffect(() => {
    load();
  }, [id]);

  const handleReturn = (item: InvoiceItem) => {
    setSelectedItem(item);
    setShowModal(true);
  };

  const onReturnSaved = async () => {
    setShowModal(false);
    await load();
  };

  const toggleExpand = (itemId: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) newExpanded.delete(itemId);
    else newExpanded.add(itemId);
    setExpandedItems(newExpanded);
  };

  const toggleWeightDetails = (itemId: number) => {
    const newSet = new Set(expandedWeightItems);
    if (newSet.has(itemId)) newSet.delete(itemId);
    else newSet.add(itemId);
    setExpandedWeightItems(newSet);
  };

  const handleDeleteInvoice = async () => {
    if (window.confirm(`آیا از حذف فاکتور ${invoiceData?.invoice.invoice_number} مطمئن هستید؟`)) {
      await deleteInvoiceFully(invoiceData!.invoice.id!);
      navigate('/');
    }
  };

  if (!invoiceData) return <div className="p-4">در حال بارگذاری...</div>;

  return (
    <div className="container mx-auto p-4" dir="rtl">
      {workshop && (
        <div className="border rounded-lg p-4 mb-6 bg-blue-50">
          <h2 className="text-xl font-bold">{workshop.name}</h2>
          <p>آدرس: {workshop.address || '---'}</p>
          <p>تلفن: {workshop.phone || '---'}</p>
        </div>
      )}
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="text-lg font-bold">فاکتور شماره: {invoiceData.invoice.invoice_number}</h3>
          <p>تاریخ: {toJalali(invoiceData.invoice.date)}</p>
        </div>
        <button onClick={handleDeleteInvoice} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">
          🗑️ حذف فاکتور
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border">
          <thead className="bg-gray-100">
            <tr>
              <th className="border px-4 py-2">کالا</th>
              <th className="border px-4 py-2">عملیات</th>
              <th className="border px-4 py-2">تعداد ارسالی</th>
              <th className="border px-4 py-2">وزن ارسالی</th>
              <th className="border px-4 py-2">برگشت کل</th>
              <th className="border px-4 py-2">باقیمانده</th>
              <th className="border px-4 py-2">عملیات</th>
            </tr>
          </thead>
          <tbody>
            {invoiceData.items.map(item => {
              const returns = returnsMap.get(item.id!) || [];
              const totalReturnedQty = returns.reduce((s:number, r:any) => s + (r.quantity_returned || 0), 0);
              const totalReturnedWt = returns.reduce((s:number, r:any) => s + (r.weight_returned || 0), 0);
              const totalGoodQty = returns.filter(r => r.return_status === 'good').reduce((s:number, r:any) => s + (r.quantity_returned || 0), 0);
              const remQty = (item.quantity_sent || 0) - totalReturnedQty;
              const remWt = (item.weight_sent || 0) - totalReturnedWt;
              const isExpanded = expandedItems.has(item.id!);
              const weightAttrs = parseWeightAttributes(item.attributes);
              const hasWeightAttrs = weightAttrs && (weightAttrs.totalWeight || weightAttrs.sampleWeight);
              const isWeightExpanded = expandedWeightItems.has(item.id!);
              return (
                <React.Fragment key={item.id}>
                  <tr className="hover:bg-gray-50">
                    <td className="border px-4 py-2">{item.product_name}</td>
                    <td className="border px-4 py-2">{item.operation || '---'}</td>
                    <td className="border px-4 py-2">{item.quantity_sent || '-'}</td>
                    <td className="border px-4 py-2">{item.weight_sent || '-'}</td>
                    <td className="border px-4 py-2">
                      {totalReturnedQty} / {totalReturnedWt}
                      {totalGoodQty > 0 && totalGoodQty !== totalReturnedQty ? ` (سالم: ${totalGoodQty})` : ''}
                    </td>
                    <td className="border px-4 py-2">{remQty} / {remWt}</td>
                    <td className="border px-4 py-2">
                      {(!item.is_settled && (remQty > 0 || remWt > 0)) && (
                        <button onClick={() => handleReturn(item)} className="bg-green-600 text-white px-3 py-1 rounded ml-2">برگشت</button>
                      )}
                      {returns.length > 0 && (
                        <button onClick={() => toggleExpand(item.id!)} className="bg-gray-500 text-white px-3 py-1 rounded ml-2">
                          {isExpanded ? 'بستن تاریخچه' : 'نمایش تاریخچه برگشت'}
                        </button>
                      )}
                      {hasWeightAttrs && (
                        <button onClick={() => toggleWeightDetails(item.id!)} className="bg-indigo-600 text-white px-2 py-1 rounded text-xs">
                          {isWeightExpanded ? 'بستن جزئیات وزن' : 'جزئیات وزن'}
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="border px-4 py-2">
                        <div className="text-sm">
                          <strong>تاریخچه برگشت‌ها:</strong>
                          <table className="w-full mt-2 border-collapse">
                            <thead>
                              <tr className="bg-gray-200">
                                <th className="border px-2 py-1">تاریخ برگشت</th>
                                <th className="border px-2 py-1">تعداد</th>
                                <th className="border px-2 py-1">وزن</th>
                                <th className="border px-2 py-1">فاکتور برگشت</th>
                                <th className="border px-2 py-1">وضعیت</th>
                              </tr>
                            </thead>
                            <tbody>
                              {returns.map((ret: any) => (
                                <tr key={ret.id}>
                                  <td className="border px-2 py-1">{ret.return_date ? toJalali(ret.return_date) : '---'}</td>
                                  <td className="border px-2 py-1">{ret.quantity_returned || '-'}</td>
                                  <td className="border px-2 py-1">{ret.weight_returned || '-'}</td>
                                  <td className="border px-2 py-1">{ret.return_invoice_number || '---'}</td>
                                  <td className="border px-2 py-1">{ret.return_status === 'good' ? '✅ سالم' : '❌ خراب'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                       </td>
                    </tr>
                  )}
                  {isWeightExpanded && hasWeightAttrs && (
                    <tr className="bg-slate-800/70">
                      <td colSpan={7} className="border px-2 py-2 text-xs">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-amber-200">
                          <div><span className="text-blue-300">وزن کل (ظرف+جنس):</span> {weightAttrs.totalWeight?.toLocaleString()} g ({(weightAttrs.totalWeight / 1000).toFixed(2)} kg)</div>
                          <div><span className="text-blue-300">وزن یک ظرف خالی:</span> {weightAttrs.tareWeight?.toLocaleString()} g</div>
                          <div><span className="text-blue-300">تعداد ظرف‌ها:</span> {weightAttrs.containerCount}</div>
                          <div><span className="text-blue-300">وزن خالص (جنس):</span> {weightAttrs.netWeight?.toLocaleString()} g ({(weightAttrs.netWeight / 1000).toFixed(2)} kg)</div>
                          <div><span className="text-blue-300">وزن نمونه:</span> {weightAttrs.sampleWeight?.toLocaleString()} g</div>
                          <div><span className="text-blue-300">تعداد نمونه:</span> {weightAttrs.sampleCount}</div>
                          <div><span className="text-blue-300">وزن هر قطعه (تخمینی):</span> {(weightAttrs.sampleWeight / weightAttrs.sampleCount).toFixed(2)} g</div>
                          <div><span className="text-blue-300">تعداد محاسبه شده:</span> {item.quantity_sent?.toLocaleString()} عدد</div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {showModal && selectedItem && (
        <ReturnModal item={selectedItem} onClose={() => setShowModal(false)} onSave={onReturnSaved} />
      )}
    </div>
  );
};

export default InvoiceDetails;