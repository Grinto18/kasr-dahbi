import React, { useMemo, useState } from 'react';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BarChart3,
  CloudUpload,
  Database,
  DollarSign,
  Download,
  FileSpreadsheet,
  Lock,
  Plus,
  Printer,
  RefreshCw,
  Receipt,
  Save,
  Settings,
  ShieldCheck,
  Unlock,
  Upload,
  UserCheck,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.tsx';
import { ExpenseCategory, RoleCode, User } from '../db/types.ts';
import { syncSnapshotToFirestore } from '../lib/firebase.ts';

const EXPENSE_CATEGORIES_AR: Record<ExpenseCategory, string> = {
  Electricity: 'كهرباء (Electricity)',
  Gas: 'غاز (Gas)',
  Rent: 'إيجار المحل (Rent)',
  Transport: 'نقل وتوصيل (Transport)',
  Maintenance: 'صيانة وإصلاحات (Maintenance)',
  Supplies: 'مستلزمات وتغليف (Supplies)',
  Salaries: 'رواتب وأجور (Salaries)',
  Other: 'مصاريف أخرى (Other)',
};

const ROLE_LABELS_AR: Record<RoleCode, string> = {
  ADMIN: 'مدير النظام (ADMIN)',
  MANAGER: 'مدير المطعم (MANAGER)',
  CASHIER: 'أمين صندوق (CASHIER)',
  WAITER: 'نادل صالة (WAITER)',
  KITCHEN: 'طاهي / مطبخ (KITCHEN)',
  INVENTORY: 'أمين مخزن (INVENTORY)',
};

// ============================================================================
// 1. CASH REGISTER & SHIFT MANAGEMENT VIEW
// ============================================================================

