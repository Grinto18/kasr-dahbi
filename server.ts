import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { posDb } from './src/db/engine.ts';
import {
  CreateOrderSchema,
  hasPermission,
  LoginSchema,
  ProcessPaymentSchema,
  ProductInputSchema,
  type RoleCode,
} from './src/db/types.ts';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'golden-palace-pos-secret-key-hussein-dey-2026';
const PORT = Number(process.env.PORT || 3000);

export interface AuthUserPayload {
  id: string;
  username: string;
  email: string;
  fullName: string;
  role: RoleCode;
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUserPayload;
}

function signToken(user: AuthUserPayload, rememberMe = true): string {
  return jwt.sign(user, JWT_SECRET, { expiresIn: rememberMe ? '30d' : '12h' });
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'غير مصرح: يرجى تسجيل الدخول أولاً' });
  }
  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AuthUserPayload;
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجددًا' });
  }
}

function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'غير مصرح' });
    }
    if (!hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        error: `ليس لديك صلاحية (${permission}) لتنفيذ هذه العملية. دورك الحالي: ${req.user.role}`,
      });
    }
    next();
  };
}

export function createPosExpressApp() {
  const app = express();

  // Security headers & JSON body parser
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
  app.use(express.json({ limit: '10mb' }));

  // 1. HEALTH CHECK
  app.get('/api/health', (_req, res) => {
    const state = posDb.getState();
    res.json({
      status: 'ok',
      app: 'GOLDEN PALACE POS',
      restaurant: state.settings.restaurantName,
      version: state.version,
      timestamp: new Date().toISOString(),
    });
  });

  // 2. AUTHENTICATION (/api/auth)
  app.post('/api/auth/login', (req, res) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات غير صالحة' });
      }
      const user = posDb.authenticateUser(parsed.data.identifier, parsed.data.password);
      if (!user) {
        return res.status(401).json({ error: 'اسم المستخدم أو كلمة المرور غير صحيحة' });
      }
      const payload: AuthUserPayload = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      const token = signToken(payload, parsed.data.rememberMe);
      return res.json({ user, token });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'فشل تسجيل الدخول' });
    }
  });

  app.post('/api/auth/firebase-sync', (req, res) => {
    try {
      const { uid, email, displayName } = req.body;
      if (!uid || !email) {
        return res.status(400).json({ error: 'بيانات حساب Google غير مكتملة' });
      }
      const user = posDb.getOrCreateFirebaseUser(uid, email, displayName);
      const payload: AuthUserPayload = {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      };
      const token = signToken(payload, true);
      return res.json({ user, token });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'فشل مزامنة حساب Google' });
    }
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res) => {
    const users = posDb.getUsers();
    const found = users.find((u) => u.id === req.user?.id);
    if (!found) {
      return res.status(404).json({ error: 'المستخدم غير موجود' });
    }
    return res.json({ user: found });
  });

  app.post('/api/auth/logout', requireAuth, (req: AuthenticatedRequest, res) => {
    if (req.user) {
      posDb.logAudit(req.user, 'LOGOUT', 'USER', `تسجيل خروج ${req.user.fullName}`, req.user.id);
    }
    return res.json({ success: true });
  });

  // 3. BOOTSTRAP STATE (Fast initial load & offline cache seed)
  app.get('/api/bootstrap', requireAuth, (_req: AuthenticatedRequest, res) => {
    const state = posDb.getState();
    const safeUsers = posDb.getUsers();
    const { backups, ...restState } = state;
    const backupMetaWithoutSnapshots = backups.map(({ snapshot: _, ...meta }) => meta);
    res.json({
      ...restState,
      users: safeUsers,
      backups: backupMetaWithoutSnapshots,
    });
  });

  // 4. USERS & ROLES (/api/users)
  app.get('/api/users', requireAuth, requirePermission('employees:manage'), (_req, res) => {
    res.json({ users: posDb.getUsers(), roles: posDb.getState().roles });
  });

  app.post('/api/users', requireAuth, requirePermission('employees:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const created = posDb.createUser(req.user!, req.body);
      res.status(201).json(created);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/users/:id', requireAuth, requirePermission('employees:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const updated = posDb.updateUser(req.user!, req.params.id, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 5. CATEGORIES (/api/categories)
  app.get('/api/categories', requireAuth, (_req, res) => {
    const categories = [...posDb.getState().categories].sort((a, b) => a.sortOrder - b.sortOrder);
    res.json(categories);
  });

  app.post('/api/categories', requireAuth, requirePermission('menu:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const cat = posDb.createCategory(req.user!, req.body);
      res.status(201).json(cat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/categories/:id', requireAuth, requirePermission('menu:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const cat = posDb.updateCategory(req.user!, req.params.id, req.body);
      res.json(cat);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/categories/:id', requireAuth, requirePermission('menu:manage'), (req: AuthenticatedRequest, res) => {
    try {
      posDb.deleteCategory(req.user!, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 6. PRODUCTS & PRICE HISTORY (/api/products)
  app.get('/api/products', requireAuth, (req, res) => {
    const includeDeleted = req.query.includeDeleted === 'true';
    const products = posDb.getState().products.filter((p) => includeDeleted || !p.isDeleted);
    res.json(products);
  });

  app.get('/api/products/price-history', requireAuth, (_req, res) => {
    res.json(posDb.getState().priceHistory);
  });

  app.post('/api/products', requireAuth, requirePermission('menu:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const parsed = ProductInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات المنتج غير صالحة' });
      }
      const product = posDb.createProduct(req.user!, parsed.data);
      res.status(201).json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/products/:id', requireAuth, requirePermission('menu:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const product = posDb.updateProduct(req.user!, req.params.id, req.body);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/products/:id', requireAuth, requirePermission('menu:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const deleted = posDb.safeDeleteProduct(req.user!, req.params.id);
      res.json(deleted);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 7. ORDERS (/api/orders)
  app.get('/api/orders', requireAuth, (_req, res) => {
    res.json(posDb.getState().orders);
  });

  app.post('/api/orders', requireAuth, requirePermission('pos:use'), (req: AuthenticatedRequest, res) => {
    try {
      const parsed = CreateOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الطلب غير صالحة' });
      }
      const order = posDb.createOrder(req.user!, parsed.data);
      res.status(201).json(order);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/orders/:id/status', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { status, stationFilter, deliveryDriver } = req.body;
      const updated = posDb.updateOrderStatus(req.user!, req.params.id, status, stationFilter, deliveryDriver);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/orders/:id/refund', requireAuth, requirePermission('orders:refund'), (req: AuthenticatedRequest, res) => {
    try {
      const { reason } = req.body;
      const updated = posDb.refundOrder(req.user!, req.params.id, reason || 'استرجاع بطلب العميل');
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 8. PAYMENTS (/api/payments)
  app.get('/api/payments', requireAuth, (_req, res) => {
    res.json(posDb.getState().payments);
  });

  app.post('/api/payments', requireAuth, requirePermission('pos:use'), (req: AuthenticatedRequest, res) => {
    try {
      const parsed = ProcessPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.issues[0]?.message || 'بيانات الدفع غير صالحة' });
      }
      const result = posDb.processPayment(req.user!, parsed.data);
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 9. TABLES (/api/tables)
  app.get('/api/tables', requireAuth, (_req, res) => {
    const state = posDb.getState();
    res.json({ zones: state.tableZones, tables: state.tables });
  });

  app.post('/api/tables/zones', requireAuth, requirePermission('tables:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const zone = posDb.createZone(req.user!, req.body.nameAr, req.body.nameFr);
      res.status(201).json(zone);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/tables', requireAuth, requirePermission('tables:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const table = posDb.createTable(req.user!, req.body);
      res.status(201).json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/tables/:id', requireAuth, requirePermission('tables:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const table = posDb.updateTableStatus(req.user!, req.params.id, req.body.status, req.body);
      res.json(table);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/tables/transfer-or-merge', requireAuth, requirePermission('tables:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const { sourceTableId, targetTableId, mode } = req.body;
      const result = posDb.transferOrMergeTables(req.user!, sourceTableId, targetTableId, mode);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 10. KITCHEN KDS (/api/kitchen)
  app.get('/api/kitchen', requireAuth, (req, res) => {
    const station = req.query.station as string | undefined;
    const activeOrders = posDb
      .getState()
      .orders.filter((o) => o.status !== 'HELD')
      .map((o) => {
        if (!station || station === 'ALL') return o;
        return {
          ...o,
          items: o.items.filter((i) => i.kitchenStation === station),
        };
      })
      .filter((o) => o.items.length > 0);
    res.json(activeOrders);
  });

  // 11. INVENTORY, WASTE, STOCK COUNT & RECIPES (/api/inventory, /api/recipes)
  app.get('/api/inventory', requireAuth, (_req, res) => {
    const state = posDb.getState();
    res.json({
      ingredients: state.ingredients,
      movements: state.stockMovements,
      wasteRecords: state.wasteRecords,
      stockCounts: state.stockCounts,
    });
  });

  app.post('/api/inventory/ingredients', requireAuth, requirePermission('inventory:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const ing = posDb.createIngredient(req.user!, req.body);
      res.status(201).json(ing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/inventory/adjust', requireAuth, requirePermission('inventory:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const ing = posDb.adjustIngredientStock(req.user!, req.body);
      res.json(ing);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/inventory/waste', requireAuth, requirePermission('inventory:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const waste = posDb.recordWaste(req.user!, req.body);
      res.status(201).json(waste);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/inventory/stock-count', requireAuth, requirePermission('inventory:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const count = posDb.performStockCount(req.user!, req.body);
      res.status(201).json(count);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/recipes', requireAuth, (_req, res) => {
    const products = posDb.getState().products.filter((p) => !p.isDeleted);
    res.json(products.map((p) => ({ productId: p.id, productNameAr: p.nameAr, recipe: p.recipe })));
  });

  app.patch('/api/recipes/:productId', requireAuth, requirePermission('inventory:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const updated = posDb.updateProduct(req.user!, req.params.productId, { recipe: req.body.recipe });
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 12. SUPPLIERS & PURCHASES (/api/suppliers, /api/purchases)
  app.get('/api/suppliers', requireAuth, (_req, res) => {
    res.json(posDb.getState().suppliers);
  });

  app.post('/api/suppliers', requireAuth, requirePermission('purchases:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const sup = posDb.createSupplier(req.user!, req.body);
      res.status(201).json(sup);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/suppliers/:id', requireAuth, requirePermission('purchases:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const sup = posDb.updateSupplier(req.user!, req.params.id, req.body);
      res.json(sup);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.delete('/api/suppliers/:id', requireAuth, requirePermission('purchases:manage'), (req: AuthenticatedRequest, res) => {
    try {
      posDb.deleteSupplier(req.user!, req.params.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/purchases', requireAuth, (_req, res) => {
    res.json(posDb.getState().purchases);
  });

  app.post('/api/purchases', requireAuth, requirePermission('purchases:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const purchase = posDb.createPurchase(req.user!, req.body);
      res.status(201).json(purchase);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 13. CUSTOMERS & DELIVERY (/api/customers, /api/delivery)
  app.get('/api/customers', requireAuth, (_req, res) => {
    res.json(posDb.getState().customers);
  });

  app.post('/api/customers', requireAuth, requirePermission('customers:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const cust = posDb.createCustomer(req.user!, req.body);
      res.status(201).json(cust);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.patch('/api/customers/:id', requireAuth, requirePermission('customers:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const cust = posDb.updateCustomer(req.user!, req.params.id, req.body);
      res.json(cust);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/delivery', requireAuth, (_req, res) => {
    const deliveryOrders = posDb.getState().orders.filter((o) => o.orderType === 'DELIVERY');
    res.json(deliveryOrders);
  });

  // 14. EXPENSES (/api/expenses)
  app.get('/api/expenses', requireAuth, (_req, res) => {
    res.json(posDb.getState().expenses);
  });

  app.post('/api/expenses', requireAuth, requirePermission('expenses:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const exp = posDb.createExpense(req.user!, req.body);
      res.status(201).json(exp);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 15. CASH REGISTER (/api/cash-register)
  app.get('/api/cash-register', requireAuth, (_req, res) => {
    const state = posDb.getState();
    res.json({
      shifts: state.cashShifts,
      activeShift: state.cashShifts.find((s) => s.status === 'OPEN') || null,
      transactions: state.cashTransactions,
    });
  });

  app.post('/api/cash-register/open', requireAuth, requirePermission('cash:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const shift = posDb.openCashShift(req.user!, Number(req.body.openingBalance || 0), req.body.notes);
      res.status(201).json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/cash-register/movement', requireAuth, requirePermission('cash:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const shift = posDb.addCashMovement(req.user!, req.body.type, Number(req.body.amount), req.body.reason);
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.post('/api/cash-register/close', requireAuth, requirePermission('cash:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const shift = posDb.closeCashShift(req.user!, Number(req.body.actualCash), req.body.notes);
      res.json(shift);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  // 16. REPORTS (/api/reports)
  app.get('/api/reports', requireAuth, (req, res) => {
    const state = posDb.getState();
    const fromDate = (req.query.from as string) || '2000-01-01';
    const toDate = (req.query.to as string) || '2099-12-31';

    const validOrders = state.orders.filter((o) => {
      const dateStr = o.createdAt.slice(0, 10);
      return o.status !== 'CANCELLED' && o.status !== 'HELD' && dateStr >= fromDate && dateStr <= toDate;
    });

    const filteredExpenses = state.expenses.filter((e) => e.expenseDate >= fromDate && e.expenseDate <= toDate);
    const filteredPayments = state.payments.filter((p) => {
      const dateStr = p.createdAt.slice(0, 10);
      return p.status === 'COMPLETED' && dateStr >= fromDate && dateStr <= toDate;
    });

    const totalSales = validOrders.reduce((s, o) => s + o.totalAmount, 0);
    const totalCostOfGoods = validOrders.reduce(
      (s, o) => s + o.items.reduce((is, item) => is + item.unitCost * item.quantity, 0),
      0
    );
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const totalWasteCost = state.wasteRecords
      .filter((w) => w.reportedAt.slice(0, 10) >= fromDate && w.reportedAt.slice(0, 10) <= toDate)
      .reduce((s, w) => s + w.totalCost, 0);

    const byPaymentMethod: Record<string, number> = {
      CASH: 0,
      CARD: 0,
      CCP: 0,
      BARIDIMOB: 0,
      OTHER: 0,
    };

    for (const pay of filteredPayments) {
      for (const alloc of pay.allocations) {
        const net = alloc.method === 'CASH' ? Math.max(0, alloc.amount - pay.changeGiven) : alloc.amount;
        byPaymentMethod[alloc.method] = (byPaymentMethod[alloc.method] || 0) + net;
      }
    }

    const productSalesMap = new Map<string, { productId: string; nameAr: string; quantity: number; revenue: number; profit: number }>();
    for (const order of validOrders) {
      for (const item of order.items) {
        const curr = productSalesMap.get(item.productId) || {
          productId: item.productId,
          nameAr: item.productNameAr,
          quantity: 0,
          revenue: 0,
          profit: 0,
        };
        curr.quantity += item.quantity;
        curr.revenue += item.subtotal;
        curr.profit += item.subtotal - item.unitCost * item.quantity;
        productSalesMap.set(item.productId, curr);
      }
    }

    res.json({
      summary: {
        totalSales,
        ordersCount: validOrders.length,
        avgOrderValue: validOrders.length > 0 ? Math.round(totalSales / validOrders.length) : 0,
        totalCostOfGoods,
        totalExpenses,
        totalWasteCost,
        estimatedNetProfit: totalSales - totalCostOfGoods - totalExpenses - totalWasteCost,
      },
      byPaymentMethod,
      topProducts: Array.from(productSalesMap.values()).sort((a, b) => b.revenue - a.revenue),
      lowStockIngredients: state.ingredients.filter((i) => i.currentStock <= i.minStock),
    });
  });

  // 17. SETTINGS, AUDIT LOGS & BACKUPS (/api/settings, /api/audit-logs, /api/backups)
  app.get('/api/settings', requireAuth, (_req, res) => {
    res.json(posDb.getState().settings);
  });

  app.patch('/api/settings', requireAuth, requirePermission('settings:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const updated = posDb.updateSettings(req.user!, req.body);
      res.json(updated);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/audit-logs', requireAuth, (_req, res) => {
    res.json(posDb.getState().auditLogs);
  });

  app.get('/api/backups', requireAuth, requirePermission('backups:manage'), (_req, res) => {
    const backups = posDb.getState().backups.map(({ snapshot: _, ...meta }) => meta);
    res.json(backups);
  });

  app.post('/api/backups', requireAuth, requirePermission('backups:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const backup = posDb.createBackup(req.user!, 'MANUAL');
      const { snapshot: _, ...meta } = backup;
      res.status(201).json(meta);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  });

  app.get('/api/backups/:id/download', requireAuth, requirePermission('backups:manage'), (req, res) => {
    const backup = posDb.getState().backups.find((b) => b.id === req.params.id);
    if (!backup || !backup.snapshot) {
      return res.status(404).json({ error: 'النسخة الاحتياطية غير موجودة' });
    }
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    return res.send(JSON.stringify(backup.snapshot, null, 2));
  });

  app.post('/api/backups/restore', requireAuth, requirePermission('backups:manage'), (req: AuthenticatedRequest, res) => {
    try {
      const { backupId, snapshot, confirmed } = req.body;
      let targetSnapshot = snapshot;
      if (backupId && !targetSnapshot) {
        const found = posDb.getState().backups.find((b) => b.id === backupId);
        if (!found || !found.snapshot) {
          return res.status(404).json({ error: 'ملف النسخة الاحتياطية غير موجود' });
        }
        targetSnapshot = found.snapshot;
      }
      if (!targetSnapshot) {
        return res.status(400).json({ error: 'بيانات النسخة الاحتياطية مفقودة' });
      }
      const result = posDb.restoreBackup(req.user!, targetSnapshot, Boolean(confirmed));
      return res.json(result);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  });

  // 18. OFFLINE QUEUE SYNCHRONIZATION (/api/sync)
  app.post('/api/sync', requireAuth, (req: AuthenticatedRequest, res) => {
    try {
      const { operations } = req.body as {
        operations: {
          id: string;
          type: 'CREATE_ORDER' | 'PROCESS_PAYMENT' | 'UPDATE_ORDER_STATUS' | 'UPDATE_TABLE_STATUS';
          payload: any;
          idempotencyKey: string;
        }[];
      };

      if (!Array.isArray(operations)) {
        return res.status(400).json({ error: 'قائمة العمليات غير صالحة' });
      }

      const results: { id: string; status: 'SYNCED' | 'SKIPPED_IDEMPOTENT' | 'ERROR'; error?: string; result?: any }[] = [];

      for (const op of operations) {
        try {
          if (op.type === 'CREATE_ORDER') {
            const order = posDb.createOrder(req.user!, {
              ...op.payload,
              idempotencyKey: op.idempotencyKey || op.payload.idempotencyKey,
            });
            results.push({ id: op.id, status: 'SYNCED', result: order });
          } else if (op.type === 'PROCESS_PAYMENT') {
            const paymentResult = posDb.processPayment(req.user!, {
              ...op.payload,
              idempotencyKey: op.idempotencyKey || op.payload.idempotencyKey,
            });
            results.push({ id: op.id, status: 'SYNCED', result: paymentResult });
          } else if (op.type === 'UPDATE_ORDER_STATUS') {
            const updatedOrder = posDb.updateOrderStatus(
              req.user!,
              op.payload.orderId,
              op.payload.status,
              op.payload.stationFilter,
              op.payload.deliveryDriver
            );
            results.push({ id: op.id, status: 'SYNCED', result: updatedOrder });
          } else if (op.type === 'UPDATE_TABLE_STATUS') {
            const updatedTable = posDb.updateTableStatus(req.user!, op.payload.tableId, op.payload.status, op.payload);
            results.push({ id: op.id, status: 'SYNCED', result: updatedTable });
          }
        } catch (opErr: any) {
          // If already paid, mark as skipped idempotent so queue clears cleanly
          if (String(opErr.message).includes('تم دفع هذه الفاتورة بالكامل مسبقًا')) {
            results.push({ id: op.id, status: 'SKIPPED_IDEMPOTENT' });
          } else {
            results.push({ id: op.id, status: 'ERROR', error: opErr.message });
          }
        }
      }

      return res.json({ syncedCount: results.filter((r) => r.status !== 'ERROR').length, results });
    } catch (error: any) {
      return res.status(500).json({ error: error.message || 'فشل مزامنة العمليات المحلية' });
    }
  });

  return app;
}

async function startServer() {
  const app = createPosExpressApp();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Golden Palace POS Server running on http://0.0.0.0:${PORT}`);
  });
}

if (process.env.VITEST !== 'true') {
  startServer();
}
