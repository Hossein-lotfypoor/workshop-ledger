// src/pages/LedgerBook.tsx
import React, { useState } from 'react';
import moment from 'moment-jalaali';
import { useLedgerBook } from '../hooks/useLedgerBook';

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

const LedgerBook: React.FC = () => {
  const ledger = useLedgerBook();
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  // استیت‌های مودال ورودی و خروجی دستی
  const [inModal, setInModal] = useState(false);
  const [inWorkshop, setInWorkshop] = useState('');
  const [inName, setInName] = useState('');
  const [inQty, setInQty] = useState('');
  const [inWeight, setInWeight] = useState('');
  const [inInvoiceNum, setInInvoiceNum] = useState('');

  const [outModal, setOutModal] = useState(false);
  const [outWorkshop, setOutWorkshop] = useState('');
  const [outName, setOutName] = useState('');
  const [outQty, setOutQty] = useState('');
  const [outWeight, setOutWeight] = useState('');
  const [outType, setOutType] = useState('healthy');

  // ◄ راه اندازی سیستم شنیداری صوتی مرورگر
  const handleStartVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("مرورگر شما از سیستم صوتی پشتیبانی نمی‌کند. لطفاً از گوگل کروم جدید استفاده کنید.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR'; // تنظیم زبان روی فارسی شاداب
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('🔊 در حال شنیدن صدای شما... جمله خود را بگویید.');
    };

    recognition.onerror = () => {
      setIsListening(false);
      setVoiceStatus('❌ خطایی رخ داد یا صدایی شنیده نشد.');
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onresult = async (event: any) => {
      const speechToText = event.results[0][0].transcript;
      setVoiceStatus(`🗣 شما گفتید: "${speechToText}" ... در حال پردازش جدول`);
      
      const result = await ledger.processVoiceText(speechToText);
      alert(result.msg);
      setVoiceStatus(result.success ? `✅ موفق: ${result.msg}` : `⚠️ خطا: ${result.msg}`);
    };

    recognition.start();
  };

  const handlePrevDay = () => {
    const prev = moment(`${ledger.selY}/${ledger.selM}/${ledger.selD}`, 'jYYYY/jMM/jDD').subtract(1, 'days');
    ledger.setSelY(prev.jYear()); ledger.setSelM(prev.jMonth() + 1); ledger.setSelD(prev.jDate());
  };

  const handleNextDay = () => {
    const next = moment(`${ledger.selY}/${ledger.selM}/${ledger.selD}`, 'jYYYY/jMM/jDD').add(1, 'days');
    ledger.setSelY(next.jYear()); ledger.setSelM(next.jMonth() + 1); ledger.setSelD(next.jDate());
  };

  const submitInputForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inWorkshop.trim() || !inName.trim() || !inQty) return alert("اطلاعات اصلی الزامی است.");
    const success = await ledger.addQuickInput(inWorkshop, inName, parseInt(inQty), parseFloat(inWeight) || 0, inInvoiceNum);
    if (success) { setInModal(false); setInName(''); setInQty(''); setInWeight(''); setInWorkshop(''); setInInvoiceNum(''); }
  };

  const submitOutputForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outWorkshop.trim() || !outName.trim() || !outQty) return alert("اطلاعات اصلی الزامی است.");
    const res = await ledger.addQuickOutput(outWorkshop, outName, parseInt(outQty), parseFloat(outWeight) || 0, outType === 'healthy');
    if (res.success) { setOutModal(false); setOutName(''); setOutQty(''); setOutWeight(''); setOutWorkshop(''); setOutType('healthy'); } else { alert(res.msg); }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl" dir="rtl">
      
      {/* هدر سررسید روزانه + دکمه خلاقانه ثبت صوتی هوشمند */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevDay} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition">◀ روز قبل</button>
          <div className="bg-amber-50 border border-amber-200 px-6 py-2 rounded-xl text-center min-w-[180px]">
            <span className="block text-[10px] text-amber-800 font-medium mb-0.5">دفتر سررسید روزانه</span>
            <span className="text-lg font-black text-slate-800">{ledger.selD} {monthNames[ledger.selM - 1]} {ledger.selY}</span>
          </div>
          <button onClick={handleNextDay} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition">روز بعد ▶</button>
        </div>

        {/* دکمه سیستم صوتی و وضعیت پردازش */}
        <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
          <button 
            type="button" 
            onClick={handleStartVoice}
            className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold text-sm transition shadow-sm ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'}`}
          >
            {isListening ? '🛑 در حال ضبط... بلند بگویید' : '🎙️ فشردن میکروفون و ثبت بار صوتی (خلاقانه)'}
          </button>
          {voiceStatus && <span className="text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full font-medium">{voiceStatus}</span>}
        </div>

        <div className="w-full md:w-64 relative">
          <input
            type="text"
            placeholder="🔍 جستجوی کالا، کارگاه..."
            value={ledger.searchTerm}
            onChange={(e) => ledger.setSearchTerm(e.target.value)}
            className="w-full p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm outline-none transition"
          />
        </div>
      </div>

      {/* بخش دو صفحه‌ای سررسید */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* صفحه راست: ورودی‌ها */}
        <div className="bg-white rounded-3xl shadow-md border-r-8 border-emerald-600 p-5 min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-bold text-emerald-700 flex items-center gap-1.5">📥 ورودی‌ها (ارسال به کارگاه)</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setInModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition shadow-sm">➕ ثبت دستی</button>
              <span className="bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">{ledger.invoicesIn.length} ردیف</span>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[550px]">
            {ledger.invoicesIn.length === 0 ? <div className="text-center text-gray-400 mt-24 text-xs">خالی است</div> : (
              ledger.invoicesIn.map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex justify-between mb-1.5"><span className="font-bold text-slate-800 text-sm">{item.workshop_name}</span><span className="text-[10px] bg-slate-200 text-slate-700 px-2 rounded">فاکتور: {item.invoice_number}</span></div>
                  <div className="text-xs text-slate-600 mb-2">کالا: <strong className="text-slate-900 text-sm">{item.product_name}</strong></div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border">
                    <div>تعداد: <strong className="text-emerald-600 text-sm">{item.quantity_sent.toLocaleString()}</strong></div>
                    <div>وزن: <strong>{item.weight_sent ? `${item.weight_sent} g` : '-'}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* صفحه چپ: خروجی‌ها */}
        <div className="bg-white rounded-3xl shadow-md border-r-8 border-orange-500 p-5 min-h-[500px] flex flex-col">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-base font-bold text-orange-700 flex items-center gap-1.5">📤 خروجی‌ها (دریافت قطعات تولیدی)</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setOutModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition shadow-sm">➕ ثبت دستی</button>
              <span className="bg-orange-50 text-orange-800 text-xs px-2.5 py-1 rounded-full font-bold">{ledger.returnsOut.length} ردیف</span>
            </div>
          </div>
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[550px]">
            {ledger.returnsOut.length === 0 ? <div className="text-center text-gray-400 mt-24 text-xs">خالی است</div> : (
              ledger.returnsOut.map((item, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <div className="flex justify-between mb-1.5"><span className="font-bold text-slate-800 text-sm">{item.workshop_name}</span><span className={`text-[10px] px-2 rounded font-bold ${item.type === 'سالم' ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>{item.type}</span></div>
                  <div className="text-xs text-slate-600 mb-2">کالا: <strong className="text-slate-900 text-sm">{item.product_name}</strong></div>
                  <div className="grid grid-cols-2 gap-2 text-xs bg-white p-2 rounded-lg border">
                    <div>تعداد: <strong className="text-orange-600 text-sm">{item.quantity_returned.toLocaleString()}</strong></div>
                    <div>وزن: <strong>{item.weight_returned ? `${item.weight_returned} g` : '-'}</strong></div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* --- مودال اختصاصی ثبت دستی ورودی --- */}
      {inModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-base font-bold mb-3 border-b pb-2">📥 ثبت دستی ورودی جدید</h4>
            <form onSubmit={submitInputForm} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام کارگاه مقصد</label>
                <div className="relative">
                  <input type="text" value={inWorkshop} onChange={e => setInWorkshop(e.target.value)} placeholder="تایپ نام کارگاه..." className="w-full p-2.5 border rounded-xl text-sm outline-none" />
                  <select onChange={e => { if(e.target.value !== '') setInWorkshop(e.target.value) }} className="absolute left-2 top-2 bg-slate-200 text-xs px-2 py-1 rounded-lg">
                    <option value="">📋 لیست...</option>
                    {ledger.workshopsList.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">شماره فاکتور</label>
                <input type="text" value={inInvoiceNum} onChange={e => setInInvoiceNum(e.target.value)} placeholder="اختیاری" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام کالا</label>
                <input type="text" value={inName} onChange={e => setInName(e.target.value)} placeholder="نام قطعه..." className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={inQty} onChange={e => setInQty(e.target.value)} placeholder="تعداد" className="p-2.5 border rounded-xl text-sm outline-none" />
                <input type="number" value={inWeight} onChange={e => setInWeight(e.target.value)} placeholder="وزن" className="p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm">ذخیره</button>
                <button type="button" onClick={() => setInModal(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- مودال اختصاصی ثبت دستی خروجی --- */}
      {outModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-base font-bold mb-3 border-b pb-2">📤 ثبت دستی خروج بار / برگشت</h4>
            <form onSubmit={submitOutputForm} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام کارگاه مبدا</label>
                <div className="relative">
                  <input type="text" value={outWorkshop} onChange={e => setOutWorkshop(e.target.value)} placeholder="تایپ نام کارگاه..." className="w-full p-2.5 border rounded-xl text-sm outline-none" />
                  <select onChange={e => { if(e.target.value !== '') setOutWorkshop(e.target.value) }} className="absolute left-2 top-2 bg-slate-200 text-xs px-2 py-1 rounded-lg">
                    <option value="">📋 لیست...</option>
                    {ledger.workshopsList.map(w => <option key={w.id} value={String(w.id)}>{w.name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام دقیق قطعه جاری</label>
                <input type="text" value={outName} onChange={e => setOutName(e.target.value)} placeholder="نام قطعه..." className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input type="number" value={outQty} onChange={e => setOutQty(e.target.value)} placeholder="تعداد" className="p-2.5 border rounded-xl text-sm outline-none" />
                <input type="number" value={outWeight} onChange={e => setOutWeight(e.target.value)} placeholder="وزن" className="p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="flex gap-4 text-sm py-1">
                <label className="flex items-center gap-1"><input type="radio" checked={outType === 'healthy'} onChange={() => setOutType('healthy')} /> سالم</label>
                <label className="flex items-center gap-1 text-red-600"><input type="radio" checked={outType === 'wasted'} onChange={() => setOutType('wasted')} /> ضایعات</label>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-orange-600 text-white font-bold py-2 rounded-xl text-sm">ثبت خروج</button>
                <button type="button" onClick={() => setOutModal(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default LedgerBook;