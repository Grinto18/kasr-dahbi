import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import {
  ROLE_PERMISSIONS,
  type AuditLogRecord,
  type BackupMetadata,
  type CashShift,
  type CashTransaction,
  type Category,
  type Customer,
  type ExpenseCategory,
  type ExpenseRecord,
  type Ingredient,
  type Order,
  type OrderItem,
  type OrderStatus,
  type PaymentAllocation,
  type PaymentRecord,
  type PosDatabaseState,
  type PriceHistoryRecord,
  type Product,
  type PurchaseRecord,
  type RestaurantSettings,
  type RestaurantTable,
  type Role,
  type RoleCode,
  type StockCountRecord,
  type StockMovement,
  type Supplier,
  type TableStatus,
  type TableZone,
  type User,
  type WasteReason,
  type WasteRecord,
} from './types.ts';

const DATA_DIR = process.env.POS_DATA_DIR
  ? path.resolve(process.env.POS_DATA_DIR)
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'golden_palace_db.json');

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

const EXPENSE_CATEGORY_AR: Record<ExpenseCategory, string> = {
  Electricity: 'كهرباء',
  Gas: 'غاز',
  Rent: 'كراء المحل',
  Transport: 'نقل وتوصيل',
  Maintenance: 'صيانة وتجهيزات',
  Supplies: 'مستلزمات وتغليف',
  Salaries: 'أجور العمال',
  Other: 'مصاريف أخرى',
};

