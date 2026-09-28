import React, { useEffect, useState } from 'react';
import {
  BarChart3,
  Bell,
  ChefHat,
  Crown,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Printer,
  RefreshCw,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Utensils,
  UtensilsCrossed,
  Wallet,
  Wifi,
  WifiOff,
  X,
} from 'lucide-react';
import { PosProvider, usePos } from './context/PosContext.tsx';
import { LoginPage } from './pages/LoginPage.tsx';
import { DashboardPage } from './pages/DashboardPage.tsx';
import { PosCashierPage } from './pages/PosCashierPage.tsx';
import { KitchenKdsView, OrdersAndDeliveryView, TablesView } from './pages/TablesAndKdsPage.tsx';
import {
  InventoryRecipesView,
  MenuManagementView,
  SuppliersPurchasesView,
} from './pages/MenuAndInventoryPage.tsx';
import {
  CashRegisterView,
  CustomersExpensesView,
  EmployeesSettingsBackupView,
  ReportsAnalyticsView,
} from './pages/FinanceAndAdminPage.tsx';
import { ReceiptConfigPage } from './pages/ReceiptConfigPage.tsx';
import { PWAInstallButton } from './components/ReceiptPrinterModal.tsx';

interface NavItem {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  permission: string;
  badge?: number;
}

