import type { WarehouseCatalogProduct } from './warehouseProducts';

const COMMAND_WORDS = new Set([
  'موجودی', 'انبار', 'کالا', 'محصول', 'ببین', 'بررسی', 'چک', 'کن', 'بگو', 'داریم', 'دارم',
  'هست', 'هستش', 'چقدر', 'چند', 'عدد', 'لطفا', 'لطفاً', 'برای', 'از', 'رو', 'را', 'میخوام', 'میخواهم',
  'ورود', 'وارد', 'رسید', 'دریافت', 'خروج', 'تحویل', 'ارسال', 'بفرست', 'پایه', 'اولیه', 'ورودی', 'کلی',
  'نقطه', 'سفارش', 'مدل', 'جدید', 'افزودن', 'رنگ', 'فاکتور', 'سند', 'شماره', 'تاریخ', 'توضیح', 'توضیحات',
  'یادداشت', 'کارگاه', 'فروشنده', 'مبدا', 'مقصد', 'به', 'و', 'چنده', 'چندتا', 'موجوده', 'کالای', 'کالاهای'
]);

const SPOKEN_NUMBER_VALUES = new Map<string, number>([
  ['صفر', 0], ['یک', 1], ['یه', 1], ['دو', 2], ['سه', 3], ['چهار', 4], ['پنج', 5], ['شش', 6], ['شیش', 6],
  ['هفت', 7], ['هشت', 8], ['نه', 9], ['ده', 10], ['یازده', 11], ['دوازده', 12], ['سیزده', 13], ['چهارده', 14],
  ['پانزده', 15], ['شونزده', 16], ['شانزده', 16], ['هفده', 17], ['هجده', 18], ['نوزده', 19], ['بیست', 20],
  ['سی', 30], ['چهل', 40], ['پنجاه', 50], ['شصت', 60], ['هفتاد', 70], ['هشتاد', 80], ['نود', 90],
  ['صد', 100], ['دویست', 200], ['سیصد', 300], ['چهارصد', 400], ['پانصد', 500], ['ششصد', 600],
  ['هفتصد', 700], ['هشتصد', 800], ['نهصد', 900], ['هزار', 1000]
]);

export function normalizeWarehouseSpeechText(value: string): string {
  return value
    .normalize('NFKC')
    .replace(/[أإآ]/g, 'ا')
    .replace(/[ۀة]/g, 'ه')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[\u064B-\u065F\u0670\u200C\u200D]/g, ' ')
    .replace(/[۰-۹٠-٩]/g, digit => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit) >= 0
      ? '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)
      : '٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/٫/g, '.')
    .toLocaleLowerCase('fa')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractWarehouseQuantity(value: string): number | null {
  const normalized = normalizeWarehouseSpeechText(value);
  const digitMatch = normalized.match(/(?:^|\s)(\d+(?:\.\d+)?)(?=\s|$)/);
  if (digitMatch) return Number(digitMatch[1]);

  const terms = normalized.split(' ');
  for (let index = 0; index < terms.length; index += 1) {
    if (!SPOKEN_NUMBER_VALUES.has(terms[index])) continue;
    let total = 0;
    let group = 0;
    let found = false;
    for (let cursor = index; cursor < terms.length; cursor += 1) {
      const term = terms[cursor];
      if (term === 'و' && found) continue;
      const value = SPOKEN_NUMBER_VALUES.get(term);
      if (value === undefined) break;
      found = true;
      if (value === 1000) {
        total += (group || 1) * value;
        group = 0;
      } else if (value === 100) {
        group = (group || 1) * value;
      } else {
        group += value;
      }
    }
    if (found) return total + group;
  }
  return null;
}

export function matchWarehouseCatalogProducts(
  products: WarehouseCatalogProduct[],
  spokenText: string
): WarehouseCatalogProduct[] {
  const query = normalizeWarehouseSpeechText(spokenText);
  const terms = query.split(' ').filter(term => term.length > 1 && !COMMAND_WORDS.has(term) &&
    !SPOKEN_NUMBER_VALUES.has(term) && !/^\d+(?:\.\d+)?$/.test(term));
  if (terms.length === 0) return [];

  const matches = products
    .map(product => {
      const fields = [product.model, product.color, product.item].map(normalizeWarehouseSpeechText);
      const searchableText = fields.join(' ');
      const matchedTerms = terms.filter(term => searchableText.includes(term));
      if (matchedTerms.length !== terms.length) return null;

      const exactFieldMatches = fields.filter(field => field && query.includes(field)).length;
      const exactIdentity = normalizeWarehouseSpeechText(`${product.model} ${product.color} ${product.item}`) === query;
      return {
        product,
        score: (exactIdentity ? 1000 : 0) + exactFieldMatches * 10 + matchedTerms.length
      };
    })
    .filter((match): match is { product: WarehouseCatalogProduct; score: number } => match !== null)
    .sort((left, right) => right.score - left.score);
  const bestScore = matches[0]?.score;
  return matches
    .filter(match => match.score === bestScore)
    .map(match => match.product);
}