export const CashRegisterView: React.FC = () => {
  const { cashShifts, cashTransactions, apiRequest, refreshAll, addNotification } = usePos();

  const activeShift = useMemo(() => cashShifts.find((s) => s.status === 'OPEN') || null, [cashShifts]);

  const [openingBalanceInput, setOpeningBalanceInput] = useState(15000);
  const [openNotes, setOpenNotes] = useState('وردية صباحية — القصر الذهبي');

  const [movementType, setMovementType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_IN');
  const [movementAmount, setMovementAmount] = useState(2000);
  const [movementReason, setMovementReason] = useState('');

  const [actualCashInput, setActualCashInput] = useState<number>(activeShift?.expectedCash || 0);
  const [closeNotes, setCloseNotes] = useState('إغلاق وردية ومطابقة الصندوق');
  const [showCloseModal, setShowCloseModal] = useState(false);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/cash-register/open', {
        method: 'POST',
        body: JSON.stringify({ openingBalance: Number(openingBalanceInput), notes: openNotes }),
      });
      await refreshAll();
      addNotification('INFO', 'فتح الصندوق', 'تم فتح وردية الصندوق بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleAddMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!movementReason.trim() || movementAmount <= 0) return;
    try {
      await apiRequest('/api/cash-register/movement', {
        method: 'POST',
        body: JSON.stringify({
          type: movementType,
          amount: Number(movementAmount),
          reason: movementReason.trim(),
        }),
      });
      await refreshAll();
      setMovementReason('');
      addNotification('INFO', 'حركة نقدية', 'تم تسجيل الحركة في الصندوق وتحديث الرصيد المتوقع');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/cash-register/close', {
        method: 'POST',
        body: JSON.stringify({ actualCash: Number(actualCashInput), notes: closeNotes }),
      });
      await refreshAll();
      setShowCloseModal(false);
      addNotification('INFO', 'إغلاق الصندوق', 'تم إغلاق الوردية وحفظ تقرير الجرد النقدي');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Wallet className="w-6 h-6 text-[#D4AF37]" />
            <span>إدارة الصندوق والورديات النقدية (Cash Register & Shifts)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            معادلة الصندوق الدقيقة: الرصيد المتوقع = الرصيد الافتتاحي + المبيعات النقدية + الإيداعات − المصاريف − المرتجعات − المسحوبات
          </p>
        </div>

        {activeShift && (
          <button
            type="button"
            onClick={() => {
              setActualCashInput(activeShift.expectedCash);
              setShowCloseModal(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-extrabold text-xs flex items-center gap-2"
          >
            <Lock className="w-4 h-4" />
            <span>إغلاق الوردية وجرد الصندوق</span>
          </button>
        )}
      </div>

      {/* Active Shift Card or Open Shift Form */}
      {activeShift ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 rounded-2xl bg-[#141419] border border-[#D4AF37]/30 p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                  وردية مفتوحة نشطة
                </span>
                <h2 className="text-base font-bold text-white mt-1.5">
                  المسؤول: {activeShift.openedByName}
                </h2>
              </div>
              <div className="text-left text-xs text-neutral-400 tabular-nums">
                بدأت: {new Date(activeShift.openedAt).toLocaleString('ar-DZ')}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/5">
                <div className="text-[11px] text-neutral-400">الرصيد الافتتاحي</div>
                <div className="text-base font-bold text-white mt-1 tabular-nums">
                  {activeShift.openingBalance.toLocaleString('en-US')} د.ج
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25">
                <div className="text-[11px] text-emerald-300">المبيعات النقدية (Cash)</div>
                <div className="text-base font-bold text-emerald-300 mt-1 tabular-nums">
                  +{activeShift.cashSales.toLocaleString('en-US')} د.ج
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-sky-500/10 border border-sky-500/25">
                <div className="text-[11px] text-sky-300">مبيعات البطاقة و BaridiMob</div>
                <div className="text-base font-bold text-sky-300 mt-1 tabular-nums">
                  {(activeShift.cardSales + activeShift.ccpSales + activeShift.baridimobSales).toLocaleString('en-US')} د.ج
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/25">
                <div className="text-[11px] text-red-300">المصاريف والمرتجعات</div>
                <div className="text-base font-bold text-red-300 mt-1 tabular-nums">
                  -{(activeShift.expensesTotal + activeShift.refundsTotal).toLocaleString('en-US')} د.ج
                </div>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-l from-[#D4AF37]/20 via-[#D4AF37]/10 to-transparent border border-[#D4AF37]/40 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-[#F3E5AB]">النقد المتوقع في الدرج الآن (Expected Cash)</div>
                <div className="text-[11px] text-neutral-300 mt-0.5">
                  شامل الإيداعات (+{activeShift.cashInTotal} د.ج) والمسحوبات (-{activeShift.cashOutTotal} د.ج)
                </div>
              </div>
              <div className="text-2xl font-extrabold text-[#D4AF37] tabular-nums">
                {activeShift.expectedCash.toLocaleString('en-US')} د.ج
              </div>
            </div>
          </div>

          {/* Cash In / Cash Out Form */}
          <form
            onSubmit={handleAddMovement}
            className="rounded-2xl bg-[#141419] border border-white/10 p-5 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-white/10 pb-2.5">
                إيداع أو سحب نقدي (Cash In / Out)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMovementType('CASH_IN')}
                  className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    movementType === 'CASH_IN'
                      ? 'bg-emerald-500 text-black border-emerald-500'
                      : 'bg-black/40 text-neutral-300 border-white/10'
                  }`}
                >
                  <ArrowDownCircle className="w-4 h-4" />
                  <span>إيداع نقدي (+)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType('CASH_OUT')}
                  className={`py-2.5 rounded-xl text-xs font-bold border flex items-center justify-center gap-1.5 ${
                    movementType === 'CASH_OUT'
                      ? 'bg-amber-500 text-black border-amber-500'
                      : 'bg-black/40 text-neutral-300 border-white/10'
                  }`}
                >
                  <ArrowUpCircle className="w-4 h-4" />
                  <span>سحب نقدي (-)</span>
                </button>
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">المبلغ (د.ج)</label>
                <input
                  type="number"
                  min={1}
                  required
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(Number(e.target.value))}
                  className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-sm font-bold text-white tabular-nums"
                />
              </div>

              <div>
                <label className="text-xs text-neutral-400 block mb-1">البيان / السبب *</label>
                <input
                  type="text"
                  required
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="مثال: تغذية فكة نقدية للصندوق"
                  className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2.5 text-xs text-white"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs"
            >
              تسجيل الحركة في الصندوق
            </button>
          </form>
        </div>
      ) : (
        <form
          onSubmit={handleOpenShift}
          className="max-w-lg mx-auto rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-4"
        >
          <div className="flex items-center gap-2.5 text-[#D4AF37]">
            <Unlock className="w-6 h-6" />
            <h2 className="text-lg font-bold text-white">فتح وردية صندوق جديدة</h2>
          </div>
          <p className="text-xs text-neutral-400">
            الصندوق مغلق حاليًا. أدخل الرصيد الافتتاحي (الفكة النقدية) لبدء الوردية الجديدة.
          </p>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">الرصيد الافتتاحي (د.ج)</label>
            <input
              type="number"
              min={0}
              required
              value={openingBalanceInput}
              onChange={(e) => setOpeningBalanceInput(Number(e.target.value))}
              className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-sm font-bold text-white tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs text-neutral-400 block mb-1">ملاحظات الافتتاح</label>
            <input
              type="text"
              value={openNotes}
              onChange={(e) => setOpenNotes(e.target.value)}
              className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs"
          >
            فتح الصندوق وبدء الوردية
          </button>
        </form>
      )}

      {/* Cash Transactions Table */}
      <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">سجل حركات الصندوق التفصيلي</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">النوع</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">البيان</th>
                <th className="py-3 px-4">بواسطة</th>
                <th className="py-3 px-4">التوقيت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {cashTransactions.slice(0, 40).map((tx) => (
                <tr key={tx.id}>
                  <td className="py-3 px-4 font-mono font-bold text-[#F3E5AB]">{tx.type}</td>
                  <td
                    className={`py-3 px-4 font-bold tabular-nums ${
                      ['EXPENSE', 'REFUND', 'CASH_OUT'].includes(tx.type)
                        ? 'text-red-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {tx.amount.toLocaleString('en-US')} د.ج
                  </td>
                  <td className="py-3 px-4 text-neutral-200">{tx.reason}</td>
                  <td className="py-3 px-4 text-neutral-400">{tx.createdByName}</td>
                  <td className="py-3 px-4 text-neutral-400 tabular-nums">
                    {new Date(tx.createdAt).toLocaleString('ar-DZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Close Shift Modal */}
      {showCloseModal && activeShift && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleCloseShift}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-red-500/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">إغلاق الوردية ومطابقة النقد الفعلي</h3>
            <div className="p-3.5 rounded-xl bg-black/50 border border-white/10 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-400">النقد المتوقع في النظام:</span>
                <strong className="text-[#D4AF37] tabular-nums">
                  {activeShift.expectedCash.toLocaleString('en-US')} د.ج
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">الفرق (عجز / فائض):</span>
                <strong
                  className={`tabular-nums ${
                    actualCashInput - activeShift.expectedCash < 0
                      ? 'text-red-400'
                      : actualCashInput - activeShift.expectedCash > 0
                      ? 'text-emerald-400'
                      : 'text-white'
                  }`}
                >
                  {(actualCashInput - activeShift.expectedCash).toLocaleString('en-US')} د.ج
                </strong>
              </div>
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">النقد الفعلي الموجود في الدرج (د.ج) *</label>
              <input
                type="number"
                required
                value={actualCashInput}
                onChange={(e) => setActualCashInput(Number(e.target.value))}
                className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-sm font-bold text-white tabular-nums"
              />
            </div>

            <div>
              <label className="text-xs text-neutral-400 block mb-1">ملاحظات الإغلاق</label>
              <input
                type="text"
                value={closeNotes}
                onChange={(e) => setCloseNotes(e.target.value)}
                className="w-full rounded-xl bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCloseModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-red-500 text-white font-bold text-xs"
              >
                تأكيد إغلاق الوردية
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. CUSTOMERS & EXPENSES VIEW
// ============================================================================

export const CustomersExpensesView: React.FC = () => {
  const { customers, expenses, apiRequest, refreshAll, addNotification } = usePos();

  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');

  const [expCategory, setExpCategory] = useState<ExpenseCategory>('Supplies');
  const [expAmount, setExpAmount] = useState(2500);
  const [expDesc, setExpDesc] = useState('');
  const [expFromCash, setExpFromCash] = useState(true);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return;
    try {
      await apiRequest('/api/customers', {
        method: 'POST',
        body: JSON.stringify({
          name: custName.trim(),
          phone: custPhone.trim(),
          address: custAddress.trim(),
        }),
      });
      await refreshAll();
      setCustName('');
      setCustPhone('');
      setCustAddress('');
      addNotification('INFO', 'إضافة عميل', 'تم حفظ بيانات العميل بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expDesc.trim() || expAmount <= 0) return;
    try {
      await apiRequest('/api/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: expCategory,
          amount: Number(expAmount),
          description: expDesc.trim(),
          paidFromCashRegister: expFromCash,
        }),
      });
      await refreshAll();
      setExpDesc('');
      addNotification('INFO', 'تسجيل مصروف', 'تم تسجيل المصروف وتحديث الصندوق والتقارير');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Customers Section */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#141419] border border-white/10 p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-[#D4AF37]" />
            <span>قاعدة بيانات العملاء والتوصيل ({customers.length})</span>
          </h2>
          <form onSubmit={handleAddCustomer} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              required
              placeholder="اسم العميل *"
              value={custName}
              onChange={(e) => setCustName(e.target.value)}
              className="rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
            />
            <input
              type="text"
              required
              placeholder="رقم الهاتف *"
              value={custPhone}
              onChange={(e) => setCustPhone(e.target.value)}
              className="rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
            />
            <div className="flex gap-1.5">
              <input
                type="text"
                placeholder="العنوان (حسين داي...)"
                value={custAddress}
                onChange={(e) => setCustAddress(e.target.value)}
                className="flex-1 rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs shrink-0"
              >
                إضافة
              </button>
            </div>
          </form>

          <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
            {customers.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{c.name}</div>
                  <div className="text-neutral-400 tabular-nums">
                    {c.phone} • {c.address || 'بدون عنوان مسجل'}
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-[#D4AF37] tabular-nums">
                    {c.totalSpent.toLocaleString('en-US')} د.ج
                  </div>
                  <div className="text-[11px] text-neutral-400 tabular-nums">{c.totalOrders} طلبات</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Expenses Section */}
      <div className="space-y-4">
        <div className="rounded-2xl bg-[#141419] border border-white/10 p-5 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#D4AF37]" />
            <span>المصاريف التشغيلية اليومية ({expenses.length})</span>
          </h2>

          <form onSubmit={handleAddExpense} className="space-y-3 bg-black/40 p-3.5 rounded-xl border border-white/5">
            <div className="grid grid-cols-2 gap-2.5">
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                className="rounded-lg bg-[#141419] border border-white/15 px-3 py-2 text-xs text-white"
              >
                {Object.entries(EXPENSE_CATEGORIES_AR).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                required
                value={expAmount}
                onChange={(e) => setExpAmount(Number(e.target.value))}
                placeholder="المبلغ (د.ج)"
                className="rounded-lg bg-[#141419] border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
              />
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                placeholder="وصف المصروف (مثال: شراء فحم طبيعي للمشاوي)"
                className="flex-1 rounded-lg bg-[#141419] border border-white/15 px-3 py-2 text-xs text-white"
              />
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs shrink-0"
              >
                تسجيل المصروف
              </button>
            </div>

            <label className="flex items-center gap-2 text-xs text-neutral-300 cursor-pointer">
              <input
                type="checkbox"
                checked={expFromCash}
                onChange={(e) => setExpFromCash(e.target.checked)}
                className="rounded accent-[#D4AF37]"
              />
              <span>خصم المبلغ مباشرة من درج الصندوق المفتوح حاليًا</span>
            </label>
          </form>

          <div className="divide-y divide-white/5 max-h-[360px] overflow-y-auto">
            {expenses.map((exp) => (
              <div key={exp.id} className="py-3 flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-white">{exp.description}</div>
                  <div className="text-neutral-400">
                    {exp.categoryNameAr} • {exp.expenseDate}
                  </div>
                </div>
                <div className="text-left">
                  <div className="font-bold text-red-400 tabular-nums">
                    -{exp.amount.toLocaleString('en-US')} د.ج
                  </div>
                  <div className="text-[10px] text-neutral-500">
                    {exp.paidFromCashRegister ? 'من الصندوق' : 'خارج الصندوق'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 3. REPORTS & FINANCIAL ANALYTICS VIEW
// ============================================================================

export const ReportsAnalyticsView: React.FC = () => {
  const { orders, expenses, wasteRecords, payments } = usePos();

  const [fromDate, setFromDate] = useState('2025-01-01');
  const [toDate, setToDate] = useState('2027-12-31');

  const analytics = useMemo(() => {
    const validOrders = orders.filter((o) => {
      const d = o.createdAt.slice(0, 10);
      return o.status !== 'CANCELLED' && o.status !== 'HELD' && d >= fromDate && d <= toDate;
    });

    const filteredExpenses = expenses.filter((e) => e.expenseDate >= fromDate && e.expenseDate <= toDate);
    const filteredWaste = wasteRecords.filter((w: any) => {
      const d = w.reportedAt.slice(0, 10);
      return d >= fromDate && d <= toDate;
    });

    const totalSales = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalCogs = validOrders.reduce(
      (s, o) => s + o.items.reduce((is, i) => is + i.unitCost * i.quantity, 0),
      0
    );
    const totalExp = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalWaste = filteredWaste.reduce((s: number, w: any) => s + w.totalCost, 0);
    const netProfit = totalSales - totalCogs - totalExp - totalWaste;

    const byPayment: Record<string, number> = { CASH: 0, CARD: 0, CCP: 0, BARIDIMOB: 0, OTHER: 0 };
    for (const p of payments) {
      const d = p.createdAt.slice(0, 10);
      if (p.status === 'COMPLETED' && d >= fromDate && d <= toDate) {
        for (const a of p.allocations) {
          const net = a.method === 'CASH' ? Math.max(0, a.amount - p.changeGiven) : a.amount;
          byPayment[a.method] = (byPayment[a.method] || 0) + net;
        }
      }
    }

    const productMap = new Map<
      string,
      { nameAr: string; qty: number; revenue: number; cost: number; profit: number }
    >();
    for (const o of validOrders) {
      for (const item of o.items) {
        const cur = productMap.get(item.productId) || {
          nameAr: item.productNameAr,
          qty: 0,
          revenue: 0,
          cost: 0,
          profit: 0,
        };
        cur.qty += item.quantity;
        cur.revenue += item.subtotal;
        cur.cost += item.unitCost * item.quantity;
        cur.profit += item.subtotal - item.unitCost * item.quantity;
        productMap.set(item.productId, cur);
      }
    }

    return {
      totalSales,
      ordersCount: validOrders.length,
      avgOrder: validOrders.length ? Math.round(totalSales / validOrders.length) : 0,
      totalCogs,
      totalExp,
      totalWaste,
      netProfit,
      byPayment,
      topProducts: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue),
    };
  }, [orders, expenses, wasteRecords, payments, fromDate, toDate]);

  const handleExportCsv = () => {
    const rows = [
      ['المنتج', 'الكمية المباعة', 'الإيرادات (د.ج)', 'التكلفة (د.ج)', 'صافي الربح (د.ج)'],
      ...analytics.topProducts.map((p) => [
        p.nameAr,
        String(p.qty),
        String(p.revenue),
        String(p.cost),
        String(p.profit),
      ]),
    ];
    const csvContent = '\uFEFF' + rows.map((r) => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `golden_palace_report_${fromDate}_${toDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-[#D4AF37]" />
            <span>التقارير المالية وتحليل الأرباح (Financial Reports & Profit Analysis)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            تقارير المبيعات، تكلفة البضاعة المباعة (COGS)، المصاريف، الهدر، وصافي الربح التقديري
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
          />
          <span className="text-xs text-neutral-400">إلى</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
          />
          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3.5 py-2 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>تصدير CSV / Excel</span>
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة التقرير</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="p-4 rounded-2xl bg-[#141419] border border-white/10">
          <div className="text-xs text-neutral-400">إجمالي المبيعات</div>
          <div className="text-xl font-extrabold text-white mt-1 tabular-nums">
            {analytics.totalSales.toLocaleString('en-US')} د.ج
          </div>
          <div className="text-[11px] text-[#D4AF37] mt-1 tabular-nums">
            {analytics.ordersCount} فاتورة (المتوسط: {analytics.avgOrder} د.ج)
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-white/10">
          <div className="text-xs text-neutral-400">تكلفة المكونات (COGS)</div>
          <div className="text-xl font-extrabold text-amber-300 mt-1 tabular-nums">
            {analytics.totalCogs.toLocaleString('en-US')} د.ج
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-white/10">
          <div className="text-xs text-neutral-400">المصاريف التشغيلية</div>
          <div className="text-xl font-extrabold text-red-300 mt-1 tabular-nums">
            {analytics.totalExp.toLocaleString('en-US')} د.ج
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#141419] border border-white/10">
          <div className="text-xs text-neutral-400">تكلفة الهدر والتوالف</div>
          <div className="text-xl font-extrabold text-red-400 mt-1 tabular-nums">
            {analytics.totalWaste.toLocaleString('en-US')} د.ج
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 to-[#141419] border border-[#D4AF37]/40">
          <div className="text-xs font-bold text-[#F3E5AB]">صافي الربح التقديري</div>
          <div className="text-xl font-extrabold text-emerald-400 mt-1 tabular-nums">
            {analytics.netProfit.toLocaleString('en-US')} د.ج
          </div>
        </div>
      </div>

      {/* Payment Methods Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {Object.entries(analytics.byPayment).map(([method, amount]) => (
          <div key={method} className="p-3.5 rounded-xl bg-[#141419] border border-white/10">
            <div className="text-xs text-neutral-400 font-mono">{method}</div>
            <div className="text-sm font-bold text-white mt-1 tabular-nums">
              {amount.toLocaleString('en-US')} د.ج
            </div>
          </div>
        ))}
      </div>

      {/* Product Profitability Table */}
      <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">تقرير ربحية الأصناف الأكثر مبيعًا</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">المنتج</th>
                <th className="py-3 px-4">الكمية المباعة</th>
                <th className="py-3 px-4">الإيرادات</th>
                <th className="py-3 px-4">التكلفة</th>
                <th className="py-3 px-4">الربح الصافي</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {analytics.topProducts.map((p, idx) => (
                <tr key={idx}>
                  <td className="py-3 px-4 font-bold text-white">{p.nameAr}</td>
                  <td className="py-3 px-4 tabular-nums text-[#F3E5AB] font-bold">{p.qty}</td>
                  <td className="py-3 px-4 tabular-nums text-white">
                    {p.revenue.toLocaleString('en-US')} د.ج
                  </td>
                  <td className="py-3 px-4 tabular-nums text-neutral-400">
                    {p.cost.toLocaleString('en-US')} د.ج
                  </td>
                  <td className="py-3 px-4 tabular-nums font-bold text-emerald-400">
                    {p.profit.toLocaleString('en-US')} د.ج
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// 4. EMPLOYEES, SETTINGS, AUDIT LOGS & BACKUP/RESTORE VIEW
// ============================================================================

export const EmployeesSettingsBackupView: React.FC = () => {
  const {
    users,
    settings,
    backups,
    auditLogs,
    apiRequest,
    refreshAll,
    can,
    addNotification,
  } = usePos();

  const [subTab, setSubTab] = useState<'EMPLOYEES' | 'SETTINGS' | 'BACKUPS' | 'AUDIT'>('EMPLOYEES');

  // New User Form
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<RoleCode>('CASHIER');
  const [newPhone, setNewPhone] = useState('');

  // Settings Form
  const [formSettings, setFormSettings] = useState(settings);

  // Restore Confirmation State
  const [restoreConfirmBackupId, setRestoreConfirmBackupId] = useState<string | null>(null);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newFullName.trim() || !newPassword.trim()) return;
    try {
      await apiRequest('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          username: newUsername.trim(),
          fullName: newFullName.trim(),
          password: newPassword,
          role: newRole,
          phone: newPhone.trim(),
        }),
      });
      await refreshAll();
      setNewUsername('');
      setNewFullName('');
      setNewPassword('');
      addNotification('INFO', 'إضافة موظف', 'تم إنشاء حساب الموظف وتعيين صلاحياته بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleToggleUserActive = async (u: User) => {
    try {
      await apiRequest(`/api/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive }),
      });
      await refreshAll();
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(formSettings),
      });
      await refreshAll();
      addNotification('INFO', 'حفظ الإعدادات', 'تم تحديث إعدادات مطعم القصر الذهبي بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleCreateManualBackup = async () => {
    try {
      const created = await apiRequest('/api/backups', { method: 'POST' });
      await refreshAll();
      await syncSnapshotToFirestore({
        id: created.id,
        snapshotType: 'BACKUP',
        version: 1,
        summary: `نسخة احتياطية يدوية: ${created.filename}`,
      }).catch(() => {});
      addNotification('BACKUP_SUCCESS', 'نسخة احتياطية جديدة', `تم إنشاء وحفظ النسخة ${created.filename}`);
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ في النسخ الاحتياطي', err.message);
    }
  };

  const handleConfirmRestore = async (backupId: string) => {
    try {
      await apiRequest('/api/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ backupId, confirmed: true }),
      });
      await refreshAll();
      setRestoreConfirmBackupId(null);
      addNotification(
        'BACKUP_SUCCESS',
        'استعادة النظام بنجاح',
        'تم حفظ نسخة أمان تلقائية قبل الاستعادة واسترجاع كافة البيانات.'
      );
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'فشل الاستعادة', err.message);
    }
  };

  const handleUploadRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      await apiRequest('/api/backups/restore', {
        method: 'POST',
        body: JSON.stringify({ snapshot: parsed, confirmed: true }),
      });
      await refreshAll();
      addNotification('BACKUP_SUCCESS', 'استعادة من ملف JSON', 'تمت استعادة قاعدة البيانات بنجاح.');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'ملف غير صالح', err.message || 'تعذر قراءة ملف النسخة الاحتياطية');
    }
  };

  return (
    <div className="space-y-6">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#141419] border border-white/10 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('EMPLOYEES')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'EMPLOYEES'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            الموظفون والصلاحيات RBAC
          </button>
          <button
            type="button"
            onClick={() => {
              setFormSettings(settings);
              setSubTab('SETTINGS');
            }}
            className={`px-4 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'SETTINGS'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            إعدادات المطعم والطباعة
          </button>
          <button
            type="button"
            onClick={() => setSubTab('BACKUPS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'BACKUPS'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            النسخ الاحتياطي والاستعادة ({backups.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('AUDIT')}
            className={`px-4 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'AUDIT'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            سجل المراجعة الأمني (Audit Logs)
          </button>
        </div>
      </div>

      {/* 1. EMPLOYEES & RBAC */}
      {subTab === 'EMPLOYEES' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <form
            onSubmit={handleCreateUser}
            className="rounded-2xl bg-[#141419] border border-white/10 p-5 space-y-4"
          >
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-[#D4AF37]" />
              <span>إضافة موظف جديد</span>
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الاسم الكامل *</label>
                <input
                  type="text"
                  required
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="مثال: ياسين بوزيد"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">اسم المستخدم (لتسجيل الدخول) *</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="yacine_waiter"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">كلمة المرور *</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الدور الوظيفي والصلاحيات</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as RoleCode)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                >
                  {Object.entries(ROLE_LABELS_AR).map(([code, label]) => (
                    <option key={code} value={code}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">رقم الهاتف</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                />
              </div>
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-[#D4AF37] text-black font-extrabold text-xs"
            >
              حفظ حساب الموظف
            </button>
          </form>

          <div className="lg:col-span-2 rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
            <div className="p-4 border-b border-white/10">
              <h3 className="text-base font-bold text-white">قائمة الموظفين وحسابات النظام ({users.length})</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                  <tr>
                    <th className="py-3 px-4">الاسم</th>
                    <th className="py-3 px-4">اسم المستخدم</th>
                    <th className="py-3 px-4">الدور</th>
                    <th className="py-3 px-4">الحالة</th>
                    <th className="py-3 px-4 text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="py-3 px-4 font-bold text-white">{u.fullName}</td>
                      <td className="py-3 px-4 font-mono text-neutral-300">{u.username}</td>
                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded bg-[#D4AF37]/15 text-[#F3E5AB] font-bold">
                          {ROLE_LABELS_AR[u.role]}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            u.isActive ? 'bg-emerald-500/15 text-emerald-300' : 'bg-red-500/15 text-red-300'
                          }`}
                        >
                          {u.isActive ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-left">
                        {u.username !== 'admin' && (
                          <button
                            type="button"
                            onClick={() => handleToggleUserActive(u)}
                            className="px-3 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-300"
                          >
                            {u.isActive ? 'إيقاف' : 'تفعيل'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 2. SETTINGS */}
      {subTab === 'SETTINGS' && (
        <form
          onSubmit={handleSaveSettings}
          className="rounded-2xl bg-[#141419] border border-white/10 p-6 space-y-5 max-w-3xl"
        >
          <h2 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
            <Settings className="w-5 h-5 text-[#D4AF37]" />
            <span>إعدادات مطعم القصر الذهبي والطباعة الحرارية</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-neutral-400 block mb-1">اسم المطعم</label>
              <input
                type="text"
                value={formSettings.restaurantName}
                onChange={(e) => setFormSettings({ ...formSettings, restaurantName: e.target.value })}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">العلامة التجارية</label>
              <input
                type="text"
                value={formSettings.brandTitle}
                onChange={(e) => setFormSettings({ ...formSettings, brandTitle: e.target.value })}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">العنوان</label>
              <input
                type="text"
                value={formSettings.address}
                onChange={(e) => setFormSettings({ ...formSettings, address: e.target.value })}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">رقم الهاتف</label>
              <input
                type="text"
                value={formSettings.phone}
                onChange={(e) => setFormSettings({ ...formSettings, phone: e.target.value })}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">مقاس ورق الفاتورة الحرارية</label>
              <select
                value={formSettings.receiptSize}
                onChange={(e) => setFormSettings({ ...formSettings, receiptSize: e.target.value as any })}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              >
                <option value="80mm">80mm (طابعة كاشير قياسية)</option>
                <option value="58mm">58mm (طابعة حرارية مدمجة)</option>
                <option value="A4">A4 (فاتورة مكتبية كاملة)</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">رسوم التوصيل الافتراضية (د.ج)</label>
              <input
                type="number"
                value={formSettings.defaultDeliveryFee}
                onChange={(e) =>
                  setFormSettings({ ...formSettings, defaultDeliveryFee: Number(e.target.value) })
                }
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
              />
            </div>
          </div>

          <div className="flex items-center gap-6 pt-2">
            <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formSettings.taxEnabled}
                onChange={(e) => setFormSettings({ ...formSettings, taxEnabled: e.target.checked })}
                className="accent-[#D4AF37]"
              />
              <span>تفعيل الضريبة ({formSettings.taxRatePercent}%)</span>
            </label>

            <label className="flex items-center gap-2 text-xs text-neutral-200 cursor-pointer">
              <input
                type="checkbox"
                checked={formSettings.autoPrintReceipt}
                onChange={(e) => setFormSettings({ ...formSettings, autoPrintReceipt: e.target.checked })}
                className="accent-[#D4AF37]"
              />
              <span>طباعة الفاتورة تلقائيًا فور إتمام الدفع</span>
            </label>
          </div>

          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>حفظ وتطبيق الإعدادات</span>
          </button>
        </form>
      )}

      {/* 3. BACKUPS & RESTORE */}
      {subTab === 'BACKUPS' && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-[#141419] border border-[#D4AF37]/30 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-[#D4AF37]" />
                <span>مركز النسخ الاحتياطي والاستعادة الآمنة (Backup & Restore)</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                يقوم النظام تلقائيًا بإنشاء نسخة أمان قبل أي عملية استعادة لحماية الفواتير والبيانات من الضياع.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <label className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs cursor-pointer flex items-center gap-2">
                <Upload className="w-4 h-4 text-[#D4AF37]" />
                <span>استعادة من ملف JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleUploadRestoreFile}
                  className="hidden"
                />
              </label>

              <button
                type="button"
                onClick={handleCreateManualBackup}
                className="px-4 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs flex items-center gap-2"
              >
                <CloudUpload className="w-4 h-4" />
                <span>إنشاء نسخة احتياطية الآن</span>
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">اسم الملف</th>
                  <th className="py-3 px-4">النوع</th>
                  <th className="py-3 px-4">عدد السجلات</th>
                  <th className="py-3 px-4">الحجم</th>
                  <th className="py-3 px-4">بواسطة</th>
                  <th className="py-3 px-4">التاريخ</th>
                  <th className="py-3 px-4 text-left">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {backups.map((b) => (
                  <tr key={b.id}>
                    <td className="py-3 px-4 font-mono font-bold text-[#F3E5AB]">{b.filename}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300 font-mono text-[11px]">
                        {b.backupType}
                      </span>
                    </td>
                    <td className="py-3 px-4 tabular-nums text-white">{b.recordsCount} سجل</td>
                    <td className="py-3 px-4 tabular-nums text-neutral-400">
                      {(b.sizeBytes / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-3 px-4 text-neutral-300">{b.createdByName}</td>
                    <td className="py-3 px-4 tabular-nums text-neutral-400">
                      {new Date(b.createdAt).toLocaleString('ar-DZ')}
                    </td>
                    <td className="py-3 px-4 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/backups/${b.id}/download`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 text-neutral-200 flex items-center gap-1"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>تحميل</span>
                        </a>
                        <button
                          type="button"
                          onClick={() => setRestoreConfirmBackupId(b.id)}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold"
                        >
                          استعادة
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. AUDIT LOGS */}
      {subTab === 'AUDIT' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
              <span>سجل المراجعة الأمني للعمليات الحساسة (Audit Trail)</span>
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">العملية</th>
                  <th className="py-3 px-4">الكيان</th>
                  <th className="py-3 px-4">التفاصيل</th>
                  <th className="py-3 px-4">المستخدم</th>
                  <th className="py-3 px-4">التوقيت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {auditLogs.slice(0, 60).map((log) => (
                  <tr key={log.id}>
                    <td className="py-3 px-4 font-mono font-bold text-[#F3E5AB]">{log.action}</td>
                    <td className="py-3 px-4 font-mono text-neutral-400">{log.entityType}</td>
                    <td className="py-3 px-4 text-neutral-200">{log.details}</td>
                    <td className="py-3 px-4 text-neutral-300">
                      {log.userName} ({log.userRole})
                    </td>
                    <td className="py-3 px-4 text-neutral-400 tabular-nums">
                      {new Date(log.createdAt).toLocaleString('ar-DZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Restore Modal */}
      {restoreConfirmBackupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl bg-[#141419] border border-amber-500/40 p-6 space-y-4">
            <h3 className="text-base font-bold text-white">تأكيد استعادة النسخة الاحتياطية</h3>
            <p className="text-xs text-neutral-300 leading-relaxed">
              هل أنت متأكد من استعادة هذه النسخة؟ سيقوم النظام أولاً بإنشاء نسخة احتياطية تلقائية للبيانات الحالية قبل الاسترجاع لضمان عدم ضياع أي فاتورة.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRestoreConfirmBackupId(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleConfirmRestore(restoreConfirmBackupId)}
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-extrabold text-xs"
              >
                نعم، تأكيد الاستعادة الآمنة
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
