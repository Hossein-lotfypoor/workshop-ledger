// src/hooks/useLedgerBook.ts
import { useState, useEffect, useCallback } from 'react';
import moment from 'moment-jalaali';
import { db } from '../db/database';
import type { LedgerInput, LedgerOutput } from '../db/database';
import { toMiladi } from '../utils/dateUtils';

export type LedgerInputItem = LedgerInput;
export type LedgerOutputItem = LedgerOutput;

function normalizePersianDigits(text: string): string {
  return text
    .replace(/۰/g, '0').replace(/۱/g, '1').replace(/۲/g, '2').replace(/۳/g, '3').replace(/۴/g, '4')
    .replace(/۵/g, '5').replace(/۶/g, '6').replace(/۷/g, '7').replace(/۸/g, '8').replace(/۹/g, '9');
}

function extractInvoiceNumber(text: string): string | undefined {
  const match = text.match(/(?:شماره\s*)?فاکتور\s*(\d+)/i);
  return match?.[1];
}

function extractQuantity(text: string): number | null {
  const match = text.match(/(?:تعداد\s*)?(\d+)\s*(?:عدد|جفت|تا)?/);
  return match ? parseInt(match[1], 10) : null;
}

function extractProductName(text: string, qtyMatch: RegExpMatchArray | null): string {
  if (!qtyMatch) return 'کالای نامشخص';
  let product = text.slice(qtyMatch.index! + qtyMatch[0].length).trim();
  product = product.replace(/^(?:عدد|جفت|تا)\s+/i, '').trim();

  const stopWords = ['از', 'با', 'به', 'شماره', 'فاکتور', 'تحویل', 'وارد', 'گردید', 'شد', 'رسید'];
  for (const word of stopWords) {
    const idx = product.search(new RegExp(`\\s${word}\\s`, 'i'));
    if (idx > 0) {
      product = product.slice(0, idx).trim();
      break;
    }
  }

  product = product.replace(/\s*(?:از|با|به)\s+.*$/i, '').trim();
  return product || 'کالای نامشخص';
}

function extractSource(text: string): string | undefined {
  const match = text.match(/(?:از\s+)(.+?)(?:\s+(?:با|باش|شماره\s*فاکتور|فاکتور|تحویل|وارد)|$)/i);
  return match?.[1]?.trim();
}

function extractDestination(text: string): string | undefined {
  const match = text.match(/تحویل\s+(.+?)(?:\s+گردید|\s+شد|$)/i);
  if (match) return match[1].trim();

  const toMatch = text.match(/(?:به\s+)(.+?)(?:\s+تحویل|\s+گردید|\s+شد|$)/i);
  return toMatch?.[1]?.trim();
}

