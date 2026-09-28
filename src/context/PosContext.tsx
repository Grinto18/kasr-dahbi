import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  AuditLogRecord,
  BackupMetadata,
  CashShift,
  CashTransaction,
  Category,
  Customer,
  ExpenseRecord,
  hasPermission,
  Ingredient,
  Order,
  OrderStatus,
  PaymentAllocation,
  PaymentRecord,
  PriceHistoryRecord,
  Product,
  PurchaseRecord,
  RestaurantSettings,
  RestaurantTable,
  Role,
  StockCountRecord,
  StockMovement,
  Supplier,
  TableStatus,
  TableZone,
  User,
} from '../db/types.ts';
import {
  cacheBootstrapToIndexedDB,
  enqueueOfflineOperation,
  HeldCartRecord,
  loadCachedBootstrapFromIndexedDB,
  offlineDb,
  OfflineQueueItem,
} from '../lib/offlineDb.ts';
import {
  signInWithGooglePopup,
  signOutFirebase,
  syncOrderToFirestore,
  syncSnapshotToFirestore,
} from '../lib/firebase.ts';
import { useOnlineStatus } from '../lib/usePWAInstall.ts';

export interface PosNotification {
  id: string;
  type: 'LOW_STOCK' | 'NEW_ORDER' | 'KITCHEN_READY' | 'PAYMENT_SUCCESS' | 'BACKUP_SUCCESS' | 'SYNC_ERROR' | 'OFFLINE_MODE' | 'INFO';
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

interface PosContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isOnline: boolean;
  simulatedOffline: boolean;
  setSimulatedOffline: (val: boolean) => void;
  offlineQueue: OfflineQueueItem[];
  heldCarts: HeldCartRecord[];
  notifications: PosNotification[];
  markNotificationsRead: () => void;
  addNotification: (type: PosNotification['type'], title: string, message: string) => void;

