import React, { useEffect, useRef, useState } from 'react';
import {
  exportFromServer,
  importToServer,
  serverIsReachable,
  type BackupPayload,
} from '../db/apiClient';
import { countRows, legacyDatabaseExists, readLegacyData } from '../db/legacyBrowserDb';

const DataTransfer: React.FC = () => {
  const [online, setOnline] = useState<boolean | null>(null);
  const [hasLegacy, setHasLegacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    serverIsReachable().then(setOnline);
    legacyDatabaseExists().then(setHasLegacy).catch(() => setHasLegacy(false));
  }, []);

  const run = async (action: () => Promise<string>) => {
    setBusy(true);
    setMessage('');
    setError('');
    try {
      setMessage(await action());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'خطای ناشناخته');
    } finally {
      setBusy(false);
    }
  };

  const migrateFromBrowser = () =>
    run(async () => {
      const payload = await readLegacyData();
      const total = countRows(payload);
      if (!total) return 'داده‌ای در مرورگر این دستگاه پیدا نشد.';
      const result = await importToServer(payload);
      const moved = Object.values(result.imported).reduce((sum, value) => sum + value, 0);
      return `${moved} رکورد از مرورگر این دستگاه به سرور کارگاه منتقل شد.`;
    });

  const downloadBackup = () =>
    run(async () => {
      const data = await exportFromServer();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `workshop-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      return 'فایل پشتیبان دانلود شد.';
    });

  const restoreBackup = (file: File) =>
    run(async () => {
      const parsed = JSON.parse(await file.text()) as { tables?: BackupPayload } & BackupPayload;
      const tables = parsed.tables ?? parsed;
      const result = await importToServer(tables);
      const restored = Object.values(result.imported).reduce((sum, value) => sum + value, 0);
      return `${restored} رکورد از فایل پشتیبان بازیابی شد.`;
    });

  return (
    <div className="container mx-auto max-w-3xl p-4" dir="rtl">
      <h1 className="text-2xl font-bold mb-4">داده‌ها و پشتیبان‌گیری</h1>

      <div className={`p-3 rounded mb-6 ${online ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}>
        {online === null
          ? 'در حال بررسی اتصال به سرور کارگاه...'
          : online
            ? 'به سرور کارگاه وصل هستید؛ داده‌ها روی همان لپ‌تاپ ذخیره می‌شوند و بین همه دستگاه‌های شبکه مشترک‌اند.'
            : 'به سرور کارگاه وصل نیستید. مطمئن شوید لپ‌تاپ کارگاه روشن است و به همان Wi‑Fi وصل هستید.'}
      </div>

      {hasLegacy && (
        <section className="bg-white p-4 rounded shadow mb-4">
          <h2 className="font-bold mb-2">انتقال داده‌های قدیمی این مرورگر</h2>
          <p className="text-sm text-gray-600 mb-3">
            داده‌هایی که قبلاً فقط داخل همین مرورگر ذخیره شده بودند را به سرور کارگاه منتقل می‌کند. رکوردهای تکراری دوباره اضافه نمی‌شوند.
          </p>
          <button
            onClick={migrateFromBrowser}
            disabled={busy || !online}
            className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
          >
            انتقال به سرور کارگاه
          </button>
        </section>
      )}

      <section className="bg-white p-4 rounded shadow mb-4">
        <h2 className="font-bold mb-2">پشتیبان‌گیری</h2>
        <p className="text-sm text-gray-600 mb-3">یک فایل JSON از کل داده‌های سرور می‌گیرد؛ آن را روی فلش یا هارد دیگر نگه دارید.</p>
        <button
          onClick={downloadBackup}
          disabled={busy || !online}
          className="bg-slate-700 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          دانلود فایل پشتیبان
        </button>
      </section>

      <section className="bg-white p-4 rounded shadow">
        <h2 className="font-bold mb-2">بازیابی از فایل پشتیبان</h2>
        <input
          ref={fileInput}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file) restoreBackup(file);
          }}
        />
        <button
          onClick={() => fileInput.current?.click()}
          disabled={busy || !online}
          className="bg-amber-600 text-white px-4 py-2 rounded disabled:bg-gray-400"
        >
          انتخاب فایل و بازیابی
        </button>
      </section>

      {busy && <p className="mt-4">در حال انجام...</p>}
      {message && <p className="mt-4 text-green-700 font-bold">{message}</p>}
      {error && <p className="mt-4 text-red-700 font-bold">{error}</p>}
    </div>
  );
};

export default DataTransfer;
