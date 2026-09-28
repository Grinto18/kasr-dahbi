-- ============================================================================
-- GOLDEN PALACE POS (القصر الذهبي — عند الجيجلي • حسين داي)
-- Complete PostgreSQL Production Schema (46 Tables, Foreign Keys & Indexes)
-- ============================================================================

BEGIN;

-- 1. USERS, ROLES & PERMISSIONS (RBAC)
CREATE TABLE IF NOT EXISTS roles (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL CHECK (code IN ('ADMIN', 'MANAGER', 'CASHIER', 'WAITER', 'KITCHEN', 'INVENTORY')),
  name_ar VARCHAR(100) NOT NULL,
  name_en VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS permissions (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name_ar VARCHAR(128) NOT NULL,
  module VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id VARCHAR(64) NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(64) PRIMARY KEY,
  username VARCHAR(64) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(128) NOT NULL,
  password_hash TEXT NOT NULL,
  pin_code VARCHAR(16),
  phone VARCHAR(32),
  role_code VARCHAR(32) NOT NULL REFERENCES roles(code),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id VARCHAR(64) NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, role_id)
);

-- 2. KITCHEN STATIONS
CREATE TABLE IF NOT EXISTS kitchen_stations (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL CHECK (code IN ('MAIN_KITCHEN', 'GRILL', 'DRINKS', 'DESSERT')),
  name_ar VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100),
  name_en VARCHAR(100),
  printer_name VARCHAR(128),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 3. MENU MANAGEMENT (CATEGORIES, PRODUCTS, VARIANTS, ADDONS, IMAGES, PRICE HISTORY)
