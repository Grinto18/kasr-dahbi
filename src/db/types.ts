import { z } from 'zod';

export type RoleCode = 'ADMIN' | 'MANAGER' | 'CASHIER' | 'WAITER' | 'KITCHEN' | 'INVENTORY';

export type KitchenStationCode = 'MAIN_KITCHEN' | 'GRILL' | 'DRINKS' | 'DESSERT';

export type OrderType = 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';

export type OrderStatus =
  | 'NEW'
  | 'CONFIRMED'
  | 'PREPARING'
  | 'READY'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'HELD';

export type PaymentStatus = 'UNPAID' | 'PARTIAL' | 'PAID' | 'REFUNDED';

export type PaymentMethodCode = 'CASH' | 'CARD' | 'CCP' | 'BARIDIMOB' | 'OTHER';

export type TableStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'CLEANING';

export type StockMovementType =
  | 'STOCK_IN'
  | 'STOCK_OUT'
  | 'ADJUSTMENT'
  | 'WASTE'
  | 'PURCHASE'
  | 'SALE_DEDUCTION'
  | 'STOCK_COUNT';

export type WasteReason = 'Expired' | 'Damaged' | 'Burned' | 'Spilled' | 'Other';

export type ExpenseCategory =
  | 'Electricity'
  | 'Gas'
  | 'Rent'
  | 'Transport'
  | 'Maintenance'
  | 'Supplies'
  | 'Salaries'
  | 'Other';

export interface Role {
  id: string;
  code: RoleCode;
  nameAr: string;
  nameEn: string;
  permissions: string[];
}

export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  passwordHash?: string;
  pinCode?: string;
  phone: string;
  role: RoleCode;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
}

export interface Category {
  id: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  priceDelta: number;
  isDefault: boolean;
}

export interface ProductAddon {
  id: string;
  productId: string;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  price: number;
  isAvailable: boolean;
}

export interface RecipeItem {
  id: string;
  ingredientId: string;
  ingredientNameAr: string;
  quantity: number; // in ingredient's unit
  unitCode: string;
}

export interface Product {
  id: string;
  categoryId: string;
  kitchenStation: KitchenStationCode;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  description: string;
  price: number;
  cost: number;
  imageUrl: string;
  barcode: string;
  isAvailable: boolean;
  isDeleted: boolean;
  preparationTimeMinutes: number;
  variants: ProductVariant[];
  addons: ProductAddon[];
  recipe: RecipeItem[];
  createdAt: string;
  updatedAt: string;
}

export interface PriceHistoryRecord {
  id: string;
  productId: string;
  productNameAr: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedByName: string;
  changedAt: string;
}

export interface TableZone {
  id: string;
  nameAr: string;
  nameFr: string;
  sortOrder: number;
}

export interface RestaurantTable {
  id: string;
  zoneId: string;
  zoneNameAr: string;
  number: string;
  nameAr: string;
  capacity: number;
  status: TableStatus;
  currentOrderId?: string | null;
  mergedWithTableId?: string | null;
  reservationName?: string;
  reservationTime?: string;
  updatedAt: string;
}

export interface OrderItemAddon {
  id: string;
  addonId: string;
  nameAr: string;
  price: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productNameAr: string;
  variantId?: string;
  variantNameAr?: string;
  quantity: number;
  unitPrice: number; // Immutable historical price
  unitCost: number;
  addons: OrderItemAddon[];
  addonsTotal: number;
  subtotal: number;
  kitchenStation: KitchenStationCode;
  kitchenStatus: OrderStatus;
  notes: string;
  paidQuantity: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  idempotencyKey: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  tableId?: string | null;
  tableName?: string | null;
  customerId?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  deliveryAddress?: string | null;
  deliveryDriver?: string | null;
  items: OrderItem[];
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  deliveryFee: number;
  totalAmount: number;
  paidAmount: number;
  notes: string;
  createdBy: string;
  createdByName: string;
  inventoryDeducted: boolean;
  createdAt: string;
  updatedAt: string;
  startedPreparingAt?: string;
  readyAt?: string;
  completedAt?: string;
}

export interface PaymentAllocation {
  method: PaymentMethodCode;
  amount: number;
  referenceNumber?: string;
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  idempotencyKey: string;
  totalDue: number;
  totalTendered: number;
  changeGiven: number;
  allocations: PaymentAllocation[];
  status: 'COMPLETED' | 'REFUNDED';
  cashierId: string;
  cashierName: string;
  createdAt: string;
}

export interface CashShift {
  id: string;
  registerId: string;
  openedBy: string;
  openedByName: string;
  closedBy?: string;
  closedByName?: string;
  openingBalance: number;
  cashSales: number;
  cardSales: number;
  ccpSales: number;
  baridimobSales: number;
  otherSales: number;
  expensesTotal: number;
  refundsTotal: number;
  cashInTotal: number;
  cashOutTotal: number;
  expectedCash: number;
  actualCash?: number | null;
  difference?: number | null;
  status: 'OPEN' | 'CLOSED';
  notes: string;
  openedAt: string;
  closedAt?: string;
}

