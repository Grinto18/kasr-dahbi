import React, { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowLeft,
  Banknote,
  ChefHat,
  CreditCard,
  DollarSign,
  PauseCircle,
  ShoppingBag,
  TrendingUp,
  Vault,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { usePos } from '../context/PosContext.tsx';

interface DashboardPageProps {
  onNavigate: (tab: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const {
    orders,
    payments,
    expenses,
    ingredients,
    cashShifts,
    heldCarts,
    settings,
  } = usePos();

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const activeOrders = orders.filter((o) => o.status !== 'CANCELLED' && o.status !== 'HELD');
    const todayOrders = activeOrders.filter((o) => o.createdAt.slice(0, 10) === todayStr);
    const salesOrders = todayOrders.length > 0 ? todayOrders : activeOrders;

    const totalSales = salesOrders.reduce((s, o) => s + o.totalAmount, 0);
    const ordersCount = salesOrders.length;
    const avgOrder = ordersCount > 0 ? Math.round(totalSales / ordersCount) : 0;

    let cashSales = 0;
    let cardAndElectronicSales = 0;
    for (const p of payments) {
      if (p.status !== 'COMPLETED') continue;
      for (const a of p.allocations) {
        const net = a.method === 'CASH' ? Math.max(0, a.amount - p.changeGiven) : a.amount;
        if (a.method === 'CASH') cashSales += net;
        else cardAndElectronicSales += net;
      }
    }

    const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const netSales = totalSales - totalExpenses;

    const currentKitchenOrders = orders.filter((o) =>
      ['NEW', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status)
    );
    const heldOrdersCount = orders.filter((o) => o.status === 'HELD').length + heldCarts.length;

    // Top products
    const productMap = new Map<string, { name: string; qty: number; revenue: number }>();
    for (const o of activeOrders) {
      for (const item of o.items) {
        const prev = productMap.get(item.productId) || {
          name: item.productNameAr,
          qty: 0,
          revenue: 0,
        };
        prev.qty += item.quantity;
        prev.revenue += item.subtotal;
        productMap.set(item.productId, prev);
      }
    }
    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const lowStock = ingredients.filter((i) => i.currentStock <= i.minStock);
    const activeShift = cashShifts.find((s) => s.status === 'OPEN') || null;

    return {
      totalSales,
      ordersCount,
      avgOrder,
      cashSales,
      cardAndElectronicSales,
      totalExpenses,
      netSales,
      currentKitchenOrders,
      heldOrdersCount,
      topProducts,
      lowStock,
      activeShift,
    };
  }, [orders, payments, expenses, ingredients, cashShifts, heldCarts]);

  const paymentChartData = [
    { name: 'نقدًا (Cash)', value: Math.max(stats.cashSales, 0), color: '#D4AF37' },
    { name: 'بطاقة / CCP / BaridiMob', value: Math.max(stats.cardAndElectronicSales, 0), color: '#3B82F6' },
    { name: 'المصاريف', value: Math.max(stats.totalExpenses, 0), color: '#EF4444' },
  ];

  const topProductsChartData =
    stats.topProducts.length > 0
      ? stats.topProducts.map((p) => ({
          name: p.name.slice(0, 18),
          revenue: p.revenue,
          qty: p.qty,
        }))
      : [
          { name: 'مشاوي مشكلة', revenue: 24000, qty: 10 },
          { name: 'شخشوخة باللحم', revenue: 18000, qty: 12 },
          { name: 'صحن دجاج مع أرز', revenue: 15600, qty: 13 },
          { name: 'تريدة جيجلية', revenue: 11200, qty: 8 },
        ];

  return (
    <div className="space-y-6">
      {/* Top Action Banner */}
      <div className="rounded-xl bg-[#141419] border border-white/10 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-extrabold text-white">
            لوحة القيادة التشغيلية — {settings.restaurantName} ({settings.brandTitle})
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            {settings.address} · {settings.landmark} · هاتف: {settings.phone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('pos')}
            className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2.5 text-xs font-bold text-black hover:bg-[#e5c247] transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>فتح نقطة البيع (POS)</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('kitchen')}
            className="flex items-center gap-2 rounded-lg bg-white/5 border border-white/15 px-4 py-2.5 text-xs font-semibold text-white hover:bg-white/10 transition-colors"
          >
            <ChefHat className="w-4 h-4 text-[#D4AF37]" />
            <span>شاشة المطبخ KDS ({stats.currentKitchenOrders.length})</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid (8 metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-[#141419] border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>إجمالي مبيعات اليوم</span>
            <DollarSign className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-white mt-2">
            {stats.totalSales.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-[#D4AF37]">{settings.currency}</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            عدد الطلبات: <span className="font-mono font-bold text-white">{stats.ordersCount}</span> · متوسط الطلب:{' '}
            <span className="font-mono font-bold text-white">{stats.avgOrder.toLocaleString('en-US')}</span>
          </p>
        </div>

        <div className="rounded-xl bg-[#141419] border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>المبيعات النقدية والبطاقات</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-emerald-400 mt-2">
            {stats.cashSales.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-neutral-400">نقدًا</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-blue-400" />
            <span>بطاقة / CCP / BaridiMob:</span>
            <span className="font-mono font-bold text-white">
              {stats.cardAndElectronicSales.toLocaleString('en-US')} {settings.currency}
            </span>
          </p>
        </div>

        <div className="rounded-xl bg-[#141419] border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>صافي المبيعات والمصاريف</span>
            <TrendingUp className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-2xl font-extrabold font-mono tabular-nums text-[#F3E5AB] mt-2">
            {stats.netSales.toLocaleString('en-US')}{' '}
            <span className="text-xs font-normal text-neutral-400">{settings.currency}</span>
          </p>
          <p className="text-[11px] text-neutral-400 mt-1">
            إجمالي المصاريف المسجلة:{' '}
            <span className="font-mono font-bold text-red-400">
              {stats.totalExpenses.toLocaleString('en-US')} {settings.currency}
            </span>
          </p>
        </div>

        <div className="rounded-xl bg-[#141419] border border-white/10 p-4">
          <div className="flex items-center justify-between text-xs text-neutral-400">
            <span>حالة الصندوق والطلبات المعلقة</span>
            <Vault className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <p className="text-lg font-extrabold font-mono tabular-nums text-white mt-2">
            {stats.activeShift
              ? `مفتوح (${stats.activeShift.expectedCash.toLocaleString('en-US')} ${settings.currency})`
              : 'الصندوق مغلق'}
          </p>
          <p className="text-[11px] text-neutral-400 mt-1 flex items-center gap-2">
            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>طلبات معلقة (Hold): {stats.heldOrdersCount}</span>
            <span>·</span>
            <span>في المطبخ: {stats.currentKitchenOrders.length}</span>
          </p>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl bg-[#141419] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">الأطباق والمنتجات الأكثر مبيعًا (د.ج)</h2>
              <p className="text-xs text-neutral-400">تحليل الإيرادات حسب الصنف</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('reports')}
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
            >
              <span>التقارير التفصيلية</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductsChartData} layout="vertical" margin={{ left: 20, right: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#262630" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={11} />
                <YAxis dataKey="name" type="category" width={120} stroke="#E5E7EB" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#141419', borderColor: '#D4AF37', borderRadius: '8px', color: '#fff' }}
                />
                <Bar dataKey="revenue" name="المبيعات (د.ج)" fill="#D4AF37" radius={[4, 4, 4, 4]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-5 rounded-xl bg-[#141419] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-white">توزيع السيولة وطرق الدفع</h2>
              <p className="text-xs text-neutral-400">النقدي مقابل البطاقة والمصاريف</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('cash')}
              className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1"
            >
              <span>إدارة الصندوق</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="h-64 w-full flex flex-col items-center justify-center">
            <ResponsiveContainer width="100%" height="80%">
              <PieChart>
                <Pie
                  data={
                    paymentChartData.some((d) => d.value > 0)
                      ? paymentChartData
                      : [{ name: 'رصيد افتتاح الصندوق', value: stats.activeShift?.openingBalance || 20000, color: '#D4AF37' }]
                  }
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={76}
                  paddingAngle={4}
                >
                  {(paymentChartData.some((d) => d.value > 0)
                    ? paymentChartData
                    : [{ name: 'رصيد افتتاح الصندوق', value: 20000, color: '#D4AF37' }]
                  ).map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: '#141419', borderColor: '#D4AF37', borderRadius: '8px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap items-center justify-center gap-4 text-xs text-neutral-300 mt-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4AF37]" />
                نقدًا: {stats.cashSales.toLocaleString('en-US')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                بطاقة/بريد: {stats.cardAndElectronicSales.toLocaleString('en-US')}
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                مصاريف: {stats.totalExpenses.toLocaleString('en-US')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Current Kitchen Orders & Low Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 rounded-xl bg-[#141419] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white">أحدث الطلبات الجارية ({orders.length})</h2>
            <button
              type="button"
              onClick={() => onNavigate('orders')}
              className="text-xs text-[#D4AF37] hover:underline"
            >
              عرض كل الطلبات والفواتير
            </button>
          </div>

          {orders.length === 0 ? (
            <div className="py-10 text-center text-xs text-neutral-400">
              لا توجد طلبات مسجلة بعد في هذه الوردية. اضغط على <strong>فتح نقطة البيع (POS)</strong> لإنشاء أول طلب.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-neutral-400">
                    <th className="py-2.5 font-semibold">رقم الطلب</th>
                    <th className="py-2.5 font-semibold">النوع / الطاولة</th>
                    <th className="py-2.5 font-semibold">الأصناف</th>
                    <th className="py-2.5 font-semibold">الإجمالي</th>
                    <th className="py-2.5 font-semibold">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {orders.slice(0, 6).map((ord) => (
                    <tr key={ord.id} className="hover:bg-white/[0.02]">
                      <td className="py-2.5 font-mono font-bold text-[#F3E5AB]">{ord.orderNumber}</td>
                      <td className="py-2.5">
                        {ord.orderType === 'DINE_IN'
                          ? `طاولة (${ord.tableName || 'صالة'})`
                          : ord.orderType === 'TAKEAWAY'
                          ? 'سفري'
                          : `توصيل (${ord.customerName || ''})`}
                      </td>
                      <td className="py-2.5 text-neutral-300">
                        {ord.items.map((i) => `${i.quantity}x ${i.productNameAr}`).join('، ').slice(0, 45)}
                      </td>
                      <td className="py-2.5 font-mono font-bold">
                        {ord.totalAmount.toLocaleString('en-US')} {settings.currency}
                      </td>
                      <td className="py-2.5 font-semibold text-neutral-300">
                        {ord.status} · {ord.paymentStatus === 'PAID' ? 'مدفوع' : 'غير مدفوع'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="lg:col-span-5 rounded-xl bg-[#141419] border border-white/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <span>حالة المخزون والمواد المنخفضة</span>
            </h2>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs text-[#D4AF37] hover:underline"
            >
              إدارة المخزون
            </button>
          </div>

          <div className="space-y-2.5">
            {ingredients.slice(0, 6).map((ing) => {
              const isLow = ing.currentStock <= ing.minStock;
              return (
                <div
                  key={ing.id}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-[#1C1C24] border border-white/5 text-xs"
                >
                  <div>
                    <div className="font-semibold text-white">{ing.nameAr}</div>
                    <div className="text-[11px] text-neutral-400">
                      الحد الأدنى: {ing.minStock.toLocaleString('en-US')} {ing.unitNameAr}
                    </div>
                  </div>
                  <div className="text-left">
                    <div
                      className={`font-mono font-bold ${
                        isLow ? 'text-red-400' : 'text-emerald-400'
                      }`}
                    >
                      {ing.currentStock.toLocaleString('en-US')} {ing.unitNameAr}
                    </div>
                    <div className="text-[10px] text-neutral-400">
                      {isLow ? 'منخفض — يحتاج تموين' : 'متوفر'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
