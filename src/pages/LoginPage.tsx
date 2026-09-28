import React, { useState } from 'react';
import { Crown, Lock, LogIn, MapPin, Phone, ShieldCheck, UserCheck } from 'lucide-react';
import { usePos } from '../context/PosContext.tsx';
import { PWAInstallButton } from '../components/ReceiptPrinterModal.tsx';

const QUICK_ACCOUNTS = [
  { label: 'المدير العام (ADMIN)', username: 'admin', pass: 'admin123', desc: 'كامل الصلاحيات والإعدادات' },
  { label: 'مدير المطعم (MANAGER)', username: 'manager', pass: '123456', desc: 'المبيعات والتقارير والمخزون والقائمة' },
  { label: 'الكاشير (CASHIER)', username: 'cashier', pass: '123456', desc: 'نقطة البيع والدفع والصندوق والطباعة' },
  { label: 'النادل (WAITER)', username: 'waiter', pass: '123456', desc: 'الطاولات وإنشاء الطلبات للمطبخ' },
  { label: 'شاشة المطبخ (KITCHEN)', username: 'kitchen', pass: '123456', desc: 'شاشة KDS ومحطات التحضير' },
  { label: 'أمين المخزن (INVENTORY)', username: 'inventory', pass: '123456', desc: 'المخزون والمشتريات والجرد والهدر' },
];

export const LoginPage: React.FC = () => {
  const { login, loginWithGoogle, settings } = usePos();
  const [identifier, setIdentifier] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(identifier, password, rememberMe);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickLogin = async (u: string, p: string) => {
    setIdentifier(u);
    setPassword(p);
    setError(null);
    setSubmitting(true);
    try {
      await login(u, p, rememberMe);
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setError(err.message || 'تعذر تسجيل الدخول بواسطة Google');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#0B0B0E] text-[#F5F5F7] flex flex-col justify-between">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#111116]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
            <Crown className="w-5 h-5 text-[#D4AF37]" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#F3E5AB]">
            GOLDEN PALACE POS
          </span>
        </div>

        <div className="hidden md:flex items-center gap-4 text-xs text-neutral-400">
          <span>{settings.restaurantName}</span>
          <span aria-hidden="true">·</span>
          <span>{settings.brandTitle}</span>
          <span aria-hidden="true">·</span>
          <span>{settings.address}</span>
        </div>

        <div className="flex items-center gap-3">
          <PWAInstallButton />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Right Column: Brand & Quick Staff Role Access */}
          <div className="lg:col-span-7 rounded-xl bg-[#141419] border border-white/10 p-8 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#D4AF37] tracking-wide">
                نظام نقاط البيع والإدارة المتكامل
              </p>
              <h1 className="text-3xl font-extrabold text-white mt-2">
                مطعم {settings.restaurantName} — {settings.brandTitle}
              </h1>
              <p className="text-sm text-neutral-400 mt-2 leading-relaxed">
                منظومة تشغيلية متكاملة للكاشير، إدارة الطاولات، شاشة المطبخ الفورية (KDS)، المخزون والوصفات الدقيقة، الصندوق، والتقارير المالية مع دعم العمل دون اتصال بالإنترنت (Offline PWA).
              </p>

              <div className="mt-5 pt-5 border-t border-white/10 flex flex-wrap items-center gap-5 text-xs text-neutral-300">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>{settings.address} ({settings.landmark})</span>
                </div>
                <div className="flex items-center gap-2 font-mono" dir="ltr">
                  <Phone className="w-4 h-4 text-[#D4AF37]" />
                  <span>{settings.phone}</span>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-neutral-300 flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span>الدخول السريع حسب الدور الوظيفي (RBAC):</span>
                </h2>
                <span className="text-[11px] text-neutral-500">اضغط للدخول الفوري</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.username}
                    type="button"
                    disabled={submitting}
                    onClick={() => handleQuickLogin(acc.username, acc.pass)}
                    className="text-right p-3 rounded-lg bg-[#1C1C24] border border-white/10 hover:border-[#D4AF37]/60 hover:bg-[#22222C] transition-colors group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-[#F3E5AB]">
                        {acc.label}
                      </span>
                      <span className="text-[11px] font-mono text-[#D4AF37]">{acc.username}</span>
                    </div>
                    <p className="text-[11px] text-neutral-400 mt-1">{acc.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Left Column: Login Form */}
          <div className="lg:col-span-5 rounded-xl bg-[#141419] border border-[#D4AF37]/30 p-8 flex flex-col justify-center">
            <div className="flex items-center gap-2.5 mb-6">
              <ShieldCheck className="w-6 h-6 text-[#D4AF37]" />
              <div>
                <h2 className="text-xl font-bold text-white">تسجيل الدخول للنظام</h2>
                <p className="text-xs text-neutral-400">أدخل بيانات الموظف أو حساب الإدارة</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/30 p-3 text-xs text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  اسم المستخدم أو البريد الإلكتروني
                </label>
                <input
                  type="text"
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="admin أو البريد الإلكتروني"
                  className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-300 mb-1.5">
                  كلمة المرور
                </label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-3.5 py-2.5 text-sm text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-3 top-3" />
                </div>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-white/20 bg-[#0B0B0E] text-[#D4AF37] focus:ring-0"
                  />
                  <span>تذكر الجلسة على هذا الجهاز</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] py-3 text-sm font-bold text-black hover:bg-[#e5c247] transition-colors disabled:opacity-50"
              >
                <LogIn className="w-4 h-4" />
                <span>{submitting ? 'جاري التحقق...' : 'دخول إلى النظام'}</span>
              </button>
            </form>

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-white/10" />
              <span className="text-[11px] text-neutral-500">أو المصادقة السحابية</span>
              <div className="h-px flex-1 bg-white/10" />
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-white/5 border border-white/15 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.4 1 3.5 3.6 1.6 7.4l3.7 2.8C6.2 7.2 8.9 5 12 5z"
                />
                <path
                  fill="#4285F4"
                  d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.6l3.7 2.9c2.2-2 3.7-5 3.7-8.7z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.3 14.8c-.2-.8-.4-1.6-.4-2.5s.2-1.7.4-2.5L1.6 7C.6 9 0 11.2 0 13.5s.6 4.5 1.6 6.5l3.7-2.9z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3.1 0-5.8-2.1-6.7-5L1.6 17c1.9 3.9 5.8 7 10.4 7z"
                />
              </svg>
              <span>الدخول بحساب Google للمدير</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-3 border-t border-white/10 text-center text-xs text-neutral-500">
        {settings.restaurantName} • {settings.brandTitle} • {settings.address} • هاتف: {settings.phone}
      </footer>
    </div>
  );
};