export function createInitialSeedState(): PosDatabaseState {
  const now = new Date().toISOString();
  const adminHash = bcrypt.hashSync('admin123', 10);
  const staffHash = bcrypt.hashSync('123456', 10);

  const roles: Role[] = [
    { id: 'role_admin', code: 'ADMIN', nameAr: 'مدير النظام العام', nameEn: 'Administrator', permissions: ROLE_PERMISSIONS.ADMIN },
    { id: 'role_manager', code: 'MANAGER', nameAr: 'مدير المطعم', nameEn: 'Manager', permissions: ROLE_PERMISSIONS.MANAGER },
    { id: 'role_cashier', code: 'CASHIER', nameAr: 'كاشير (أمين الصندوق)', nameEn: 'Cashier', permissions: ROLE_PERMISSIONS.CASHIER },
    { id: 'role_waiter', code: 'WAITER', nameAr: 'نادل (النُدُل والطاولات)', nameEn: 'Waiter', permissions: ROLE_PERMISSIONS.WAITER },
    { id: 'role_kitchen', code: 'KITCHEN', nameAr: 'طاهي / شاشة المطبخ', nameEn: 'Kitchen Staff', permissions: ROLE_PERMISSIONS.KITCHEN },
    { id: 'role_inventory', code: 'INVENTORY', nameAr: 'أمين المخزن والمشتريات', nameEn: 'Inventory Controller', permissions: ROLE_PERMISSIONS.INVENTORY },
  ];

  const users: User[] = [
    {
      id: 'usr_admin',
      username: 'admin',
      email: 'grinto25@gmail.com',
      fullName: 'المدير العام — عند الجيجلي',
      passwordHash: adminHash,
      pinCode: '1111',
      phone: '0791755614',
      role: 'ADMIN',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_manager',
      username: 'manager',
      email: 'manager@goldenpalace.dz',
      fullName: 'كريم بلهوشات (مدير الصالة)',
      passwordHash: staffHash,
      pinCode: '2222',
      phone: '0550123456',
      role: 'MANAGER',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_cashier',
      username: 'cashier',
      email: 'cashier@goldenpalace.dz',
      fullName: 'ياسين جيجلي (كاشير رئيسي)',
      passwordHash: staffHash,
      pinCode: '3333',
      phone: '0661234567',
      role: 'CASHIER',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_waiter',
      username: 'waiter',
      email: 'waiter@goldenpalace.dz',
      fullName: 'أمين حسين داي (نادل)',
      passwordHash: staffHash,
      pinCode: '4444',
      phone: '0770987654',
      role: 'WAITER',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_kitchen',
      username: 'kitchen',
      email: 'kitchen@goldenpalace.dz',
      fullName: 'الشيف سفيان (المطبخ والشواية)',
      passwordHash: staffHash,
      pinCode: '5555',
      phone: '0554112233',
      role: 'KITCHEN',
      isActive: true,
      createdAt: now,
    },
    {
      id: 'usr_inventory',
      username: 'inventory',
      email: 'inventory@goldenpalace.dz',
      fullName: 'رشيد أمين المخزن',
      passwordHash: staffHash,
      pinCode: '6666',
      phone: '0662334455',
      role: 'INVENTORY',
      isActive: true,
      createdAt: now,
    },
  ];

  const categories: Category[] = [
    { id: 'cat_grills', nameAr: 'مشاوي', nameFr: 'Grillades', nameEn: 'Grills', description: 'مشاوي على الجمر الطريقة الجيجلية', sortOrder: 1, isActive: true, createdAt: now },
    { id: 'cat_plates', nameAr: 'أطباق رئيسية', nameFr: 'Plats Principaux', nameEn: 'Main Plates', description: 'أطباق يومية ساخنة ومحمرات', sortOrder: 2, isActive: true, createdAt: now },
    { id: 'cat_rice', nameAr: 'أرز', nameFr: 'Riz', nameEn: 'Rice Dishes', description: 'أرز بسمتي بالزعفران والمكسرات', sortOrder: 3, isActive: true, createdAt: now },
    { id: 'cat_chakhchoukha', nameAr: 'شخشوخة', nameFr: 'Chakhchoukha', nameEn: 'Chakhchoukha', description: 'شخشوخة تقليدية باللحم والحمص', sortOrder: 4, isActive: true, createdAt: now },
    { id: 'cat_trida', nameAr: 'تريدة', nameFr: 'Trida', nameEn: 'Trida', description: 'تريدة جيجلية وقسنطينية أصيلة', sortOrder: 5, isActive: true, createdAt: now },
    { id: 'cat_salads', nameAr: 'سلطات ومقبلات', nameFr: 'Salades & Entrées', nameEn: 'Salads & Starters', description: 'سلطات طازجة، بوراك، وشوربة فريك', sortOrder: 6, isActive: true, createdAt: now },
    { id: 'cat_drinks', nameAr: 'مشروبات', nameFr: 'Boissons', nameEn: 'Drinks', description: 'عصائر طبيعية، مشروبات غازية، وشاي بالنعناع', sortOrder: 7, isActive: true, createdAt: now },
    { id: 'cat_desserts', nameAr: 'حلويات', nameFr: 'Desserts', nameEn: 'Desserts', description: 'بقلاوة، مقروط، وفلان القصر الذهبي', sortOrder: 8, isActive: true, createdAt: now },
  ];

  const suppliers: Supplier[] = [
    {
      id: 'sup_1',
      name: 'مؤسسة اللحوم الطازجة — حسين داي',
      phone: '0550998877',
      address: 'سوق الجملة، حسين داي، الجزائر',
      notes: 'توريد يومي للحوم الغنم والدجاج الطازج',
      totalPurchases: 145000,
      createdAt: now,
    },
    {
      id: 'sup_2',
      name: 'شركة الواحة للمواد الغذائية والتوابل',
      phone: '0661445566',
      address: 'المنطقة الصناعية رويبة، الجزائر',
      notes: 'أرز بسمتي، سميد، شخشوخة، تريدة، وزيوت',
      totalPurchases: 82000,
      createdAt: now,
    },
    {
      id: 'sup_3',
      name: 'موزع المشروبات والمياه المعدنية — الجزائر الوسطى',
      phone: '0771223344',
      address: 'شارع طرابلس، حسين داي',
      notes: 'مشروبات غازية وعصائر ومياه سعيدة وإيفري',
      totalPurchases: 46000,
      createdAt: now,
    },
  ];

  const ingredients: Ingredient[] = [
    { id: 'ing_chicken', nameAr: 'لحم دجاج طازج', nameEn: 'Fresh Chicken', unitCode: 'g', unitNameAr: 'غرام', currentStock: 25000, minStock: 5000, maxStock: 60000, unitCost: 0.65, supplierId: 'sup_1', supplierName: 'مؤسسة اللحوم الطازجة — حسين داي', updatedAt: now },
    { id: 'ing_lamb', nameAr: 'لحم غنم طازج', nameEn: 'Fresh Lamb', unitCode: 'g', unitNameAr: 'غرام', currentStock: 18000, minStock: 4000, maxStock: 40000, unitCost: 2.2, supplierId: 'sup_1', supplierName: 'مؤسسة اللحوم الطازجة — حسين داي', updatedAt: now },
    { id: 'ing_merguez', nameAr: 'مرقاز تقليدي', nameEn: 'Merguez Sausage', unitCode: 'g', unitNameAr: 'غرام', currentStock: 12000, minStock: 3000, maxStock: 30000, unitCost: 1.5, supplierId: 'sup_1', supplierName: 'مؤسسة اللحوم الطازجة — حسين داي', updatedAt: now },
    { id: 'ing_rice', nameAr: 'أرز بسمتي فاخر', nameEn: 'Basmati Rice', unitCode: 'g', unitNameAr: 'غرام', currentStock: 30000, minStock: 5000, maxStock: 80000, unitCost: 0.35, supplierId: 'sup_2', supplierName: 'شركة الواحة للمواد الغذائية والتوابل', updatedAt: now },
    { id: 'ing_sauce', nameAr: 'صلصة القصر الذهبي الخاصة', nameEn: 'Signature Sauce', unitCode: 'g', unitNameAr: 'غرام', currentStock: 10000, minStock: 2000, maxStock: 25000, unitCost: 0.4, supplierId: 'sup_2', supplierName: 'شركة الواحة للمواد الغذائية والتوابل', updatedAt: now },
    { id: 'ing_chakh_dough', nameAr: 'رقائق شخشوخة تقليدية', nameEn: 'Chakhchoukha Dough', unitCode: 'g', unitNameAr: 'غرام', currentStock: 15000, minStock: 3000, maxStock: 35000, unitCost: 0.45, supplierId: 'sup_2', supplierName: 'شركة الواحة للمواد الغذائية والتوابل', updatedAt: now },
    { id: 'ing_trida_dough', nameAr: 'عجينة تريدة تقليدية', nameEn: 'Trida Pasta', unitCode: 'g', unitNameAr: 'غرام', currentStock: 12000, minStock: 2500, maxStock: 30000, unitCost: 0.5, supplierId: 'sup_2', supplierName: 'شركة الواحة للمواد الغذائية والتوابل', updatedAt: now },
    { id: 'ing_potatoes', nameAr: 'بطاطا للقلي', nameEn: 'Fresh Potatoes', unitCode: 'g', unitNameAr: 'غرام', currentStock: 20000, minStock: 5000, maxStock: 50000, unitCost: 0.12, supplierId: 'sup_2', supplierName: 'شركة الواحة للمواد الغذائية والتوابل', updatedAt: now },
    { id: 'ing_juice_orange', nameAr: 'عصير برتقال طبيعي', nameEn: 'Fresh Orange Juice', unitCode: 'ml', unitNameAr: 'ملل', currentStock: 15000, minStock: 3000, maxStock: 40000, unitCost: 0.3, supplierId: 'sup_3', supplierName: 'موزع المشروبات والمياه المعدنية — الجزائر الوسطى', updatedAt: now },
    { id: 'ing_baklava', nameAr: 'بقلاوة جزائرية بالمكسرات', nameEn: 'Algerian Baklava', unitCode: 'pcs', unitNameAr: 'قطعة', currentStock: 60, minStock: 15, maxStock: 150, unitCost: 120, supplierId: 'sup_2', supplierName: 'شركة الواحة للمواد الغذائية والتوابل', updatedAt: now },
  ];

  const products: Product[] = [
    {
      id: 'prd_chicken_plate',
      categoryId: 'cat_plates',
      kitchenStation: 'MAIN_KITCHEN',
      nameAr: 'صحن دجاج محمر مع أرز (Chicken Plate)',
      nameFr: 'Assiette Poulet Rôti & Riz',
      nameEn: 'Chicken Plate',
      description: 'نصف دجاجة محمرة على الطريقة الجيجلية مع أرز بسمتي بالزعفران وصلصة القصر الذهبي',
      price: 1200,
      cost: 420,
      imageUrl: '/src/assets/images/dish_roast_chicken_rice_1790580219039.jpg',
      barcode: '613000010001',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 15,
      variants: [
        { id: 'var_cp_reg', productId: 'prd_chicken_plate', nameAr: 'عادي (نصف دجاجة)', nameFr: 'Normal', nameEn: 'Regular', priceDelta: 0, isDefault: true },
        { id: 'var_cp_lrg', productId: 'prd_chicken_plate', nameAr: 'عائلي (دجاجة كاملة)', nameFr: 'Familial', nameEn: 'Large', priceDelta: 900, isDefault: false },
      ],
      addons: [
        { id: 'add_cp_cheese', productId: 'prd_chicken_plate', nameAr: 'جبن إضافي', nameFr: 'Supplément Fromage', nameEn: 'Extra Cheese', price: 150, isAvailable: true },
        { id: 'add_cp_sauce', productId: 'prd_chicken_plate', nameAr: 'صلصة حارة', nameFr: 'Sauce Piquante', nameEn: 'Spicy Sauce', price: 50, isAvailable: true },
        { id: 'add_cp_fries', productId: 'prd_chicken_plate', nameAr: 'بطاطا مقلية', nameFr: 'Frites', nameEn: 'French Fries', price: 200, isAvailable: true },
      ],
      recipe: [
        { id: 'rec_cp_1', ingredientId: 'ing_chicken', ingredientNameAr: 'لحم دجاج طازج', quantity: 250, unitCode: 'g' },
        { id: 'rec_cp_2', ingredientId: 'ing_rice', ingredientNameAr: 'أرز بسمتي فاخر', quantity: 200, unitCode: 'g' },
        { id: 'rec_cp_3', ingredientId: 'ing_sauce', ingredientNameAr: 'صلصة القصر الذهبي الخاصة', quantity: 50, unitCode: 'g' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prd_mixed_grill',
      categoryId: 'cat_grills',
      kitchenStation: 'GRILL',
      nameAr: 'مشاوي مشكلة القصر الذهبي',
      nameFr: 'Grillades Mixtes Golden Palace',
      nameEn: 'Golden Palace Mixed Grill',
      description: 'تشكيلة فاخرة من كوتليت الغنم، الشيش طاووق، والمرقاز المشوي على الجمر مع الخضر المشوية',
      price: 2400,
      cost: 950,
      imageUrl: '/src/assets/images/dish_mixed_grill_1790580192391.jpg',
      barcode: '613000010002',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 20,
      variants: [
        { id: 'var_mg_1p', productId: 'prd_mixed_grill', nameAr: 'شخص واحد', nameFr: '1 Personne', nameEn: 'Single', priceDelta: 0, isDefault: true },
        { id: 'var_mg_2p', productId: 'prd_mixed_grill', nameAr: 'شخصين (صحن ملكي)', nameFr: '2 Personnes', nameEn: 'Double Royal', priceDelta: 2000, isDefault: false },
      ],
      addons: [
        { id: 'add_mg_meat', productId: 'prd_mixed_grill', nameAr: 'إضافة سيخ لحم', nameFr: 'Brochette Viande', nameEn: 'Extra Meat Skewer', price: 450, isAvailable: true },
        { id: 'add_mg_fries', productId: 'prd_mixed_grill', nameAr: 'بطاطا مقلية', nameFr: 'Frites', nameEn: 'Fries', price: 200, isAvailable: true },
        { id: 'add_mg_drink', productId: 'prd_mixed_grill', nameAr: 'مشروب غازي مرافق', nameFr: 'Boisson', nameEn: 'Soft Drink', price: 150, isAvailable: true },
      ],
      recipe: [
        { id: 'rec_mg_1', ingredientId: 'ing_lamb', ingredientNameAr: 'لحم غنم طازج', quantity: 200, unitCode: 'g' },
        { id: 'rec_mg_2', ingredientId: 'ing_chicken', ingredientNameAr: 'لحم دجاج طازج', quantity: 150, unitCode: 'g' },
        { id: 'rec_mg_3', ingredientId: 'ing_merguez', ingredientNameAr: 'مرقاز تقليدي', quantity: 120, unitCode: 'g' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prd_chakhchoukha',
      categoryId: 'cat_chakhchoukha',
      kitchenStation: 'MAIN_KITCHEN',
      nameAr: 'شخشوخة باللحم الغنمي (عند الجيجلي)',
      nameFr: 'Chakhchoukha Traditionnelle à l’Agneau',
      nameEn: 'Traditional Lamb Chakhchoukha',
      description: 'شخشوخة جزائرية أصيلة مسقية بمرق أحمر خاثر مع لحم الغنم والحمص والبيض والدهان الحر',
      price: 1500,
      cost: 560,
      imageUrl: '/src/assets/images/dish_chakhchoukha_1790580204627.jpg',
      barcode: '613000010003',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 15,
      variants: [
        { id: 'var_chk_std', productId: 'prd_chakhchoukha', nameAr: 'صحن فردي', nameFr: 'Individuel', nameEn: 'Single', priceDelta: 0, isDefault: true },
        { id: 'var_chk_fam', productId: 'prd_chakhchoukha', nameAr: 'قصعة عائلية (4 أشخاص)', nameFr: 'Gasâa Familiale', nameEn: 'Family Platter', priceDelta: 3800, isDefault: false },
      ],
      addons: [
        { id: 'add_chk_meat', productId: 'prd_chakhchoukha', nameAr: 'قطعة لحم غنم إضافية', nameFr: 'Supplément Viande', nameEn: 'Extra Lamb', price: 650, isAvailable: true },
        { id: 'add_chk_sauce', productId: 'prd_chakhchoukha', nameAr: 'مرق إضافي', nameFr: 'Sauce Supplémentaire', nameEn: 'Extra Gravy', price: 100, isAvailable: true },
      ],
      recipe: [
        { id: 'rec_chk_1', ingredientId: 'ing_chakh_dough', ingredientNameAr: 'رقائق شخشوخة تقليدية', quantity: 250, unitCode: 'g' },
        { id: 'rec_chk_2', ingredientId: 'ing_lamb', ingredientNameAr: 'لحم غنم طازج', quantity: 200, unitCode: 'g' },
        { id: 'rec_chk_3', ingredientId: 'ing_sauce', ingredientNameAr: 'صلصة القصر الذهبي الخاصة', quantity: 80, unitCode: 'g' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prd_trida',
      categoryId: 'cat_trida',
      kitchenStation: 'MAIN_KITCHEN',
      nameAr: 'تريدة جيجلية بالدجاج واللحم',
      nameFr: 'Trida Jijelienne au Poulet et Viande',
      nameEn: 'Jijelian Trida',
      description: 'تريدة تقليدية مجمرة في الفرن بمرق أبيض غني بالحمص وكريات اللحم والدجاج المحمر',
      price: 1400,
      cost: 480,
      imageUrl: '/src/assets/images/dish_chakhchoukha_1790580204627.jpg',
      barcode: '613000010004',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 15,
      variants: [
        { id: 'var_trd_std', productId: 'prd_trida', nameAr: 'صحن فردي', nameFr: 'Individuel', nameEn: 'Single', priceDelta: 0, isDefault: true },
      ],
      addons: [
        { id: 'add_trd_meat', productId: 'prd_trida', nameAr: 'إضافة كريات لحم', nameFr: 'Boulettes de Viande', nameEn: 'Meatballs', price: 350, isAvailable: true },
      ],
      recipe: [
        { id: 'rec_trd_1', ingredientId: 'ing_trida_dough', ingredientNameAr: 'عجينة تريدة تقليدية', quantity: 220, unitCode: 'g' },
        { id: 'rec_trd_2', ingredientId: 'ing_chicken', ingredientNameAr: 'لحم دجاج طازج', quantity: 180, unitCode: 'g' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prd_royal_rice',
      categoryId: 'cat_rice',
      kitchenStation: 'MAIN_KITCHEN',
      nameAr: 'أرز ملكي بالمكسرات واللحم',
      nameFr: 'Riz Royal aux Amandes et Agneau',
      nameEn: 'Royal Saffron Rice',
      description: 'أرز بسمتي مطهو بالزعفران واللوز المحمص مع قطع لحم الغنم الطرية',
      price: 1100,
      cost: 390,
      imageUrl: '/src/assets/images/dish_roast_chicken_rice_1790580219039.jpg',
      barcode: '613000010005',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 12,
      variants: [
        { id: 'var_rr_sm', productId: 'prd_royal_rice', nameAr: 'صغير', nameFr: 'Petit', nameEn: 'Small', priceDelta: -200, isDefault: false },
        { id: 'var_rr_md', productId: 'prd_royal_rice', nameAr: 'متوسط', nameFr: 'Moyen', nameEn: 'Medium', priceDelta: 0, isDefault: true },
        { id: 'var_rr_lg', productId: 'prd_royal_rice', nameAr: 'كبير', nameFr: 'Grand', nameEn: 'Large', priceDelta: 350, isDefault: false },
      ],
      addons: [
        { id: 'add_rr_sauce', productId: 'prd_royal_rice', nameAr: 'صلصة بيضاء بالجبن', nameFr: 'Sauce Fromage', nameEn: 'Cheese Sauce', price: 150, isAvailable: true },
      ],
      recipe: [
        { id: 'rec_rr_1', ingredientId: 'ing_rice', ingredientNameAr: 'أرز بسمتي فاخر', quantity: 250, unitCode: 'g' },
        { id: 'rec_rr_2', ingredientId: 'ing_lamb', ingredientNameAr: 'لحم غنم طازج', quantity: 120, unitCode: 'g' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prd_orange_juice',
      categoryId: 'cat_drinks',
      kitchenStation: 'DRINKS',
      nameAr: 'عصير برتقال طبيعي طازج',
      nameFr: 'Jus d’Orange Pressé Frais',
      nameEn: 'Fresh Orange Juice',
      description: 'عصير برتقال بوفاريك معصور طازجًا عند الطلب بدون سكر مضاف',
      price: 350,
      cost: 110,
      imageUrl: '/src/assets/images/dish_algerian_dessert_tea_1790580231073.jpg',
      barcode: '613000010006',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 4,
      variants: [
        { id: 'var_oj_cup', productId: 'prd_orange_juice', nameAr: 'كأس (330 مل)', nameFr: 'Verre 330ml', nameEn: 'Glass', priceDelta: 0, isDefault: true },
        { id: 'var_oj_jug', productId: 'prd_orange_juice', nameAr: 'إبريق عائلي (1 لتر)', nameFr: 'Carafe 1L', nameEn: '1L Pitcher', priceDelta: 550, isDefault: false },
      ],
      addons: [],
      recipe: [
        { id: 'rec_oj_1', ingredientId: 'ing_juice_orange', ingredientNameAr: 'عصير برتقال طبيعي', quantity: 330, unitCode: 'ml' },
      ],
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prd_baklava_tea',
      categoryId: 'cat_desserts',
      kitchenStation: 'DESSERT',
      nameAr: 'بقلاوة ملكية مع شاي بالنعناع',
      nameFr: 'Baklava Royale & Thé à la Menthe',
      nameEn: 'Royal Baklava & Mint Tea',
      description: 'قطعتان من البقلاوة الجزائرية المورقة بالجوز واللوز مع كأس شاي صحراوي بالنعناع',
      price: 550,
      cost: 210,
      imageUrl: '/src/assets/images/dish_algerian_dessert_tea_1790580231073.jpg',
      barcode: '613000010007',
      isAvailable: true,
      isDeleted: false,
      preparationTimeMinutes: 5,
      variants: [
        { id: 'var_bt_std', productId: 'prd_baklava_tea', nameAr: 'حصتان + شاي', nameFr: '2 Pièces + Thé', nameEn: '2 Pcs + Tea', priceDelta: 0, isDefault: true },
      ],
      addons: [],
      recipe: [
        { id: 'rec_bt_1', ingredientId: 'ing_baklava', ingredientNameAr: 'بقلاوة جزائرية بالمكسرات', quantity: 2, unitCode: 'pcs' },
      ],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const tableZones: TableZone[] = [
    { id: 'zone_inside', nameAr: 'القاعة الداخلية', nameFr: 'Salle Intérieure', sortOrder: 1 },
    { id: 'zone_terrace', nameAr: 'الشرفة الخارجية (الترّاس)', nameFr: 'Terrasse', sortOrder: 2 },
    { id: 'zone_first_floor', nameAr: 'الطابق الأول (عائلات)', nameFr: '1er Étage Familles', sortOrder: 3 },
  ];

  const tables: RestaurantTable[] = [
    { id: 'tbl_1', zoneId: 'zone_inside', zoneNameAr: 'القاعة الداخلية', number: '1', nameAr: 'طاولة 1', capacity: 4, status: 'AVAILABLE', updatedAt: now },
    { id: 'tbl_2', zoneId: 'zone_inside', zoneNameAr: 'القاعة الداخلية', number: '2', nameAr: 'طاولة 2', capacity: 4, status: 'AVAILABLE', updatedAt: now },
    { id: 'tbl_3', zoneId: 'zone_inside', zoneNameAr: 'القاعة الداخلية', number: '3', nameAr: 'طاولة 3', capacity: 6, status: 'AVAILABLE', updatedAt: now },
    { id: 'tbl_4', zoneId: 'zone_inside', zoneNameAr: 'القاعة الداخلية', number: '4', nameAr: 'طاولة 4', capacity: 2, status: 'AVAILABLE', updatedAt: now },
    { id: 'tbl_5', zoneId: 'zone_terrace', zoneNameAr: 'الشرفة الخارجية (الترّاس)', number: '5', nameAr: 'طاولة 5 (واجهة)', capacity: 4, status: 'AVAILABLE', updatedAt: now },
    { id: 'tbl_6', zoneId: 'zone_terrace', zoneNameAr: 'الشرفة الخارجية (الترّاس)', number: '6', nameAr: 'طاولة 6 (واجهة)', capacity: 4, status: 'RESERVED', reservationName: 'الحاج عبد القادر', reservationTime: '20:00', updatedAt: now },
    { id: 'tbl_7', zoneId: 'zone_first_floor', zoneNameAr: 'الطابق الأول (عائلات)', number: '7', nameAr: 'طاولة عائلات 7', capacity: 8, status: 'AVAILABLE', updatedAt: now },
    { id: 'tbl_8', zoneId: 'zone_first_floor', zoneNameAr: 'الطابق الأول (عائلات)', number: '8', nameAr: 'طاولة عائلات 8', capacity: 10, status: 'AVAILABLE', updatedAt: now },
  ];

  const customers: Customer[] = [
    {
      id: 'cust_1',
      name: 'محمد بن علي',
      phone: '0551234567',
      address: 'حي المقرية، حسين داي، الجزائر',
      notes: 'يفضل الشخشوخة بدون حار',
      totalOrders: 3,
      totalSpent: 7400,
      createdAt: now,
    },
    {
      id: 'cust_2',
      name: 'فندق Oasis — الاستقبال',
      phone: '0770556677',
      address: 'شارع بلهوشات، بجانب المطعم، حسين داي',
      notes: 'طلبات ضيوف الفندق — توصيل سريع',
      totalOrders: 5,
      totalSpent: 16800,
      createdAt: now,
    },
  ];

  const initialShift: CashShift = {
    id: 'shift_initial',
    registerId: 'reg_main',
    openedBy: 'usr_cashier',
    openedByName: 'ياسين جيجلي (كاشير رئيسي)',
    openingBalance: 20000,
    cashSales: 0,
    cardSales: 0,
    ccpSales: 0,
    baridimobSales: 0,
    otherSales: 0,
    expensesTotal: 0,
    refundsTotal: 0,
    cashInTotal: 0,
    cashOutTotal: 0,
    expectedCash: 20000,
    actualCash: null,
    difference: null,
    status: 'OPEN',
    notes: 'الوردية الصباحية — الصندوق الرئيسي',
    openedAt: now,
  };

  const initialCashTx: CashTransaction = {
    id: 'ctx_opening',
    shiftId: 'shift_initial',
    type: 'OPENING',
    amount: 20000,
    reason: 'رصيد افتتاح الوردية الصباحية',
    createdBy: 'usr_cashier',
    createdByName: 'ياسين جيجلي (كاشير رئيسي)',
    createdAt: now,
  };

  const settings: RestaurantSettings = {
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

  return {
    version: 1,
    settings,
    roles,
    users,
    categories,
    products,
    priceHistory: [],
    tableZones,
    tables,
    orders: [],
    payments: [],
    cashShifts: [initialShift],
    cashTransactions: [initialCashTx],
    ingredients,
    stockMovements: [],
    wasteRecords: [],
    stockCounts: [],
    suppliers,
    purchases: [],
    customers,
    expenses: [],
    auditLogs: [
      {
        id: uid('aud'),
        userId: 'usr_admin',
        userName: 'المدير العام — عند الجيجلي',
        userRole: 'ADMIN',
        action: 'SYSTEM_INIT',
        entityType: 'SYSTEM',
        details: 'تهيئة نظام القصر الذهبي GOLDEN PALACE POS وفتح الصندوق برصيد افتتاحي 20,000 د.ج',
        createdAt: now,
      },
    ],
    backups: [],
  };
}

export class PosDatabaseEngine {
  private state: PosDatabaseState;
  private persistToDisk: boolean;

  constructor(persistToDisk = process.env.VITEST !== 'true') {
    this.persistToDisk = persistToDisk;
    if (this.persistToDisk) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        if (fs.existsSync(DB_FILE)) {
          const raw = fs.readFileSync(DB_FILE, 'utf8');
          this.state = JSON.parse(raw) as PosDatabaseState;
        } else {
          this.state = createInitialSeedState();
          this.save();
        }
      } catch (err) {
        console.error('Failed to read DB file, initializing fresh seed:', err);
        this.state = createInitialSeedState();
      }
    } else {
      this.state = createInitialSeedState();
    }
  }

  private save(): void {
    this.state.version += 1;
    if (this.persistToDisk) {
      try {
        fs.mkdirSync(DATA_DIR, { recursive: true });
        fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf8');
      } catch (err) {
        console.error('Failed to persist DB file:', err);
      }
    }
  }

  /**
   * Executes a multi-step operation inside an ACID transaction.
   * If any error is thrown, the entire database state rolls back atomically.
   */
  public executeTransaction<T>(operation: (state: PosDatabaseState) => T): T {
    const snapshot = JSON.stringify(this.state);
    try {
      const result = operation(this.state);
      this.save();
      return result;
    } catch (error) {
      // Atomic Rollback
      this.state = JSON.parse(snapshot) as PosDatabaseState;
      throw error;
    }
  }

  public getState(): PosDatabaseState {
    return this.state;
  }

  public logAudit(
    user: { id: string; fullName: string; role: RoleCode },
    action: string,
    entityType: string,
    details: string,
    entityId?: string
  ): AuditLogRecord {
    const record: AuditLogRecord = {
      id: uid('aud'),
      userId: user.id,
      userName: user.fullName,
      userRole: user.role,
      action,
      entityType,
      entityId,
      details,
      createdAt: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(record);
    if (this.state.auditLogs.length > 1000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 1000);
    }
    return record;
  }

  // ==========================================================================
  // AUTH & USERS
  // ==========================================================================

  public authenticateUser(identifier: string, password: string): Omit<User, 'passwordHash'> | null {
    const normalized = identifier.trim().toLowerCase();
    const user = this.state.users.find(
      (u) => u.isActive && (u.username.toLowerCase() === normalized || u.email.toLowerCase() === normalized)
    );
    if (!user || !user.passwordHash) return null;
    const valid = bcrypt.compareSync(password, user.passwordHash);
    if (!valid) return null;

    user.lastLoginAt = new Date().toISOString();
    this.logAudit({ id: user.id, fullName: user.fullName, role: user.role }, 'LOGIN', 'USER', `تسجيل دخول المستخدم ${user.fullName}`, user.id);
    this.save();
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  public getOrCreateFirebaseUser(uidStr: string, email: string, displayName?: string): Omit<User, 'passwordHash'> {
    const normalizedEmail = email.trim().toLowerCase();
    let user = this.state.users.find((u) => u.email.toLowerCase() === normalizedEmail || u.id === uidStr);
    if (!user) {
      const isAdminEmail = normalizedEmail === 'grinto25@gmail.com';
      user = {
        id: uidStr,
        username: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        fullName: displayName || (isAdminEmail ? 'المدير العام (Google)' : normalizedEmail.split('@')[0]),
        passwordHash: bcrypt.hashSync(uid('pwd'), 10),
        phone: '0791755614',
        role: isAdminEmail ? 'ADMIN' : 'CASHIER',
        isActive: true,
        lastLoginAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      };
      this.state.users.push(user);
      this.save();
    } else {
      user.lastLoginAt = new Date().toISOString();
      this.save();
    }
    const { passwordHash: _, ...safeUser } = user;
    return safeUser;
  }

  public getUsers(): Omit<User, 'passwordHash'>[] {
    return this.state.users.map(({ passwordHash: _, ...u }) => u);
  }

  public createUser(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { username: string; email: string; fullName: string; password: string; phone: string; role: RoleCode; pinCode?: string }
  ): Omit<User, 'passwordHash'> {
    return this.executeTransaction((state) => {
      const exists = state.users.some(
        (u) => u.username.toLowerCase() === input.username.trim().toLowerCase() || u.email.toLowerCase() === input.email.trim().toLowerCase()
      );
      if (exists) {
        throw new Error('اسم المستخدم أو البريد الإلكتروني مسجل مسبقًا');
      }
      const newUser: User = {
        id: uid('usr'),
        username: input.username.trim(),
        email: input.email.trim(),
        fullName: input.fullName.trim(),
        passwordHash: bcrypt.hashSync(input.password, 10),
        pinCode: input.pinCode || '',
        phone: input.phone.trim(),
        role: input.role,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      state.users.push(newUser);
      this.logAudit(actor, 'CREATE_USER', 'USER', `إضافة موظف جديد: ${newUser.fullName} (${newUser.role})`, newUser.id);
      const { passwordHash: _, ...safeUser } = newUser;
      return safeUser;
    });
  }

  public updateUser(
    actor: { id: string; fullName: string; role: RoleCode },
    userId: string,
    updates: Partial<{ fullName: string; email: string; phone: string; role: RoleCode; isActive: boolean; password?: string }>
  ): Omit<User, 'passwordHash'> {
    return this.executeTransaction((state) => {
      const user = state.users.find((u) => u.id === userId);
      if (!user) throw new Error('المستخدم غير موجود');
      if (updates.fullName !== undefined) user.fullName = updates.fullName.trim();
      if (updates.email !== undefined) user.email = updates.email.trim();
      if (updates.phone !== undefined) user.phone = updates.phone.trim();
      if (updates.role !== undefined) user.role = updates.role;
      if (updates.isActive !== undefined) user.isActive = updates.isActive;
      if (updates.password && updates.password.trim().length >= 4) {
        user.passwordHash = bcrypt.hashSync(updates.password.trim(), 10);
      }
      this.logAudit(actor, 'UPDATE_USER', 'USER', `تحديث بيانات الموظف: ${user.fullName}`, user.id);
      const { passwordHash: _, ...safeUser } = user;
      return safeUser;
    });
  }

  // ==========================================================================
  // CATEGORIES & PRODUCTS (WITH PRICE HISTORY & SAFE SOFT DELETE)
  // ==========================================================================

  public createCategory(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { nameAr: string; nameFr?: string; nameEn?: string; description?: string; sortOrder?: number }
  ): Category {
    return this.executeTransaction((state) => {
      const cat: Category = {
        id: uid('cat'),
        nameAr: input.nameAr.trim(),
        nameFr: (input.nameFr || '').trim(),
        nameEn: (input.nameEn || '').trim(),
        description: (input.description || '').trim(),
        sortOrder: input.sortOrder ?? state.categories.length + 1,
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      state.categories.push(cat);
      this.logAudit(actor, 'CREATE_CATEGORY', 'CATEGORY', `إضافة فئة قائمة: ${cat.nameAr}`, cat.id);
      return cat;
    });
  }

  public updateCategory(
    actor: { id: string; fullName: string; role: RoleCode },
    categoryId: string,
    updates: Partial<{ nameAr: string; nameFr: string; nameEn: string; description: string; sortOrder: number; isActive: boolean }>
  ): Category {
    return this.executeTransaction((state) => {
      const cat = state.categories.find((c) => c.id === categoryId);
      if (!cat) throw new Error('الفئة غير موجودة');
      if (updates.nameAr !== undefined) cat.nameAr = updates.nameAr.trim();
      if (updates.nameFr !== undefined) cat.nameFr = updates.nameFr.trim();
      if (updates.nameEn !== undefined) cat.nameEn = updates.nameEn.trim();
      if (updates.description !== undefined) cat.description = updates.description.trim();
      if (updates.sortOrder !== undefined) cat.sortOrder = Number(updates.sortOrder);
      if (updates.isActive !== undefined) cat.isActive = Boolean(updates.isActive);
      this.logAudit(actor, 'UPDATE_CATEGORY', 'CATEGORY', `تعديل الفئة: ${cat.nameAr}`, cat.id);
      return cat;
    });
  }

  public deleteCategory(actor: { id: string; fullName: string; role: RoleCode }, categoryId: string): void {
    this.executeTransaction((state) => {
      const catIndex = state.categories.findIndex((c) => c.id === categoryId);
      if (catIndex === -1) throw new Error('الفئة غير موجودة');
      const hasActiveProducts = state.products.some((p) => p.categoryId === categoryId && !p.isDeleted);
      if (hasActiveProducts) {
        throw new Error('لا يمكن حذف الفئة لأنها تحتوي على منتجات نشطة. قم بنقل أو حذف المنتجات أولًا.');
      }
      const removed = state.categories.splice(catIndex, 1)[0];
      this.logAudit(actor, 'DELETE_CATEGORY', 'CATEGORY', `حذف الفئة: ${removed.nameAr}`, categoryId);
    });
  }

  public createProduct(actor: { id: string; fullName: string; role: RoleCode }, input: any): Product {
    return this.executeTransaction((state) => {
      const now = new Date().toISOString();
      const productId = uid('prd');
      const product: Product = {
        id: productId,
        categoryId: input.categoryId,
        kitchenStation: input.kitchenStation || 'MAIN_KITCHEN',
        nameAr: input.nameAr.trim(),
        nameFr: (input.nameFr || '').trim(),
        nameEn: (input.nameEn || '').trim(),
        description: (input.description || '').trim(),
        price: Number(input.price),
        cost: Number(input.cost || 0),
        imageUrl: input.imageUrl || '/src/assets/images/dish_mixed_grill_1790580192391.jpg',
        barcode: input.barcode || '',
        isAvailable: input.isAvailable !== false,
        isDeleted: false,
        preparationTimeMinutes: Number(input.preparationTimeMinutes || 15),
        variants: (input.variants || []).map((v: any, idx: number) => ({
          id: v.id || uid('var'),
          productId,
          nameAr: v.nameAr,
          nameFr: v.nameFr || '',
          nameEn: v.nameEn || '',
          priceDelta: Number(v.priceDelta || 0),
          isDefault: v.isDefault ?? idx === 0,
        })),
        addons: (input.addons || []).map((a: any) => ({
          id: a.id || uid('add'),
          productId,
          nameAr: a.nameAr,
          nameFr: a.nameFr || '',
          nameEn: a.nameEn || '',
          price: Number(a.price || 0),
          isAvailable: a.isAvailable !== false,
        })),
        recipe: (input.recipe || []).map((r: any) => {
          const ing = state.ingredients.find((i) => i.id === r.ingredientId);
          return {
            id: r.id || uid('rec'),
            ingredientId: r.ingredientId,
            ingredientNameAr: ing ? ing.nameAr : r.ingredientNameAr || '',
            quantity: Number(r.quantity),
            unitCode: ing ? ing.unitCode : r.unitCode || 'g',
          };
        }),
        createdAt: now,
        updatedAt: now,
      };
      state.products.push(product);
      this.logAudit(actor, 'CREATE_PRODUCT', 'PRODUCT', `إضافة منتج جديد: ${product.nameAr} بسعر ${product.price} د.ج`, product.id);
      return product;
    });
  }

  public updateProduct(actor: { id: string; fullName: string; role: RoleCode }, productId: string, updates: any): Product {
    return this.executeTransaction((state) => {
      const product = state.products.find((p) => p.id === productId);
      if (!product) throw new Error('المنتج غير موجود');

      const now = new Date().toISOString();
      if (updates.price !== undefined && Number(updates.price) !== product.price) {
        const oldPrice = product.price;
        const newPrice = Number(updates.price);
        const priceLog: PriceHistoryRecord = {
          id: uid('ph'),
          productId: product.id,
          productNameAr: product.nameAr,
          oldPrice,
          newPrice,
          changedBy: actor.id,
          changedByName: actor.fullName,
          changedAt: now,
        };
        state.priceHistory.unshift(priceLog);
        product.price = newPrice;
        this.logAudit(
          actor,
          'CHANGE_PRICE',
          'PRODUCT',
          `تغيير سعر المنتج "${product.nameAr}" من ${oldPrice} د.ج إلى ${newPrice} د.ج`,
          product.id
        );
      }

      if (updates.categoryId !== undefined) product.categoryId = updates.categoryId;
      if (updates.kitchenStation !== undefined) product.kitchenStation = updates.kitchenStation;
      if (updates.nameAr !== undefined) product.nameAr = updates.nameAr.trim();
      if (updates.nameFr !== undefined) product.nameFr = updates.nameFr.trim();
      if (updates.nameEn !== undefined) product.nameEn = updates.nameEn.trim();
      if (updates.description !== undefined) product.description = updates.description.trim();
      if (updates.cost !== undefined) product.cost = Number(updates.cost);
      if (updates.imageUrl !== undefined) product.imageUrl = updates.imageUrl;
      if (updates.barcode !== undefined) product.barcode = updates.barcode;
      if (updates.isAvailable !== undefined) product.isAvailable = Boolean(updates.isAvailable);
      if (updates.preparationTimeMinutes !== undefined) product.preparationTimeMinutes = Number(updates.preparationTimeMinutes);

      if (updates.variants !== undefined) {
        product.variants = updates.variants.map((v: any, idx: number) => ({
          id: v.id || uid('var'),
          productId: product.id,
          nameAr: v.nameAr,
          nameFr: v.nameFr || '',
          nameEn: v.nameEn || '',
          priceDelta: Number(v.priceDelta || 0),
          isDefault: v.isDefault ?? idx === 0,
        }));
      }

      if (updates.addons !== undefined) {
        product.addons = updates.addons.map((a: any) => ({
          id: a.id || uid('add'),
          productId: product.id,
          nameAr: a.nameAr,
          nameFr: a.nameFr || '',
          nameEn: a.nameEn || '',
          price: Number(a.price || 0),
          isAvailable: a.isAvailable !== false,
        }));
      }

      if (updates.recipe !== undefined) {
        product.recipe = updates.recipe.map((r: any) => {
          const ing = state.ingredients.find((i) => i.id === r.ingredientId);
          return {
            id: r.id || uid('rec'),
            ingredientId: r.ingredientId,
            ingredientNameAr: ing ? ing.nameAr : r.ingredientNameAr || '',
            quantity: Number(r.quantity),
            unitCode: ing ? ing.unitCode : r.unitCode || 'g',
          };
        });
      }

      product.updatedAt = now;
      this.logAudit(actor, 'UPDATE_PRODUCT', 'PRODUCT', `تعديل المنتج: ${product.nameAr}`, product.id);
      return product;
    });
  }

  public safeDeleteProduct(actor: { id: string; fullName: string; role: RoleCode }, productId: string): Product {
    return this.executeTransaction((state) => {
      const product = state.products.find((p) => p.id === productId);
      if (!product) throw new Error('المنتج غير موجود');
      product.isDeleted = true;
      product.isAvailable = false;
      product.updatedAt = new Date().toISOString();
      this.logAudit(
        actor,
        'DELETE_PRODUCT',
        'PRODUCT',
        `حذف آمن للمنتج "${product.nameAr}" مع الحفاظ على سلامة الفواتير التاريخية`,
        product.id
      );
      return product;
    });
  }

  // ==========================================================================
  // ORDERS, KDS & AUTOMATIC RECIPE INVENTORY DEDUCTION
  // ==========================================================================

  private deductInventoryForOrder(state: PosDatabaseState, order: Order, actor: { id: string; fullName: string }): void {
    if (order.inventoryDeducted) return;
    const now = new Date().toISOString();

    for (const item of order.items) {
      const product = state.products.find((p) => p.id === item.productId);
      if (!product || !product.recipe || product.recipe.length === 0) continue;

      for (const recipeItem of product.recipe) {
        const ingredient = state.ingredients.find((ing) => ing.id === recipeItem.ingredientId);
        if (!ingredient) {
          throw new Error(`المكون ${recipeItem.ingredientNameAr} غير موجود في المخزون`);
        }
        const totalNeeded = Number((recipeItem.quantity * item.quantity).toFixed(3));
        const previousStock = ingredient.currentStock;
        const newStock = Number((previousStock - totalNeeded).toFixed(3));
        ingredient.currentStock = newStock;
        ingredient.updatedAt = now;

        const movement: StockMovement = {
          id: uid('mov'),
          ingredientId: ingredient.id,
          ingredientNameAr: ingredient.nameAr,
          movementType: 'SALE_DEDUCTION',
          quantity: -totalNeeded,
          previousStock,
          newStock,
          unitCost: ingredient.unitCost,
          referenceId: order.id,
          notes: `خصم تلقائي لبيع ${item.quantity}x ${product.nameAr} (طلب #${order.orderNumber})`,
          createdBy: actor.id,
          createdByName: actor.fullName,
          createdAt: now,
        };
        state.stockMovements.unshift(movement);
      }
    }
    order.inventoryDeducted = true;
  }

  public createOrder(actor: { id: string; fullName: string; role: RoleCode }, input: any): Order {
    return this.executeTransaction((state) => {
      // Idempotency check: never duplicate orders
      const existingOrder = state.orders.find((o) => o.idempotencyKey === input.idempotencyKey);
      if (existingOrder) {
        return existingOrder;
      }

      const now = new Date().toISOString();
      const orderId = uid('ord');
      const seqNumber = (state.orders.length + 1001).toString();
      const orderNumber = `GP-${seqNumber}`;

      const orderItems: OrderItem[] = input.items.map((itemInput: any) => {
        const product = state.products.find((p) => p.id === itemInput.productId);
        if (!product) {
          throw new Error(`المنتج غير موجود: ${itemInput.productId}`);
        }
        let unitPrice = product.price;
        let variantNameAr: string | undefined;
        if (itemInput.variantId) {
          const variant = product.variants.find((v) => v.id === itemInput.variantId);
          if (variant) {
            unitPrice += variant.priceDelta;
            variantNameAr = variant.nameAr;
          }
        }

        const selectedAddons = (itemInput.addonIds || [])
          .map((aid: string) => product.addons.find((a) => a.id === aid))
          .filter(Boolean)
          .map((a: any) => ({
            id: uid('oia'),
            addonId: a.id,
            nameAr: a.nameAr,
            price: a.price,
          }));

        const addonsTotal = selectedAddons.reduce((sum: number, a: any) => sum + a.price, 0);
        const quantity = Number(itemInput.quantity);
        const subtotal = (unitPrice + addonsTotal) * quantity;

        return {
          id: uid('oi'),
          orderId,
          productId: product.id,
          productNameAr: product.nameAr,
          variantId: itemInput.variantId,
          variantNameAr,
          quantity,
          unitPrice, // Immutable historical unit price stored inside order_items
          unitCost: product.cost,
          addons: selectedAddons,
          addonsTotal,
          subtotal,
          kitchenStation: product.kitchenStation,
          kitchenStatus: input.status === 'HELD' ? 'HELD' : 'NEW',
          notes: itemInput.notes || '',
          paidQuantity: 0,
        };
      });

      const subtotal = orderItems.reduce((sum, item) => sum + item.subtotal, 0);
      const discountAmount = Math.min(Number(input.discountAmount || 0), subtotal);
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = state.settings.taxEnabled
        ? Math.round((taxableAmount * state.settings.taxRatePercent) / 100)
        : 0;
      const deliveryFee = input.orderType === 'DELIVERY' ? Number(input.deliveryFee ?? state.settings.defaultDeliveryFee) : 0;
      const totalAmount = taxableAmount + taxAmount + deliveryFee;

      let tableName: string | null = null;
      if (input.tableId) {
        const table = state.tables.find((t) => t.id === input.tableId);
        if (table) {
          tableName = table.nameAr;
          if (input.status !== 'HELD') {
            table.status = 'OCCUPIED';
            table.currentOrderId = orderId;
            table.updatedAt = now;
          }
        }
      }

      let customerName = input.customerName || null;
      let customerPhone = input.customerPhone || null;
      if (input.customerId) {
        const cust = state.customers.find((c) => c.id === input.customerId);
        if (cust) {
          customerName = cust.name;
          customerPhone = cust.phone;
        }
      }

      const newOrder: Order = {
        id: orderId,
        orderNumber,
        idempotencyKey: input.idempotencyKey,
        orderType: input.orderType,
        status: input.status || 'NEW',
        paymentStatus: 'UNPAID',
        tableId: input.tableId || null,
        tableName,
        customerId: input.customerId || null,
        customerName,
        customerPhone,
        deliveryAddress: input.deliveryAddress || null,
        deliveryDriver: input.deliveryDriver || null,
        items: orderItems,
        subtotal,
        discountAmount,
        taxAmount,
        deliveryFee,
        totalAmount,
        paidAmount: 0,
        notes: input.notes || '',
        createdBy: actor.id,
        createdByName: actor.fullName,
        inventoryDeducted: false,
        createdAt: now,
        updatedAt: now,
      };

      state.orders.unshift(newOrder);
      this.logAudit(
        actor,
        input.status === 'HELD' ? 'HOLD_ORDER' : 'CREATE_ORDER',
        'ORDER',
        `إنشاء طلب ${newOrder.orderNumber} (${newOrder.orderType}) بقيمة ${newOrder.totalAmount} د.ج`,
        newOrder.id
      );
      return newOrder;
    });
  }

  public updateOrderStatus(
    actor: { id: string; fullName: string; role: RoleCode },
    orderId: string,
    newStatus: OrderStatus,
    stationFilter?: string,
    deliveryDriver?: string
  ): Order {
    return this.executeTransaction((state) => {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw new Error('الطلب غير موجود');

      const now = new Date().toISOString();
      if (stationFilter) {
        order.items.forEach((item) => {
          if (item.kitchenStation === stationFilter) {
            item.kitchenStatus = newStatus;
          }
        });
      } else {
        order.items.forEach((item) => {
          item.kitchenStatus = newStatus;
        });
      }

      order.status = newStatus;
      order.updatedAt = now;
      if (deliveryDriver !== undefined) {
        order.deliveryDriver = deliveryDriver;
      }

      if (newStatus === 'PREPARING' && !order.startedPreparingAt) {
        order.startedPreparingAt = now;
      }
      if (newStatus === 'READY') {
        order.readyAt = now;
      }
      if (newStatus === 'COMPLETED' || newStatus === 'DELIVERED') {
        order.completedAt = now;
        this.deductInventoryForOrder(state, order, actor);
      }
      if (newStatus === 'CANCELLED') {
        if (order.tableId) {
          const table = state.tables.find((t) => t.id === order.tableId);
          if (table && table.currentOrderId === order.id) {
            table.status = 'AVAILABLE';
            table.currentOrderId = null;
            table.updatedAt = now;
          }
        }
      }

      this.logAudit(actor, 'UPDATE_ORDER_STATUS', 'ORDER', `تغيير حالة الطلب ${order.orderNumber} إلى ${newStatus}`, order.id);
      return order;
    });
  }

  // ==========================================================================
  // PAYMENTS (SINGLE, MULTI-METHOD & SPLIT BILL WITH IDEMPOTENCY & ACID)
  // ==========================================================================

  public processPayment(
    actor: { id: string; fullName: string; role: RoleCode },
    input: {
      orderId: string;
      idempotencyKey: string;
      allocations: PaymentAllocation[];
      splitItemQuantities?: { orderItemId: string; quantity: number }[];
    }
  ): { payment: PaymentRecord; order: Order } {
    return this.executeTransaction((state) => {
      // 1. Check idempotency key to prevent duplicate payment processing
      const existingPayment = state.payments.find((p) => p.idempotencyKey === input.idempotencyKey);
      if (existingPayment) {
        const existingOrder = state.orders.find((o) => o.id === existingPayment.orderId)!;
        return { payment: existingPayment, order: existingOrder };
      }

      const order = state.orders.find((o) => o.id === input.orderId);
      if (!order) throw new Error('الطلب غير موجود');
      if (order.paymentStatus === 'PAID') {
        throw new Error('تم دفع هذه الفاتورة بالكامل مسبقًا — يمنع تكرار الدفع');
      }
      if (order.status === 'CANCELLED') {
        throw new Error('لا يمكن الدفع لطلب ملغى');
      }

      const remainingOrderDue = Math.max(0, order.totalAmount - order.paidAmount);
      const totalTendered = input.allocations.reduce((sum, a) => sum + Number(a.amount), 0);
      if (totalTendered <= 0) {
        throw new Error('مبلغ الدفع غير صالح');
      }

      // Calculate non-cash vs cash allocations to prevent non-cash overpayment
      const nonCashTotal = input.allocations
        .filter((a) => a.method !== 'CASH')
        .reduce((sum, a) => sum + Number(a.amount), 0);

      if (nonCashTotal > remainingOrderDue + 0.01) {
        throw new Error('لا يمكن أن يتجاوز الدفع بالبطاقة أو البريد قيمة المبلغ المتبقي من الفاتورة');
      }

      const effectivePaidForOrder = Math.min(remainingOrderDue, totalTendered);
      const changeGiven = Math.max(0, totalTendered - remainingOrderDue);
      const now = new Date().toISOString();

      // Update split item quantities if specified
      if (input.splitItemQuantities && input.splitItemQuantities.length > 0) {
        for (const splitItem of input.splitItemQuantities) {
          const oItem = order.items.find((i) => i.id === splitItem.orderItemId);
          if (oItem) {
            oItem.paidQuantity = Math.min(oItem.quantity, oItem.paidQuantity + splitItem.quantity);
          }
        }
      }

      order.paidAmount = Number((order.paidAmount + effectivePaidForOrder).toFixed(2));
      if (order.paidAmount >= order.totalAmount - 0.01) {
        order.paymentStatus = 'PAID';
        order.paidAmount = order.totalAmount;
        order.items.forEach((i) => {
          i.paidQuantity = i.quantity;
        });
        if (order.status === 'HELD' || order.status === 'NEW') {
          order.status = 'CONFIRMED';
          order.items.forEach((i) => {
            if (i.kitchenStatus === 'HELD') i.kitchenStatus = 'NEW';
          });
        }
        // Automatically deduct recipe ingredients inside the same transaction!
        this.deductInventoryForOrder(state, order, actor);

        // Free table if Dine-in order is completed or mark table cleanable
        if (order.tableId) {
          const table = state.tables.find((t) => t.id === order.tableId);
          if (table && table.currentOrderId === order.id) {
            table.status = 'AVAILABLE';
            table.currentOrderId = null;
            table.updatedAt = now;
          }
        }

        // Update customer stats if linked
        if (order.customerId) {
          const cust = state.customers.find((c) => c.id === order.customerId);
          if (cust) {
            cust.totalOrders += 1;
            cust.totalSpent += order.totalAmount;
          }
        }
      } else {
        order.paymentStatus = 'PARTIAL';
      }
      order.updatedAt = now;

      // Update Open Cash Shift
      const activeShift = state.cashShifts.find((s) => s.status === 'OPEN');
      if (activeShift) {
        for (const alloc of input.allocations) {
          const netMethodAmount =
            alloc.method === 'CASH' ? Math.max(0, alloc.amount - changeGiven) : alloc.amount;
          if (alloc.method === 'CASH') {
            activeShift.cashSales += netMethodAmount;
            state.cashTransactions.unshift({
              id: uid('ctx'),
              shiftId: activeShift.id,
              type: 'SALE',
              amount: netMethodAmount,
              reason: `مبيعات نقدية للطلب #${order.orderNumber}`,
              referenceId: order.id,
              createdBy: actor.id,
              createdByName: actor.fullName,
              createdAt: now,
            });
          } else if (alloc.method === 'CARD') {
            activeShift.cardSales += netMethodAmount;
          } else if (alloc.method === 'CCP') {
            activeShift.ccpSales += netMethodAmount;
          } else if (alloc.method === 'BARIDIMOB') {
            activeShift.baridimobSales += netMethodAmount;
          } else {
            activeShift.otherSales += netMethodAmount;
          }
        }
        activeShift.expectedCash =
          activeShift.openingBalance +
          activeShift.cashSales +
          activeShift.cashInTotal -
          activeShift.expensesTotal -
          activeShift.refundsTotal -
          activeShift.cashOutTotal;
      }

      const payment: PaymentRecord = {
        id: uid('pay'),
        orderId: order.id,
        orderNumber: order.orderNumber,
        idempotencyKey: input.idempotencyKey,
        totalDue: effectivePaidForOrder,
        totalTendered,
        changeGiven,
        allocations: input.allocations,
        status: 'COMPLETED',
        cashierId: actor.id,
        cashierName: actor.fullName,
        createdAt: now,
      };

      state.payments.unshift(payment);
      this.logAudit(
        actor,
        'PAYMENT_SUCCESS',
        'PAYMENT',
        `تحصيل دفعة للطلب ${order.orderNumber} بقيمة ${effectivePaidForOrder} د.ج (${input.allocations.map((a) => `${a.method}: ${a.amount}`).join(' + ')})`,
        payment.id
      );

      return { payment, order };
    });
  }

  public refundOrder(actor: { id: string; fullName: string; role: RoleCode }, orderId: string, reason: string): Order {
    return this.executeTransaction((state) => {
      const order = state.orders.find((o) => o.id === orderId);
      if (!order) throw new Error('الطلب غير موجود');
      if (order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PARTIAL') {
        throw new Error('الطلب غير مدفوع لاسترجاعه');
      }
      const refundAmount = order.paidAmount;
      const now = new Date().toISOString();

      order.paymentStatus = 'REFUNDED';
      order.status = 'CANCELLED';
      order.updatedAt = now;

      state.payments
        .filter((p) => p.orderId === order.id)
        .forEach((p) => {
          p.status = 'REFUNDED';
        });

      const activeShift = state.cashShifts.find((s) => s.status === 'OPEN');
      if (activeShift) {
        activeShift.refundsTotal += refundAmount;
        activeShift.expectedCash =
          activeShift.openingBalance +
          activeShift.cashSales +
          activeShift.cashInTotal -
          activeShift.expensesTotal -
          activeShift.refundsTotal -
          activeShift.cashOutTotal;

        state.cashTransactions.unshift({
          id: uid('ctx'),
          shiftId: activeShift.id,
          type: 'REFUND',
          amount: refundAmount,
          reason: `استرجاع مبلغ الطلب #${order.orderNumber}: ${reason}`,
          referenceId: order.id,
          createdBy: actor.id,
          createdByName: actor.fullName,
          createdAt: now,
        });
      }

      this.logAudit(actor, 'REFUND_ORDER', 'ORDER', `استرجاع الطلب ${order.orderNumber} بقيمة ${refundAmount} د.ج — السبب: ${reason}`, order.id);
      return order;
    });
  }

  // ==========================================================================
  // TABLES & ZONES MANAGEMENT
  // ==========================================================================

  public createZone(actor: { id: string; fullName: string; role: RoleCode }, nameAr: string, nameFr = ''): TableZone {
    return this.executeTransaction((state) => {
      const zone: TableZone = {
        id: uid('zone'),
        nameAr: nameAr.trim(),
        nameFr: nameFr.trim(),
        sortOrder: state.tableZones.length + 1,
      };
      state.tableZones.push(zone);
      this.logAudit(actor, 'CREATE_ZONE', 'TABLE_ZONE', `إضافة منطقة طاولات: ${zone.nameAr}`, zone.id);
      return zone;
    });
  }

  public createTable(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { zoneId: string; number: string; nameAr: string; capacity: number }
  ): RestaurantTable {
    return this.executeTransaction((state) => {
      const zone = state.tableZones.find((z) => z.id === input.zoneId);
      if (!zone) throw new Error('منطقة الطاولات غير موجودة');
      const table: RestaurantTable = {
        id: uid('tbl'),
        zoneId: zone.id,
        zoneNameAr: zone.nameAr,
        number: input.number.trim(),
        nameAr: input.nameAr.trim(),
        capacity: Number(input.capacity || 4),
        status: 'AVAILABLE',
        updatedAt: new Date().toISOString(),
      };
      state.tables.push(table);
      this.logAudit(actor, 'CREATE_TABLE', 'TABLE', `إضافة ${table.nameAr} في ${zone.nameAr}`, table.id);
      return table;
    });
  }

  public updateTableStatus(
    actor: { id: string; fullName: string; role: RoleCode },
    tableId: string,
    status: TableStatus,
    extra?: { reservationName?: string; reservationTime?: string }
  ): RestaurantTable {
    return this.executeTransaction((state) => {
      const table = state.tables.find((t) => t.id === tableId);
      if (!table) throw new Error('الطاولة غير موجودة');
      table.status = status;
      if (status === 'AVAILABLE') {
        table.currentOrderId = null;
        table.mergedWithTableId = null;
        table.reservationName = undefined;
        table.reservationTime = undefined;
      }
      if (extra?.reservationName !== undefined) table.reservationName = extra.reservationName;
      if (extra?.reservationTime !== undefined) table.reservationTime = extra.reservationTime;
      table.updatedAt = new Date().toISOString();
      this.logAudit(actor, 'UPDATE_TABLE', 'TABLE', `تغيير حالة ${table.nameAr} إلى ${status}`, table.id);
      return table;
    });
  }

  public transferOrMergeTables(
    actor: { id: string; fullName: string; role: RoleCode },
    sourceTableId: string,
    targetTableId: string,
    mode: 'TRANSFER' | 'MERGE'
  ): { sourceTable: RestaurantTable; targetTable: RestaurantTable } {
    return this.executeTransaction((state) => {
      const sourceTable = state.tables.find((t) => t.id === sourceTableId);
      const targetTable = state.tables.find((t) => t.id === targetTableId);
      if (!sourceTable || !targetTable) throw new Error('إحدى الطاولتين غير موجودة');
      if (sourceTable.id === targetTable.id) throw new Error('لا يمكن نقل أو دمج الطاولة مع نفسها');

      const now = new Date().toISOString();

      if (mode === 'TRANSFER') {
        if (!sourceTable.currentOrderId) throw new Error('الطاولة المصدر لا تحتوي على طلب مفتوح لنقله');
        const order = state.orders.find((o) => o.id === sourceTable.currentOrderId);
        if (order) {
          order.tableId = targetTable.id;
          order.tableName = targetTable.nameAr;
          order.updatedAt = now;
        }
        targetTable.status = 'OCCUPIED';
        targetTable.currentOrderId = sourceTable.currentOrderId;
        targetTable.updatedAt = now;

        sourceTable.status = 'AVAILABLE';
        sourceTable.currentOrderId = null;
        sourceTable.updatedAt = now;

        this.logAudit(actor, 'TRANSFER_TABLE', 'TABLE', `نقل الطلب من ${sourceTable.nameAr} إلى ${targetTable.nameAr}`, targetTable.id);
      } else {
        // MERGE
        const sourceOrder = sourceTable.currentOrderId ? state.orders.find((o) => o.id === sourceTable.currentOrderId) : null;
        const targetOrder = targetTable.currentOrderId ? state.orders.find((o) => o.id === targetTable.currentOrderId) : null;

        if (sourceOrder && targetOrder && sourceOrder.id !== targetOrder.id) {
          // Merge items from sourceOrder into targetOrder
          for (const item of sourceOrder.items) {
            item.orderId = targetOrder.id;
            targetOrder.items.push(item);
          }
          targetOrder.subtotal += sourceOrder.subtotal;
          targetOrder.discountAmount += sourceOrder.discountAmount;
          targetOrder.taxAmount += sourceOrder.taxAmount;
          targetOrder.totalAmount += sourceOrder.totalAmount;
          targetOrder.notes = `${targetOrder.notes} | مدمج مع ${sourceTable.nameAr}`.trim();
          targetOrder.updatedAt = now;

          sourceOrder.status = 'CANCELLED';
          sourceOrder.notes = `تم دمج هذا الطلب مع ${targetTable.nameAr} (#${targetOrder.orderNumber})`;
        } else if (sourceOrder && !targetOrder) {
          sourceOrder.tableId = targetTable.id;
          sourceOrder.tableName = `${targetTable.nameAr} + ${sourceTable.nameAr}`;
          targetTable.currentOrderId = sourceOrder.id;
        }

        targetTable.status = 'OCCUPIED';
        sourceTable.status = 'OCCUPIED';
        sourceTable.mergedWithTableId = targetTable.id;
        sourceTable.currentOrderId = targetTable.currentOrderId;
        sourceTable.updatedAt = now;
        targetTable.updatedAt = now;

        this.logAudit(actor, 'MERGE_TABLES', 'TABLE', `دمج ${sourceTable.nameAr} مع ${targetTable.nameAr}`, targetTable.id);
      }

      return { sourceTable, targetTable };
    });
  }

  // ==========================================================================
  // CASH REGISTER & SHIFTS
  // ==========================================================================

  public openCashShift(
    actor: { id: string; fullName: string; role: RoleCode },
    openingBalance: number,
    notes = ''
  ): CashShift {
    return this.executeTransaction((state) => {
      const existingOpen = state.cashShifts.find((s) => s.status === 'OPEN');
      if (existingOpen) {
        throw new Error('يوجد وردية صندوق مفتوحة بالفعل. يرجى إغلاق الوردية الحالية أولًا.');
      }
      const now = new Date().toISOString();
      const shift: CashShift = {
        id: uid('shift'),
        registerId: 'reg_main',
        openedBy: actor.id,
        openedByName: actor.fullName,
        openingBalance: Number(openingBalance),
        cashSales: 0,
        cardSales: 0,
        ccpSales: 0,
        baridimobSales: 0,
        otherSales: 0,
        expensesTotal: 0,
        refundsTotal: 0,
        cashInTotal: 0,
        cashOutTotal: 0,
        expectedCash: Number(openingBalance),
        actualCash: null,
        difference: null,
        status: 'OPEN',
        notes,
        openedAt: now,
      };
      state.cashShifts.unshift(shift);
      state.cashTransactions.unshift({
        id: uid('ctx'),
        shiftId: shift.id,
        type: 'OPENING',
        amount: Number(openingBalance),
        reason: notes || 'افتتاح وردية الصندوق',
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: now,
      });
      this.logAudit(actor, 'CASH_SHIFT_OPEN', 'CASH_SHIFT', `فتح وردية صندوق برصيد افتتاحي ${openingBalance} د.ج`, shift.id);
      return shift;
    });
  }

  public addCashMovement(
    actor: { id: string; fullName: string; role: RoleCode },
    type: 'CASH_IN' | 'CASH_OUT',
    amount: number,
    reason: string
  ): CashShift {
    return this.executeTransaction((state) => {
      const activeShift = state.cashShifts.find((s) => s.status === 'OPEN');
      if (!activeShift) throw new Error('لا توجد وردية صندوق مفتوحة حاليًا');
      const val = Number(amount);
      if (val <= 0) throw new Error('المبلغ يجب أن يكون أكبر من صفر');

      if (type === 'CASH_IN') {
        activeShift.cashInTotal += val;
      } else {
        activeShift.cashOutTotal += val;
      }
      activeShift.expectedCash =
        activeShift.openingBalance +
        activeShift.cashSales +
        activeShift.cashInTotal -
        activeShift.expensesTotal -
        activeShift.refundsTotal -
        activeShift.cashOutTotal;

      state.cashTransactions.unshift({
        id: uid('ctx'),
        shiftId: activeShift.id,
        type,
        amount: val,
        reason,
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: new Date().toISOString(),
      });

      this.logAudit(
        actor,
        type,
        'CASH_SHIFT',
        `${type === 'CASH_IN' ? 'إيداع نقدي' : 'سحب نقدي'} بقيمة ${val} د.ج — السبب: ${reason}`,
        activeShift.id
      );
      return activeShift;
    });
  }

  public closeCashShift(
    actor: { id: string; fullName: string; role: RoleCode },
    actualCash: number,
    notes = ''
  ): CashShift {
    return this.executeTransaction((state) => {
      const activeShift = state.cashShifts.find((s) => s.status === 'OPEN');
      if (!activeShift) throw new Error('لا توجد وردية صندوق مفتوحة لإغلاقها');
      const now = new Date().toISOString();

      activeShift.expectedCash =
        activeShift.openingBalance +
        activeShift.cashSales +
        activeShift.cashInTotal -
        activeShift.expensesTotal -
        activeShift.refundsTotal -
        activeShift.cashOutTotal;

      activeShift.actualCash = Number(actualCash);
      activeShift.difference = Number((activeShift.actualCash - activeShift.expectedCash).toFixed(2));
      activeShift.status = 'CLOSED';
      activeShift.closedBy = actor.id;
      activeShift.closedByName = actor.fullName;
      activeShift.closedAt = now;
      if (notes) activeShift.notes = `${activeShift.notes} | ${notes}`.trim();

      state.cashTransactions.unshift({
        id: uid('ctx'),
        shiftId: activeShift.id,
        type: 'CLOSING',
        amount: activeShift.actualCash,
        reason: `إغلاق الوردية — المتوقع: ${activeShift.expectedCash} د.ج، الفعلي: ${activeShift.actualCash} د.ج، الفارق: ${activeShift.difference} د.ج`,
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: now,
      });

      this.logAudit(
        actor,
        'CASH_SHIFT_CLOSE',
        'CASH_SHIFT',
        `إغلاق الصندوق — المتوقع: ${activeShift.expectedCash} د.ج، الفعلي: ${activeShift.actualCash} د.ج، الفارق: ${activeShift.difference} د.ج`,
        activeShift.id
      );
      return activeShift;
    });
  }

  // ==========================================================================
  // INVENTORY, WASTE, STOCK COUNT, SUPPLIERS & PURCHASES
  // ==========================================================================

  public createIngredient(
    actor: { id: string; fullName: string; role: RoleCode },
    input: {
      nameAr: string;
      nameEn?: string;
      unitCode: 'g' | 'kg' | 'ml' | 'l' | 'pcs';
      currentStock: number;
      minStock: number;
      maxStock: number;
      unitCost: number;
      supplierId?: string;
    }
  ): Ingredient {
    return this.executeTransaction((state) => {
      const unitNames: Record<string, string> = { g: 'غرام', kg: 'كيلوغرام', ml: 'ملل', l: 'لتر', pcs: 'قطعة' };
      const supplier = input.supplierId ? state.suppliers.find((s) => s.id === input.supplierId) : null;
      const ing: Ingredient = {
        id: uid('ing'),
        nameAr: input.nameAr.trim(),
        nameEn: (input.nameEn || '').trim(),
        unitCode: input.unitCode,
        unitNameAr: unitNames[input.unitCode] || input.unitCode,
        currentStock: Number(input.currentStock || 0),
        minStock: Number(input.minStock || 0),
        maxStock: Number(input.maxStock || 1000),
        unitCost: Number(input.unitCost || 0),
        supplierId: supplier?.id || null,
        supplierName: supplier?.name || null,
        updatedAt: new Date().toISOString(),
      };
      state.ingredients.push(ing);
      this.logAudit(actor, 'CREATE_INGREDIENT', 'INVENTORY', `إضافة مادة مخزون: ${ing.nameAr}`, ing.id);
      return ing;
    });
  }

  public adjustIngredientStock(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { ingredientId: string; movementType: 'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'; quantity: number; notes: string }
  ): Ingredient {
    return this.executeTransaction((state) => {
      const ing = state.ingredients.find((i) => i.id === input.ingredientId);
      if (!ing) throw new Error('المادة غير موجودة في المخزون');
      const prev = ing.currentStock;
      const qty = Number(input.quantity);
      const delta = input.movementType === 'STOCK_OUT' ? -Math.abs(qty) : qty;
      ing.currentStock = Number((prev + delta).toFixed(3));
      ing.updatedAt = new Date().toISOString();

      state.stockMovements.unshift({
        id: uid('mov'),
        ingredientId: ing.id,
        ingredientNameAr: ing.nameAr,
        movementType: input.movementType,
        quantity: delta,
        previousStock: prev,
        newStock: ing.currentStock,
        unitCost: ing.unitCost,
        notes: input.notes || 'تعديل مخزون يدوي',
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: ing.updatedAt,
      });

      this.logAudit(actor, 'CHANGE_INVENTORY', 'INVENTORY', `حركة مخزون (${input.movementType}) للمادة ${ing.nameAr}: ${delta} ${ing.unitNameAr}`, ing.id);
      return ing;
    });
  }

  public recordWaste(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { ingredientId: string; quantity: number; reason: WasteReason; notes?: string }
  ): WasteRecord {
    return this.executeTransaction((state) => {
      const ing = state.ingredients.find((i) => i.id === input.ingredientId);
      if (!ing) throw new Error('المادة غير موجودة');
      const qty = Math.abs(Number(input.quantity));
      if (qty <= 0) throw new Error('الكمية يجب أن تكون أكبر من صفر');

      const prev = ing.currentStock;
      ing.currentStock = Number((prev - qty).toFixed(3));
      const now = new Date().toISOString();
      ing.updatedAt = now;

      const totalCost = Number((qty * ing.unitCost).toFixed(2));
      const waste: WasteRecord = {
        id: uid('wst'),
        ingredientId: ing.id,
        ingredientNameAr: ing.nameAr,
        unitCode: ing.unitCode,
        quantity: qty,
        unitCost: ing.unitCost,
        totalCost,
        reason: input.reason,
        notes: input.notes || '',
        reportedBy: actor.id,
        reportedByName: actor.fullName,
        reportedAt: now,
      };
      state.wasteRecords.unshift(waste);

      state.stockMovements.unshift({
        id: uid('mov'),
        ingredientId: ing.id,
        ingredientNameAr: ing.nameAr,
        movementType: 'WASTE',
        quantity: -qty,
        previousStock: prev,
        newStock: ing.currentStock,
        unitCost: ing.unitCost,
        referenceId: waste.id,
        notes: `تسجيل هدر (${input.reason}): ${input.notes || ''}`,
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: now,
      });

      this.logAudit(actor, 'RECORD_WASTE', 'WASTE', `تسجيل هدر ${qty} ${ing.unitNameAr} من ${ing.nameAr} (${input.reason})`, waste.id);
      return waste;
    });
  }

  public performStockCount(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { notes?: string; items: { ingredientId: string; actualQuantity: number }[] }
  ): StockCountRecord {
    return this.executeTransaction((state) => {
      const now = new Date().toISOString();
      const countId = uid('cnt');
      const countItems = input.items.map((item) => {
        const ing = state.ingredients.find((i) => i.id === item.ingredientId);
        if (!ing) throw new Error(`المادة غير موجودة: ${item.ingredientId}`);
        const systemQuantity = ing.currentStock;
        const actualQuantity = Number(item.actualQuantity);
        const difference = Number((actualQuantity - systemQuantity).toFixed(3));

        if (difference !== 0) {
          ing.currentStock = actualQuantity;
          ing.updatedAt = now;
          state.stockMovements.unshift({
            id: uid('mov'),
            ingredientId: ing.id,
            ingredientNameAr: ing.nameAr,
            movementType: 'STOCK_COUNT',
            quantity: difference,
            previousStock: systemQuantity,
            newStock: actualQuantity,
            unitCost: ing.unitCost,
            referenceId: countId,
            notes: `تسوية جرد مخزون: النظام ${systemQuantity} / الفعلي ${actualQuantity}`,
            createdBy: actor.id,
            createdByName: actor.fullName,
            createdAt: now,
          });
        }

        return {
          ingredientId: ing.id,
          ingredientNameAr: ing.nameAr,
          unitCode: ing.unitCode,
          systemQuantity,
          actualQuantity,
          difference,
        };
      });

      const record: StockCountRecord = {
        id: countId,
        notes: input.notes || 'جرد دوري للمخزون',
        countedBy: actor.id,
        countedByName: actor.fullName,
        countedAt: now,
        items: countItems,
      };
      state.stockCounts.unshift(record);
      this.logAudit(actor, 'STOCK_COUNT', 'INVENTORY', `إجراء جرد مخزون شامل لعدد ${countItems.length} مادة`, record.id);
      return record;
    });
  }

  public createSupplier(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { name: string; phone: string; address?: string; notes?: string }
  ): Supplier {
    return this.executeTransaction((state) => {
      const supplier: Supplier = {
        id: uid('sup'),
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: (input.address || '').trim(),
        notes: (input.notes || '').trim(),
        totalPurchases: 0,
        createdAt: new Date().toISOString(),
      };
      state.suppliers.unshift(supplier);
      this.logAudit(actor, 'CREATE_SUPPLIER', 'SUPPLIER', `إضافة مورد: ${supplier.name}`, supplier.id);
      return supplier;
    });
  }

  public updateSupplier(
    actor: { id: string; fullName: string; role: RoleCode },
    supplierId: string,
    updates: Partial<{ name: string; phone: string; address: string; notes: string }>
  ): Supplier {
    return this.executeTransaction((state) => {
      const sup = state.suppliers.find((s) => s.id === supplierId);
      if (!sup) throw new Error('المورد غير موجود');
      if (updates.name !== undefined) sup.name = updates.name.trim();
      if (updates.phone !== undefined) sup.phone = updates.phone.trim();
      if (updates.address !== undefined) sup.address = updates.address.trim();
      if (updates.notes !== undefined) sup.notes = updates.notes.trim();
      this.logAudit(actor, 'UPDATE_SUPPLIER', 'SUPPLIER', `تعديل بيانات المورد: ${sup.name}`, sup.id);
      return sup;
    });
  }

  public deleteSupplier(actor: { id: string; fullName: string; role: RoleCode }, supplierId: string): void {
    this.executeTransaction((state) => {
      const idx = state.suppliers.findIndex((s) => s.id === supplierId);
      if (idx === -1) throw new Error('المورد غير موجود');
      const removed = state.suppliers.splice(idx, 1)[0];
      this.logAudit(actor, 'DELETE_SUPPLIER', 'SUPPLIER', `حذف المورد: ${removed.name}`, supplierId);
    });
  }

  public createPurchase(
    actor: { id: string; fullName: string; role: RoleCode },
    input: {
      supplierId: string;
      invoiceNumber?: string;
      notes?: string;
      items: { ingredientId: string; quantity: number; unitCost: number }[];
    }
  ): PurchaseRecord {
    return this.executeTransaction((state) => {
      const supplier = state.suppliers.find((s) => s.id === input.supplierId);
      if (!supplier) throw new Error('المورد غير موجود');
      if (!input.items || input.items.length === 0) throw new Error('يجب إضافة مادة واحدة على الأقل لفاتورة الشراء');

      const now = new Date().toISOString();
      const purchaseId = uid('pur');
      const purchaseItems = input.items.map((item) => {
        const ing = state.ingredients.find((i) => i.id === item.ingredientId);
        if (!ing) throw new Error(`المادة غير موجودة: ${item.ingredientId}`);
        const quantity = Number(item.quantity);
        const unitCost = Number(item.unitCost);
        const totalCost = Number((quantity * unitCost).toFixed(2));

        const prevStock = ing.currentStock;
        ing.currentStock = Number((prevStock + quantity).toFixed(3));
        ing.unitCost = unitCost;
        ing.updatedAt = now;

        state.stockMovements.unshift({
          id: uid('mov'),
          ingredientId: ing.id,
          ingredientNameAr: ing.nameAr,
          movementType: 'PURCHASE',
          quantity,
          previousStock: prevStock,
          newStock: ing.currentStock,
          unitCost,
          referenceId: purchaseId,
          notes: `شراء من المورد ${supplier.name}`,
          createdBy: actor.id,
          createdByName: actor.fullName,
          createdAt: now,
        });

        return {
          ingredientId: ing.id,
          ingredientNameAr: ing.nameAr,
          unitCode: ing.unitCode,
          quantity,
          unitCost,
          totalCost,
        };
      });

      const totalAmount = purchaseItems.reduce((sum, i) => sum + i.totalCost, 0);
      supplier.totalPurchases += totalAmount;

      const purchase: PurchaseRecord = {
        id: purchaseId,
        invoiceNumber: input.invoiceNumber || `PUR-${state.purchases.length + 101}`,
        supplierId: supplier.id,
        supplierName: supplier.name,
        totalAmount,
        notes: input.notes || '',
        items: purchaseItems,
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: now,
      };

      state.purchases.unshift(purchase);
      this.logAudit(
        actor,
        'CREATE_PURCHASE',
        'PURCHASE',
        `تأكيد فاتورة شراء ${purchase.invoiceNumber} من ${supplier.name} بقيمة ${totalAmount} د.ج وزيادة المخزون`,
        purchase.id
      );
      return purchase;
    });
  }

  // ==========================================================================
  // CUSTOMERS & EXPENSES
  // ==========================================================================

  public createCustomer(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { name: string; phone: string; address?: string; notes?: string }
  ): Customer {
    return this.executeTransaction((state) => {
      const cust: Customer = {
        id: uid('cust'),
        name: input.name.trim(),
        phone: input.phone.trim(),
        address: (input.address || '').trim(),
        notes: (input.notes || '').trim(),
        totalOrders: 0,
        totalSpent: 0,
        createdAt: new Date().toISOString(),
      };
      state.customers.unshift(cust);
      this.logAudit(actor, 'CREATE_CUSTOMER', 'CUSTOMER', `إضافة عميل: ${cust.name} (${cust.phone})`, cust.id);
      return cust;
    });
  }

  public updateCustomer(
    actor: { id: string; fullName: string; role: RoleCode },
    customerId: string,
    updates: Partial<{ name: string; phone: string; address: string; notes: string }>
  ): Customer {
    return this.executeTransaction((state) => {
      const cust = state.customers.find((c) => c.id === customerId);
      if (!cust) throw new Error('العميل غير موجود');
      if (updates.name !== undefined) cust.name = updates.name.trim();
      if (updates.phone !== undefined) cust.phone = updates.phone.trim();
      if (updates.address !== undefined) cust.address = updates.address.trim();
      if (updates.notes !== undefined) cust.notes = updates.notes.trim();
      this.logAudit(actor, 'UPDATE_CUSTOMER', 'CUSTOMER', `تعديل بيانات العميل: ${cust.name}`, cust.id);
      return cust;
    });
  }

  public createExpense(
    actor: { id: string; fullName: string; role: RoleCode },
    input: { category: ExpenseCategory; amount: number; description: string; paidFromCashRegister?: boolean; expenseDate?: string }
  ): ExpenseRecord {
    return this.executeTransaction((state) => {
      const amount = Number(input.amount);
      if (amount <= 0) throw new Error('مبلغ المصروف يجب أن يكون أكبر من صفر');
      const now = new Date().toISOString();
      const paidFromCash = input.paidFromCashRegister !== false;

      const expense: ExpenseRecord = {
        id: uid('exp'),
        category: input.category,
        categoryNameAr: EXPENSE_CATEGORY_AR[input.category] || input.category,
        amount,
        description: input.description.trim(),
        paidFromCashRegister: paidFromCash,
        expenseDate: input.expenseDate || now.slice(0, 10),
        createdBy: actor.id,
        createdByName: actor.fullName,
        createdAt: now,
      };
      state.expenses.unshift(expense);

      if (paidFromCash) {
        const activeShift = state.cashShifts.find((s) => s.status === 'OPEN');
        if (activeShift) {
          activeShift.expensesTotal += amount;
          activeShift.expectedCash =
            activeShift.openingBalance +
            activeShift.cashSales +
            activeShift.cashInTotal -
            activeShift.expensesTotal -
            activeShift.refundsTotal -
            activeShift.cashOutTotal;

          state.cashTransactions.unshift({
            id: uid('ctx'),
            shiftId: activeShift.id,
            type: 'EXPENSE',
            amount,
            reason: `مصروف (${expense.categoryNameAr}): ${expense.description}`,
            referenceId: expense.id,
            createdBy: actor.id,
            createdByName: actor.fullName,
            createdAt: now,
          });
        }
      }

      this.logAudit(actor, 'CREATE_EXPENSE', 'EXPENSE', `تسجيل مصروف (${expense.categoryNameAr}) بقيمة ${amount} د.ج: ${expense.description}`, expense.id);
      return expense;
    });
  }

  // ==========================================================================
  // SETTINGS & BACKUPS
  // ==========================================================================

  public updateSettings(
    actor: { id: string; fullName: string; role: RoleCode },
    updates: Partial<RestaurantSettings>
  ): RestaurantSettings {
    return this.executeTransaction((state) => {
      state.settings = {
        ...state.settings,
        ...updates,
      };
      this.logAudit(actor, 'UPDATE_SETTINGS', 'SETTINGS', 'تحديث إعدادات المطعم والنظام');
      return state.settings;
    });
  }

  public createBackup(
    actor: { id: string; fullName: string; role: RoleCode },
    backupType: 'MANUAL' | 'AUTO_PRE_RESTORE' | 'AUTO_DAILY' = 'MANUAL'
  ): BackupMetadata {
    const now = new Date().toISOString();
    const { backups: _existingBackups, ...stateWithoutBackups } = this.state;
    const serialized = JSON.stringify(stateWithoutBackups);
    const recordsCount =
      this.state.orders.length +
      this.state.products.length +
      this.state.ingredients.length +
      this.state.customers.length +
      this.state.payments.length;

    const backup: BackupMetadata = {
      id: uid('bkp'),
      filename: `golden_palace_backup_${now.replace(/[:.]/g, '-')}.json`,
      backupType,
      sizeBytes: Buffer.byteLength(serialized, 'utf8'),
      recordsCount,
      createdBy: actor.id,
      createdByName: actor.fullName,
      createdAt: now,
      snapshot: JSON.parse(serialized),
    };

    this.state.backups.unshift(backup);
    if (this.state.backups.length > 25) {
      this.state.backups = this.state.backups.slice(0, 25);
    }
    this.logAudit(actor, 'CREATE_BACKUP', 'BACKUP', `إنشاء نسخة احتياطية (${backupType}): ${backup.filename}`, backup.id);
    this.save();
    return backup;
  }

  public restoreBackup(
    actor: { id: string; fullName: string; role: RoleCode },
    snapshotToRestore: Partial<PosDatabaseState>,
    confirmed: boolean
  ): { autoBackupId: string; restoredVersion: number } {
    if (!confirmed) {
      throw new Error('يجب تأكيد استعادة النسخة الاحتياطية صراحةً لمنع فقدان البيانات الحالية');
    }
    // Automatically create a safety backup before restoring!
    const safetyBackup = this.createBackup(actor, 'AUTO_PRE_RESTORE');
    const keptBackups = [...this.state.backups];

    this.executeTransaction((state) => {
      if (snapshotToRestore.settings) state.settings = snapshotToRestore.settings;
      if (snapshotToRestore.categories) state.categories = snapshotToRestore.categories;
      if (snapshotToRestore.products) state.products = snapshotToRestore.products;
      if (snapshotToRestore.priceHistory) state.priceHistory = snapshotToRestore.priceHistory;
      if (snapshotToRestore.tableZones) state.tableZones = snapshotToRestore.tableZones;
      if (snapshotToRestore.tables) state.tables = snapshotToRestore.tables;
      if (snapshotToRestore.orders) state.orders = snapshotToRestore.orders;
      if (snapshotToRestore.payments) state.payments = snapshotToRestore.payments;
      if (snapshotToRestore.cashShifts) state.cashShifts = snapshotToRestore.cashShifts;
      if (snapshotToRestore.cashTransactions) state.cashTransactions = snapshotToRestore.cashTransactions;
      if (snapshotToRestore.ingredients) state.ingredients = snapshotToRestore.ingredients;
      if (snapshotToRestore.stockMovements) state.stockMovements = snapshotToRestore.stockMovements;
      if (snapshotToRestore.wasteRecords) state.wasteRecords = snapshotToRestore.wasteRecords;
      if (snapshotToRestore.stockCounts) state.stockCounts = snapshotToRestore.stockCounts;
      if (snapshotToRestore.suppliers) state.suppliers = snapshotToRestore.suppliers;
      if (snapshotToRestore.purchases) state.purchases = snapshotToRestore.purchases;
      if (snapshotToRestore.customers) state.customers = snapshotToRestore.customers;
      if (snapshotToRestore.expenses) state.expenses = snapshotToRestore.expenses;
      state.backups = keptBackups;

      this.logAudit(
        actor,
        'RESTORE_BACKUP',
        'BACKUP',
        `استعادة قاعدة البيانات بنجاح (تم حفظ نسخة أمان تلقائية رقم ${safetyBackup.id} قبل الاستعادة)`
      );
    });

    return { autoBackupId: safetyBackup.id, restoredVersion: this.state.version };
  }
}

export const posDb = new PosDatabaseEngine(true);
