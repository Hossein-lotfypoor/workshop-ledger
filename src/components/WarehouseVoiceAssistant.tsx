import { useState } from 'react';
import {
  addWarehouseModel,
  addWarehouseMovement,
  getWarehouseCurrentStock,
  getWarehouseStock,
  saveWarehouseInitialStocks,
  type WarehouseStock
} from '../db/database';
import { getCurrentJalaliDate, toMiladi } from '../utils/dateUtils';
import {
  getWarehouseCatalogProducts,
  type WarehouseCatalogProduct
} from '../utils/warehouseProducts';
import { extractWarehouseQuantity, matchWarehouseCatalogProducts, normalizeWarehouseSpeechText } from '../utils/warehouseVoice';

interface RecognitionResult {
  results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface LocalRecognition {
  lang: string;
  processLocally: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: RecognitionResult) => void) | null;
  start(): void;
}

interface LocalRecognitionConstructor {
  new(): LocalRecognition;
  available?: (options: { langs: string[]; processLocally: boolean; quality: string }) => Promise<string>;
  install?: (options: { langs: string[]; processLocally: boolean; quality: string }) => Promise<boolean>;
}

type RequestedAction =
  | { kind: 'lookup' }
  | { kind: 'movement'; movementType: 'in' | 'out'; quantity: number; date?: string; counterparty?: string; referenceNumber?: string; notes?: string }
  | { kind: 'initial-stock'; quantity: number }
  | { kind: 'reorder-point'; quantity: number };

type PendingAction =
  | { kind: 'add-model'; model: string }
  | { kind: 'movement'; movementType: 'in' | 'out'; quantity: number; date?: string; counterparty?: string; referenceNumber?: string; notes?: string; product: WarehouseCatalogProduct }
  | { kind: 'initial-stock-batch'; items: Array<{ product: WarehouseCatalogProduct; quantity: number }> }
  | { kind: 'reorder-point'; quantity: number; product: WarehouseCatalogProduct };