export const useLedgerBook = () => {
  const m = moment();
  const [selY, setSelY] = useState(m.jYear());
  const [selM, setSelM] = useState(m.jMonth() + 1);
  const [selD, setSelD] = useState(m.jDate());

  const [invoicesIn, setInvoicesIn] = useState<LedgerInputItem[]>([]);
  const [returnsOut, setReturnsOut] = useState<LedgerOutputItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightInputId, setHighlightInputId] = useState<number | null>(null);
  const [highlightOutputId, setHighlightOutputId] = useState<number | null>(null);

  const triggerRefresh = () => setRefreshKey(p => p + 1);
  const clearHighlightInput = useCallback(() => setHighlightInputId(null), []);
  const clearHighlightOutput = useCallback(() => setHighlightOutputId(null), []);

  const matchesSearch = (fields: (string | undefined)[], term: string) => {
    if (!term.trim()) return true;
    const q = term.trim();
    return fields.some(f => f?.includes(q));
  };

  const loadLedgerData = useCallback(async () => {
    const targetJalaliStr = `${selY}/${selM.toString().padStart(2, '0')}/${selD.toString().padStart(2, '0')}`;
    try {
      const allInputs = await db.ledger_inputs.toArray();
      const inputList = allInputs.filter(item => {
        const itemJalali = moment(item.date).format('jYYYY/jMM/jDD');
        return matchesSearch(
          [item.product_name, item.invoice_number, item.source, item.notes],
          searchTerm
        ) && (searchTerm.trim() !== '' || itemJalali === targetJalaliStr);
      });

      const allOutputs = await db.ledger_outputs.toArray();
      const outputList = allOutputs.filter(item => {
        const itemJalali = moment(item.date).format('jYYYY/jMM/jDD');
        return matchesSearch(
          [item.product_name, item.invoice_number, item.source, item.destination, item.notes],
          searchTerm
        ) && (searchTerm.trim() !== '' || itemJalali === targetJalaliStr);
      });

      setInvoicesIn(inputList);
      setReturnsOut(outputList);
    } catch (err) {
      console.error(err);
    }
  }, [selY, selM, selD, searchTerm]);

  useEffect(() => {
    loadLedgerData();
  }, [loadLedgerData, refreshKey]);

  const addQuickInput = async (
    productName: string,
    qty: number,
    weight: number,
    invoiceNumber?: string,
    source?: string,
    notes?: string
  ) => {
    const miladiDate = toMiladi(`${selY}/${selM}/${selD}`);
    if (!miladiDate) return false;

    try {
      const id = await db.ledger_inputs.add({
        date: miladiDate,
        invoice_number: invoiceNumber?.trim() || undefined,
        product_name: productName.trim(),
        quantity: qty,
        weight: weight || undefined,
        source: source?.trim() || undefined,
        notes: notes?.trim() || undefined,
      });
      setHighlightInputId(id as number);
      triggerRefresh();
      return true;
    } catch (e) {
      console.error(e);
      return false;
    }
  };

  const addQuickOutput = async (
    productName: string,
    qty: number,
    weight: number,
    destination: string,
    invoiceNumber?: string,
    source?: string,
    notes?: string
  ) => {
    const miladiDate = toMiladi(`${selY}/${selM}/${selD}`);
    if (!miladiDate) return { success: false, msg: 'تاریخ نامعتبر است' };
    if (!destination.trim()) return { success: false, msg: 'مقصد تحویل الزامی است' };

    try {
      const id = await db.ledger_outputs.add({
        date: miladiDate,
        invoice_number: invoiceNumber?.trim() || undefined,
        product_name: productName.trim(),
        quantity: qty,
        weight: weight || undefined,
        source: source?.trim() || undefined,
        destination: destination.trim(),
        notes: notes?.trim() || undefined,
      });
      setHighlightOutputId(id as number);
      triggerRefresh();
      return { success: true, msg: 'با موفقیت ثبت شد' };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'خطای دیتابیس';
      return { success: false, msg };
    }
  };

  const processVoiceText = async (text: string): Promise<{ success: boolean; msg: string }> => {
    const cleanText = normalizePersianDigits(text);
    const qtyMatch = cleanText.match(/(?:تعداد\s*)?(\d+)\s*(?:عدد|جفت|تا)?/);
    const qty = extractQuantity(cleanText);
    if (!qty || !qtyMatch) {
      return { success: false, msg: 'تعداد را در جمله متوجه نشدم! (مثلاً: ۲۰ عدد)' };
    }

    const isOutput = /تحویل|خروج|دادم|ارسال\s+شد|تحویل\s+گردید|تحویل\s+شد/.test(cleanText);
    const isInput = !isOutput && /وارد|ورود|رسید|دریافت/.test(cleanText);

    if (!isInput && !isOutput) {
      return { success: false, msg: "مشخص کنید جنس 'وارد شد' یا 'تحویل ... گردید'؟" };
    }

    const productName = extractProductName(cleanText, qtyMatch);
    const invoiceNumber = extractInvoiceNumber(cleanText);
    const source = extractSource(cleanText);

    if (isInput) {
      const ok = await addQuickInput(productName, qty, 0, invoiceNumber, source);
      return ok
        ? { success: true, msg: `📥 ورود ثبت شد: ${qty} عدد ${productName}` }
        : { success: false, msg: 'خطا در ذخیره دیتابیس' };
    }

    const destination = extractDestination(cleanText);
    if (!destination) {
      return { success: false, msg: 'مقصد تحویل را متوجه نشدم! (مثلاً: تحویل انبار گردید)' };
    }

    const res = await addQuickOutput(productName, qty, 0, destination, invoiceNumber, source);
    return res.success
      ? { success: true, msg: `📤 خروج ثبت شد: ${qty} عدد ${productName} — تحویل ${destination}` }
      : { success: false, msg: res.msg };
  };

  return {
    selY, setSelY, selM, setSelM, selD, setSelD,
    invoicesIn, returnsOut, searchTerm, setSearchTerm,
    addQuickInput, addQuickOutput, processVoiceText,
    highlightInputId, highlightOutputId, clearHighlightInput, clearHighlightOutput,
  };
};
