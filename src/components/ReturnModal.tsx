import React, { useState } from 'react';
import { addFastReturn } from '../db/database';
import type { InvoiceItem } from '../db/database';

interface ReturnModalProps {
  item: InvoiceItem;
  onClose: () => void;
  onSave: () => void;
}

const ReturnModal: React.FC<ReturnModalProps> = ({ item, onClose, onSave }) => {
  const [qty, setQty] = useState('');
  const [weight, setWeight] = useState('');
  const [returnInvoiceNumber, setReturnInvoiceNumber] = useState('');
  const [returnStatus, setReturnStatus] = useState<'good' | 'damaged'>('good');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const quantity = (item.unit_type === 'count' || item.unit_type === 'both') ? parseFloat(qty) || 0 : 0;
    const weightVal = (item.unit_type === 'weight' || item.unit_type === 'both') ? parseFloat(weight) || 0 : 0;
    if (quantity === 0 && weightVal === 0) {
      alert('حداقل یکی از تعداد یا وزن را وارد کنید');
      return;
    }
    await addFastReturn(item.id!, quantity, weightVal, returnInvoiceNumber, returnStatus);
    onSave();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
        <h3 className="text-xl font-bold mb-4">ثبت برگشت سریع</h3>
        <p className="mb-2"><strong>کالا:</strong> {item.product_name}</p>
        <p className="mb-4"><strong>تعداد ارسالی:</strong> {item.quantity_sent} / وزن: {item.weight_sent}</p>
        <form onSubmit={handleSubmit}>
          {(item.unit_type === 'count' || item.unit_type === 'both') && (
            <div className="mb-3">
              <label className="block text-sm font-medium">تعداد برگشتی:</label>
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={qty} onChange={e => setQty(e.target.value)} />
            </div>
          )}
          {(item.unit_type === 'weight' || item.unit_type === 'both') && (
            <div className="mb-3">
              <label className="block text-sm font-medium">وزن برگشتی (کیلوگرم):</label>
              <input type="number" className="mt-1 w-full border rounded px-2 py-1" value={weight} onChange={e => setWeight(e.target.value)} />
            </div>
          )}
          <div className="mb-3">
            <label className="block text-sm font-medium">شماره فاکتور برگشت (اختیاری):</label>
            <input type="text" className="mt-1 w-full border rounded px-2 py-1" value={returnInvoiceNumber} onChange={e => setReturnInvoiceNumber(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium">وضعیت برگشت:</label>
            <select className="mt-1 w-full border rounded px-2 py-1" value={returnStatus} onChange={e => setReturnStatus(e.target.value as 'good' | 'damaged')}>
              <option value="good">سالم (قابل استفاده)</option>
              <option value="damaged">خراب (غیرقابل استفاده)</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 rounded">انصراف</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">ذخیره</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReturnModal;