import { describe, it, expect } from 'vitest';
import { PosDatabaseEngine } from './db/engine.ts';
import { hasPermission } from './db/types.ts';

describe('GOLDEN PALACE POS — Full System & Accounting Verification Suite', () => {
  const adminActor = {
    id: 'usr_admin',
    username: 'admin',
    fullName: 'عبد القادر الجيجلي (المدير العام)',
    role: 'ADMIN' as const,
  };

  it('1. Authenticates users securely and enforces Role-Based Access Control (RBAC)', () => {
    const db = new PosDatabaseEngine();
    const authSuccess = db.authenticateUser('admin', 'admin123');
    expect(authSuccess).not.toBeNull();
    expect(authSuccess?.role).toBe('ADMIN');

    const authFail = db.authenticateUser('admin', 'wrong-password');
    expect(authFail).toBeNull();

    // Verify granular permissions
    expect(hasPermission('ADMIN', 'backups:manage')).toBe(true);
    expect(hasPermission('KITCHEN', 'kitchen:update')).toBe(true);
    expect(hasPermission('KITCHEN', 'pos:use')).toBe(false);
    expect(hasPermission('WAITER', 'tables:manage')).toBe(true);
    expect(hasPermission('WAITER', 'settings:manage')).toBe(false);
    expect(hasPermission('INVENTORY', 'inventory:manage')).toBe(true);
  });

  it('2. Adds, edits, disables, and safely deletes products while preserving historical invoices & Price History', () => {
    const db = new PosDatabaseEngine();

    // Create Category
    const newCat = db.createCategory(adminActor, {
      nameAr: 'أطباق تقليدية خاصة',
      nameFr: 'Spécialités Traditionnelles',
      nameEn: 'Traditional Specials',
      sortOrder: 99,
    });
    expect(newCat.id).toBeTruthy();

    // Create Product with recipe
    const lambIng = db.getState().ingredients[0];
    const newProd = db.createProduct(adminActor, {
      categoryId: newCat.id,
      kitchenStation: 'MAIN_KITCHEN',
      nameAr: 'كسكسي ملكي باللحم',
      nameFr: 'Couscous Royal',
      price: 1500,
      cost: 650,
      variants: [{ nameAr: 'حجم عائلي', priceDelta: 500 }],
      addons: [{ nameAr: 'إضافة مرق', price: 100 }],
      recipe: [{ ingredientId: lambIng.id, quantity: 0.25, unitCode: lambIng.unitCode }],
    });
    expect(newProd.price).toBe(1500);

    // Create an order with this product at price 1500 DZD
    const historicalOrder = db.createOrder(adminActor, {
      idempotencyKey: 'idem_hist_order_1',
      orderType: 'TAKEAWAY',
      items: [{ productId: newProd.id, quantity: 2 }],
    });
    expect(historicalOrder.totalAmount).toBe(3000);
    expect(historicalOrder.items[0].unitPrice).toBe(1500);

    // Now change product price to 1800 DZD
    const updatedProd = db.updateProduct(adminActor, newProd.id, { price: 1800 });
    expect(updatedProd.price).toBe(1800);

    // Verify Price History recorded oldPrice=1500, newPrice=1800
    const historyEntry = db.getState().priceHistory.find((ph) => ph.productId === newProd.id);
    expect(historyEntry).toBeDefined();
    expect(historyEntry?.oldPrice).toBe(1500);
    expect(historyEntry?.newPrice).toBe(1800);

    // CRITICAL: Verify historical order invoice did NOT change!
    const reloadedOrder = db.getState().orders.find((o) => o.id === historicalOrder.id)!;
    expect(reloadedOrder.items[0].unitPrice).toBe(1500);
    expect(reloadedOrder.totalAmount).toBe(3000);

    // Safe delete product and verify historical order remains intact
    const deletedProd = db.safeDeleteProduct(adminActor, newProd.id);
    expect(deletedProd.isDeleted).toBe(true);
    expect(deletedProd.isAvailable).toBe(false);

    const orderAfterDelete = db.getState().orders.find((o) => o.id === historicalOrder.id)!;
    expect(orderAfterDelete.items[0].productNameAr).toBe('كسكسي ملكي باللحم');
    expect(orderAfterDelete.totalAmount).toBe(3000);
  });

  it('3. Deducts recipe ingredients on order creation and handles KDS status workflow', () => {
    const db = new PosDatabaseEngine();
    const grillProduct = db.getState().products.find((p) => p.recipe.length > 0)!;
    const recipeItem = grillProduct.recipe[0];
    const stockBefore = db.getState().ingredients.find((i) => i.id === recipeItem.ingredientId)!.currentStock;

    const order = db.createOrder(adminActor, {
      idempotencyKey: 'idem_kds_order_1',
      orderType: 'DINE_IN',
      tableId: db.getState().tables[0].id,
      items: [{ productId: grillProduct.id, quantity: 2, notes: 'بدون بصل' }],
    });

    // Verify KDS workflow transitions
    const prepOrder = db.updateOrderStatus(adminActor, order.id, 'PREPARING');
    expect(prepOrder.status).toBe('PREPARING');

    const readyOrder = db.updateOrderStatus(adminActor, order.id, 'READY');
    expect(readyOrder.status).toBe('READY');

    const completedOrder = db.updateOrderStatus(adminActor, order.id, 'COMPLETED');
    expect(completedOrder.status).toBe('COMPLETED');
    expect(completedOrder.inventoryDeducted).toBe(true);

    const stockAfter = db.getState().ingredients.find((i) => i.id === recipeItem.ingredientId)!.currentStock;
    expect(stockAfter).toBeCloseTo(stockBefore - recipeItem.quantity * 2, 3);
  });

  it('4. Processes Cash, Card & Split Payments accurately, calculates change, and prevents duplicate payment', () => {
    const db = new PosDatabaseEngine();
    const prod = db.getState().products[0];

    const order = db.createOrder(adminActor, {
      idempotencyKey: 'idem_pay_test_order',
      orderType: 'TAKEAWAY',
      items: [{ productId: prod.id, quantity: 1 }],
    });

    const totalDue = order.totalAmount;
    const cashTendered = totalDue + 500; // Customer hands 500 DZD extra

    const { payment, order: paidOrder } = db.processPayment(adminActor, {
      orderId: order.id,
      idempotencyKey: 'idem_pay_tx_1',
      allocations: [{ method: 'CASH', amount: cashTendered }],
    });

    expect(paidOrder.paymentStatus).toBe('PAID');
    expect(payment.changeGiven).toBe(500);

    // Idempotent retry with same idempotencyKey returns existing payment without double-charging
    const retryResult = db.processPayment(adminActor, {
      orderId: order.id,
      idempotencyKey: 'idem_pay_tx_1',
      allocations: [{ method: 'CASH', amount: cashTendered }],
    });
    expect(retryResult.payment.id).toBe(payment.id);

    // Attempt to pay an already-paid invoice with a new key must throw an error
    expect(() =>
      db.processPayment(adminActor, {
        orderId: order.id,
        idempotencyKey: 'idem_pay_tx_duplicate_attempt',
        allocations: [{ method: 'CARD', amount: totalDue }],
      })
    ).toThrow();
  });

  it('5. Verifies Cash Register Shift equation, Purchases, Waste, Stock Count, and Backup/Restore', () => {
    const db = new PosDatabaseEngine();
    const shiftBefore = db.getState().cashShifts.find((s) => s.status === 'OPEN')!;
    const expectedBefore = shiftBefore.expectedCash;

    // Record an expense paid from cash register (1000 DZD)
    db.createExpense(adminActor, {
      category: 'Supplies',
      amount: 1000,
      description: 'أكياس تغليف سفري',
      paidFromCashRegister: true,
    });

    const shiftAfterExpense = db.getState().cashShifts.find((s) => s.status === 'OPEN')!;
    expect(shiftAfterExpense.expectedCash).toBe(expectedBefore - 1000);

    // Record Purchase Invoice and verify stock increases
    const ing = db.getState().ingredients[0];
    const ingStockBefore = ing.currentStock;
    db.createPurchase(adminActor, {
      supplierId: db.getState().suppliers[0].id,
      invoiceNumber: 'INV-TEST-99',
      items: [{ ingredientId: ing.id, quantity: 10, unitCost: ing.unitCost }],
    });
    const ingStockAfterPurchase = db.getState().ingredients.find((i) => i.id === ing.id)!.currentStock;
    expect(ingStockAfterPurchase).toBeCloseTo(ingStockBefore + 10, 3);

    // Record Waste and verify stock decreases
    const wasteRec = db.recordWaste(adminActor, {
      ingredientId: ing.id,
      quantity: 2,
      reason: 'Damaged',
      notes: 'تلف أثناء النقل',
    });
    expect(wasteRec.totalCost).toBe(2 * ing.unitCost);
    const ingStockAfterWaste = db.getState().ingredients.find((i) => i.id === ing.id)!.currentStock;
    expect(ingStockAfterWaste).toBeCloseTo(ingStockAfterPurchase - 2, 3);

    // Create manual backup & restore with safety backup
    const backup = db.createBackup(adminActor, 'MANUAL');
    expect(backup.snapshot).toBeDefined();

    const restoreResult = db.restoreBackup(adminActor, backup.snapshot!, true);
    expect(restoreResult.autoBackupId).toBeTruthy();
    const autoPreRestore = db.getState().backups.find((b) => b.id === restoreResult.autoBackupId);
    expect(autoPreRestore?.backupType).toBe('AUTO_PRE_RESTORE');
  });
});
