import Dexie, { Table } from 'dexie';

export interface Workshop {
  id?: number;
  name: string;
  address?: string;
  phone?: string;
  unit_type: 'count' | 'weight' | 'both';
  notes?: string;
}

export interface Invoice {
  id?: number;
  invoice_number: string;
  workshop_id: number;
  date: string;
  description?: string;
}

export interface InvoiceItem {
  id?: number;
  invoice_id: number;
  line_number: number;
  product_name: string;
  quantity_sent: number;
  weight_sent: number;
  unit_type: 'count' | 'weight' | 'both';
  operation?: string;
  attributes?: string;
  status: 'pending' | 'partial' | 'completed';
  remaining_quantity: number;
  remaining_weight: number;
  is_settled: boolean;
  previous_item_id?: number;
}

export interface ReturnInvoice {
  id?: number;
  return_invoice_number?: string;
  workshop_id: number;
  return_date: string;
  notes?: string;
}

export interface ReturnInvoiceItem {
  id?: number;
  return_invoice_id: number;
  original_invoice_item_id: number;
  quantity_returned: number;
  weight_returned: number;
  return_status: 'good' | 'damaged';
}

export interface LedgerReturn {
  id?: number;
  invoice_item_id: number;
  return_date: string;
  quantity_returned: number;
  weight_returned: number;
  return_type: 'healthy' | 'wasted';
}

/** ردیف ورود جنس در دفتر سررسید — مستقل از فاکتور کارگاه */
export interface LedgerInput {
  id?: number;
  date: string;
  invoice_number?: string;
  product_name: string;
  quantity: number;
  weight?: number;
  source?: string;
  notes?: string;
}

/** ردیف خروج/تحویل جنس در دفتر سررسید — مستقل از فاکتور کارگاه */
export interface LedgerOutput {
  id?: number;
  date: string;
  invoice_number?: string;
  product_name: string;
  quantity: number;
  weight?: number;
  source?: string;
  destination: string;
  notes?: string;
}

/** مخاطب — آدرس و تلفن برای جستجوی صوتی */
export interface Contact {
  id?: number;
  name: string;
  aliases?: string;
  address: string;
  phone: string;
  notes?: string;
}

class WorkshopDB extends Dexie {
  workshops!: Table<Workshop, number>;
  invoices!: Table<Invoice, number>;
  invoice_items!: Table<InvoiceItem, number>;
  return_invoices!: Table<ReturnInvoice, number>;
  return_invoice_items!: Table<ReturnInvoiceItem, number>;
  returns!: Table<LedgerReturn, number>;
  ledger_inputs!: Table<LedgerInput, number>;
  ledger_outputs!: Table<LedgerOutput, number>;
  contacts!: Table<Contact, number>;

  constructor() {
    super('WorkshopDB');
    this.version(1).stores({
      workshops: '++id, name, unit_type',
      invoices: '++id, invoice_number, workshop_id, date',
      invoice_items: '++id, invoice_id, line_number, product_name, unit_type, status, is_settled, remaining_quantity, remaining_weight',
      return_invoices: '++id, return_invoice_number, workshop_id, return_date, notes',
      return_invoice_items: '++id, return_invoice_id, original_invoice_item_id'
    });
    this.version(2).stores({
      workshops: '++id, name, unit_type',
      invoices: '++id, invoice_number, workshop_id, date',
      invoice_items: '++id, invoice_id, line_number, product_name, unit_type, status, is_settled, remaining_quantity, remaining_weight',
      return_invoices: '++id, return_invoice_number, workshop_id, return_date, notes',
      return_invoice_items: '++id, return_invoice_id, original_invoice_item_id, return_status'
    }).upgrade(async tx => {
      const items = await tx.table('return_invoice_items').toArray();
      for (const item of items) {
        await tx.table('return_invoice_items').update(item.id, { return_status: 'good' });
      }
    });
    this.version(3).stores({
      workshops: '++id, name, unit_type',
      invoices: '++id, invoice_number, workshop_id, date',
      invoice_items: '++id, invoice_id, line_number, product_name, unit_type, status, is_settled, remaining_quantity, remaining_weight',
      return_invoices: '++id, return_invoice_number, workshop_id, return_date, notes',
      return_invoice_items: '++id, return_invoice_id, original_invoice_item_id, return_status',
      returns: '++id, invoice_item_id, return_date, return_type'
    });
    this.version(4).stores({
      workshops: '++id, name, unit_type',
      invoices: '++id, invoice_number, workshop_id, date',
      invoice_items: '++id, invoice_id, line_number, product_name, unit_type, status, is_settled, remaining_quantity, remaining_weight',
      return_invoices: '++id, return_invoice_number, workshop_id, return_date, notes',
      return_invoice_items: '++id, return_invoice_id, original_invoice_item_id, return_status',
      returns: '++id, invoice_item_id, return_date, return_type',
      ledger_inputs: '++id, date, invoice_number, product_name, source',
      ledger_outputs: '++id, date, invoice_number, product_name, destination, source'
    });
    this.version(5).stores({
      workshops: '++id, name, unit_type',
      invoices: '++id, invoice_number, workshop_id, date',
      invoice_items: '++id, invoice_id, line_number, product_name, unit_type, status, is_settled, remaining_quantity, remaining_weight',
      return_invoices: '++id, return_invoice_number, workshop_id, return_date, notes',
      return_invoice_items: '++id, return_invoice_id, original_invoice_item_id, return_status',
      returns: '++id, invoice_item_id, return_date, return_type',
      ledger_inputs: '++id, date, invoice_number, product_name, source',
      ledger_outputs: '++id, date, invoice_number, product_name, destination, source',
      contacts: '++id, name, phone'
    });
  }
}