export interface CashTransaction {
  id: string;
  shiftId: string;
  type: 'OPENING' | 'SALE' | 'EXPENSE' | 'REFUND' | 'CASH_IN' | 'CASH_OUT' | 'CLOSING';
  amount: number;
  reason: string;
  referenceId?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Ingredient {
  id: string;
  nameAr: string;
  nameEn: string;
  unitCode: 'g' | 'kg' | 'ml' | 'l' | 'pcs';
  unitNameAr: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  supplierId?: string | null;
  supplierName?: string | null;
  updatedAt: string;
}

export interface StockMovement {
  id: string;
  ingredientId: string;
  ingredientNameAr: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  referenceId?: string;
  notes: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface WasteRecord {
  id: string;
  ingredientId: string;
  ingredientNameAr: string;
  unitCode: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  reason: WasteReason;
  notes: string;
  reportedBy: string;
  reportedByName: string;
  reportedAt: string;
}

export interface StockCountRecord {
  id: string;
  notes: string;
  countedBy: string;
  countedByName: string;
  countedAt: string;
  items: {
    ingredientId: string;
    ingredientNameAr: string;
    unitCode: string;
    systemQuantity: number;
    actualQuantity: number;
    difference: number;
  }[];
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  totalPurchases: number;
  createdAt: string;
}

export interface PurchaseRecord {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  supplierName: string;
  totalAmount: number;
  notes: string;
  items: {
    ingredientId: string;
    ingredientNameAr: string;
    unitCode: string;
    quantity: number;
    unitCost: number;
    totalCost: number;
  }[];
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  notes: string;
  totalOrders: number;
  totalSpent: number;
  createdAt: string;
}

export interface ExpenseRecord {
  id: string;
  category: ExpenseCategory;
  categoryNameAr: string;
  amount: number;
  description: string;
  paidFromCashRegister: boolean;
  expenseDate: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  userId: string;
  userName: string;
  userRole: RoleCode;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface RestaurantSettings {
  restaurantName: string;
  brandTitle: string;
  address: string;
  landmark: string;
  phone: string;
  currency: string;
  language: 'ar' | 'fr' | 'en';
  rtl: boolean;
  themeAccent: 'gold' | 'emerald' | 'royal';
  receiptSize: '58mm' | '80mm' | 'A4';
  printerName: string;
  autoPrintReceipt: boolean;
  taxEnabled: boolean;
  taxRatePercent: number;
  maxDiscountPercent: number;
  defaultDeliveryFee: number;
  receiptFooterMessage: string;

  // Thermal Receipt Header Customization
  logoUrl?: string;
  showLogo?: boolean;
  receiptHeaderMessage?: string;
  taxId?: string; // NIF: Numéro d'Identification Fiscale
  commercialRegister?: string; // RC: Registre de Commerce
  statisticalId?: string; // NIS: Numéro d'Identification Statistique
  articleNumber?: string; // ART: Numéro d'Article d'Imposition
  showTaxId?: boolean;

  // Thermal Receipt Content & Details
  showCashierName?: boolean;
  showCustomerInfo?: boolean;
  showTableInfo?: boolean;
  showOrderType?: boolean;
  showItemAddons?: boolean;
  showItemNotes?: boolean;
  showPaymentBreakdown?: boolean;

  // Thermal Receipt Footer Customization
  showWifiInfo?: boolean;
  wifiSsid?: string;
  wifiPassword?: string;
  showSocialMedia?: boolean;
  socialHandle?: string;
  showReturnPolicy?: boolean;
  returnPolicyText?: string;
  showBarcode?: boolean;
  showQrCode?: boolean;
  qrCodeUrl?: string;
  receiptFontDensity?: 'comfortable' | 'normal' | 'compact';
}

export interface BackupMetadata {
  id: string;
  filename: string;
  backupType: 'MANUAL' | 'AUTO_PRE_RESTORE' | 'AUTO_DAILY';
  sizeBytes: number;
  recordsCount: number;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  snapshot?: PosDatabaseState;
}

export interface PosDatabaseState {
  version: number;
  settings: RestaurantSettings;
  roles: Role[];
  users: User[];
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
  wasteRecords: WasteRecord[];
  stockCounts: StockCountRecord[];
  suppliers: Supplier[];
  purchases: PurchaseRecord[];
  customers: Customer[];
  expenses: ExpenseRecord[];
  auditLogs: AuditLogRecord[];
  backups: BackupMetadata[];
}

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

export const LoginSchema = z.object({
  identifier: z.string().min(1, 'يرجى إدخال اسم المستخدم أو البريد الإلكتروني'),
  password: z.string().min(1, 'يرجى إدخال كلمة المرور'),
  rememberMe: z.boolean().optional().default(true),
});

export const ProductInputSchema = z.object({
  categoryId: z.string().min(1, 'الفئة مطلوبة'),
  kitchenStation: z.enum(['MAIN_KITCHEN', 'GRILL', 'DRINKS', 'DESSERT']).default('MAIN_KITCHEN'),
  nameAr: z.string().min(1, 'الاسم بالعربية مطلوب').max(160),
  nameFr: z.string().max(160).optional().default(''),
  nameEn: z.string().max(160).optional().default(''),
  description: z.string().max(500).optional().default(''),
  price: z.number().min(0, 'السعر يجب أن يكون موجبًا'),
  cost: z.number().min(0).optional().default(0),
  imageUrl: z.string().optional().default(''),
  barcode: z.string().optional().default(''),
  isAvailable: z.boolean().optional().default(true),
  preparationTimeMinutes: z.number().min(1).max(180).optional().default(15),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        nameAr: z.string().min(1),
        nameFr: z.string().optional().default(''),
        nameEn: z.string().optional().default(''),
        priceDelta: z.number().default(0),
        isDefault: z.boolean().optional().default(false),
      })
    )
    .optional()
    .default([]),
  addons: z
    .array(
      z.object({
        id: z.string().optional(),
        nameAr: z.string().min(1),
        nameFr: z.string().optional().default(''),
        nameEn: z.string().optional().default(''),
        price: z.number().min(0),
        isAvailable: z.boolean().optional().default(true),
      })
    )
    .optional()
    .default([]),
  recipe: z
    .array(
      z.object({
        id: z.string().optional(),
        ingredientId: z.string().min(1),
        ingredientNameAr: z.string().optional().default(''),
        quantity: z.number().positive(),
        unitCode: z.string().default('g'),
      })
    )
    .optional()
    .default([]),
});

