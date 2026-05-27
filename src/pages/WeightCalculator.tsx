import React, { useState, useEffect, useCallback } from 'react';
import moment from 'moment-jalaali';
import { getAllWorkshops, addInvoice, addInvoiceItem } from '../db/database';
import type { Workshop } from '../db/database';
import { toMiladi } from '../utils/dateUtils';
import { ShamsiCalendar } from '../components/ShamsiCalendar'; // کامپوننت جدید

interface GoodsItem {
  name: string;
  workshopName: string;
  workshopId: number;
  totalCount: string;
  net: string;
  total: string;
  tare: string;
  cnt: number;
  sw: string;
  sc: string;
}

const monthNames = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];

const WeightCalculator: React.FC = () => {
  const getCurrentJalali = () => {
    const m = moment();
    return { year: m.jYear(), month: m.jMonth() + 1, day: m.jDate() };
  };

  const current = getCurrentJalali();
  const [selY, setSelY] = useState(current.year);
  const [selM, setSelM] = useState(current.month);
  const [selD, setSelD] = useState(current.day);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [curY, setCurY] = useState(selY);
  const [curM, setCurM] = useState(selM);

  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [selectedWorkshopId, setSelectedWorkshopId] = useState<number>(0);
  const [name, setName] = useState("");
  const [total, setTotal] = useState("");
  const [tare, setTare] = useState("");
  const [cnt, setCnt] = useState(1);
  const [sw, setSw] = useState("");
  const [sc, setSc] = useState("");
  const [calcResult, setCalcResult] = useState<{ finalCount: number; net: number; total: number; tare: number; cnt: number; sw: number; sc: number } | null>(null);
  const [goodsList, setGoodsList] = useState<GoodsItem[]>([]);
  const [notice, setNotice] = useState("");

  useEffect(() => { getAllWorkshops().then(setWorkshops); }, []);

  const getStorageKey = () => `weight_goods_${selY}_${selM}_${selD}`;

  const loadList = useCallback(() => {
    const raw = localStorage.getItem(getStorageKey());
    setGoodsList(raw ? JSON.parse(raw) : []);
  }, [selY, selM, selD]);

  const saveList = useCallback(() => {
    localStorage.setItem(getStorageKey(), JSON.stringify(goodsList));
  }, [goodsList, selY, selM, selD]);

  useEffect(() => { loadList(); }, [loadList]);
  useEffect(() => { saveList(); }, [goodsList, saveList]);

  const showNotice = (msg: string) => {
    setNotice(msg);
    setTimeout(() => setNotice(""), 3000);
  };

  const handleLongPressDelete = (index: number) => {
    if (window.confirm("آیا این کالا حذف شود؟")) {
      const newList = [...goodsList];
      newList.splice(index, 1);
      setGoodsList(newList);
      showNotice("کالا حذف شد");
    }
  };

  const clearAllList = () => {
    if (window.confirm("همه کالاهای این تاریخ حذف شوند؟")) {
      setGoodsList([]);
      showNotice("لیست پاک شد");
    }
  };

  const copyListToClipboard = () => {
    if (goodsList.length === 0) {
      alert("لیست خالی است");
      return;
    }
    let text = `لیست تاریخ ${selY}/${selM}/${selD}\nکارگاه | نام کالا | تعداد کل | وزن خالص | وزن کل | وزن ظرف | تعداد ظرف | وزن نمونه | تعداد نمونه\n`;
    goodsList.forEach((item) => {
      text += `${item.workshopName}\t${item.name}\t${item.totalCount}\t${item.net}\t${item.total}\t${item.tare}\t${item.cnt}\t${item.sw}\t${item.sc}\n`;
    });
    navigator.clipboard.writeText(text);
    alert("کپی شد");
  };

  const calculate = () => {
    const totalNum = parseFloat(total);
    const tareNum = parseFloat(tare);
    const cntNum = parseInt(cnt.toString());
    const swNum = parseFloat(sw);
    const scNum = parseFloat(sc);
    if (isNaN(totalNum) || isNaN(tareNum) || isNaN(cntNum) || isNaN(swNum) || isNaN(scNum) || cntNum <= 0 || scNum <= 0 || swNum <= 0 || totalNum <= 0) {
      setCalcResult(null);
      showNotice("لطفاً اعداد مثبت و معتبر وارد کنید");
      return;
    }
    const net = totalNum - tareNum * cntNum;
    if (net <= 0) {
      setCalcResult(null);
      showNotice(`وزن خالص (${net}g) منفی یا صفر است`);
      return;
    }
    setCalcResult({ finalCount: Math.round((net * scNum) / swNum), net, total: totalNum, tare: tareNum, cnt: cntNum, sw: swNum, sc: scNum });
  };

  const saveCurrent = () => {
    if (!calcResult) return showNotice("ابتدا محاسبه کنید");
    if (!selectedWorkshopId) return showNotice("لطفاً یک کارگاه انتخاب کنید");
    const workshop = workshops.find(w => w.id === selectedWorkshopId);
    setGoodsList((prev) => [...prev, {
      name: name.trim() === "" ? `کالا ${new Date().toLocaleTimeString("fa-IR")}` : name,
      workshopName: workshop ? workshop.name : "نامشخص",
      workshopId: selectedWorkshopId,
      totalCount: calcResult.finalCount.toLocaleString("fa-IR"),
      net: calcResult.net.toString(), total: calcResult.total.toString(), tare: calcResult.tare.toString(), cnt: calcResult.cnt, sw: calcResult.sw.toString(), sc: calcResult.sc.toString(),
    }]);
    setName(""); setSelectedWorkshopId(0); showNotice("کالا در لیست ذخیره شد");
  };

  const clearForm = () => {
    setName(""); setTotal(""); setTare(""); setCnt(1); setSw(""); setSc(""); setSelectedWorkshopId(0); setCalcResult(null);
  };

  const sendToWorkshop = async () => {
    if (!calcResult || !selectedWorkshopId) return showNotice("اطلاعات محاسبه یا کارگاه ناقص است");
    const invoiceNumber = prompt("شماره فاکتور ارسال را وارد کنید:", `W-${selY}${selM}${selD}-${Date.now().toString().slice(-6)}`);
    if (!invoiceNumber?.trim()) return showNotice("شماره فاکتور الزامی است");
    const miladiDate = toMiladi(`${selY}/${selM}/${selD}`);
    if (!miladiDate) return showNotice("تاریخ انتخابی معتبر نیست");
    try {
      const invoiceId = await addInvoice({ invoice_number: invoiceNumber.trim(), workshop_id: selectedWorkshopId, date: miladiDate, description: `ثبت خودکار - وزن خالص: ${calcResult.net}g` });
      await addInvoiceItem({
        invoice_id: invoiceId, line_number: 1, product_name: name.trim() === "" ? `کالا ${new Date().toLocaleTimeString("fa-IR")}` : name,
        quantity_sent: calcResult.finalCount, weight_sent: calcResult.net, unit_type: 'count', operation: "محاسبه از وزن",
        attributes: JSON.stringify({ totalWeight: calcResult.total, tareWeight: calcResult.tare, containerCount: calcResult.cnt, sampleWeight: calcResult.sw, sampleCount: calcResult.sc }),
        status: 'pending', remaining_quantity: calcResult.finalCount, remaining_weight: calcResult.net, is_settled: false
      });
      showNotice(`فاکتور ${invoiceNumber} ثبت شد`);
      clearForm();
    } catch (err: any) {
      showNotice(`خطا: ${err.message}`);
    }
  };

  const handleDayClick = (day: number) => {
    setSelY(curY); setSelM(curM); setSelD(day); setCalendarOpen(false);
  };

  const dateDisplay = `${selY}/${selM.toString().padStart(2, "0")}/${selD.toString().padStart(2, "0")} - ${monthNames[selM - 1]}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-950 py-6 px-4 flex justify-center items-center" dir="rtl">
      <div className="max-w-2xl w-full bg-white/10 backdrop-blur-md rounded-3xl border border-amber-500/30 p-5 shadow-2xl">
        <h2 className="text-center text-2xl font-bold bg-gradient-to-r from-amber-200 to-orange-400 bg-clip-text text-transparent mb-4">
          📆 دفترچه کالا (محاسبه وزن)
        </h2>

        {/* انتخاب تاریخ */}
        <div className="relative calendar-container mb-4">
          <div className="flex justify-between items-center bg-black/30 rounded-2xl p-2">
            <span className="text-amber-200 text-sm">📅</span>
            <input type="text" value={dateDisplay} readOnly className="bg-transparent border-none text-amber-100 text-sm font-medium flex-1 px-2 focus:outline-none" />
            <button onClick={() => setCalendarOpen(!calendarOpen)} className="bg-orange-500 text-black text-sm font-bold px-4 py-1 rounded-full">
              انتخاب تاریخ
            </button>
          </div>
          <ShamsiCalendar 
            calendarOpen={calendarOpen} setCalendarOpen={setCalendarOpen}
            curY={curY} setCurY={setCurY} curM={curM} setCurM={setCurM}
            selY={selY} selM={selM} selD={selD} onDayClick={handleDayClick}
          />
        </div>

        {/* فرم ورودی */}
        <div className="space-y-3">
          <div>
            <label className="block text-blue-200 text-xs">🏭 نام کارگاه</label>
            <select value={selectedWorkshopId} onChange={(e) => setSelectedWorkshopId(parseInt(e.target.value))} className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none">
              <option value="0">انتخاب کارگاه</option>
              {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-blue-200 text-xs">🏷️ نام کالا</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: پیچ M6" className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-blue-200 text-xs">⚖️ وزن کل (گرم)</label>
              <input type="number" value={total} onChange={(e) => setTotal(e.target.value)} placeholder="15200" className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-blue-200 text-xs">🧺 وزن یک ظرف (گرم)</label>
              <input type="number" value={tare} onChange={(e) => setTare(e.target.value)} placeholder="450" className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-blue-200 text-xs">🔢 تعداد ظرف‌ها</label>
              <input type="number" value={cnt} onChange={(e) => setCnt(parseInt(e.target.value) || 0)} className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-blue-200 text-xs">📦 وزن نمونه (گرم)</label>
              <input type="number" value={sw} onChange={(e) => setSw(e.target.value)} placeholder="1020" className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none" />
            </div>
            <div>
              <label className="block text-blue-200 text-xs">🔢 تعداد نمونه</label>
              <input type="number" value={sc} onChange={(e) => setSc(e.target.value)} placeholder="47" className="w-full p-2 bg-black/40 border border-white/20 rounded-xl text-white text-sm focus:border-amber-500 outline-none" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 my-4 flex-wrap">
          <button onClick={calculate} className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 text-black font-bold py-2 rounded-full">✨ محاسبه</button>
          <button onClick={saveCurrent} className="flex-1 bg-amber-700 text-white font-bold py-2 rounded-full">➕ ذخیره در لیست</button>
          <button onClick={clearForm} className="flex-1 bg-white/10 text-white py-2 rounded-full">🗑️ پاک فرم</button>
        </div>

        {calcResult && (
          <div className="bg-black/40 rounded-xl p-3 text-center mb-3">
            <div className="text-2xl font-bold text-amber-300">{calcResult.finalCount.toLocaleString("fa-IR")} عدد</div>
            <div className="text-xs text-gray-300">
              وزن خالص: {calcResult.net.toLocaleString("fa-IR")} g | وزن ظرف‌ها: {(calcResult.tare * calcResult.cnt).toLocaleString("fa-IR")} g | هر قطعه ≈ {(calcResult.sw / calcResult.sc).toFixed(2)} g
            </div>
            {selectedWorkshopId !== 0 && (
              <button onClick={sendToWorkshop} className="mt-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold py-1 px-4 rounded-full transition">
                📦 ارسال به کارگاه (ثبت فاکتور)
              </button>
            )}
          </div>
        )}

        {notice && <div className="bg-amber-800/80 text-center text-sm py-1 rounded-xl mb-2">{notice}</div>}

        <div className="flex justify-between items-center mt-2 mb-2">
          <span className="text-amber-400 text-sm">📋 لیست این تاریخ</span>
          <button onClick={clearAllList} className="bg-white/10 text-white text-xs px-2 py-1 rounded-full">حذف همه</button>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {goodsList.map((item, idx) => (
            <div
              key={idx}
              className="bg-black/40 rounded-xl border-r-4 border-amber-500 p-3 cursor-pointer transition-all active:scale-[0.99]"
              onMouseDown={() => {
                const timer = setTimeout(() => handleLongPressDelete(idx), 500);
                const cancel = () => clearTimeout(timer);
                document.addEventListener("mouseup", cancel, { once: true });
                document.addEventListener("touchend", cancel, { once: true });
              }}
              onTouchStart={() => {
                const timer = setTimeout(() => handleLongPressDelete(idx), 500);
                const cancel = () => clearTimeout(timer);
                document.addEventListener("touchend", cancel, { once: true });
                document.addEventListener("touchcancel", cancel, { once: true });
              }}
            >
              <div className="flex justify-between items-start border-b border-amber-500/30 pb-1 mb-2">
                <div className="font-bold text-amber-400">{item.workshopName} - {item.name}</div>
                <div className="text-lg font-bold text-amber-200">{item.totalCount} عدد</div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/5 rounded-lg p-1 text-center"><span className="block text-blue-300">وزن خالص</span><span className="text-white">{item.net} g</span></div>
                <div className="bg-white/5 rounded-lg p-1 text-center"><span className="block text-blue-300">وزن کل</span><span className="text-white">{item.total} g</span></div>
                <div className="bg-white/5 rounded-lg p-1 text-center"><span className="block text-blue-300">تعداد ظرف</span><span className="text-white">{item.cnt}</span></div>
                <div className="bg-white/5 rounded-lg p-1 text-center"><span className="block text-blue-300">وزن نمونه</span><span className="text-white">{item.sw} g</span></div>
                <div className="bg-white/5 rounded-lg p-1 text-center"><span className="block text-blue-300">تعداد نمونه</span><span className="text-white">{item.sc}</span></div>
                <div className="bg-white/5 rounded-lg p-1 text-center"><span className="block text-blue-300">وزن هر قطعه</span><span className="text-white">≈ {(parseFloat(item.sw) / parseFloat(item.sc)).toFixed(2)} g</span></div>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-3 text-amber-300 text-xs">
          <span>💡 برای حذف هر کالا، روی کارت کلیک کرده و نگه دارید</span>
          <button onClick={copyListToClipboard} className="bg-amber-700 text-white text-xs px-2 py-1 rounded-full">📋 کپی لیست</button>
        </div>
        <footer className="text-center text-white/50 text-[10px] pt-2">
          تاریخ امروز: {current.year}/{current.month}/{current.day}
        </footer>
      </div>
    </div>
  );
};

export default WeightCalculator;