const MainWorkspace: React.FC = () => {
  const {
    user,
    isLoading,
    isOnline,
    simulatedOffline,
    setSimulatedOffline,
    offlineQueue,
    syncOfflineQueue,
    notifications,
    markNotificationsRead,
    orders,
    ingredients,
    logout,
    can,
  } = usePos();

  const [activeTab, setActiveTab] = useState<string>('pos');
  const [preselectedTableId, setPreselectedTableId] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  // Set default landing screen based on user role when user logs in
  useEffect(() => {
    if (!user) return;
    if (user.role === 'KITCHEN') setActiveTab('kds');
    else if (user.role === 'INVENTORY') setActiveTab('inventory');
    else if (user.role === 'WAITER') setActiveTab('tables');
    else if (user.role === 'CASHIER') setActiveTab('pos');
    else setActiveTab('dashboard');
  }, [user?.id, user?.role]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0B0E] text-white flex items-center justify-center" dir="rtl">
        <div className="text-center space-y-3">
          <Crown className="w-12 h-12 text-[#D4AF37] mx-auto animate-pulse" />
          <div className="text-sm font-bold text-[#F3E5AB]">جاري تحميل نظام القصر الذهبي POS...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const activeKitchenCount = orders.filter((o) =>
    ['NEW', 'CONFIRMED', 'PREPARING'].includes(o.status)
  ).length;
  const lowStockCount = ingredients.filter((i) => i.currentStock <= i.minStock).length;
  const unreadNotifs = notifications.filter((n) => !n.read).length;

  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'لوحة التحكم', icon: LayoutDashboard, permission: 'dashboard:view' },
    { id: 'pos', label: 'نقطة البيع (الكاشير)', icon: ShoppingCart, permission: 'pos:use' },
    { id: 'tables', label: 'الطاولات والصالات', icon: Utensils, permission: 'tables:manage' },
    {
      id: 'kds',
      label: 'شاشة المطبخ (KDS)',
      icon: ChefHat,
      permission: 'kitchen:view',
      badge: activeKitchenCount || undefined,
    },
    { id: 'orders', label: 'الطلبات والتوصيل', icon: Truck, permission: 'orders:view' },
    { id: 'menu', label: 'إدارة القائمة والأسعار', icon: UtensilsCrossed, permission: 'menu:manage' },
    {
      id: 'inventory',
      label: 'المخزون والوصفات',
      icon: Package,
      permission: 'inventory:manage',
      badge: lowStockCount || undefined,
    },
    { id: 'purchases', label: 'الموردون والمشتريات', icon: ShoppingBag, permission: 'purchases:manage' },
    { id: 'cash', label: 'الصندوق والورديات', icon: Wallet, permission: 'cash:manage' },
    { id: 'customers', label: 'العملاء والمصاريف', icon: Users, permission: 'customers:manage' },
    { id: 'reports', label: 'التقارير والأرباح', icon: BarChart3, permission: 'reports:view' },
    { id: 'receipt_config', label: 'تخصيص الفاتورة والوصل', icon: Printer, permission: 'employees:manage' },
    { id: 'admin', label: 'الإعدادات والنسخ الاحتياطي', icon: Settings, permission: 'employees:manage' },
  ].filter((item) => can(item.permission));

  const handleOpenTableInPos = (tableId: string) => {
    setPreselectedTableId(tableId);
    setActiveTab('pos');
  };

  return (
    <div className="min-h-screen bg-[#0B0B0E] text-[#F5F5F7] flex flex-col" dir="rtl">
      {/* Top Command Bar */}
      <header className="sticky top-0 z-40 h-16 bg-[#101015]/95 backdrop-blur-md border-b border-white/10 px-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg bg-white/5 text-neutral-300 hover:text-white"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4AF37] to-[#9A7B1C] flex items-center justify-center shadow-lg shadow-[#D4AF37]/15">
              <Crown className="w-5 h-5 text-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-extrabold tracking-tight text-white">
                  القصر الذهبي
                </span>
                <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-[#D4AF37]/15 text-[#F3E5AB] border border-[#D4AF37]/30">
                  GOLDEN PALACE POS
                </span>
              </div>
              <div className="text-[11px] text-neutral-400 hidden sm:block">
                عند الجيجلي • شارع بلهوشات، حسين داي (بجانب فندق Oasis) • 0791755614
              </div>
            </div>
          </div>
        </div>

        {/* Right Actions: PWA, Offline Mode Toggle, Sync Queue, Notifications, User Profile */}
        <div className="flex items-center gap-2">
          <PWAInstallButton />

          {/* Offline Mode Toggle & Sync Status */}
          <button
            type="button"
            onClick={() => setSimulatedOffline(!simulatedOffline)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border flex items-center gap-1.5 transition-all ${
              isOnline
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/20 border-amber-500/50 text-amber-300'
            }`}
            title="اضغط لمحاكاة انقطاع الإنترنت واختبار العمل المحلي (Offline IndexedDB)"
          >
            {isOnline ? (
              <>
                <Wifi className="w-3.5 h-3.5" />
                <span className="hidden md:inline">متصل (Online)</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5" />
                <span>وضع Offline محلي</span>
              </>
            )}
          </button>

          {offlineQueue.length > 0 && (
            <button
              type="button"
              onClick={syncOfflineQueue}
              disabled={!isOnline}
              className="px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#c5a030] disabled:opacity-50 text-black font-extrabold text-xs flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>مزامنة ({offlineQueue.length})</span>
            </button>
          )}

          {/* Notifications Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotifOpen(!notifOpen);
                if (!notifOpen) markNotificationsRead();
              }}
              className="relative p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300"
            >
              <Bell className="w-4 h-4" />
              {unreadNotifs > 0 && (
                <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                  {unreadNotifs}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute left-0 mt-2 w-80 rounded-2xl bg-[#141419] border border-[#D4AF37]/40 shadow-2xl z-50 overflow-hidden">
                <div className="p-3 bg-black/50 border-b border-white/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-white">التنبيهات الفورية</span>
                  <button
                    type="button"
                    onClick={() => setNotifOpen(false)}
                    className="text-neutral-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
                  {notifications.length === 0 ? (
                    <div className="p-6 text-center text-xs text-neutral-500">لا توجد تنبيهات جديدة</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 text-right hover:bg-white/[0.02]">
                        <div className="text-xs font-bold text-[#F3E5AB]">{n.title}</div>
                        <div className="text-[11px] text-neutral-300 mt-0.5">{n.message}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Badge & Logout */}
          <div className="hidden sm:flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-xl bg-white/5 border border-white/10">
            <div className="text-right">
              <div className="text-xs font-bold text-white leading-tight">{user.fullName}</div>
              <div className="text-[10px] text-[#D4AF37] font-mono">{user.role}</div>
            </div>
            <button
              type="button"
              onClick={logout}
              className="p-1.5 rounded-lg hover:bg-red-500/20 text-neutral-400 hover:text-red-300 transition-colors"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:flex w-60 bg-[#101015] border-l border-white/10 flex-col justify-between p-3 shrink-0">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-l from-[#D4AF37] to-[#b59024] text-black shadow-md shadow-[#D4AF37]/15'
                      : 'text-neutral-300 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-black' : 'text-[#D4AF37]'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-md text-[10px] font-extrabold tabular-nums ${
                        isActive ? 'bg-black/25 text-black' : 'bg-[#D4AF37]/20 text-[#F3E5AB]'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          <div className="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5 text-[11px] text-neutral-400">
            <div className="font-bold text-[#F3E5AB]">القصر الذهبي POS</div>
            <div>عند الجيجلي • حسين داي</div>
            <div className="tabular-nums text-neutral-500">هاتف: 0791755614</div>
          </div>
        </aside>

        {/* Mobile Drawer Navigation */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <aside className="relative w-64 bg-[#141419] border-l border-white/10 p-4 flex flex-col justify-between z-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <span className="text-sm font-bold text-[#F3E5AB]">القائمة الرئيسية</span>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="text-neutral-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <nav className="space-y-1">
                  {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold ${
                          isActive
                            ? 'bg-[#D4AF37] text-black'
                            : 'text-neutral-300 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{item.label}</span>
                        </div>
                      </button>
                    );
                  })}
                </nav>
              </div>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 rounded-xl bg-red-500/20 text-red-300 font-bold text-xs flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج</span>
              </button>
            </aside>
          </div>
        )}

        {/* Active View Viewport */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          {activeTab === 'dashboard' && <DashboardPage onNavigate={setActiveTab} />}
          {activeTab === 'pos' && (
            <PosCashierPage
              preselectedTableId={preselectedTableId}
              onClearPreselectedTable={() => setPreselectedTableId(null)}
            />
          )}
          {activeTab === 'tables' && <TablesView onOpenTableInPos={handleOpenTableInPos} />}
          {activeTab === 'kds' && <KitchenKdsView />}
          {activeTab === 'orders' && <OrdersAndDeliveryView />}
          {activeTab === 'menu' && <MenuManagementView />}
          {activeTab === 'inventory' && <InventoryRecipesView />}
          {activeTab === 'purchases' && <SuppliersPurchasesView />}
          {activeTab === 'cash' && <CashRegisterView />}
          {activeTab === 'customers' && <CustomersExpensesView />}
          {activeTab === 'reports' && <ReportsAnalyticsView />}
          {activeTab === 'receipt_config' && <ReceiptConfigPage />}
          {activeTab === 'admin' && <EmployeesSettingsBackupView />}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <PosProvider>
      <MainWorkspace />
    </PosProvider>
  );
}