export const CreateOrderSchema = z.object({
  idempotencyKey: z.string().min(4).max(128),
  orderType: z.enum(['DINE_IN', 'TAKEAWAY', 'DELIVERY']),
  status: z.enum(['NEW', 'CONFIRMED', 'PREPARING', 'READY', 'HELD']).optional().default('NEW'),
  tableId: z.string().nullable().optional(),
  customerId: z.string().nullable().optional(),
  customerName: z.string().nullable().optional(),
  customerPhone: z.string().nullable().optional(),
  deliveryAddress: z.string().nullable().optional(),
  deliveryDriver: z.string().nullable().optional(),
  deliveryFee: z.number().min(0).optional().default(0),
  discountAmount: z.number().min(0).optional().default(0),
  notes: z.string().max(500).optional().default(''),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        variantId: z.string().optional(),
        quantity: z.number().int().positive(),
        notes: z.string().optional().default(''),
        addonIds: z.array(z.string()).optional().default([]),
      })
    )
    .min(1, 'يجب إضافة منتج واحد على الأقل للطلب'),
});

export const ProcessPaymentSchema = z.object({
  orderId: z.string().min(1),
  idempotencyKey: z.string().min(4).max(128),
  allocations: z
    .array(
      z.object({
        method: z.enum(['CASH', 'CARD', 'CCP', 'BARIDIMOB', 'OTHER']),
        amount: z.number().positive('مبلغ الدفع يجب أن يكون أكبر من صفر'),
        referenceNumber: z.string().optional(),
      })
    )
    .min(1, 'يجب تحديد طريقة دفع واحدة على الأقل'),
  splitItemQuantities: z
    .array(
      z.object({
        orderItemId: z.string(),
        quantity: z.number().int().positive(),
      })
    )
    .optional(),
});

// ============================================================================
// RBAC PERMISSIONS MATRIX
// ============================================================================

export const ROLE_PERMISSIONS: Record<RoleCode, string[]> = {
  ADMIN: [
    'dashboard:view',
    'pos:use',
    'pos:discount',
    'orders:view',
    'orders:cancel',
    'orders:refund',
    'tables:manage',
    'kitchen:view',
    'kitchen:update',
    'menu:manage',
    'inventory:manage',
    'purchases:manage',
    'customers:manage',
    'delivery:manage',
    'expenses:manage',
    'cash:manage',
    'reports:view',
    'employees:manage',
    'settings:manage',
    'backups:manage',
  ],
  MANAGER: [
    'dashboard:view',
    'pos:use',
    'pos:discount',
    'orders:view',
    'orders:cancel',
    'orders:refund',
    'tables:manage',
    'kitchen:view',
    'kitchen:update',
    'menu:manage',
    'inventory:manage',
    'purchases:manage',
    'customers:manage',
    'delivery:manage',
    'expenses:manage',
    'cash:manage',
    'reports:view',
    'employees:manage',
  ],
  CASHIER: [
    'dashboard:view',
    'pos:use',
    'pos:discount',
    'orders:view',
    'tables:manage',
    'customers:manage',
    'delivery:manage',
    'expenses:manage',
    'cash:manage',
  ],
  WAITER: [
    'pos:use',
    'orders:view',
    'tables:manage',
    'kitchen:view',
  ],
  KITCHEN: [
    'kitchen:view',
    'kitchen:update',
  ],
  INVENTORY: [
    'inventory:manage',
    'purchases:manage',
    'reports:view',
  ],
};

export function hasPermission(role: RoleCode, permission: string): boolean {
  if (role === 'ADMIN') return true;
  return (ROLE_PERMISSIONS[role] || []).includes(permission);
}
