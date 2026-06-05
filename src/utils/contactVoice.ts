import type { Contact } from '../db/database';

export function normalizePersianDigits(text: string): string {
  return text
    .replace(/۰/g, '0').replace(/۱/g, '1').replace(/۲/g, '2').replace(/۳/g, '3').replace(/۴/g, '4')
    .replace(/۵/g, '5').replace(/۶/g, '6').replace(/۷/g, '7').replace(/۸/g, '8').replace(/۹/g, '9');
}

const QUERY_STOP_WORDS = [
  'آدرس', 'ادرس', 'شماره', 'تلفن', 'تلفنم', 'موبایل', 'بده', 'بگو', 'بگید', 'بفرست',
  'پیدا', 'کن', 'کجاست', 'کدام', 'لطفا', 'لطفاً', 'من', 'رو', 'را', 'و', 'یا', 'از',
  'اطلاعات', 'مخاطب', 'تماس', 'شخص', 'فرد',
];

export function extractNameFromVoiceQuery(rawText: string): string {
  let text = normalizePersianDigits(rawText).trim();

  for (const w of QUERY_STOP_WORDS) {
    text = text.replace(new RegExp(w, 'gi'), ' ');
  }

  return text.replace(/\s+/g, ' ').trim();
}

export function getContactSearchTokens(contact: Contact): string[] {
  const tokens = [contact.name.trim()];
  if (contact.aliases) {
    contact.aliases.split(/[,،]/).forEach(a => {
      const t = a.trim();
      if (t) tokens.push(t);
    });
  }
  return tokens;
}

function tokenMatches(query: string, token: string): boolean {
  const q = query.trim();
  const t = token.trim();
  if (!q || !t) return false;
  if (t.includes(q) || q.includes(t)) return true;

  const qWords = q.split(/\s+/).filter(w => w.length >= 2);
  return qWords.length > 0 && qWords.every(w => t.includes(w));
}

export function findContactByVoiceQuery(contacts: Contact[], rawQuery: string): Contact | null {
  const query = extractNameFromVoiceQuery(rawQuery);
  if (!query) return null;

  let best: { contact: Contact; score: number } | null = null;

  for (const contact of contacts) {
    for (const token of getContactSearchTokens(contact)) {
      if (!tokenMatches(query, token)) continue;
      const score = token.length + (token === query ? 100 : token.startsWith(query) ? 50 : 0);
      if (!best || score > best.score) {
        best = { contact, score };
      }
    }
  }

  return best?.contact ?? null;
}

export function formatContactAnswer(contact: Contact): string {
  const lines: string[] = [];
  if (contact.address?.trim()) lines.push(`آدرس: ${contact.address.trim()}`);
  if (contact.phone?.trim()) lines.push(`تلفن: ${contact.phone.trim()}`);
  return lines.join('\n') || 'اطلاعاتی ثبت نشده';
}

export function formatContactAnswerFull(contact: Contact): string {
  return `${contact.name}\n${formatContactAnswer(contact)}`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getSpeechRecognitionCtor(): (new () => any) | null {
  const w = window as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}
