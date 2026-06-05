import React, { useEffect, useState, useCallback } from 'react';
import { db } from '../db/database';
import type { Contact } from '../db/database';
import {
  findContactByVoiceQuery,
  formatContactAnswerFull,
  getSpeechRecognitionCtor,
} from '../utils/contactVoice';

const ContactsBook: React.FC = () => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');
  const [voiceAnswer, setVoiceAnswer] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formAliases, setFormAliases] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formNotes, setFormNotes] = useState('');

  const loadContacts = useCallback(async () => {
    const list = await db.contacts.orderBy('name').toArray();
    setContacts(list);
  }, []);

  useEffect(() => {
    loadContacts();
  }, [loadContacts]);

  const resetForm = () => {
    setEditingId(null);
    setFormName('');
    setFormAliases('');
    setFormAddress('');
    setFormPhone('');
    setFormNotes('');
  };

  const openAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c.id ?? null);
    setFormName(c.name);
    setFormAliases(c.aliases || '');
    setFormAddress(c.address);
    setFormPhone(c.phone);
    setFormNotes(c.notes || '');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formAddress.trim() || !formPhone.trim()) {
      return alert('نام، آدرس و تلفن الزامی است.');
    }
    const data: Omit<Contact, 'id'> = {
      name: formName.trim(),
      aliases: formAliases.trim() || undefined,
      address: formAddress.trim(),
      phone: formPhone.trim(),
      notes: formNotes.trim() || undefined,
    };
    if (editingId) {
      await db.contacts.update(editingId, data);
    } else {
      await db.contacts.add(data);
    }
    setModalOpen(false);
    resetForm();
    loadContacts();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('این مخاطب حذف شود؟')) return;
    await db.contacts.delete(id);
    loadContacts();
  };

  const showTextAnswer = (contact: Contact) => {
    setVoiceAnswer(formatContactAnswerFull(contact));
    setVoiceStatus(`✅ ${contact.name}`);
  };

  const processVoiceQuery = (spokenText: string) => {
    setVoiceStatus(`🗣 شما گفتید: «${spokenText}»`);
    const found = findContactByVoiceQuery(contacts, spokenText);
    if (!found) {
      setVoiceAnswer('');
      setVoiceStatus('⚠️ مخاطبی با این نام پیدا نشد.');
      return;
    }
    showTextAnswer(found);
  };

  const handleStartVoice = () => {
    const SpeechRecognition = getSpeechRecognitionCtor();
    if (!SpeechRecognition) {
      alert('مرورگر از تشخیص گفتار پشتیبانی نمی‌کند. از Chrome استفاده کنید.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceAnswer('');
      setVoiceStatus('🔊 بگویید: «آدرس و شماره تلفن مش حسین بده»');
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('❌ صدا شنیده نشد یا خطا رخ داد.');
    };

    recognition.onend = () => setIsListening(false);

    recognition.onresult = (event: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => {
      const transcript = event.results[0][0].transcript;
      processVoiceQuery(transcript);
    };

    recognition.start();
  };

  const filtered = contacts.filter(c => {
    if (!search.trim()) return true;
    const q = search.trim();
    const haystack = [c.name, c.aliases, c.address, c.phone, c.notes].filter(Boolean).join(' ');
    return haystack.includes(q);
  });

  return (
    <div className="container mx-auto p-4 max-w-4xl" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-800 mb-1">📇 دفترچه آدرس و تلفن</h1>
      <p className="text-sm text-slate-500 mb-6">
        با صدا بپرسید؛ آدرس و تلفن را به‌صورت متن نمایش می‌دهد.
      </p>

      <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-2xl p-5 mb-6 shadow-sm">
        <button
          type="button"
          onClick={handleStartVoice}
          className={`w-full py-4 rounded-xl font-bold text-white text-sm transition shadow-md ${isListening ? 'bg-red-600 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
        >
          {isListening ? '🛑 در حال گوش دادن...' : '🎙️ بپرسید: آدرس و تلفن [نام] را بده'}
        </button>
        {voiceStatus && (
          <p className="text-xs text-indigo-800 mt-3 text-center font-medium">{voiceStatus}</p>
        )}
        {voiceAnswer && (
          <div className="mt-4 bg-white border-2 border-indigo-300 rounded-xl p-4 text-center">
            <p className="text-[10px] text-indigo-600 mb-1">پاسخ</p>
            <p className="text-lg font-bold text-slate-800 leading-relaxed whitespace-pre-line">{voiceAnswer}</p>
          </div>
        )}
        <p className="text-[10px] text-slate-500 mt-3 text-center">
          مثال: «آدرس و شماره تلفن کارگاه شماره یک و بده» — نام مستعار را در فیلد «نام‌های صوتی» ثبت کنید.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="text"
          placeholder="🔍 جستجو در نام، آدرس، تلفن..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="flex-1 min-w-[200px] p-2.5 border rounded-xl text-sm"
        />
        <button onClick={openAdd} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-bold">
          ➕ مخاطب جدید
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-10 text-center text-gray-500">
          {contacts.length === 0 ? 'هنوز مخاطبی ثبت نشده. یک نفر اضافه کنید.' : 'نتیجه‌ای یافت نشد.'}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(c => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <div className="flex justify-between items-start gap-2 mb-2">
                <h3 className="font-bold text-slate-800">{c.name}</h3>
                <div className="flex gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => showTextAnswer(c)}
                    className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded-lg font-bold"
                  >
                    📋 نمایش
                  </button>
                  <button type="button" onClick={() => openEdit(c)} className="text-xs bg-slate-100 px-2 py-1 rounded-lg">ویرایش</button>
                  <button type="button" onClick={() => c.id && handleDelete(c.id)} className="text-xs bg-red-50 text-red-700 px-2 py-1 rounded-lg">حذف</button>
                </div>
              </div>
              {c.aliases && (
                <p className="text-[11px] text-slate-500 mb-1">نام‌های صوتی: {c.aliases}</p>
              )}
              <p className="text-sm text-slate-700">📍 {c.address}</p>
              <p className="text-sm text-slate-700 mt-1">📞 {c.phone}</p>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h4 className="text-base font-bold mb-3 border-b pb-2">
              {editingId ? 'ویرایش مخاطب' : 'مخاطب جدید'}
            </h4>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام *</label>
                <input value={formName} onChange={e => setFormName(e.target.value)} placeholder="مثلاً: آقای حسین" className="w-full p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام‌های صوتی (با ویرگول)</label>
                <input value={formAliases} onChange={e => setFormAliases(e.target.value)} placeholder="مش حسین، حسین" className="w-full p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">آدرس *</label>
                <textarea value={formAddress} onChange={e => setFormAddress(e.target.value)} placeholder="تهران پلاک ۸" rows={2} className="w-full p-2.5 border rounded-xl text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">تلفن *</label>
                <input value={formPhone} onChange={e => setFormPhone(e.target.value)} placeholder="09100000000" dir="ltr" className="w-full p-2.5 border rounded-xl text-sm text-left" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">یادداشت</label>
                <input value={formNotes} onChange={e => setFormNotes(e.target.value)} className="w-full p-2.5 border rounded-xl text-sm" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm">ذخیره</button>
                <button type="button" onClick={() => { setModalOpen(false); resetForm(); }} className="bg-slate-200 px-4 py-2 rounded-xl text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContactsBook;
