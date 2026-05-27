import React, { useEffect, useState } from 'react';
import { addWorkshop, getAllWorkshops, updateWorkshop, deleteWorkshop } from '../db/database';
import type { Workshop } from '../db/database';

const WorkshopsManager: React.FC = () => {
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [form, setForm] = useState({ name: '', address: '', phone: '', unit_type: 'count' as 'count' | 'weight' | 'both', notes: '' });
  const [editId, setEditId] = useState<number | null>(null);

  const load = async () => {
    const data = await getAllWorkshops();
    setWorkshops(data);
  };

  useEffect(() => { load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editId) {
      await updateWorkshop(editId, form);
      setEditId(null);
    } else {
      await addWorkshop(form);
    }
    setForm({ name: '', address: '', phone: '', unit_type: 'count', notes: '' });
    await load();
  };

  const handleEdit = (w: Workshop) => {
    setEditId(w.id!);
    setForm({ name: w.name, address: w.address || '', phone: w.phone || '', unit_type: w.unit_type, notes: w.notes || '' });
  };

  const handleDelete = async (id: number) => {
    if (confirm('حذف شود؟')) {
      await deleteWorkshop(id);
      await load();
    }
  };

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">مدیریت کارگاه‌ها</h1>
      <form onSubmit={handleSubmit} className="bg-white p-4 rounded shadow mb-6">
        <input type="text" placeholder="نام کارگاه" className="border p-2 w-full mb-2" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
        <input type="text" placeholder="آدرس" className="border p-2 w-full mb-2" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
        <input type="text" placeholder="تلفن" className="border p-2 w-full mb-2" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
        <select className="border p-2 w-full mb-2" value={form.unit_type} onChange={e => setForm({...form, unit_type: e.target.value as any})}>
          <option value="count">تعدادی</option>
          <option value="weight">وزنی</option>
          <option value="both">هر دو</option>
        </select>
        <textarea placeholder="توضیحات" className="border p-2 w-full mb-2" value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">{editId ? 'ویرایش' : 'افزودن'} کارگاه</button>
        {editId && <button type="button" onClick={() => { setEditId(null); setForm({ name: '', address: '', phone: '', unit_type: 'count', notes: '' }); }} className="bg-gray-500 text-white px-4 py-2 rounded mr-2">انصراف</button>}
      </form>
      <ul className="space-y-2">
        {workshops.map(w => (
          <li key={w.id} className="bg-white p-3 rounded shadow flex justify-between items-center">
            <div><strong>{w.name}</strong> - {w.address} - تلفن: {w.phone} - نوع: {w.unit_type}</div>
            <div><button onClick={() => handleEdit(w)} className="bg-yellow-500 text-white px-2 py-1 rounded ml-2">ویرایش</button>
            <button onClick={() => handleDelete(w.id!)} className="bg-red-600 text-white px-2 py-1 rounded">حذف</button></div>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default WorkshopsManager;