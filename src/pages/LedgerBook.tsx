// src/pages/LedgerBook.tsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'moment-jalaali';
import { useLedgerBook } from '../hooks/useLedgerBook';
import HandwrittenEntry from '../components/HandwrittenEntry';
import { formatInputLedgerLine, formatOutputLedgerLine } from '../utils/ledgerFormat';

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

const LedgerBook: React.FC = () => {
  const ledger = useLedgerBook();
  const [isListening, setIsListening] = useState(false);
  const [voiceStatus, setVoiceStatus] = useState('');

  const [inModal, setInModal] = useState(false);
  const [inName, setInName] = useState('');
  const [inQty, setInQty] = useState('');
  const [inWeight, setInWeight] = useState('');
  const [inInvoiceNum, setInInvoiceNum] = useState('');
  const [inSource, setInSource] = useState('');

  const [outModal, setOutModal] = useState(false);
  const [outName, setOutName] = useState('');
  const [outQty, setOutQty] = useState('');
  const [outWeight, setOutWeight] = useState('');
  const [outInvoiceNum, setOutInvoiceNum] = useState('');
  const [outSource, setOutSource] = useState('');
  const [outDestination, setOutDestination] = useState('');

  const handleStartVoice = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("مرورگر شما از سیستم صوتی پشتیبانی نمی‌کند. لطفاً از گوگل کروم جدید استفاده کنید.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
      setVoiceStatus('🔊 در حال شنیدن... مثال: «۲۰ عدد واشر از کارگاه ۳۰ — فاکتور ۴۰۰۳ — تحویل انبار گردید»');
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
      setVoiceStatus(`🗣 "${speechToText}" — در حال پردازش...`);
      const result = await ledger.processVoiceText(speechToText);
      setVoiceStatus(result.success ? `✅ ${result.msg}` : `⚠️ ${result.msg}`);
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

  const resetInputForm = () => {
    setInName(''); setInQty(''); setInWeight(''); setInInvoiceNum(''); setInSource('');
  };

  const resetOutputForm = () => {
    setOutName(''); setOutQty(''); setOutWeight(''); setOutInvoiceNum(''); setOutSource(''); setOutDestination('');
  };

  const submitInputForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inName.trim() || !inQty) return alert('نام کالا و تعداد الزامی است.');
    const success = await ledger.addQuickInput(
      inName,
      parseInt(inQty, 10),
      parseFloat(inWeight) || 0,
      inInvoiceNum,
      inSource
    );
    if (success) { setInModal(false); resetInputForm(); }
  };

  const submitOutputForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!outName.trim() || !outQty || !outDestination.trim()) {
      return alert('نام کالا، تعداد و مقصد تحویل الزامی است.');
    }
    const res = await ledger.addQuickOutput(
      outName,
      parseInt(outQty, 10),
      parseFloat(outWeight) || 0,
      outDestination,
      outInvoiceNum,
      outSource
    );
    if (res.success) { setOutModal(false); resetOutputForm(); }
    else alert(res.msg);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl" dir="rtl">

      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <button onClick={handlePrevDay} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition">◀ روز قبل</button>
          <div className="bg-amber-50 border border-amber-200 px-6 py-2 rounded-xl text-center min-w-[180px]">
            <span className="block text-[10px] text-amber-800 font-medium mb-0.5">دفتر سررسید روزانه</span>
            <span className="text-lg font-black text-slate-800">{ledger.selD} {monthNames[ledger.selM - 1]} {ledger.selY}</span>
          </div>
          <button onClick={handleNextDay} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-2 rounded-xl text-sm font-bold transition">روز بعد ▶</button>
        </div>

        <div className="flex flex-col items-center gap-1 flex-1 max-w-md">
          <button
            type="button"
            onClick={handleStartVoice}
            className={`w-full flex items-center justify-center gap-2 p-2.5 rounded-xl font-bold text-sm transition shadow-sm ${isListening ? 'bg-red-600 animate-pulse text-white' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white'}`}
          >
            {isListening ? '🛑 در حال ضبط...' : '🎙️ ثبت صوتی ورود / خروج جنس'}
          </button>
          {voiceStatus && <span className="text-[11px] text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full font-medium text-center">{voiceStatus}</span>}
        </div>

        <div className="w-full md:w-auto flex gap-2">
          <Link to="/ledger-reports" className="bg-amber-100 hover:bg-amber-200 text-amber-900 px-4 py-2.5 rounded-xl text-sm font-bold transition whitespace-nowrap">
            📊 گزارش
          </Link>
          <input
            type="text"
            placeholder="🔍 جستجوی کالا، فاکتور، مقصد..."
            value={ledger.searchTerm}
            onChange={(e) => ledger.setSearchTerm(e.target.value)}
            className="w-full md:w-64 p-2.5 bg-slate-50 border border-gray-300 rounded-xl text-sm outline-none transition"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <div className="ledger-page ledger-page--input bg-white shadow-md flex flex-col">
          <div className="flex justify-between items-center border-b border-amber-100 bg-amber-50/80 px-5 py-3">
            <h3 className="text-base font-bold text-emerald-700 flex items-center gap-1.5">📥 ورود جنس</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setInModal(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition shadow-sm">➕ ثبت دستی</button>
              <span className="bg-emerald-50 text-emerald-800 text-xs px-2.5 py-1 rounded-full font-bold">{ledger.invoicesIn.length} خط</span>
            </div>
          </div>
          <div className="ledger-page-inner flex-1" role="list">
            {ledger.invoicesIn.length === 0 ? (
              <div className="ledger-empty">هنوز ورودی ثبت نشده...</div>
            ) : (
              ledger.invoicesIn.map((item) => (
                <HandwrittenEntry
                  key={item.id ?? `${item.invoice_number}-${item.product_name}`}
                  text={formatInputLedgerLine(item)}
                  variant="input"
                  animate={item.id === ledger.highlightInputId}
                  onAnimationEnd={ledger.clearHighlightInput}
                />
              ))
            )}
          </div>
        </div>

        <div className="ledger-page ledger-page--output bg-white shadow-md flex flex-col">
          <div className="flex justify-between items-center border-b border-amber-100 bg-amber-50/80 px-5 py-3">
            <h3 className="text-base font-bold text-orange-700 flex items-center gap-1.5">📤 خروج / تحویل جنس</h3>
            <div className="flex items-center gap-2">
              <button onClick={() => setOutModal(true)} className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-full transition shadow-sm">➕ ثبت دستی</button>
              <span className="bg-orange-50 text-orange-800 text-xs px-2.5 py-1 rounded-full font-bold">{ledger.returnsOut.length} خط</span>
            </div>
          </div>
          <div className="ledger-page-inner flex-1" role="list">
            {ledger.returnsOut.length === 0 ? (
              <div className="ledger-empty">هنوز خروجی ثبت نشده...</div>
            ) : (
              ledger.returnsOut.map((item) => (
                <HandwrittenEntry
                  key={item.id ?? `${item.product_name}-${item.destination}`}
                  text={formatOutputLedgerLine(item)}
                  variant="output"
                  animate={item.id === ledger.highlightOutputId}
                  onAnimationEnd={ledger.clearHighlightOutput}
                />
              ))
            )}
          </div>
        </div>

      </div>

      {inModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-base font-bold mb-1 border-b pb-2">📥 ثبت ورود جنس</h4>
            <p className="text-[11px] text-gray-500 mb-3">ثبت دریافت جنس در انبار — مستقل از فاکتور کارگاه</p>
            <form onSubmit={submitInputForm} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام کالا *</label>
                <input type="text" value={inName} onChange={e => setInName(e.target.value)} placeholder="مثلاً: واشر، دوش ۴۰" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">تعداد *</label>
                  <input type="number" value={inQty} onChange={e => setInQty(e.target.value)} placeholder="۲۰" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">وزن (گرم)</label>
                  <input type="number" value={inWeight} onChange={e => setInWeight(e.target.value)} placeholder="اختیاری" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">شماره فاکتور</label>
                <input type="text" value={inInvoiceNum} onChange={e => setInInvoiceNum(e.target.value)} placeholder="مثلاً: ۴۰۰۳" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">از / مبدا</label>
                <input type="text" value={inSource} onChange={e => setInSource(e.target.value)} placeholder="مثلاً: کارگاه شماره ۳۰" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="flex-1 bg-emerald-600 text-white font-bold py-2 rounded-xl text-sm">ذخیره</button>
                <button type="button" onClick={() => setInModal(false)} className="bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm">انصراف</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {outModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full">
            <h4 className="text-base font-bold mb-1 border-b pb-2">📤 ثبت خروج / تحویل جنس</h4>
            <p className="text-[11px] text-gray-500 mb-3">مثال: ۲۰ عدد واشر از کارگاه ۳۰ — فاکتور ۴۰۰۳ — تحویل انبار</p>
            <form onSubmit={submitOutputForm} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">نام کالا *</label>
                <input type="text" value={outName} onChange={e => setOutName(e.target.value)} placeholder="مثلاً: واشر، دوش ۴۰" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">تعداد *</label>
                  <input type="number" value={outQty} onChange={e => setOutQty(e.target.value)} placeholder="۲" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">وزن (گرم)</label>
                  <input type="number" value={outWeight} onChange={e => setOutWeight(e.target.value)} placeholder="اختیاری" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">تحویل به *</label>
                <input type="text" value={outDestination} onChange={e => setOutDestination(e.target.value)} placeholder="مثلاً: انبار، آقای شماره ۵۶" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">شماره فاکتور</label>
                <input type="text" value={outInvoiceNum} onChange={e => setOutInvoiceNum(e.target.value)} placeholder="مثلاً: ۴۰۰۳" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">از / مبدا</label>
                <input type="text" value={outSource} onChange={e => setOutSource(e.target.value)} placeholder="مثلاً: کارگاه شماره ۳۰" className="w-full p-2.5 border rounded-xl text-sm outline-none" />
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
