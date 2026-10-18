import { useEffect, useState, type FormEvent, type PropsWithChildren } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { WarehouseRoleProvider, type WarehouseRole } from './WarehouseAccessContext';

export default function WarehouseAuthGate({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [signingUp, setSigningUp] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [role, setRole] = useState<WarehouseRole>('owner');
  const [checkingRole, setCheckingRole] = useState(false);
  const [roleError, setRoleError] = useState('');

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let active = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setSession(data.session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!supabase || !session) {
      setRole('owner');
      setCheckingRole(false);
      setRoleError('');
      return;
    }

    let active = true;
    setCheckingRole(true);
    setRoleError('');
    void supabase.from('workshop_warehouse_access')
      .select('owner_id')
      .eq('viewer_id', session.user.id)
      .limit(1)
      .then(({ data, error }) => {
        if (!active) return;
        if (error) {
          setRoleError('بررسی سطح دسترسی انبار انجام نشد. مطمئن شو migration دسترسی فقط‌خواندنی را در Supabase اجرا کرده‌ای.');
          return;
        }
        setRole(data?.length ? 'viewer' : 'owner');
      })
      .then(() => {
        if (active) setCheckingRole(false);
      });

    return () => { active = false; };
  }, [session?.user.id]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!supabase) return;

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get('email') ?? '').trim();
    const password = String(formData.get('password') ?? '');
    setBusy(true);
    setMessage('');

    const result = signingUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });

    if (result.error) {
      setMessage(result.error.message);
    } else if (signingUp && !result.data.session) {
      setMessage('حساب ساخته شد. ایمیلت را برای تأیید حساب بررسی کن.');
    }
    setBusy(false);
  };

  if (!supabase) {
    return <section className="mx-auto max-w-lg p-6 text-right" dir="rtl">
      <h1 className="text-xl font-bold">اتصال Supabase تنظیم نشده</h1>
      <p className="mt-3 text-sm">مقادیر VITE_SUPABASE_URL و VITE_SUPABASE_ANON_KEY را در فایل .env.local وارد و برنامه را دوباره اجرا کن.</p>
    </section>;
  }

  if (loading) return <p className="p-6 text-center" dir="rtl">در حال بررسی ورود...</p>;

  if (session) {
    if (checkingRole) return <p className="p-6 text-center" dir="rtl">در حال بررسی سطح دسترسی...</p>;
    if (roleError) return <p role="alert" className="m-6 rounded border border-red-300 p-4 text-right text-red-800" dir="rtl">{roleError}</p>;

    return <WarehouseRoleProvider role={role}><div dir="rtl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2 text-sm">
        <span>{session.user.email}{role === 'viewer' && <span className="mr-2 text-slate-500">(فقط مشاهده)</span>}</span>
        <button type="button" className="text-emerald-800 underline" onClick={() => { if (supabase) void supabase.auth.signOut(); }}>خروج</button>
      </div>
      {children}
    </div></WarehouseRoleProvider>;
  }

  return <section className="mx-auto max-w-md p-6 text-right" dir="rtl">
    <h1 className="text-xl font-bold">ورود به انبار</h1>
    <form className="mt-5 space-y-4" onSubmit={event => void handleSubmit(event)}>
      <label className="block text-sm font-medium">
        ایمیل
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" type="email" name="email" autoComplete="email" required />
      </label>
      <label className="block text-sm font-medium">
        گذرواژه
        <input className="mt-1 w-full rounded border border-slate-300 px-3 py-2" type="password" name="password" autoComplete={signingUp ? 'new-password' : 'current-password'} minLength={8} required />
      </label>
      {message && <p role="status" className="text-sm text-amber-800">{message}</p>}
      <button className="w-full rounded bg-emerald-800 px-4 py-2 font-bold text-white disabled:opacity-60" type="submit" disabled={busy}>
        {busy ? 'لطفاً صبر کن...' : signingUp ? 'ساخت حساب' : 'ورود'}
      </button>
    </form>
    <button className="mt-4 text-sm text-emerald-800 underline" type="button" onClick={() => { setSigningUp(value => !value); setMessage(''); }}>
      {signingUp ? 'حساب داری؟ وارد شو' : 'حساب نداری؟ ثبت‌نام کن'}
    </button>
  </section>;
}