// سرور محلی کارگاه — داده‌ها در یک فایل SQLite روی همین دستگاه ذخیره می‌شوند
import { createServer } from 'node:http';
import { networkInterfaces } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import {
  schema,
  tableNames,
  isTable,
  isColumn,
  createTableSql,
  indexSql,
  toStorage,
  fromStorage,
} from './schema.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.LEDGER_DATA_DIR || path.join(rootDir, 'data');
const dbFile = path.join(dataDir, 'workshop.db');
const distDir = path.join(rootDir, 'dist');
const port = Number(process.env.PORT) || 3000;
const basePath = '/workshop-ledger';

fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(dbFile);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
for (const table of tableNames) {
  db.exec(createTableSql(table));
  for (const sql of indexSql(table)) db.exec(sql);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));

function tableParam(req, res) {
  const { table } = req.params;
  if (!isTable(table)) {
    res.status(404).json({ error: `جدول ${table} وجود ندارد` });
    return null;
  }
  return table;
}

function buildFilter(table, query, res) {
  const { where, equals } = query;
  if (where === undefined) return { clause: '', params: [] };
  if (!isColumn(table, where)) {
    res.status(400).json({ error: `ستون ${where} در جدول ${table} وجود ندارد` });
    return null;
  }
  if (equals === undefined || equals === '') return { clause: ` WHERE ${where} IS NULL`, params: [] };
  return { clause: ` WHERE ${where} = ?`, params: [toStorage(table, where, equals)] };
}

function buildOrder(table, query, res) {
  const { orderBy, desc } = query;
  if (!orderBy) return '';
  if (!isColumn(table, orderBy)) {
    res.status(400).json({ error: `ستون ${orderBy} در جدول ${table} وجود ندارد` });
    return null;
  }
  return ` ORDER BY ${orderBy} ${desc === '1' || desc === 'true' ? 'DESC' : 'ASC'}`;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, database: dbFile, tables: tableNames });
});

app.get('/api/_export', (_req, res) => {
  const payload = {};
  for (const table of tableNames) {
    payload[table] = db.prepare(`SELECT * FROM ${table}`).all().map(row => fromStorage(table, row));
  }
  res.json({ exportedAt: new Date().toISOString(), tables: payload });
});

// وارد کردن داده‌ها (از مرورگر یا فایل پشتیبان). mode=replace کل جدول را جایگزین می‌کند
app.post('/api/_import', (req, res) => {
  const { tables, mode = 'merge' } = req.body ?? {};
  if (!tables || typeof tables !== 'object') {
    res.status(400).json({ error: 'ساختار داده نامعتبر است' });
    return;
  }
  const summary = {};
  try {
    db.transaction(() => {
      for (const table of tableNames) {
        const rows = tables[table];
        if (!Array.isArray(rows)) continue;
        if (mode === 'replace') db.prepare(`DELETE FROM ${table}`).run();
        const existing = new Set(db.prepare(`SELECT id FROM ${table}`).all().map(row => row.id));
        let inserted = 0;
        for (const row of rows) {
          if (row.id !== undefined && existing.has(Number(row.id))) continue;
          insertRow(table, row);
          inserted += 1;
        }
        summary[table] = inserted;
      }
    })();
  } catch (error) {
    res.status(400).json({ error: error.message });
    return;
  }
  res.json({ imported: summary });
});

app.get('/api/:table/count', (req, res) => {
  const table = tableParam(req, res);
  if (!table) return;
  const filter = buildFilter(table, req.query, res);
  if (!filter) return;
  const row = db.prepare(`SELECT COUNT(*) AS total FROM ${table}${filter.clause}`).get(...filter.params);
  res.json({ count: row.total });
});

app.get('/api/:table', (req, res) => {
  const table = tableParam(req, res);
  if (!table) return;
  const filter = buildFilter(table, req.query, res);
  if (!filter) return;
  const order = buildOrder(table, req.query, res);
  if (order === null) return;
  const rows = db.prepare(`SELECT * FROM ${table}${filter.clause}${order}`).all(...filter.params);
  res.json(rows.map(row => fromStorage(table, row)));
});

app.get('/api/:table/:id', (req, res) => {
  const table = tableParam(req, res);
  if (!table) return;
  const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(Number(req.params.id));
  if (!row) {
    res.status(404).json({ error: 'رکورد یافت نشد' });
    return;
  }
  res.json(fromStorage(table, row));
});

function insertRow(table, payload) {
  const columns = Object.keys(schema[table]).filter(column => payload[column] !== undefined);
  const withId = payload.id !== undefined && payload.id !== null;
  const names = withId ? ['id', ...columns] : columns;
  const values = names.map(name => (name === 'id' ? Number(payload.id) : toStorage(table, name, payload[name])));
  const placeholders = names.map(() => '?').join(', ');
  const sql = names.length
    ? `INSERT INTO ${table} (${names.join(', ')}) VALUES (${placeholders})`
    : `INSERT INTO ${table} DEFAULT VALUES`;
  const info = db.prepare(sql).run(...values);
  return withId ? Number(payload.id) : Number(info.lastInsertRowid);
}

app.post('/api/:table', (req, res) => {
  const table = tableParam(req, res);
  if (!table) return;
  try {
    res.status(201).json({ id: insertRow(table, req.body ?? {}) });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.patch('/api/:table/:id', (req, res) => {
  const table = tableParam(req, res);
  if (!table) return;
  const payload = req.body ?? {};
  const columns = Object.keys(schema[table]).filter(column => payload[column] !== undefined);
  if (!columns.length) {
    res.json({ updated: 0 });
    return;
  }
  const assignments = columns.map(column => `${column} = ?`).join(', ');
  const values = columns.map(column => toStorage(table, column, payload[column]));
  const info = db
    .prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`)
    .run(...values, Number(req.params.id));
  res.json({ updated: info.changes });
});

app.delete('/api/:table/:id', (req, res) => {
  const table = tableParam(req, res);
  if (!table) return;
  const info = db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(Number(req.params.id));
  res.json({ deleted: info.changes });
});

if (fs.existsSync(distDir)) {
  app.use(basePath, express.static(distDir));
  app.get(`${basePath}/*splat`, (_req, res) => res.sendFile(path.join(distDir, 'index.html')));
  app.get('/', (_req, res) => res.redirect(`${basePath}/`));
}

function localAddresses() {
  return Object.values(networkInterfaces())
    .flat()
    .filter(item => item && item.family === 'IPv4' && !item.internal)
    .map(item => item.address);
}

createServer(app).listen(port, '0.0.0.0', () => {
  console.log(`فایل دیتابیس: ${dbFile}`);
  console.log(`روی همین دستگاه:  http://localhost:${port}${basePath}/`);
  for (const address of localAddresses()) {
    console.log(`از موبایل داخل همین شبکه: http://${address}:${port}${basePath}/`);
  }
});