export const db = new WorkshopDB();

export async function addWorkshop(workshop: Omit<Workshop, 'id'>) {
  return await db.workshops.add(workshop);
}
export async function getAllWorkshops(): Promise<Workshop[]> {
  return await db.workshops.toArray();
}
export async function updateWorkshop(id: number, workshop: Partial<Workshop>) {
  return await db.workshops.update(id, workshop);
}
export async function deleteWorkshop(id: number) {
  return await db.workshops.delete(id);
}

export async function addInvoice(invoice: Omit<Invoice, 'id'>) {
  if (!invoice.invoice_number?.trim()) throw new Error('شماره فاکتور الزامی است');
  if (!invoice.workshop_id) throw new Error('کارگاه الزامی است');
  if (!invoice.date) throw new Error('تاریخ الزامی است');
  const existing = await db.invoices.where('invoice_number').equals(invoice.invoice_number).first();
  if (existing) throw new Error(`فاکتور با شماره ${invoice.invoice_number} قبلاً ثبت شده`);
  return await db.invoices.add(invoice);
}
export async function addInvoiceItem(item: Omit<InvoiceItem, 'id'>) {
  if (!item.product_name?.trim()) throw new Error('نام کالا الزامی است');
  if (!item.invoice_id) throw new Error('شناسه فاکتور الزامی است');
  const type = item.unit_type;
  const hasQty = (type === 'count' || type === 'both') && item.quantity_sent > 0;
  const hasWt = (type === 'weight' || type === 'both') && item.weight_sent > 0;
  if (!hasQty && !hasWt) throw new Error('حداقل یکی از تعداد یا وزن باید بزرگتر از صفر باشد');
  return await db.invoice_items.add(item);
}
export async function getInvoiceWithItems(invoiceId: number) {
  const invoice = await db.invoices.get(invoiceId);
  if (!invoice) return null;
  const items = await db.invoice_items.where('invoice_id').equals(invoiceId).toArray();
  for (const item of items) {
    const returns = await db.return_invoice_items.where('original_invoice_item_id').equals(item.id!).toArray();
    const totalReturnedQty = returns.reduce((s, r) => s + (r.quantity_returned || 0), 0);
    const totalReturnedWt = returns.reduce((s, r) => s + (r.weight_returned || 0), 0);
    (item as any).total_returned_quantity = totalReturnedQty;
    (item as any).total_returned_weight = totalReturnedWt;
    (item as any).remaining_quantity = (item.quantity_sent || 0) - totalReturnedQty;
    (item as any).remaining_weight = (item.weight_sent || 0) - totalReturnedWt;
  }
  return { invoice, items };
}
export async function getAllInvoicesWithWorkshop(): Promise<(Invoice & { workshopName: string })[]> {
  const invoices = await db.invoices.orderBy('date').reverse().toArray();
  const result: (Invoice & { workshopName: string })[] = [];
  for (const inv of invoices) {
    const workshop = await db.workshops.get(inv.workshop_id);
    result.push({ ...inv, workshopName: workshop?.name || '' });
  }
  return result;
}

export async function addFastReturn(
  originalItemId: number,
  quantityReturned: number,
  weightReturned = 0,
  returnInvoiceNumber?: string,
  returnStatus: 'good' | 'damaged' = 'good'
) {
  const originalItem = await db.invoice_items.get(originalItemId);
  if (!originalItem) throw new Error('آیتم اصلی یافت نشد');
  const invoice = await db.invoices.get(originalItem.invoice_id);
  if (!invoice) throw new Error('فاکتور مربوطه یافت نشد');
  const autoReturnInvoice: Omit<ReturnInvoice, 'id'> = {
    return_invoice_number: returnInvoiceNumber?.trim() || `INT-${Date.now()}`,
    workshop_id: invoice.workshop_id,
    return_date: new Date().toISOString().slice(0,10),
    notes: returnInvoiceNumber ? 'برگشت با فاکتور کارگاه' : 'برگشت سریع'
  };
  const returnInvoiceId = await db.return_invoices.add(autoReturnInvoice);
  await db.return_invoice_items.add({
    return_invoice_id: returnInvoiceId,
    original_invoice_item_id: originalItemId,
    quantity_returned: quantityReturned,
    weight_returned: weightReturned,
    return_status: returnStatus
  });
  await updateItemSettlementStatus(originalItemId);
}

