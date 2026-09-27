// خواندن داده‌های نسخه قدیمی که در IndexedDB مرورگر ذخیره شده بود — فقط برای انتقال به سرور
import Dexie from 'dexie';
import type { BackupPayload } from './apiClient';

const LEGACY_DB_NAME = 'WorkshopDB';

const LEGACY_STORES = {
  workshops: '++id, name, unit_type',
  invoices: '++id, invoice_number, workshop_id, date',
  invoice_items:
    '++id, invoice_id, line_number, product_name, unit_type, status, is_settled, remaining_quantity, remaining_weight',
  return_invoices: '++id, return_invoice_number, workshop_id, return_date, notes',
  return_invoice_items: '++id, return_invoice_id, original_invoice_item_id, return_status',
  returns: '++id, invoice_item_id, return_date, return_type',
  ledger_inputs: '++id, date, invoice_number, product_name, source',
  ledger_outputs: '++id, date, invoice_number, product_name, destination, source',
  contacts: '++id, name, phone',
};

export async function legacyDatabaseExists(): Promise<boolean> {
  if (!('databases' in indexedDB)) return true;
  const databases = await indexedDB.databases();
  return databases.some(item => item.name === LEGACY_DB_NAME);
}

export async function readLegacyData(): Promise<BackupPayload> {
  const legacy = new Dexie(LEGACY_DB_NAME);
  legacy.version(5).stores(LEGACY_STORES);
  await legacy.open();
  const payload: BackupPayload = {};
  for (const table of Object.keys(LEGACY_STORES)) {
    payload[table] = await legacy.table(table).toArray();
  }
  legacy.close();
  return payload;
}

export function countRows(payload: BackupPayload): number {
  return Object.values(payload).reduce((total, rows) => total + rows.length, 0);
}