CREATE TABLE IF NOT EXISTS categories (
  id VARCHAR(64) PRIMARY KEY,
  name_ar VARCHAR(128) NOT NULL,
  name_fr VARCHAR(128),
  name_en VARCHAR(128),
  description TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id VARCHAR(64) PRIMARY KEY,
  category_id VARCHAR(64) NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  kitchen_station VARCHAR(32) NOT NULL DEFAULT 'MAIN_KITCHEN' REFERENCES kitchen_stations(code),
  name_ar VARCHAR(160) NOT NULL,
  name_fr VARCHAR(160) NOT NULL DEFAULT '',
  name_en VARCHAR(160) NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (cost >= 0),
  image_url TEXT,
  barcode VARCHAR(64),
  is_available BOOLEAN NOT NULL DEFAULT TRUE,
  is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
  preparation_time_minutes INTEGER NOT NULL DEFAULT 15,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_products_available ON products(is_available, is_deleted);

CREATE TABLE IF NOT EXISTS product_variants (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_ar VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100) DEFAULT '',
  name_en VARCHAR(100) DEFAULT '',
  price_delta NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS product_addons (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name_ar VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100) DEFAULT '',
  name_en VARCHAR(100) DEFAULT '',
  price NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_available BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS product_images (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS price_history (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  old_price NUMERIC(12, 2) NOT NULL,
  new_price NUMERIC(12, 2) NOT NULL,
  changed_by VARCHAR(64) NOT NULL REFERENCES users(id),
  changed_by_name VARCHAR(128) NOT NULL,
  reason TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON price_history(product_id, changed_at DESC);

-- 4. INVENTORY, UNITS, INGREDIENTS, SUPPLIERS & RECIPES
CREATE TABLE IF NOT EXISTS units (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL,
  name_ar VARCHAR(64) NOT NULL,
  name_en VARCHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS suppliers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ingredients (
  id VARCHAR(64) PRIMARY KEY,
  name_ar VARCHAR(160) NOT NULL,
  name_en VARCHAR(160) DEFAULT '',
  unit_code VARCHAR(32) NOT NULL REFERENCES units(code),
  current_stock NUMERIC(14, 3) NOT NULL DEFAULT 0,
  min_stock NUMERIC(14, 3) NOT NULL DEFAULT 0,
  max_stock NUMERIC(14, 3) NOT NULL DEFAULT 1000,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  supplier_id VARCHAR(64) REFERENCES suppliers(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory (
  id VARCHAR(64) PRIMARY KEY,
  warehouse_name VARCHAR(128) NOT NULL DEFAULT 'المخزن الرئيسي - القصر الذهبي',
  last_count_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_items (
  id VARCHAR(64) PRIMARY KEY,
  inventory_id VARCHAR(64) NOT NULL REFERENCES inventory(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC(14, 3) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(inventory_id, ingredient_id)
);

CREATE TABLE IF NOT EXISTS recipes (
  id VARCHAR(64) PRIMARY KEY,
  product_id VARCHAR(64) UNIQUE NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  notes TEXT DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS recipe_items (
  id VARCHAR(64) PRIMARY KEY,
  recipe_id VARCHAR(64) NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_code VARCHAR(32) NOT NULL REFERENCES units(code)
);

CREATE INDEX IF NOT EXISTS idx_recipe_items_recipe ON recipe_items(recipe_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id VARCHAR(64) PRIMARY KEY,
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  movement_type VARCHAR(32) NOT NULL CHECK (movement_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'WASTE', 'PURCHASE', 'SALE_DEDUCTION', 'STOCK_COUNT')),
  quantity NUMERIC(14, 3) NOT NULL,
  previous_stock NUMERIC(14, 3) NOT NULL,
  new_stock NUMERIC(14, 3) NOT NULL,
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reference_id VARCHAR(64),
  notes TEXT,
  created_by VARCHAR(64) REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stock_movements_ingredient ON stock_movements(ingredient_id, created_at DESC);

CREATE TABLE IF NOT EXISTS stock_counts (
  id VARCHAR(64) PRIMARY KEY,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED',
  notes TEXT,
  counted_by VARCHAR(64) NOT NULL REFERENCES users(id),
  counted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id VARCHAR(64) PRIMARY KEY,
  stock_count_id VARCHAR(64) NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  system_quantity NUMERIC(14, 3) NOT NULL,
  actual_quantity NUMERIC(14, 3) NOT NULL,
  difference NUMERIC(14, 3) NOT NULL
);

CREATE TABLE IF NOT EXISTS waste (
  id VARCHAR(64) PRIMARY KEY,
  reason VARCHAR(32) NOT NULL CHECK (reason IN ('Expired', 'Damaged', 'Burned', 'Spilled', 'Other')),
  notes TEXT,
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reported_by VARCHAR(64) NOT NULL REFERENCES users(id),
  reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS waste_items (
  id VARCHAR(64) PRIMARY KEY,
  waste_id VARCHAR(64) NOT NULL REFERENCES waste(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  reason VARCHAR(32) NOT NULL
);

-- 5. PURCHASES
CREATE TABLE IF NOT EXISTS purchases (
  id VARCHAR(64) PRIMARY KEY,
  invoice_number VARCHAR(64) NOT NULL,
  supplier_id VARCHAR(64) NOT NULL REFERENCES suppliers(id) ON DELETE RESTRICT,
  status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED' CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_items (
  id VARCHAR(64) PRIMARY KEY,
  purchase_id VARCHAR(64) NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  ingredient_id VARCHAR(64) NOT NULL REFERENCES ingredients(id) ON DELETE RESTRICT,
  quantity NUMERIC(14, 3) NOT NULL CHECK (quantity > 0),
  unit_cost NUMERIC(12, 2) NOT NULL CHECK (unit_cost >= 0),
  total_cost NUMERIC(12, 2) NOT NULL
);

-- 6. TABLES & ZONES
CREATE TABLE IF NOT EXISTS table_zones (
  id VARCHAR(64) PRIMARY KEY,
  name_ar VARCHAR(100) NOT NULL,
  name_fr VARCHAR(100),
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tables (
  id VARCHAR(64) PRIMARY KEY,
  zone_id VARCHAR(64) NOT NULL REFERENCES table_zones(id) ON DELETE CASCADE,
  number VARCHAR(32) NOT NULL,
  name_ar VARCHAR(100) NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 4,
  status VARCHAR(32) NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING')),
  current_order_id VARCHAR(64),
  merged_with_table_id VARCHAR(64),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. CUSTOMERS & DELIVERY
CREATE TABLE IF NOT EXISTS customers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  phone VARCHAR(32) UNIQUE NOT NULL,
  address TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_spent NUMERIC(12, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS delivery_addresses (
  id VARCHAR(64) PRIMARY KEY,
  customer_id VARCHAR(64) NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(64) NOT NULL DEFAULT 'المنزل',
  address_line TEXT NOT NULL,
  landmark TEXT,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 200
);

-- 8. ORDERS, ITEMS, ADDONS & STATUS HISTORY
CREATE TABLE IF NOT EXISTS orders (
  id VARCHAR(64) PRIMARY KEY,
  order_number VARCHAR(64) UNIQUE NOT NULL,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  order_type VARCHAR(32) NOT NULL CHECK (order_type IN ('DINE_IN', 'TAKEAWAY', 'DELIVERY')),
  status VARCHAR(32) NOT NULL CHECK (status IN ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'HELD')),
  payment_status VARCHAR(32) NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PARTIAL', 'PAID', 'REFUNDED')),
  table_id VARCHAR(64) REFERENCES tables(id) ON DELETE SET NULL,
  customer_id VARCHAR(64) REFERENCES customers(id) ON DELETE SET NULL,
  subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0,
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_by_name VARCHAR(128) NOT NULL,
  inventory_deducted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE TABLE IF NOT EXISTS order_items (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id VARCHAR(64) NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name_ar VARCHAR(160) NOT NULL,
  variant_id VARCHAR(64),
  variant_name_ar VARCHAR(100),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price NUMERIC(12, 2) NOT NULL, -- Preserves historical price!
  unit_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  addons_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12, 2) NOT NULL,
  kitchen_station VARCHAR(32) NOT NULL DEFAULT 'MAIN_KITCHEN',
  kitchen_status VARCHAR(32) NOT NULL DEFAULT 'NEW',
  notes TEXT DEFAULT '',
  paid_quantity INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS order_item_addons (
  id VARCHAR(64) PRIMARY KEY,
  order_item_id VARCHAR(64) NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  addon_id VARCHAR(64),
  name_ar VARCHAR(100) NOT NULL,
  price NUMERIC(12, 2) NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS order_status_history (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  old_status VARCHAR(32),
  new_status VARCHAR(32) NOT NULL,
  changed_by VARCHAR(64) REFERENCES users(id),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE TABLE IF NOT EXISTS delivery_orders (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) UNIQUE NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  customer_name VARCHAR(160) NOT NULL,
  customer_phone VARCHAR(32) NOT NULL,
  delivery_address TEXT NOT NULL,
  delivery_fee NUMERIC(12, 2) NOT NULL DEFAULT 0,
  driver_name VARCHAR(128) DEFAULT '',
  driver_phone VARCHAR(32) DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED', 'CANCELLED')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. KITCHEN DISPLAY SYSTEM (KDS)
CREATE TABLE IF NOT EXISTS kitchen_orders (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number VARCHAR(64) NOT NULL,
  table_name VARCHAR(100),
  order_type VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  ready_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  preparation_seconds INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS kitchen_order_items (
  id VARCHAR(64) PRIMARY KEY,
  kitchen_order_id VARCHAR(64) NOT NULL REFERENCES kitchen_orders(id) ON DELETE CASCADE,
  order_item_id VARCHAR(64) NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_name_ar VARCHAR(160) NOT NULL,
  variant_name_ar VARCHAR(100),
  addons_summary TEXT DEFAULT '',
  quantity INTEGER NOT NULL,
  station VARCHAR(32) NOT NULL REFERENCES kitchen_stations(code),
  status VARCHAR(32) NOT NULL DEFAULT 'NEW' CHECK (status IN ('NEW', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED', 'CANCELLED')),
  notes TEXT DEFAULT ''
);

-- 10. PAYMENTS & CASH REGISTER
CREATE TABLE IF NOT EXISTS payment_methods (
  id VARCHAR(64) PRIMARY KEY,
  code VARCHAR(32) UNIQUE NOT NULL CHECK (code IN ('CASH', 'CARD', 'CCP', 'BARIDIMOB', 'OTHER')),
  name_ar VARCHAR(64) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS payments (
  id VARCHAR(64) PRIMARY KEY,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  idempotency_key VARCHAR(128) UNIQUE NOT NULL,
  total_due NUMERIC(12, 2) NOT NULL,
  total_tendered NUMERIC(12, 2) NOT NULL,
  change_given NUMERIC(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REFUNDED')),
  cashier_id VARCHAR(64) NOT NULL REFERENCES users(id),
  cashier_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_transactions (
  id VARCHAR(64) PRIMARY KEY,
  payment_id VARCHAR(64) NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  order_id VARCHAR(64) NOT NULL REFERENCES orders(id) ON DELETE RESTRICT,
  method VARCHAR(32) NOT NULL REFERENCES payment_methods(code),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  reference_number VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cash_registers (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(100) NOT NULL DEFAULT 'الصندوق الرئيسي #1',
  is_open BOOLEAN NOT NULL DEFAULT FALSE,
  current_shift_id VARCHAR(64)
);

CREATE TABLE IF NOT EXISTS cash_shifts (
  id VARCHAR(64) PRIMARY KEY,
  register_id VARCHAR(64) NOT NULL REFERENCES cash_registers(id),
  opened_by VARCHAR(64) NOT NULL REFERENCES users(id),
  opened_by_name VARCHAR(128) NOT NULL,
  closed_by VARCHAR(64) REFERENCES users(id),
  opening_balance NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
  card_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
  other_sales NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expenses_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  refunds_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_in_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  cash_out_total NUMERIC(12, 2) NOT NULL DEFAULT 0,
  expected_cash NUMERIC(12, 2) NOT NULL DEFAULT 0,
  actual_cash NUMERIC(12, 2),
  difference NUMERIC(12, 2),
  status VARCHAR(32) NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  notes TEXT DEFAULT '',
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS cash_transactions (
  id VARCHAR(64) PRIMARY KEY,
  shift_id VARCHAR(64) NOT NULL REFERENCES cash_shifts(id) ON DELETE CASCADE,
  type VARCHAR(32) NOT NULL CHECK (type IN ('OPENING', 'SALE', 'EXPENSE', 'REFUND', 'CASH_IN', 'CASH_OUT', 'CLOSING')),
  amount NUMERIC(12, 2) NOT NULL,
  reason TEXT NOT NULL,
  reference_id VARCHAR(64),
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_by_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 11. EXPENSES
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  category VARCHAR(64) NOT NULL CHECK (category IN ('Electricity', 'Gas', 'Rent', 'Transport', 'Maintenance', 'Supplies', 'Salaries', 'Other')),
  amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  paid_from_cash_register BOOLEAN NOT NULL DEFAULT TRUE,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by VARCHAR(64) NOT NULL REFERENCES users(id),
  created_by_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. AUDIT LOGS, SETTINGS & BACKUPS
CREATE TABLE IF NOT EXISTS audit_logs (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64),
  user_name VARCHAR(128) NOT NULL,
  user_role VARCHAR(32) NOT NULL,
  action VARCHAR(64) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id VARCHAR(64),
  details TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE TABLE IF NOT EXISTS settings (
  key VARCHAR(64) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
  id VARCHAR(64) PRIMARY KEY,
  filename VARCHAR(255) NOT NULL,
  backup_type VARCHAR(32) NOT NULL CHECK (backup_type IN ('MANUAL', 'AUTO_PRE_RESTORE', 'AUTO_DAILY')),
  size_bytes INTEGER NOT NULL DEFAULT 0,
  records_count INTEGER NOT NULL DEFAULT 0,
  created_by VARCHAR(64),
  created_by_name VARCHAR(128) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMIT;
