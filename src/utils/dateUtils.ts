// src/utils/dateUtils.ts
import moment from 'moment-jalaali';

// تنظیم locale فارسی (برای نمایش نام ماه‌ها)
moment.loadPersian({ dialect: 'persian-modern' });

/**
 * تبدیل تاریخ میلادی (YYYY-MM-DD) به شمسی (jYYYY/jMM/jDD)
 * @param miladiDate - تاریخ به فرمت 'YYYY-MM-DD' یا Date object
 * @returns رشته شمسی مثل '۱۴۰۳/۰۲/۱۷'
 */
export function toJalali(miladiDate: string | Date): string {
  const m = moment(miladiDate);
  if (!m.isValid()) return '';
  return m.format('jYYYY/jMM/jDD');
}

/**
 * تبدیل تاریخ شمسی (jYYYY/jMM/jDD) به میلادی (YYYY-MM-DD)
 * @param jalaliDate - رشته شمسی مثل '1403/02/17'
 * @returns رشته میلادی مثل '2024-05-06' یا null در صورت نامعتبر
 */
export function toMiladi(jalaliDate: string): string | null {
  const m = moment(jalaliDate, 'jYYYY/jMM/jDD');
  if (!m.isValid()) return null;
  return m.format('YYYY-MM-DD');
}

/**
 * تاریخ جاری شمسی برای مقدار پیش‌فرض در فرم‌ها
 */
export function getCurrentJalaliDate(): string {
  return moment().format('jYYYY/jMM/jDD');
}