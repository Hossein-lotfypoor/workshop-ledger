// src/hooks/useLedgerBook.ts
import { useState, useEffect, useCallback } from 'react';
import moment from 'moment-jalaali';
import { db } from '../db/database';
import type { Workshop } from '../db/database';
import { toMiladi } from '../utils/dateUtils';

export interface LedgerInputItem {
  id?: number;
  invoice_id: number;
  invoice_number: string;
  workshop_name: string;
  product_name: string;
  quantity_sent: number;
  weight_sent: number;
  date?: string;
}

export interface LedgerOutputItem {
  id?: number;
  product_name: string;
  workshop_name: string;
  quantity_returned: number;
  weight_returned: number;
  type: string;
  date?: string;
}

export const useLedgerBook = () => {
  const m = moment();
  const [selY, setSelY] = useState(m.jYear());
  const [selM, setSelM] = useState(m.jMonth() + 1);
  const [selD, setSelD] = useState(m.jDate());
  
  const [invoicesIn, setInvoicesIn] = useState<LedgerInputItem[]>([]);
  const [returnsOut, setReturnsOut] = useState<LedgerOutputItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [workshopsList, setWorkshopsList] = useState<Workshop[]>([]);
  const [workshopsMapping, setWorkshopsMapping] = useState<Record<number, string>>({});
  const [refreshKey, setRefreshKey] = useState(0);

  const triggerRefresh = () => setRefreshKey(p => p + 1);

  useEffect(() => {
    db.table('workshops').toArray().then(data => {
      setWorkshopsList(data);
      const mapping = data.reduce((acc, w) => ({ ...acc, [w.id!]: w.name }), {});
      setWorkshopsMapping(mapping);
    });
  }, []);

  const loadLedgerData = useCallback(async () => {
    const targetJalaliStr = `${selY}/${selM.toString().padStart(2, '0')}/${selD.toString().padStart(2, '0')}`;
    try {
      const allInvoices = await db.table('invoices').toArray();
      const allItems = await db.table('invoice_items').toArray();

      const inputList = allItems.filter(item => {
        const inv = allInvoices.find(i => i.id === item.invoice_id);
        if (!inv) return false;
        const invJalali = moment(inv.date).format('jYYYY/jMM/jDD');
        const wName = inv.workshop_id === 0 ? (item.operation || 'کارگاه دستی') : (workshopsMapping[inv.workshop_id] || '');
        if (searchTerm.trim() !== '') {
          return item.product_name.includes(searchTerm) || wName.includes(searchTerm) || inv.invoice_number.includes(searchTerm);
        }
        return invJalali === targetJalaliStr;
      }).map(item => {
        const inv = allInvoices.find(i => i.id === item.invoice_id);
        return {
          id: item.id,
          invoice_id: item.invoice_id,
          invoice_number: inv?.invoice_number || '',
          workshop_name: inv?.workshop_id === 0 ? (item.operation || 'کارگاه دستی') : (workshopsMapping[inv?.workshop_id || 0] || 'نامشخص'),
          product_name: item.product_name,
          quantity_sent: item.quantity_sent,
          weight_sent: item.weight_sent || 0,
          date: inv?.date
        };
      });

      const allReturns = await db.table('returns').toArray();
      const outputList = allReturns.filter(ret => {
        const item = allItems.find(i => i.id === ret.invoice_item_id);
        const inv = item ? allInvoices.find(i => i.id === item.invoice_id) : null;
        const retJalali = moment(ret.return_date).format('jYYYY/jMM/jDD');
        const wName = inv?.workshop_id === 0 ? (item?.operation || 'کارگاه دستی') : (inv ? (workshopsMapping[inv.workshop_id] || '') : '');
        if (searchTerm.trim() !== '') {
          return item?.product_name.includes(searchTerm) || wName.includes(searchTerm);
        }
        return retJalali === targetJalaliStr;
      }).map(ret => {
        const item = allItems.find(i => i.id === ret.invoice_item_id);
        const inv = item ? allInvoices.find(i => i.id === item.invoice_id) : null;
        return {
          id: ret.id,
          product_name: item?.product_name || 'نامشخص',
          workshop_name: inv ? (inv.workshop_id === 0 ? (item?.operation || 'کارگاه دستی') : (workshopsMapping[inv.workshop_id] || 'نامشخص')) : 'نامشخص',
          quantity_returned: ret.quantity_returned,
          weight_returned: ret.weight_returned || 0,
          type: ret.return_type === 'healthy' ? 'سالم' : 'ضایعات/خراب',
          date: ret.return_date
        };
      });

      setInvoicesIn(inputList);
      setReturnsOut(outputList);
    } catch (err) {
      console.error(err);
    }
  }, [selY, selM, selD, searchTerm, workshopsMapping]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData, refreshKey]);

  const addQuickInput = async (workshopIdOrName: string, productName: string, qty: number, weight: number, customInvoiceNum?: string) => {
    const miladiDate = toMiladi(`${selY}/${selM}/${selD}`);
    if (!miladiDate) return false;
    const isCustomName = isNaN(Number(workshopIdOrName)) || workshopIdOrName.trim() === '';
    const wId = isCustomName ? 0 : Number(workshopIdOrName);
    const customName = isCustomName ? workshopIdOrName.trim() : '';
    const finalInvoiceNumber = customInvoiceNum && customInvoiceNum.trim() !== '' ? customInvoiceNum.trim() : `IN-${selY}${selM}${selD}-${Date.now().toString().slice(-4)}`;

    try {
      const invoiceId = await db.table('invoices').add({
        invoice_number: finalInvoiceNumber,
        workshop_id: wId,
        date: miladiDate,
        description: isCustomName ? `کارگاه دستی: ${customName}` : 'ثبت سریع صوتی/دستی سررسید'
      });
      await db.table('invoice_items').add({
        invoice_id: invoiceId,
        line_number: 1,
        product_name: productName.trim(),
        quantity_sent: qty,
        weight_sent: weight,
        unit_type: 'count',
        operation: customName,
        status: 'pending',
        remaining_quantity: qty,
        remaining_weight: weight,
        is_settled: false
      });
      triggerRefresh();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const addQuickOutput = async (workshopIdOrName: string, productName: string, qty: number, weight: number, isHealthy: boolean) => {
    const miladiDate = toMiladi(`${selY}/${selM}/${selD}`);
    if (!miladiDate) return { success: false, msg: "تاریخ نامعتبر است" };
    const isCustomName = isNaN(Number(workshopIdOrName)) || workshopIdOrName.trim() === '';
    const wId = isCustomName ? 0 : Number(workshopIdOrName);
    const customName = isCustomName ? workshopIdOrName.trim() : '';

    try {
      let activeItem: any = null;
      if (wId > 0) {
        const allInvoices = await db.table('invoices').where('workshop_id').equals(wId).toArray();
        const invoiceIds = allInvoices.map(i => i.id);
        activeItem = await db.table('invoice_items').filter(item => invoiceIds.includes(item.invoice_id) && item.product_name === productName.trim() && !item.is_settled).first();
      } else {
        const allInvoices = await db.table('invoices').where('workshop_id').equals(0).toArray();
        const invoiceIds = allInvoices.map(i => i.id);
        activeItem = await db.table('invoice_items').filter(item => invoiceIds.includes(item.invoice_id) && item.operation === customName && item.product_name === productName.trim() && !item.is_settled).first();
      }

      if (!activeItem) return { success: false, msg: `خطا: کارهای معلق با نام کالا "${productName}" برای این کارگاه یافت نشد!` };

      await db.table('returns').add({
        invoice_item_id: activeItem.id,
        return_date: miladiDate,
        quantity_returned: qty,
        weight_returned: weight,
        return_type: isHealthy ? 'healthy' : 'wasted'
      });
      const newQty = Math.max(0, activeItem.remaining_quantity - qty);
      const newWeight = Math.max(0, (activeItem.remaining_weight || 0) - weight);
      await db.table('invoice_items').update(activeItem.id, { remaining_quantity: newQty, remaining_weight: newWeight, is_settled: newQty === 0 });
      triggerRefresh();
      return { success: true, msg: "با موفقیت ثبت شد" };
    } catch (e: any) {
      return { success: false, msg: e.message || "خطای دیتابیس" };
    }
  };

  // ◄ تابع جادویی پردازش صوتی متن فارسی
  const processVoiceText = async (text: string): Promise<{ success: boolean; msg: string }> => {
    // تبدیل اعداد فارسی کلامی به اعداد انگلیسی عددی برای دیتابیس
    let cleanText = text.replace(/۰/g, '0').replace(/۱/g, '1').replace(/۲/g, '2').replace(/۳/g, '3').replace(/۴/g, '4')
                        .replace(/۵/g, '5').replace(/۶/g, '6').replace(/۷/g, '7').replace(/۸/g, '8').replace(/۹/g, '9');
    
    // استخراج عدد تعداد بار
    const qtyMatch = cleanText.match(/(\d+)\s*(عدد|جفت|تا|کیلو)?/);
    if (!qtyMatch) return { success: false, msg: "تعداد قطعه را در جمله متوجه نشدم! (مثلاً بگویید: ۲۰۰ عدد)" };
    const qty = parseInt(qtyMatch[1]);

    // تشخیص جهت بار (ورودی / خروجی)
    const isInput = cleanText.includes("ارسال") || cleanText.includes("فرستادم") || cleanText.includes("ورود");
    const isOutput = cleanText.includes("تحویل") || cleanText.includes("برگشت") || cleanText.includes("خروج") || cleanText.includes("رسید");

    if (!isInput && !isOutput) {
      return { success: false, msg: "مشخص نکردید بار 'ارسال شد' یا 'تحویل گرفته شد'؟" };
    }

    // الگوهای تشخیص نام کالا و کارگاه
    // مثال: "کالای پوسته مخلوط ارسال شد به کارگاه شفیعی"
    let productName = "کالای صوتی نامشخص";
    let workshopName = "کارگاه صوتی نامشخص";

    if (cleanText.includes("کالای") && cleanText.includes("به کارگاه")) {
      const prodPart = cleanText.split("کالای")[1].split("ارسال")[0].split("به")[0].replace(/عدد/g, "").trim();
      const workPart = cleanText.split("کارگاه")[1].trim();
      if(prodPart) productName = prodPart;
      if(workPart) workshopName = workPart;
    } else {
      // فرمت ساده‌تر: "300 تا شاهتوت فرستادم برای نجفی"
      const parts = cleanText.split(/\s+(برای|به|کارگاه)\s+/);
      if(parts.length >= 3) {
         workshopName = parts[parts.length - 1].trim();
         productName = cleanText.replace(qtyMatch[0], "").split(parts[1])[0].trim();
      }
    }

    // پاکسازی نهایی کلمات زائد کامپیوتر
    productName = productName.replace(/جهت|آبکاری|پرداخت|تعداد/g, "").trim();
    workshopName = workshopName.replace(/شماره/g, "").trim();

    if (isInput) {
      const ok = await addQuickInput(workshopName, productName, qty, 0);
      return ok ? { success: true, msg: `📥 ورودی ثبت شد: ${qty} عدد [${productName}] به [${workshopName}]` } : { success: false, msg: "خطا در ذخیره دیتابیس" };
    } else {
      const res = await addQuickOutput(workshopName, productName, qty, 0, !cleanText.includes("ضایعات"));
      return res.success ? { success: true, msg: `📤 خروجی ثبت شد: ${res.msg}` } : { success: false, msg: res.msg };
    }
  };

  return {
    selY, setSelY, selM, setSelM, selD, setSelD,
    invoicesIn, returnsOut, searchTerm, setSearchTerm,
    workshopsList, addQuickInput, addQuickOutput, processVoiceText
  };
};