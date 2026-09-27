// تعریف جدول‌ها و ستون‌ها — مرجع مشترک برای ساخت دیتابیس و اعتبارسنجی درخواست‌ها
export const schema = {
  workshops: {
    name: 'TEXT',
    address: 'TEXT',
    phone: 'TEXT',
    unit_type: 'TEXT',
    notes: 'TEXT',
  },
  invoices: {
    invoice_number: 'TEXT',
    workshop_id: 'INTEGER',
    date: 'TEXT',
    description: 'TEXT',
  },
  invoice_items: {
    invoice_id: 'INTEGER',
    line_number: 'INTEGER',
    product_name: 'TEXT',
    quantity_sent: 'REAL',
    weight_sent: 'REAL',
    unit_type: 'TEXT',
    operation: 'TEXT',
    attributes: 'TEXT',
    status: 'TEXT',
    remaining_quantity: 'REAL',
    remaining_weight: 'REAL',
    is_settled: 'BOOLEAN',
    previous_item_id: 'INTEGER',
  },
  return_invoices: {
    return_invoice_number: 'TEXT',
    workshop_id: 'INTEGER',
    return_date: 'TEXT',
    notes: 'TEXT',
  },
  return_invoice_items: {
    return_invoice_id: 'INTEGER',
    original_invoice_item_id: 'INTEGER',
    quantity_returned: 'REAL',
    weight_returned: 'REAL',
    return_status: 'TEXT',
  },
  returns: {
    invoice_item_id: 'INTEGER',
    return_date: 'TEXT',
    quantity_returned: 'REAL',
    weight_returned: 'REAL',
    return_type: 'TEXT',
  },
  ledger_inputs: {
    date: 'TEXT',
    invoice_number: 'TEXT',
    product_name: 'TEXT',
    quantity: 'REAL',
    weight: 'REAL',
    source: 'TEXT',
    notes: 'TEXT',
  },
  ledger_outputs: {
    date: 'TEXT',
    invoice_number: 'TEXT',
    product_name: 'TEXT',
    quantity: 'REAL',
    weight: 'REAL',
    source: 'TEXT',
    destination: 'TEXT',
    notes: 'TEXT',
  },
  contacts: {
    name: 'TEXT',
    aliases: 'TEXT',
    address: 'TEXT',
    phone: 'TEXT',
    notes: 'TEXT',
  },
};

export const tableNames = Object.keys(schema);

export function isTable(name) {
  return Object.prototype.hasOwnProperty.call(schema, name);
}

export function isColumn(table, column) {
  return column === 'id' || Object.prototype.hasOwnProperty.call(schema[table], column);
}

export function createTableSql(table) {
  const columns = Object.entries(schema[table])
    .map(([name, type]) => `  ${name} ${type === 'BOOLEAN' ? 'INTEGER' : type}`)
    .join(',\n');
  return `CREATE TABLE IF NOT EXISTS ${table} (\n  id INTEGER PRIMARY KEY AUTOINCREMENT,\n${columns}\n)`;
}

export function indexSql(table) {
  return Object.keys(schema[table]).map(
    column => `CREATE INDEX IF NOT EXISTS idx_${table}_${column} ON ${table} (${column})`
  );
}

// SQLite فقط عدد، متن، NULL و BLOB می‌پذیرد
export function toStorage(table, column, value) {
  if (value === undefined || value === null) return null;
  const type = schema[table][column];
  if (type === 'BOOLEAN') return value ? 1 : 0;
  if (type === 'INTEGER' || type === 'REAL') {
    const num = Number(value);
    return Number.isFinite(num) ? num : null;
  }
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function fromStorage(table, row) {
  if (!row) return row;
  const result = { id: row.id };
  for (const [column, type] of Object.entries(schema[table])) {
    const value = row[column];
    if (value === null || value === undefined) continue;
    result[column] = type === 'BOOLEAN' ? Boolean(value) : value;
  }
  return result;
}