function getRecognitionConstructor(): LocalRecognitionConstructor | null {
  const speechWindow = window as unknown as {
    SpeechRecognition?: LocalRecognitionConstructor;
    webkitSpeechRecognition?: LocalRecognitionConstructor;
  };
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

function getRequestedAction(text: string): RequestedAction {
  const normalized = normalizeWarehouseSpeechText(text);
  const withoutReferences = normalized
    .replace(/\d{4}[/-]\d{1,2}[/-]\d{1,2}/g, '')
    .replace(/(?:فاکتور|سند)(?:\s+شماره)?\s+\d+/g, '');
  const quantity = extractWarehouseQuantity(withoutReferences) ?? -1;

  if (normalized.includes('نقطه سفارش')) return { kind: 'reorder-point', quantity };
  if (normalized.includes('موجودی پایه') || normalized.includes('موجودی اولیه') || normalized.includes('ورودی کلی')) {
    return { kind: 'initial-stock', quantity };
  }
  if (['خروج', 'تحویل', 'ارسال', 'بفرست'].some(word => normalized.includes(word))) {
    return { kind: 'movement', movementType: 'out', quantity, ...getMovementDetails(text, 'out') };
  }
  if (['ورود', 'وارد', 'رسید', 'دریافت'].some(word => normalized.includes(word))) {
    return { kind: 'movement', movementType: 'in', quantity, ...getMovementDetails(text, 'in') };
  }
  return { kind: 'lookup' };
}

function getMovementDetails(text: string, movementType: 'in' | 'out') {
  const normalized = normalizeWarehouseSpeechText(text);
  const rawDate = text.match(/(?:تاریخ\s*)?([۰-۹٠-٩0-9]{4}[/-][۰-۹٠-٩0-9]{1,2}[/-][۰-۹٠-٩0-9]{1,2})/)?.[1];
  const date = rawDate ? normalizeWarehouseSpeechText(rawDate).replace(/\s+/g, '/') : undefined;
  const referenceNumber = normalized.match(/(?:فاکتور|سند)(?:\s+شماره)?\s*(\d+)/)?.[1];
  const notes = normalized.match(/(?:توضیحات|توضیح|یادداشت)\s+(.+)$/)?.[1]?.trim();
  const partyPattern = movementType === 'in'
    ? /(?:از|مبدا|فروشنده)\s+(.+?)(?=\s+(?:ورود|وارد|رسید|دریافت|ثبت|فاکتور|سند|تاریخ|توضیح|یادداشت)(?:\s|$)|$)/
    : /(?:به|مقصد|تحویل گیرنده)\s+(.+?)(?=\s+(?:خروج|تحویل|ارسال|ثبت|فاکتور|سند|تاریخ|توضیح|یادداشت)(?:\s|$)|$)/;
  const counterparty = normalized.match(partyPattern)?.[1]?.trim();
  return { date, counterparty, referenceNumber, notes };
}

function getProductSearchText(text: string, action: RequestedAction): string {
  let searchText = normalizeWarehouseSpeechText(text)
    .replace(/(?:توضیحات|توضیح|یادداشت)\s+.+$/, '')
    .replace(/(?:فاکتور|سند)(?:\s+شماره)?\s+\d+/g, '')
    .replace(/تاریخ\s*\d{4}[/-]\d{1,2}[/-]\d{1,2}/g, '');
  if (action.kind === 'movement') {
    const partyPattern = action.movementType === 'in'
      ? /(?:از|مبدا|فروشنده)\s+.+?(?=\s+(?:ورود|وارد|رسید|دریافت|ثبت|فاکتور|سند|تاریخ|توضیح|یادداشت)(?:\s|$)|$)/
      : /(?:به|مقصد|تحویل گیرنده)\s+.+?(?=\s+(?:خروج|تحویل|ارسال|ثبت|فاکتور|سند|تاریخ|توضیح|یادداشت)(?:\s|$)|$)/;
    searchText = searchText.replace(partyPattern, '');
  }
  return searchText;
}

function getNewModelName(text: string): string | null {
  const normalized = normalizeWarehouseSpeechText(text);
  if (!normalized.includes('مدل جدید') && !normalized.includes('افزودن مدل')) return null;
  return normalized.replace(/^.*?(?:افزودن مدل(?: جدید)?|مدل جدید)\s*/, '').trim() || null;
}

function describeProduct(product: WarehouseCatalogProduct): string {
  return `${product.model} / ${product.color} / ${product.item}`;
}

interface WarehouseVoiceAssistantProps {
  customModels: string[];
  onModelAdded: (model: string) => void;
  onInventoryChanged: (productKeys: string[]) => Promise<void>;
}

export default function WarehouseVoiceAssistant({ customModels, onModelAdded, onInventoryChanged }: WarehouseVoiceAssistantProps) {
  const [command, setCommand] = useState('');
  const [status, setStatus] = useState('');
  const [answer, setAnswer] = useState('');
  const [candidates, setCandidates] = useState<WarehouseCatalogProduct[]>([]);
  const [requestedAction, setRequestedAction] = useState<RequestedAction | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [initialStockDraft, setInitialStockDraft] = useState<Array<{ product: WarehouseCatalogProduct; quantity: number }>>([]);
  const [busy, setBusy] = useState(false);
  const [isListening, setIsListening] = useState(false);

  const catalog = getWarehouseCatalogProducts(customModels);

  const selectProduct = async (product: WarehouseCatalogProduct, action: RequestedAction) => {
    setCandidates([]);
    setRequestedAction(null);
    if (action.kind === 'lookup') {
      const stock = await getWarehouseCurrentStock(product.key);
      setAnswer(stock
        ? `${describeProduct(product)}\nموجودی فعلی: ${stock.quantity.toLocaleString('fa-IR')}`
        : `${describeProduct(product)}\nاین کالا در کاتالوگ هست، اما هنوز موجودی برایش ثبت نشده است.`);
      setStatus('نتیجه از اطلاعات ذخیره‌شده روی همین دستگاه خوانده شد.');
      return;
    }
    if (action.kind === 'initial-stock') {
      setInitialStockDraft(current => [
        ...current.filter(item => item.product.key !== product.key),
        { product, quantity: action.quantity }
      ]);
      setStatus(`${describeProduct(product)} با موجودی پایه‌ی ${action.quantity.toLocaleString('fa-IR')} به پیش‌نویس ورودی کلی اضافه شد.`);
      return;
    }
    setPendingAction({ ...action, product });
    setStatus('پیش‌نمایش آماده است؛ برای ثبت، تأیید کن.');
  };

  const processCommand = async (text: string) => {
    setCommand(text);
    setAnswer('');
    setCandidates([]);
    setPendingAction(null);

    const newModel = getNewModelName(text);
    if (newModel) {
      setPendingAction({ kind: 'add-model', model: newModel });
      setStatus(`افزودن مدل «${newModel}» در انتظار تأیید است.`);
      return;
    }

    const action = getRequestedAction(text);
    if (action.kind !== 'lookup' && (!Number.isFinite(action.quantity) || action.quantity < 0 ||
      (action.kind === 'movement' && action.quantity === 0))) {
      setStatus('مقدار معتبر در فرمان پیدا نشد. مقدار را به رقم بگو؛ مثلاً «۲۰ عدد».' );
      return;
    }

    const matches = matchWarehouseCatalogProducts(catalog, getProductSearchText(text, action));
    if (matches.length === 0) {
      setStatus('محصولی با این مشخصات در کاتالوگ انبار پیدا نشد. مدل، رنگ و نوع کالا را دقیق‌تر بگو.');
      return;
    }
    if (matches.length > 1) {
      setRequestedAction(action);
      setCandidates(matches.slice(0, 6));
      setStatus(`چند محصول نزدیک پیدا شد (${matches.length.toLocaleString('fa-IR')}). محصول درست را انتخاب کن.`);
      return;
    }
    await selectProduct(matches[0], action);
  };

  const handleStartListening = async () => {
    const Recognition = getRecognitionConstructor();
    if (!Recognition || !Recognition.available || !Recognition.install) {
      setStatus('این مرورگر تشخیص گفتار آفلاین را پشتیبانی نمی‌کند. فرمان را تایپ کن؛ دیکته‌ی صفحه‌کلید فقط در صورت پشتیبانی خود دستگاه قابل استفاده است.');
      return;
    }

    setBusy(true);
    setStatus('در حال بررسی بسته‌ی گفتار فارسی روی دستگاه...');
    try {
      const options = { langs: ['fa-IR'], processLocally: true, quality: 'command' };
      let availability = await Recognition.available(options);
      if (availability === 'downloadable') {
        setStatus('برای استفاده‌ی آفلاین، بسته‌ی گفتار فارسی یک‌بار دانلود می‌شود.');
        const installed = await Recognition.install(options);
        if (!installed) throw new Error('بسته‌ی فارسی روی این دستگاه قابل نصب نیست.');
        availability = await Recognition.available(options);
      }
      if (availability === 'downloading') {
        throw new Error('بسته‌ی فارسی در حال دانلود است؛ پس از پایان، دوباره شروع کن.');
      }
      if (availability !== 'available') {
        throw new Error('تشخیص آفلاین فارسی در این مرورگر در دسترس نیست.');
      }

      const recognition = new Recognition();
      recognition.lang = 'fa-IR';
      recognition.processLocally = true;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.onstart = () => {
        setIsListening(true);
        setStatus('در حال شنیدن فرمان فارسی به‌صورت محلی...');
      };
      recognition.onerror = event => {
        setIsListening(false);
        setStatus(event.error === 'language-not-supported'
          ? 'بسته‌ی تشخیص گفتار فارسی روی دستگاه پشتیبانی نمی‌شود.'
          : 'دریافت صدا ناموفق بود؛ مجوز میکروفون و تنظیمات دستگاه را بررسی کن.');
      };
      recognition.onend = () => setIsListening(false);
      recognition.onresult = event => {
        const transcript = event.results[0]?.[0]?.transcript ?? '';
        if (!transcript) {
          setStatus('گفتار قابل تشخیصی دریافت نشد. دوباره امتحان کن.');
          return;
        }
        void processCommand(transcript);
      };
      recognition.start();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'شروع تشخیص گفتار ناموفق بود.');
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    setStatus('در حال ثبت روی دستگاه...');
    try {
      if (pendingAction.kind === 'add-model') {
        const savedModel = await addWarehouseModel(pendingAction.model);
        onModelAdded(savedModel.name);
        setAnswer(`مدل «${savedModel.name}» به کاتالوگ اضافه شد.`);
      } else if (pendingAction.kind === 'initial-stock-batch') {
        const stocks: WarehouseStock[] = await Promise.all(pendingAction.items.map(async ({ product, quantity }) => {
          const existing = await getWarehouseStock(product.key);
          return {
            product_key: product.key,
            model: product.model,
            color: product.color,
            item: product.item,
            quantity,
            reorder_point: existing?.reorder_point
          };
        }));
        await saveWarehouseInitialStocks(stocks);
        await onInventoryChanged(stocks.map(stock => stock.product_key));
        setInitialStockDraft([]);
        setAnswer(`موجودی پایه‌ی ${stocks.length.toLocaleString('fa-IR')} محصول ذخیره شد.`);
      } else if (pendingAction.kind === 'reorder-point') {
        const existing = await getWarehouseStock(pendingAction.product.key);
        await saveWarehouseInitialStocks([{
          product_key: pendingAction.product.key,
          model: pendingAction.product.model,
          color: pendingAction.product.color,
          item: pendingAction.product.item,
          quantity: existing?.quantity ?? 0,
          reorder_point: pendingAction.quantity
        }]);
        setAnswer(`نقطه سفارش ${describeProduct(pendingAction.product)} روی ${pendingAction.quantity.toLocaleString('fa-IR')} تنظیم شد.`);
      } else {
        const date = toMiladi(pendingAction.date || getCurrentJalaliDate());
        if (!date) throw new Error('تاریخ شمسی فرمان معتبر نیست.');
        await addWarehouseMovement({
          product_key: pendingAction.product.key,
          model: pendingAction.product.model,
          color: pendingAction.product.color,
          item: pendingAction.product.item,
          type: pendingAction.movementType,
          quantity: pendingAction.quantity,
          date,
          counterparty: pendingAction.counterparty,
          reference_number: pendingAction.referenceNumber,
          notes: pendingAction.notes
        });
        const stock = await getWarehouseCurrentStock(pendingAction.product.key);
        setAnswer(`${pendingAction.movementType === 'in' ? 'ورود' : 'خروج'} ثبت شد: ${describeProduct(pendingAction.product)}\nموجودی جدید: ${(stock?.quantity ?? 0).toLocaleString('fa-IR')}`);
      }
      if (pendingAction.kind !== 'add-model' && pendingAction.kind !== 'initial-stock-batch') {
        await onInventoryChanged([pendingAction.product.key]);
      }
      setStatus('عملیات با موفقیت انجام شد و اطلاعات به‌صورت محلی ذخیره شد.');
      setPendingAction(null);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'ثبت عملیات انجام نشد.');
    } finally {
      setBusy(false);
    }
  };

  const pendingDescription = pendingAction?.kind === 'add-model'
    ? `افزودن مدل جدید: ${pendingAction.model}`
    : pendingAction?.kind === 'initial-stock-batch'
      ? `ثبت موجودی پایه‌ی ${pendingAction.items.length.toLocaleString('fa-IR')} محصول؛ فقط محصولات فهرست‌شده تغییر می‌کنند.`
      : pendingAction?.kind === 'reorder-point'
        ? `تنظیم نقطه سفارش ${describeProduct(pendingAction.product)} روی ${pendingAction.quantity.toLocaleString('fa-IR')}`
        : pendingAction
        ? `ثبت ${pendingAction.movementType === 'in' ? 'ورود' : 'خروج'} ${pendingAction.quantity.toLocaleString('fa-IR')} عدد از ${describeProduct(pendingAction.product)}${pendingAction.counterparty ? `، ${pendingAction.movementType === 'in' ? 'مبدا' : 'مقصد'} ${pendingAction.counterparty}` : ''}${pendingAction.referenceNumber ? `، سند ${pendingAction.referenceNumber}` : ''}${pendingAction.date ? `، تاریخ ${pendingAction.date}` : ''}${pendingAction.notes ? `، توضیح ${pendingAction.notes}` : ''}`
        : '';

  return (
    <section aria-labelledby="warehouse-voice-title" className="mb-5 border-y border-emerald-200 bg-emerald-50/60 px-3 py-4 sm:px-5">
      <div className="mx-auto grid max-w-6xl gap-3 md:grid-cols-[1fr_auto] md:items-end">
        <div>
          <h2 id="warehouse-voice-title" className="text-base font-bold text-slate-900">دستیار صوتی انبار</h2>
          <p className="mt-1 text-sm text-slate-600">بررسی موجودی، ورود و خروج، موجودی پایه و افزودن مدل</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void handleStartListening()} disabled={busy || isListening} className="min-h-11 rounded bg-emerald-800 px-4 py-2 text-sm font-bold text-white disabled:opacity-60">
            {isListening ? 'در حال شنیدن...' : busy ? 'لطفاً صبر کن...' : '🎙 شروع گفتار آفلاین'}
          </button>
          <form onSubmit={event => { event.preventDefault(); void processCommand(command); }} className="flex min-w-0 flex-1 gap-2 md:flex-none">
            <input aria-label="فرمان انبار" value={command} onChange={event => setCommand(event.target.value)} className="min-w-0 flex-1 rounded border border-slate-300 bg-white px-3 py-2 text-sm md:w-80" placeholder="فرمان را بگو یا وارد کن" />
            <button type="submit" disabled={busy || !command.trim()} className="min-h-11 rounded border border-emerald-800 px-4 py-2 text-sm font-semibold text-emerald-900 disabled:opacity-50">اجرا</button>
          </form>
        </div>
      </div>
      {(status || answer || pendingAction || candidates.length > 0 || initialStockDraft.length > 0) && (
        <div className="mx-auto mt-3 max-w-6xl space-y-2" aria-live="polite">
          {status && <p role="status" className="text-sm text-slate-700">{status}</p>}
          {answer && <p className="whitespace-pre-line border-r-2 border-emerald-600 bg-white px-3 py-2 text-sm font-semibold text-slate-800">{answer}</p>}
          {initialStockDraft.length > 0 && <div className="space-y-2 border border-slate-200 bg-white p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <strong className="text-sm text-slate-800">پیش‌نویس ورودی کلی ({initialStockDraft.length.toLocaleString('fa-IR')} کالا)</strong>
              <div className="flex gap-2">
                <button type="button" onClick={() => setPendingAction({ kind: 'initial-stock-batch', items: initialStockDraft })} disabled={busy} className="min-h-10 rounded bg-emerald-800 px-4 py-2 text-sm font-bold text-white">بررسی و ثبت همه</button>
                <button type="button" onClick={() => { setInitialStockDraft([]); setStatus('پیش‌نویس ورودی کلی پاک شد.'); }} disabled={busy} className="min-h-10 rounded border border-slate-300 px-3 py-2 text-sm text-slate-700">پاک‌کردن</button>
              </div>
            </div>
            <ul className="grid gap-1 text-sm text-slate-700 sm:grid-cols-2">
              {initialStockDraft.map(({ product, quantity }) => <li key={product.key} className="flex items-center justify-between gap-2 border-b border-slate-100 py-1">
                <span className="min-w-0 flex-1">{describeProduct(product)}</span>
                <input
                  aria-label={`موجودی پایه ${describeProduct(product)}`}
                  className="w-24 rounded border border-slate-300 px-2 py-1 text-left tabular-nums"
                  type="number"
                  min="0"
                  step="any"
                  value={quantity}
                  onChange={event => {
                    const nextQuantity = event.target.value === '' ? 0 : Number(event.target.value);
                    setInitialStockDraft(current => current.map(entry => entry.product.key === product.key
                      ? { ...entry, quantity: Number.isFinite(nextQuantity) && nextQuantity >= 0 ? nextQuantity : entry.quantity }
                      : entry));
                  }}
                />
              </li>)}
            </ul>
          </div>}
          {pendingAction && <div className="flex flex-wrap items-center gap-2 border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
            <span className="min-w-0 flex-1">{pendingDescription}</span>
            <button type="button" onClick={() => void confirmAction()} disabled={busy} className="min-h-10 rounded bg-emerald-800 px-4 py-2 font-bold text-white disabled:opacity-60">تأیید و ثبت</button>
            <button type="button" onClick={() => { setPendingAction(null); setStatus('عملیات لغو شد.'); }} disabled={busy} className="min-h-10 rounded border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700">لغو</button>
          </div>}
          {candidates.length > 0 && <div className="flex flex-wrap gap-2">
            {candidates.map(product => <button key={product.key} type="button" onClick={() => requestedAction && void selectProduct(product, requestedAction)} className="min-h-10 rounded border border-emerald-700 bg-white px-3 py-2 text-sm text-emerald-950">{describeProduct(product)}</button>)}
          </div>}
        </div>
      )}
    </section>
  );
}
