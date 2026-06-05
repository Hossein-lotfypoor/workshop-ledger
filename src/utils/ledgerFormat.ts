import type { LedgerInputItem, LedgerOutputItem } from '../hooks/useLedgerBook';

export function formatInputLedgerLine(item: LedgerInputItem): string {
  const qty = item.quantity.toLocaleString('fa-IR');
  const parts = [`تعداد ${qty} عدد ${item.product_name}`];
  if (item.source) parts.push(`از ${item.source}`);
  if (item.invoice_number) parts.push(`فاکتور ${item.invoice_number}`);
  if (item.weight && item.weight > 0) parts.push(`${item.weight.toLocaleString('fa-IR')} گرم`);
  parts.push('وارد شد');
  return parts.join(' — ');
}

export function formatOutputLedgerLine(item: LedgerOutputItem): string {
  const qty = item.quantity.toLocaleString('fa-IR');
  const parts = [`تعداد ${qty} عدد ${item.product_name}`];
  if (item.source) parts.push(`از ${item.source}`);
  if (item.invoice_number) parts.push(`فاکتور ${item.invoice_number}`);
  if (item.weight && item.weight > 0) parts.push(`${item.weight.toLocaleString('fa-IR')} گرم`);
  parts.push(`تحویل ${item.destination} گردید`);
  return parts.join(' — ');
}