  // Data collections
  settings: RestaurantSettings;
  categories: Category[];
  products: Product[];
  priceHistory: PriceHistoryRecord[];
  tableZones: TableZone[];
  tables: RestaurantTable[];
  orders: Order[];
  payments: PaymentRecord[];
  cashShifts: CashShift[];
  cashTransactions: CashTransaction[];
  ingredients: Ingredient[];
  stockMovements: StockMovement[];
  wasteRecords: any[];
  stockCounts: StockCountRecord[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  customers: Customer[];
  expenses: ExpenseRecord[];
  users: User[];
  roles: Role[];
  auditLogs: AuditLogRecord[];
  backups: BackupMetadata[];

  // Auth & RBAC
  login: (identifier: string, password: string, rememberMe?: boolean) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;

  // Actions
  refreshAll: () => Promise<void>;
  syncOfflineQueue: () => Promise<void>;
  holdCart: (cart: Omit<HeldCartRecord, 'id' | 'createdAt'>) => Promise<void>;
  removeHeldCart: (id: string) => Promise<void>;

  createOrderAction: (payload: any) => Promise<Order>;
  updateOrderStatusAction: (orderId: string, status: OrderStatus, stationFilter?: string, deliveryDriver?: string) => Promise<Order>;
  processPaymentAction: (payload: {
    orderId: string;
    idempotencyKey?: string;
    allocations: PaymentAllocation[];
    splitItemQuantities?: { orderItemId: string; quantity: number }[];
  }) => Promise<{ payment: PaymentRecord; order: Order }>;
  refundOrderAction: (orderId: string, reason: string) => Promise<void>;

  apiRequest: <T = any>(path: string, options?: RequestInit) => Promise<T>;
}

const DEFAULT_SETTINGS: RestaurantSettings = {
  restaurantName: 'القصر الذهبي',
  brandTitle: 'عند الجيجلي • حسين داي',
  address: 'شارع بلهوشات، حسين داي، الجزائر العاصمة',
  landmark: 'بجانب فندق Oasis ومحطة المترو',
  phone: '0791755614',
  currency: 'DZD',
  language: 'ar',
  rtl: true,
  themeAccent: 'gold',
  receiptSize: '80mm',
  printerName: 'Epson TM-T20III Thermal',
  autoPrintReceipt: false,
  taxEnabled: true,
  taxRatePercent: 9,
  maxDiscountPercent: 25,
  defaultDeliveryFee: 200,
  receiptFooterMessage: 'شكرًا لزيارتكم لمطعم القصر الذهبي — عند الجيجلي • صحة وهنا!',

  // Thermal Receipt defaults
  showLogo: true,
  logoUrl: '',
  receiptHeaderMessage: 'أهلاً وسهلاً بكم في مطعم القصر الذهبي • مأكولات تقليدية ومشاوي على الجمر',
  taxId: '001916012345678',
  commercialRegister: '16/00-1234567A20',
  statisticalId: '099016123456789',
  articleNumber: '16120034567',
  showTaxId: true,

  showCashierName: true,
  showCustomerInfo: true,
  showTableInfo: true,
  showOrderType: true,
  showItemAddons: true,
  showItemNotes: true,
  showPaymentBreakdown: true,

  showWifiInfo: true,
  wifiSsid: 'GoldenPalace-Guest',
  wifiPassword: 'palace2026',
  showSocialMedia: true,
  socialHandle: '@goldenpalace.dz',
  showReturnPolicy: true,
  returnPolicyText: 'المأكولات والمشروبات غير قابلة للإرجاع بعد الاستلام • الرجاء الاحتفاظ بالوصل',
  showBarcode: true,
  showQrCode: true,
  qrCodeUrl: 'https://goldenpalace.dz',
  receiptFontDensity: 'normal',
};

const PosContext = createContext<PosContextValue | null>(null);

const SESSION_STORAGE_KEY = 'gp_pos_auth_session_v1';

export const PosProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const browserOnline = useOnlineStatus();
  const [simulatedOffline, setSimulatedOffline] = useState(false);
  const isOnline = browserOnline && !simulatedOffline;

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [settings, setSettings] = useState<RestaurantSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryRecord[]>([]);
  const [tableZones, setTableZones] = useState<TableZone[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [cashShifts, setCashShifts] = useState<CashShift[]>([]);
  const [cashTransactions, setCashTransactions] = useState<CashTransaction[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [wasteRecords, setWasteRecords] = useState<any[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCountRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [backups, setBackups] = useState<BackupMetadata[]>([]);

  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>([]);
  const [heldCarts, setHeldCarts] = useState<HeldCartRecord[]>([]);
  const [notifications, setNotifications] = useState<PosNotification[]>([]);

  const addNotification = useCallback(
    (type: PosNotification['type'], title: string, message: string) => {
      const notif: PosNotification = {
        id: `ntf_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        type,
        title,
        message,
        createdAt: new Date().toISOString(),
        read: false,
      };
      setNotifications((prev) => [notif, ...prev.slice(0, 39)]);
    },
    []
  );

  const markNotificationsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const loadLocalIndexedDbQueues = useCallback(async () => {
    try {
      const q = await offlineDb.offlineQueue.where('status').equals('PENDING').reverse().sortBy('createdAt');
      setOfflineQueue(q);
      const carts = await offlineDb.heldCarts.reverse().sortBy('createdAt');
      setHeldCarts(carts);
    } catch (err) {
      console.warn('IndexedDB queue read warning:', err);
    }
  }, []);

  const applyBootstrapState = useCallback(
    (data: any) => {
      if (!data) return;
      if (data.settings) setSettings(data.settings);
      if (data.categories) setCategories(data.categories);
      if (data.products) setProducts(data.products.filter((p: Product) => !p.isDeleted));
      if (data.priceHistory) setPriceHistory(data.priceHistory);
      if (data.tableZones) setTableZones(data.tableZones);
      if (data.tables) setTables(data.tables);
      if (data.orders) setOrders(data.orders);
      if (data.payments) setPayments(data.payments);
      if (data.cashShifts) setCashShifts(data.cashShifts);
      if (data.cashTransactions) setCashTransactions(data.cashTransactions);
      if (data.ingredients) {
        setIngredients(data.ingredients);
        const low = data.ingredients.filter((i: Ingredient) => i.currentStock <= i.minStock);
        if (low.length > 0) {
          setNotifications((prev) => {
            if (prev.some((n) => n.type === 'LOW_STOCK')) return prev;
            return [
              {
                id: `ntf_low_${Date.now()}`,
                type: 'LOW_STOCK',
                title: 'تنبيه انخفاض المخزون',
                message: `توجد ${low.length} مواد وصلت للحد الأدنى في المخزن (${low.map((l: Ingredient) => l.nameAr).slice(0, 2).join('، ')})`,
                createdAt: new Date().toISOString(),
                read: false,
              },
              ...prev,
            ];
          });
        }
      }
      if (data.stockMovements) setStockMovements(data.stockMovements);
      if (data.wasteRecords) setWasteRecords(data.wasteRecords);
      if (data.stockCounts) setStockCounts(data.stockCounts);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.purchases) setPurchases(data.purchases);
      if (data.customers) setCustomers(data.customers);
      if (data.expenses) setExpenses(data.expenses);
      if (data.users) setUsers(data.users);
      if (data.roles) setRoles(data.roles);
      if (data.auditLogs) setAuditLogs(data.auditLogs);
      if (data.backups) setBackups(data.backups);
    },
    []
  );

  const apiRequest = useCallback(
    async <T = any>(path: string, options: RequestInit = {}): Promise<T> => {
      if (!isOnline) {
        throw new Error('OFFLINE_MODE');
      }
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const res = await fetch(path, {
        ...options,
        headers,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `خطأ في الاتصال بالخادم (${res.status})`);
      }
      return data as T;
    },
    [isOnline, token]
  );

  const refreshAll = useCallback(async () => {
    if (!token) return;
    await loadLocalIndexedDbQueues();
    if (!isOnline) {
      const cached = await loadCachedBootstrapFromIndexedDB();
      if (cached) applyBootstrapState(cached);
      return;
    }
    try {
      const data = await apiRequest('/api/bootstrap');
      applyBootstrapState(data);
      await cacheBootstrapToIndexedDB(data);
    } catch (err) {
      const cached = await loadCachedBootstrapFromIndexedDB();
      if (cached) applyBootstrapState(cached);
    }
  }, [token, isOnline, apiRequest, applyBootstrapState, loadLocalIndexedDbQueues]);

  // Restore saved session on boot
  useEffect(() => {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY) || sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        if (parsed.user && parsed.token) {
          setUser(parsed.user);
          setToken(parsed.token);
        }
      } catch {
        // ignore invalid stored session
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (token) {
      refreshAll();
    }
  }, [token, refreshAll]);

  // Notify when switching to Offline Mode and auto-sync when returning Online
  useEffect(() => {
    if (!isOnline && user) {
      addNotification(
        'OFFLINE_MODE',
        'وضع عدم الاتصال نشط (Offline Mode)',
        'يتم حفظ الطلبات والمدفوعات محليًا في IndexedDB وستتم مزامنتها تلقائيًا فور عودة الإنترنت.'
      );
    }
  }, [isOnline, user, addNotification]);

  const syncOfflineQueue = useCallback(async () => {
    if (!isOnline || !token) return;
    const pending = await offlineDb.offlineQueue.where('status').equals('PENDING').sortBy('createdAt');
    if (pending.length === 0) return;

    try {
      const response = await apiRequest<{
        syncedCount: number;
        results: { id: string; status: string; error?: string }[];
      }>('/api/sync', {
        method: 'POST',
        body: JSON.stringify({
          operations: pending.map((item) => ({
            id: item.id,
            type: item.type,
            payload: item.payload,
            idempotencyKey: item.idempotencyKey,
          })),
        }),
      });

      for (const resItem of response.results) {
        if (resItem.status === 'SYNCED' || resItem.status === 'SKIPPED_IDEMPOTENT') {
          await offlineDb.offlineQueue.delete(resItem.id);
        } else {
          await offlineDb.offlineQueue.update(resItem.id, {
            status: 'FAILED',
            errorMessage: resItem.error,
          });
        }
      }

      await loadLocalIndexedDbQueues();
      await refreshAll();
      addNotification(
        'INFO',
        'تمت مزامنة العمليات المحلية بنجاح',
        `تمت مزامنة ${response.syncedCount} عملية مع الخادم بدون أي تكرار.`
      );
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ أثناء المزامنة', err.message || 'تعذر الاتصال بالخادم للمزامنة');
    }
  }, [isOnline, token, apiRequest, loadLocalIndexedDbQueues, refreshAll, addNotification]);

  useEffect(() => {
    if (isOnline && token && offlineQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline, token, offlineQueue.length, syncOfflineQueue]);

  const login = async (identifier: string, password: string, rememberMe = true) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password, rememberMe }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل تسجيل الدخول');
    }
    setUser(data.user);
    setToken(data.token);
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));
  };

  const loginWithGoogle = async () => {
    const fbUser = await signInWithGooglePopup();
    const res = await fetch('/api/auth/firebase-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'فشل تسجيل الدخول عبر Google');
    }
    setUser(data.user);
    setToken(data.token);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ user: data.user, token: data.token }));

    // Also sync a cloud checkpoint to Firestore
    syncSnapshotToFirestore({
      id: `login_${fbUser.uid}`,
      snapshotType: 'STATE_SYNC',
      version: 1,
      summary: `تسجيل دخول ${data.user.fullName} إلى نظام القصر الذهبي`,
    }).catch(() => {});
  };

  const logout = async () => {
    try {
      if (token && isOnline) {
        await apiRequest('/api/auth/logout', { method: 'POST' });
      }
      await signOutFirebase().catch(() => {});
    } finally {
      localStorage.removeItem(SESSION_STORAGE_KEY);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
      setUser(null);
      setToken(null);
    }
  };

  const can = useCallback(
    (permission: string) => {
      if (!user) return false;
      return hasPermission(user.role, permission);
    },
    [user]
  );

  const holdCart = async (cart: Omit<HeldCartRecord, 'id' | 'createdAt'>) => {
    const record: HeldCartRecord = {
      ...cart,
      id: `hold_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
    };
    await offlineDb.heldCarts.put(record);
    await loadLocalIndexedDbQueues();
    addNotification('INFO', 'تم تعليق الطلب (Hold)', `تم حفظ الطلب المعلق "${record.label}" للعودة إليه لاحقًا.`);
  };

  const removeHeldCart = async (id: string) => {
    await offlineDb.heldCarts.delete(id);
    await loadLocalIndexedDbQueues();
  };

  const createOrderAction = async (payload: any): Promise<Order> => {
    const idempotencyKey =
      payload.idempotencyKey || `idem_ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const fullPayload = { ...payload, idempotencyKey };

    if (isOnline) {
      try {
        const created = await apiRequest<Order>('/api/orders', {
          method: 'POST',
          body: JSON.stringify(fullPayload),
        });
        await refreshAll();
        addNotification(
          'NEW_ORDER',
          `طلب جديد #${created.orderNumber}`,
          `تم إرسال الطلب (${created.totalAmount.toLocaleString('en-US')} د.ج) إلى المطبخ.`
        );
        syncOrderToFirestore(created).catch(() => {});
        return created;
      } catch (err: any) {
        if (err.message !== 'OFFLINE_MODE' && !err.message.includes('Failed to fetch')) {
          throw err;
        }
      }
    }

    // Offline fallback execution with IndexedDB queue
    const now = new Date().toISOString();
    const offlineOrderId = `ord_off_${Date.now()}`;
    const offlineOrderNumber = `GP-OFF-${(orders.length + 1001).toString()}`;

    const builtItems = fullPayload.items.map((itemInput: any, idx: number) => {
      const product = products.find((p) => p.id === itemInput.productId);
      const basePrice = product ? product.price : 0;
      const variant = product?.variants.find((v) => v.id === itemInput.variantId);
      const unitPrice = basePrice + (variant?.priceDelta || 0);
      const selectedAddons = (itemInput.addonIds || [])
        .map((aid: string) => product?.addons.find((a) => a.id === aid))
        .filter(Boolean)
        .map((a: any) => ({ id: a.id, addonId: a.id, nameAr: a.nameAr, price: a.price }));
      const addonsTotal = selectedAddons.reduce((s: number, a: any) => s + a.price, 0);
      const subtotal = (unitPrice + addonsTotal) * itemInput.quantity;

      return {
        id: `oi_off_${idx}_${Date.now()}`,
        orderId: offlineOrderId,
        productId: itemInput.productId,
        productNameAr: product?.nameAr || 'صنف',
        variantId: itemInput.variantId,
        variantNameAr: variant?.nameAr,
        quantity: itemInput.quantity,
        unitPrice,
        unitCost: product?.cost || 0,
        addons: selectedAddons,
        addonsTotal,
        subtotal,
        kitchenStation: product?.kitchenStation || 'MAIN_KITCHEN',
        kitchenStatus: (fullPayload.status === 'HELD' ? 'HELD' : 'NEW') as OrderStatus,
        notes: itemInput.notes || '',
        paidQuantity: 0,
      };
    });

    const subtotal = builtItems.reduce((s: number, i: any) => s + i.subtotal, 0);
    const discountAmount = Number(fullPayload.discountAmount || 0);
    const taxable = Math.max(0, subtotal - discountAmount);
    const taxAmount = settings.taxEnabled ? Math.round((taxable * settings.taxRatePercent) / 100) : 0;
    const deliveryFee = fullPayload.orderType === 'DELIVERY' ? Number(fullPayload.deliveryFee || settings.defaultDeliveryFee) : 0;
    const totalAmount = taxable + taxAmount + deliveryFee;

    const tbl = fullPayload.tableId ? tables.find((t) => t.id === fullPayload.tableId) : null;

    const localOrder: Order = {
      id: offlineOrderId,
      orderNumber: offlineOrderNumber,
      idempotencyKey,
      orderType: fullPayload.orderType,
      status: fullPayload.status || 'NEW',
      paymentStatus: 'UNPAID',
      tableId: fullPayload.tableId || null,
      tableName: tbl?.nameAr || null,
      customerId: fullPayload.customerId || null,
      customerName: fullPayload.customerName || null,
      customerPhone: fullPayload.customerPhone || null,
      deliveryAddress: fullPayload.deliveryAddress || null,
      items: builtItems,
      subtotal,
      discountAmount,
      taxAmount,
      deliveryFee,
      totalAmount,
      paidAmount: 0,
      notes: fullPayload.notes || '',
      createdBy: user?.id || 'usr_cashier',
      createdByName: user?.fullName || 'الكاشير',
      inventoryDeducted: false,
      createdAt: now,
      updatedAt: now,
    };

    setOrders((prev) => [localOrder, ...prev]);
    if (tbl && localOrder.status !== 'HELD') {
      setTables((prev) =>
        prev.map((t) => (t.id === tbl.id ? { ...t, status: 'OCCUPIED' as TableStatus, currentOrderId: localOrder.id } : t))
      );
    }

    await offlineDb.orders.put(localOrder);
    await enqueueOfflineOperation(
      'CREATE_ORDER',
      fullPayload,
      `إنشاء طلب محلي #${localOrder.orderNumber} (${localOrder.totalAmount} د.ج)`,
      idempotencyKey
    );
    await loadLocalIndexedDbQueues();
    addNotification(
      'OFFLINE_MODE',
      `تم حفظ الطلب #${localOrder.orderNumber} محليًا`,
      'سيتم إرساله للخادم تلقائيًا عند استعادة الاتصال بالإنترنت.'
    );
    return localOrder;
  };

  const updateOrderStatusAction = async (
    orderId: string,
    status: OrderStatus,
    stationFilter?: string,
    deliveryDriver?: string
  ): Promise<Order> => {
    if (isOnline) {
      const updated = await apiRequest<Order>(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, stationFilter, deliveryDriver }),
      });
      await refreshAll();
      if (status === 'READY') {
        addNotification(
          'KITCHEN_READY',
          `الطلب #${updated.orderNumber} جاهز للتقديم!`,
          updated.tableName ? `الطاولة: ${updated.tableName}` : 'جاهز للاستلام من المطبخ'
        );
      }
      return updated;
    }

    const idempotencyKey = `idem_status_${orderId}_${status}_${Date.now()}`;
    let updatedOrder: Order | null = null;
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id !== orderId) return o;
        updatedOrder = { ...o, status, updatedAt: new Date().toISOString() };
        return updatedOrder;
      })
    );
    await enqueueOfflineOperation(
      'UPDATE_ORDER_STATUS',
      { orderId, status, stationFilter, deliveryDriver },
      `تحديث حالة الطلب إلى ${status}`,
      idempotencyKey
    );
    await loadLocalIndexedDbQueues();
    return updatedOrder!;
  };

  const processPaymentAction = async (payload: {
    orderId: string;
    idempotencyKey?: string;
    allocations: PaymentAllocation[];
    splitItemQuantities?: { orderItemId: string; quantity: number }[];
  }): Promise<{ payment: PaymentRecord; order: Order }> => {
    const idempotencyKey =
      payload.idempotencyKey || `idem_pay_${ payload.orderId }_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const fullPayload = { ...payload, idempotencyKey };

    if (isOnline) {
      const res = await apiRequest<{ payment: PaymentRecord; order: Order }>('/api/payments', {
        method: 'POST',
        body: JSON.stringify(fullPayload),
      });
      await refreshAll();
      addNotification(
        'PAYMENT_SUCCESS',
        `تم تحصيل دفعة الطلب #${res.order.orderNumber}`,
        `المبلغ المحصل: ${res.payment.totalDue.toLocaleString('en-US')} د.ج`
      );
      return res;
    }

    // Offline payment handling
    const targetOrder = orders.find((o) => o.id === payload.orderId);
    if (!targetOrder) throw new Error('الطلب غير موجود');
    const remaining = Math.max(0, targetOrder.totalAmount - targetOrder.paidAmount);
    const totalTendered = payload.allocations.reduce((s, a) => s + Number(a.amount), 0);
    const effectivePaid = Math.min(remaining, totalTendered);
    const changeGiven = Math.max(0, totalTendered - remaining);

    const updatedOrder: Order = {
      ...targetOrder,
      paidAmount: targetOrder.paidAmount + effectivePaid,
      paymentStatus: targetOrder.paidAmount + effectivePaid >= targetOrder.totalAmount - 0.01 ? 'PAID' : 'PARTIAL',
      updatedAt: new Date().toISOString(),
    };

    const offlinePayment: PaymentRecord = {
      id: `pay_off_${Date.now()}`,
      orderId: targetOrder.id,
      orderNumber: targetOrder.orderNumber,
      idempotencyKey,
      totalDue: effectivePaid,
      totalTendered,
      changeGiven,
      allocations: payload.allocations,
      status: 'COMPLETED',
      cashierId: user?.id || 'usr_cashier',
      cashierName: user?.fullName || 'الكاشير',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => prev.map((o) => (o.id === targetOrder.id ? updatedOrder : o)));
    setPayments((prev) => [offlinePayment, ...prev]);

    await enqueueOfflineOperation(
      'PROCESS_PAYMENT',
      fullPayload,
      `تحصيل دفعة محليًا للطلب #${targetOrder.orderNumber} (${effectivePaid} د.ج)`,
      idempotencyKey
    );
    await loadLocalIndexedDbQueues();
    addNotification(
      'PAYMENT_SUCCESS',
      `تم تسجيل الدفعة محليًا #${targetOrder.orderNumber}`,
      'محفوظة في طابور عدم الاتصال (Offline Queue) بمفتاح منع التكرار.'
    );
    return { payment: offlinePayment, order: updatedOrder };
  };

  const refundOrderAction = async (orderId: string, reason: string) => {
    await apiRequest(`/api/orders/${orderId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await refreshAll();
    addNotification('INFO', 'تم استرجاع الطلب', `تم تسجيل عملية الاسترجاع وتحديث الصندوق.`);
  };

  return (
    <PosContext.Provider
      value={{
        user,
        token,
        isLoading,
        isOnline,
        simulatedOffline,
        setSimulatedOffline,
        offlineQueue,
        heldCarts,
        notifications,
        markNotificationsRead,
        addNotification,
        settings,
        categories,
        products,
        priceHistory,
        tableZones,
        tables,
        orders,
        payments,
        cashShifts,
        cashTransactions,
        ingredients,
        stockMovements,
        wasteRecords,
        stockCounts,
        suppliers,
        purchases,
        customers,
        expenses,
        users,
        roles,
        auditLogs,
        backups,
        login,
        loginWithGoogle,
        logout,
        can,
        refreshAll,
        syncOfflineQueue,
        holdCart,
        removeHeldCart,
        createOrderAction,
        updateOrderStatusAction,
        processPaymentAction,
        refundOrderAction,
        apiRequest,
      }}
    >
      {children}
    </PosContext.Provider>
  );
};

export function usePos() {
  const ctx = useContext(PosContext);
  if (!ctx) throw new Error('usePos must be used within PosProvider');
  return ctx;
}