async function updateItemSettlementStatus(itemId: number) {
  const item = await db.invoice_items.get(itemId);
  if (!item) return;
  const returns = await db.return_invoice_items.where('original_invoice_item_id').equals(itemId).toArray();
  const totalReturnedQty = returns.reduce((s, r) => s + (r.quantity_returned || 0), 0);
  const totalReturnedWt = returns.reduce((s, r) => s + (r.weight_returned || 0), 0);

  let remainingQty = (item.quantity_sent || 0) - totalReturnedQty;
  let remainingWt = (item.weight_sent || 0) - totalReturnedWt;
  if (remainingQty < 0) remainingQty = 0;
  if (remainingWt < 0) remainingWt = 0;

  let isSettled = false;
  let status: 'pending'|'partial'|'completed' = 'pending';
  if (item.unit_type === 'count') {
    if (remainingQty <= 0) isSettled = true;
    else if (totalReturnedQty > 0) status = 'partial';
  } else if (item.unit_type === 'weight') {
    if (remainingWt <= 0) isSettled = true;
    else if (totalReturnedWt > 0) status = 'partial';
  } else {
    if (remainingQty <= 0 && remainingWt <= 0) isSettled = true;
    else if (totalReturnedQty > 0 || totalReturnedWt > 0) status = 'partial';
  }
  if (isSettled) status = 'completed';

  await db.invoice_items.update(itemId, {
    remaining_quantity: remainingQty,
    remaining_weight: remainingWt,
    is_settled: isSettled,
    status: status
  });
}

export async function getReturnsForItem(itemId: number) {
  const returnItems = await db.return_invoice_items.where('original_invoice_item_id').equals(itemId).toArray();
  const returnsWithDate = await Promise.all(returnItems.map(async (ret) => {
    const returnInv = await db.return_invoices.get(ret.return_invoice_id);
    return {
      ...ret,
      return_date: returnInv?.return_date || '',
      return_invoice_number: returnInv?.return_invoice_number || 'بدون فاکتور'
    };
  }));
  returnsWithDate.sort((a, b) => new Date(a.return_date).getTime() - new Date(b.return_date).getTime());
  return returnsWithDate;
}

export async function getPendingInvoices() {
  const allItems = await db.invoice_items.toArray();
  const pendingItems: {
    item: InvoiceItem;
    invoice: Invoice;
    workshop: Workshop;
    remainingQty: number;
    remainingWeight: number;
  }[] = [];
  for (const item of allItems) {
    if (item.is_settled) continue;
    const invoice = await db.invoices.get(item.invoice_id);
    if (!invoice) continue;
    const workshop = await db.workshops.get(invoice.workshop_id);
    if (!workshop) continue;
    const returns = await db.return_invoice_items.where('original_invoice_item_id').equals(item.id!).toArray();
    const totalReturnedQty = returns.reduce((s, r) => s + (r.quantity_returned || 0), 0);
    const totalReturnedWt = returns.reduce((s, r) => s + (r.weight_returned || 0), 0);
    const remQty = (item.quantity_sent || 0) - totalReturnedQty;
    const remWt = (item.weight_sent || 0) - totalReturnedWt;
    pendingItems.push({ item, invoice, workshop, remainingQty: remQty, remainingWeight: remWt });
  }
  pendingItems.sort((a,b) => new Date(a.invoice.date).getTime() - new Date(b.invoice.date).getTime());
  return pendingItems;
}

export async function deleteInvoiceFully(invoiceId: number) {
  const items = await db.invoice_items.where('invoice_id').equals(invoiceId).toArray();
  for (const item of items) {
    const returnItems = await db.return_invoice_items.where('original_invoice_item_id').equals(item.id!).toArray();
    for (const ret of returnItems) {
      await db.return_invoice_items.delete(ret.id!);
    }
    await db.invoice_items.delete(item.id!);
  }
  const allReturnInvoices = await db.return_invoices.toArray();
  for (const retInv of allReturnInvoices) {
    const remaining = await db.return_invoice_items.where('return_invoice_id').equals(retInv.id!).count();
    if (remaining === 0) await db.return_invoices.delete(retInv.id!);
  }
  await db.invoices.delete(invoiceId);
}

// parse attributes JSON برای نمایش فیلدهای محاسبه وزن
export function parseWeightAttributes(attributesJson: string | undefined): any {
  if (!attributesJson) return null;
  try {
    return JSON.parse(attributesJson);
  } catch {
    return null;
  }
}