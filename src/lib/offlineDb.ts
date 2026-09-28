import Dexie, { type Table } from 'dexie';
import {
  Category,
  Customer,
  Order,
  Product,
  RestaurantTable,
  TableZone,
} from '../db/types.ts';

export interface OfflineQueueItem {
  id: string;
  idempotencyKey: string;
  type: 'CREATE_ORDER' | 'PROCESS_PAYMENT' | 'UPDATE_ORDER_STATUS' | 'UPDATE_TABLE_STATUS';
  payload: any;
  descriptionAr: string;
  createdAt: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export interface HeldCartRecord {
  id: string;
  label: string;
  orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
  tableId: string | null;
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  discountAmount: number;
  notes: string;
  items: {
    cartItemId: string;
    productId: string;
    productNameAr: string;
    variantId?: string;
    variantNameAr?: string;
    unitPrice: number;
    quantity: number;
    addonIds: string[];
    addons: { id: string; nameAr: string; price: number }[];
    notes: string;
  }[];
  createdAt: string;
}

export interface KeyValueRecord {
  key: string;
  value: any;
  updatedAt: string;
}

export class GoldenPalaceOfflineDB extends Dexie {
  products!: Table<Product, string>;
  categories!: Table<Category, string>;
  restaurantTables!: Table<RestaurantTable, string>;
  zones!: Table<TableZone, string>;
  customers!: Table<Customer, string>;
  orders!: Table<Order, string>;
  heldCarts!: Table<HeldCartRecord, string>;
  offlineQueue!: Table<OfflineQueueItem, string>;
  kvStore!: Table<KeyValueRecord, string>;

  constructor() {
    super('GoldenPalacePOS_IndexedDB_v2');
    this.version(1).stores({
      products: 'id, categoryId, barcode, isAvailable',
      categories: 'id, sortOrder',
      restaurantTables: 'id, zoneId, status',
      zones: 'id, sortOrder',
      customers: 'id, phone, name',
      orders: 'id, orderNumber, idempotencyKey, status, createdAt',
      heldCarts: 'id, createdAt',
      offlineQueue: 'id, idempotencyKey, status, createdAt',
      kvStore: 'key',
    });
  }
}

export const offlineDb = new GoldenPalaceOfflineDB();

export async function cacheBootstrapToIndexedDB(bootstrapData: any): Promise<void> {
  try {
    await offlineDb.transaction(
      'rw',
      [
        offlineDb.products,
        offlineDb.categories,
        offlineDb.restaurantTables,
        offlineDb.zones,
        offlineDb.customers,
        offlineDb.orders,
        offlineDb.kvStore,
      ],
      async () => {
        if (Array.isArray(bootstrapData.products)) {
          await offlineDb.products.clear();
          await offlineDb.products.bulkPut(bootstrapData.products);
        }
        if (Array.isArray(bootstrapData.categories)) {
          await offlineDb.categories.clear();
          await offlineDb.categories.bulkPut(bootstrapData.categories);
        }
        if (Array.isArray(bootstrapData.tables)) {
          await offlineDb.restaurantTables.clear();
          await offlineDb.restaurantTables.bulkPut(bootstrapData.tables);
        }
        if (Array.isArray(bootstrapData.tableZones)) {
          await offlineDb.zones.clear();
          await offlineDb.zones.bulkPut(bootstrapData.tableZones);
        }
        if (Array.isArray(bootstrapData.customers)) {
          await offlineDb.customers.clear();
          await offlineDb.customers.bulkPut(bootstrapData.customers);
        }
        if (Array.isArray(bootstrapData.orders)) {
          await offlineDb.orders.bulkPut(bootstrapData.orders);
        }
        await offlineDb.kvStore.put({
          key: 'bootstrap_snapshot',
          value: bootstrapData,
          updatedAt: new Date().toISOString(),
        });
      }
    );
  } catch (err) {
    console.warn('IndexedDB cache write skipped:', err);
  }
}

export async function loadCachedBootstrapFromIndexedDB(): Promise<any | null> {
  try {
    const rec = await offlineDb.kvStore.get('bootstrap_snapshot');
    return rec?.value || null;
  } catch {
    return null;
  }
}

export async function enqueueOfflineOperation(
  type: OfflineQueueItem['type'],
  payload: any,
  descriptionAr: string,
  idempotencyKey: string
): Promise<OfflineQueueItem> {
  const existing = await offlineDb.offlineQueue
    .where('idempotencyKey')
    .equals(idempotencyKey)
    .first();
  if (existing) return existing;

  const item: OfflineQueueItem = {
    id: `off_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    idempotencyKey,
    type,
    payload,
    descriptionAr,
    createdAt: new Date().toISOString(),
    status: 'PENDING',
  };
  await offlineDb.offlineQueue.put(item);
  return item;
}
