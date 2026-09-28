import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  Check,
  ClipboardCheck,
  Edit3,
  History,
  Layers,
  Package,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.tsx';
import {
  Category,
  Ingredient,
  KitchenStationCode,
  Product,
  ProductAddon,
  ProductVariant,
  RecipeItem,
  Supplier,
  WasteReason,
} from '../db/types.ts';

const STATION_LABELS: Record<KitchenStationCode, string> = {
  MAIN_KITCHEN: 'المطبخ الرئيسي',
  GRILL: 'قسم المشاوي',
  DRINKS: 'قسم المشروبات',
  DESSERT: 'قسم الحلويات',
};

const WASTE_REASONS_AR: Record<WasteReason, string> = {
  Expired: 'منتهي الصلاحية (Expired)',
  Damaged: 'تالف أثناء التخزين (Damaged)',
  Burned: 'احتراق أثناء الطهي (Burned)',
  Spilled: 'انسكاب / سقوط (Spilled)',
  Other: 'سبب آخر (Other)',
};

// ============================================================================
// 1. MENU MANAGEMENT VIEW (Products, Categories, Variants, Addons, Price History)
// ============================================================================

export const MenuManagementView: React.FC = () => {
  const {
    categories,
    products,
    priceHistory,
    ingredients,
    apiRequest,
    refreshAll,
    can,
    addNotification,
  } = usePos();

  const [activeSubTab, setActiveSubTab] = useState<'PRODUCTS' | 'CATEGORIES' | 'PRICE_HISTORY'>('PRODUCTS');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [prodNameAr, setProdNameAr] = useState('');
  const [prodNameFr, setProdNameFr] = useState('');
  const [prodNameEn, setProdNameEn] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodCategoryId, setProdCategoryId] = useState('');
  const [prodStation, setProdStation] = useState<KitchenStationCode>('MAIN_KITCHEN');
  const [prodPrice, setProdPrice] = useState(0);
  const [prodCost, setProdCost] = useState(0);
  const [prodImage, setProdImage] = useState('');
  const [prodBarcode, setProdBarcode] = useState('');
  const [prodAvailable, setProdAvailable] = useState(true);
  const [prodPrepTime, setProdPrepTime] = useState(15);
  const [prodVariants, setProdVariants] = useState<ProductVariant[]>([]);
  const [prodAddons, setProdAddons] = useState<ProductAddon[]>([]);
  const [prodRecipe, setProdRecipe] = useState<RecipeItem[]>([]);

  // Category Form State
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catNameAr, setCatNameAr] = useState('');
  const [catNameFr, setCatNameFr] = useState('');
  const [catNameEn, setCatNameEn] = useState('');
  const [catSortOrder, setCatSortOrder] = useState(1);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (selectedCategoryFilter !== 'ALL' && p.categoryId !== selectedCategoryFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.nameAr.toLowerCase().includes(q) ||
          p.nameFr.toLowerCase().includes(q) ||
          p.nameEn.toLowerCase().includes(q) ||
          p.barcode.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [products, selectedCategoryFilter, searchQuery]);

  const openCreateProduct = () => {
    setEditingProduct(null);
    setProdNameAr('');
    setProdNameFr('');
    setProdNameEn('');
    setProdDesc('');
    setProdCategoryId(categories[0]?.id || '');
    setProdStation('MAIN_KITCHEN');
    setProdPrice(800);
    setProdCost(350);
    setProdImage('');
    setProdBarcode('');
    setProdAvailable(true);
    setProdPrepTime(15);
    setProdVariants([]);
    setProdAddons([]);
    setProdRecipe([]);
    setShowProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingProduct(p);
    setProdNameAr(p.nameAr);
    setProdNameFr(p.nameFr);
    setProdNameEn(p.nameEn);
    setProdDesc(p.description);
    setProdCategoryId(p.categoryId);
    setProdStation(p.kitchenStation);
    setProdPrice(p.price);
    setProdCost(p.cost);
    setProdImage(p.imageUrl);
    setProdBarcode(p.barcode);
    setProdAvailable(p.isAvailable);
    setProdPrepTime(p.preparationTimeMinutes || 15);
    setProdVariants(p.variants || []);
    setProdAddons(p.addons || []);
    setProdRecipe(p.recipe || []);
    setShowProductModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodNameAr.trim()) return;
    const payload = {
      nameAr: prodNameAr.trim(),
      nameFr: prodNameFr.trim(),
      nameEn: prodNameEn.trim(),
      description: prodDesc.trim(),
      categoryId: prodCategoryId || categories[0]?.id,
      kitchenStation: prodStation,
      price: Number(prodPrice),
      cost: Number(prodCost),
      imageUrl: prodImage.trim(),
      barcode: prodBarcode.trim(),
      isAvailable: prodAvailable,
      preparationTimeMinutes: Number(prodPrepTime) || 15,
      variants: prodVariants,
      addons: prodAddons,
      recipe: prodRecipe,
    };

    try {
      if (editingProduct) {
        await apiRequest(`/api/products/${editingProduct.id}`, {
          method: 'PATCH',
          body: JSON.stringify(payload),
        });
        addNotification('INFO', 'تحديث المنتج', `تم حفظ التعديلات على "${prodNameAr}" بنجاح.`);
      } else {
        await apiRequest('/api/products', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        addNotification('INFO', 'إضافة منتج', `تمت إضافة "${prodNameAr}" إلى قائمة القصر الذهبي.`);
      }
      await refreshAll();
      setShowProductModal(false);
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ في حفظ المنتج', err.message);
    }
  };

  const handleToggleProductAvailability = async (p: Product) => {
    try {
      await apiRequest(`/api/products/${p.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isAvailable: !p.isAvailable }),
      });
      await refreshAll();
      addNotification(
        'INFO',
        p.isAvailable ? 'تم تعطيل المنتج مؤقتًا' : 'تم تفعيل المنتج',
        `${p.nameAr}: ${!p.isAvailable ? 'متاح الآن للبيع' : 'غير متاح مؤقتًا'}`
      );
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'تعذر تحديث الحالة', err.message);
    }
  };

  const handleSafeDeleteProduct = async (p: Product) => {
    try {
      await apiRequest(`/api/products/${p.id}`, { method: 'DELETE' });
      await refreshAll();
      addNotification(
        'INFO',
        'حذف آمن للمنتج',
        `تم أرشفة "${p.nameAr}" بأمان مع الحفاظ على جميع الفواتير التاريخية.`
      );
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'تعذر الحذف', err.message);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameAr.trim()) return;
    try {
      if (editingCategory) {
        await apiRequest(`/api/categories/${editingCategory.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            nameAr: catNameAr.trim(),
            nameFr: catNameFr.trim(),
            nameEn: catNameEn.trim(),
            sortOrder: Number(catSortOrder),
          }),
        });
      } else {
        await apiRequest('/api/categories', {
          method: 'POST',
          body: JSON.stringify({
            nameAr: catNameAr.trim(),
            nameFr: catNameFr.trim(),
            nameEn: catNameEn.trim(),
            sortOrder: Number(catSortOrder),
          }),
        });
      }
      await refreshAll();
      setCatModalOpen(false);
      addNotification('INFO', 'حفظ الفئة', 'تم تحديث فئات القائمة بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleDeleteCategory = async (catId: string) => {
    try {
      await apiRequest(`/api/categories/${catId}`, { method: 'DELETE' });
      await refreshAll();
      addNotification('INFO', 'حذف الفئة', 'تم حذف الفئة بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'لا يمكن حذف الفئة', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <UtensilsCrossed className="w-6 h-6 text-[#D4AF37]" />
            <span>إدارة قائمة الطعام والأسعار (Menu & Price History)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            إضافة وتعديل الأطباق، الأحجام (Variants)، الإضافات (Add-ons)، الوصفات، وسجل تغير الأسعار
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('PRODUCTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
              activeSubTab === 'PRODUCTS'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            الأصناف والمنتجات ({products.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('CATEGORIES')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
              activeSubTab === 'CATEGORIES'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            الفئات ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('PRICE_HISTORY')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border flex items-center gap-1.5 ${
              activeSubTab === 'PRICE_HISTORY'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>سجل الأسعار ({priceHistory.length})</span>
          </button>

          {can('menu:manage') && activeSubTab === 'PRODUCTS' && (
            <button
              type="button"
              onClick={openCreateProduct}
              className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة طبق / منتج جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB 1: PRODUCTS */}
      {activeSubTab === 'PRODUCTS' && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => setSelectedCategoryFilter('ALL')}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold shrink-0 border ${
                  selectedCategoryFilter === 'ALL'
                    ? 'bg-[#D4AF37]/20 text-[#F3E5AB] border-[#D4AF37]'
                    : 'bg-[#141419] text-neutral-400 border-white/10'
                }`}
              >
                الكل ({products.length})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold shrink-0 border ${
                    selectedCategoryFilter === cat.id
                      ? 'bg-[#D4AF37]/20 text-[#F3E5AB] border-[#D4AF37]'
                      : 'bg-[#141419] text-neutral-400 border-white/10'
                  }`}
                >
                  {cat.nameAr}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم أو الباركود..."
                className="w-full rounded-xl bg-[#141419] border border-white/10 pr-9 pl-3 py-2 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((p) => {
              const cat = categories.find((c) => c.id === p.categoryId);
              const profitMargin = p.price > 0 ? Math.round(((p.price - p.cost) / p.price) * 100) : 0;

              return (
                <div
                  key={p.id}
                  className={`rounded-2xl bg-[#141419] border overflow-hidden flex flex-col justify-between transition-all ${
                    p.isAvailable ? 'border-white/10 hover:border-[#D4AF37]/40' : 'border-red-500/30 opacity-75'
                  }`}
                >
                  <div>
                    <div className="h-36 bg-black/50 relative overflow-hidden">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.nameAr}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-neutral-600">
                          <UtensilsCrossed className="w-10 h-10" />
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1.5">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-[#F3E5AB] backdrop-blur-xs">
                          {cat?.nameAr || 'عام'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-black/75 text-neutral-300">
                          {STATION_LABELS[p.kitchenStation]}
                        </span>
                      </div>
                      <div className="absolute bottom-2 left-2">
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            p.isAvailable
                              ? 'bg-emerald-500/90 text-black'
                              : 'bg-red-500/90 text-white'
                          }`}
                        >
                          {p.isAvailable ? 'متوفر' : 'غير متوفر'}
                        </span>
                      </div>
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="text-sm font-bold text-white">{p.nameAr}</h3>
                          {(p.nameFr || p.nameEn) && (
                            <p className="text-[11px] text-neutral-400">
                              {p.nameFr} {p.nameEn ? `• ${p.nameEn}` : ''}
                            </p>
                          )}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-extrabold text-[#D4AF37] tabular-nums">
                            {p.price.toLocaleString('en-US')} د.ج
                          </div>
                          <div className="text-[10px] text-neutral-400 tabular-nums">
                            التكلفة: {p.cost} د.ج ({profitMargin}%)
                          </div>
                        </div>
                      </div>

                      {p.description && (
                        <p className="text-xs text-neutral-400 line-clamp-2">{p.description}</p>
                      )}

                      <div className="flex flex-wrap gap-1.5 pt-1 text-[10px]">
                        {p.variants.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300">
                            {p.variants.length} أحجام
                          </span>
                        )}
                        {p.addons.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-300">
                            {p.addons.length} إضافات
                          </span>
                        )}
                        {p.recipe.length > 0 && (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
                            مرتبط بـ {p.recipe.length} مواد خام
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {can('menu:manage') && (
                    <div className="p-3 bg-black/40 border-t border-white/5 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => openEditProduct(p)}
                        className="flex-1 py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-semibold text-white flex items-center justify-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-[#D4AF37]" />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleProductAvailability(p)}
                        className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-neutral-300"
                      >
                        {p.isAvailable ? 'تعطيل' : 'تفعيل'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSafeDeleteProduct(p)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                        title="حذف آمن (يحفظ الفواتير القديمة)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* SUBTAB 2: CATEGORIES */}
      {activeSubTab === 'CATEGORIES' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">إدارة فئات القائمة وترتيب العرض</h2>
            {can('menu:manage') && (
              <button
                type="button"
                onClick={() => {
                  setEditingCategory(null);
                  setCatNameAr('');
                  setCatNameFr('');
                  setCatNameEn('');
                  setCatSortOrder(categories.length + 1);
                  setCatModalOpen(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة فئة جديدة</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map((cat) => {
              const prodCount = products.filter((p) => p.categoryId === cat.id).length;
              return (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-[#D4AF37]/20 text-[#F3E5AB] text-xs font-bold flex items-center justify-center tabular-nums">
                        {cat.sortOrder}
                      </span>
                      <h3 className="text-sm font-bold text-white">{cat.nameAr}</h3>
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {cat.nameFr} • {prodCount} منتجات
                    </div>
                  </div>
                  {can('menu:manage') && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCategory(cat);
                          setCatNameAr(cat.nameAr);
                          setCatNameFr(cat.nameFr);
                          setCatNameEn(cat.nameEn);
                          setCatSortOrder(cat.sortOrder);
                          setCatModalOpen(true);
                        }}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUBTAB 3: PRICE HISTORY */}
      {activeSubTab === 'PRICE_HISTORY' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">سجل تغييرات الأسعار (Price History Audit)</h2>
              <p className="text-xs text-neutral-400">
                يتم توثيق كل تعديل في السعر تلقائيًا، بينما تحتفظ الفواتير القديمة بسعر البيع التاريخي وقت الطلب.
              </p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">المنتج</th>
                  <th className="py-3 px-4">السعر القديم</th>
                  <th className="py-3 px-4">السعر الجديد</th>
                  <th className="py-3 px-4">تم التغيير بواسطة</th>
                  <th className="py-3 px-4">التاريخ والوقت</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {priceHistory.map((ph) => (
                  <tr key={ph.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-4 font-bold text-white">{ph.productNameAr}</td>
                    <td className="py-3 px-4 text-neutral-400 line-through tabular-nums">
                      {ph.oldPrice.toLocaleString('en-US')} د.ج
                    </td>
                    <td className="py-3 px-4 font-bold text-[#D4AF37] tabular-nums">
                      {ph.newPrice.toLocaleString('en-US')} د.ج
                    </td>
                    <td className="py-3 px-4 text-neutral-200">{ph.changedByName}</td>
                    <td className="py-3 px-4 text-neutral-400 tabular-nums">
                      {new Date(ph.changedAt).toLocaleString('ar-DZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRODUCT CREATE / EDIT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <form
            onSubmit={handleSaveProduct}
            className="w-full max-w-3xl rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-5 my-8 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingProduct ? `تعديل المنتج: ${editingProduct.nameAr}` : 'إضافة منتج جديد للقائمة'}
              </h3>
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الاسم بالعربية *</label>
                <input
                  type="text"
                  required
                  value={prodNameAr}
                  onChange={(e) => setProdNameAr(e.target.value)}
                  placeholder="مثال: مشوي مشكل ملكي"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الاسم بالفرنسية</label>
                <input
                  type="text"
                  value={prodNameFr}
                  onChange={(e) => setProdNameFr(e.target.value)}
                  placeholder="Grillade Mixte Royale"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الاسم بالإنجليزية</label>
                <input
                  type="text"
                  value={prodNameEn}
                  onChange={(e) => setProdNameEn(e.target.value)}
                  placeholder="Royal Mixed Grill"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الفئة</label>
                <select
                  value={prodCategoryId}
                  onChange={(e) => setProdCategoryId(e.target.value)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">محطة المطبخ</label>
                <select
                  value={prodStation}
                  onChange={(e) => setProdStation(e.target.value as KitchenStationCode)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                >
                  <option value="MAIN_KITCHEN">المطبخ الرئيسي</option>
                  <option value="GRILL">قسم المشاوي</option>
                  <option value="DRINKS">قسم المشروبات</option>
                  <option value="DESSERT">قسم الحلويات</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">سعر البيع (د.ج) *</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/50 border border-[#D4AF37]/50 px-3 py-2 text-xs font-bold text-[#F3E5AB] tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">تكلفة المنتج (د.ج)</label>
                <input
                  type="number"
                  min={0}
                  value={prodCost}
                  onChange={(e) => setProdCost(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="text-xs text-neutral-400 block mb-1">رابط الصورة (Image URL)</label>
                <input
                  type="text"
                  value={prodImage}
                  onChange={(e) => setProdImage(e.target.value)}
                  placeholder="/images/dish.jpg أو رابط مباشر"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الباركود (اختياري)</label>
                <input
                  type="text"
                  value={prodBarcode}
                  onChange={(e) => setProdBarcode(e.target.value)}
                  placeholder="613000..."
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            {/* Variants Section */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F3E5AB]">الأحجام والأنواع (Variants — صغير / متوسط / كبير)</span>
                <button
                  type="button"
                  onClick={() =>
                    setProdVariants((prev) => [
                      ...prev,
                      {
                        id: `var_${Date.now()}`,
                        productId: editingProduct?.id || '',
                        nameAr: 'حجم كبير',
                        nameFr: 'Grand',
                        nameEn: 'Large',
                        priceDelta: 300,
                        isDefault: false,
                      },
                    ])
                  }
                  className="px-2.5 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/15"
                >
                  + إضافة حجم
                </button>
              </div>
              {prodVariants.map((v, idx) => (
                <div key={v.id || idx} className="grid grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    value={v.nameAr}
                    onChange={(e) =>
                      setProdVariants((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, nameAr: e.target.value } : item))
                      )
                    }
                    placeholder="اسم الحجم (مثال: عائلي)"
                    className="rounded bg-[#141419] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    value={v.priceDelta}
                    onChange={(e) =>
                      setProdVariants((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, priceDelta: Number(e.target.value) } : item
                        )
                      )
                    }
                    placeholder="فرق السعر (+ د.ج)"
                    className="rounded bg-[#141419] border border-white/10 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setProdVariants((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-400 hover:underline text-left"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            {/* Addons Section */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">الإضافات الاختيارية (Add-ons — جبن، بطاطا، صلصة...)</span>
                <button
                  type="button"
                  onClick={() =>
                    setProdAddons((prev) => [
                      ...prev,
                      {
                        id: `add_${Date.now()}`,
                        productId: editingProduct?.id || '',
                        nameAr: 'إضافة جبن شيدر',
                        nameFr: 'Supplément Fromage',
                        nameEn: 'Extra Cheese',
                        price: 150,
                        isAvailable: true,
                      },
                    ])
                  }
                  className="px-2.5 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/15"
                >
                  + إضافة خيار
                </button>
              </div>
              {prodAddons.map((a, idx) => (
                <div key={a.id || idx} className="grid grid-cols-3 gap-2 items-center">
                  <input
                    type="text"
                    value={a.nameAr}
                    onChange={(e) =>
                      setProdAddons((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, nameAr: e.target.value } : item))
                      )
                    }
                    placeholder="اسم الإضافة"
                    className="rounded bg-[#141419] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  />
                  <input
                    type="number"
                    min={0}
                    value={a.price}
                    onChange={(e) =>
                      setProdAddons((prev) =>
                        prev.map((item, i) => (i === idx ? { ...item, price: Number(e.target.value) } : item))
                      )
                    }
                    placeholder="السعر (د.ج)"
                    className="rounded bg-[#141419] border border-white/10 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setProdAddons((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-400 hover:underline text-left"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            {/* Recipe / Ingredients Link Section */}
            <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-300">
                  الوصفة والمكونات (تخصم تلقائيًا من المخزون عند البيع)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    const firstIng = ingredients[0];
                    if (!firstIng) return;
                    setProdRecipe((prev) => [
                      ...prev,
                      {
                        id: `rec_${Date.now()}`,
                        ingredientId: firstIng.id,
                        ingredientNameAr: firstIng.nameAr,
                        quantity: 0.25,
                        unitCode: firstIng.unitCode,
                      },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded bg-white/10 text-xs text-white hover:bg-white/15"
                >
                  + ربط مادة خام
                </button>
              </div>
              {prodRecipe.map((r, idx) => (
                <div key={r.id || idx} className="grid grid-cols-3 gap-2 items-center">
                  <select
                    value={r.ingredientId}
                    onChange={(e) => {
                      const ing = ingredients.find((i) => i.id === e.target.value);
                      if (!ing) return;
                      setProdRecipe((prev) =>
                        prev.map((item, i) =>
                          i === idx
                            ? {
                                ...item,
                                ingredientId: ing.id,
                                ingredientNameAr: ing.nameAr,
                                unitCode: ing.unitCode,
                              }
                            : item
                        )
                      );
                    }}
                    className="rounded bg-[#141419] border border-white/10 px-2.5 py-1.5 text-xs text-white"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.nameAr} ({ing.unitCode})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.01"
                    min="0.001"
                    value={r.quantity}
                    onChange={(e) =>
                      setProdRecipe((prev) =>
                        prev.map((item, i) =>
                          i === idx ? { ...item, quantity: Number(e.target.value) } : item
                        )
                      )
                    }
                    className="rounded bg-[#141419] border border-white/10 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setProdRecipe((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-400 hover:underline text-left"
                  >
                    إزالة ({r.unitCode})
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowProductModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs"
              >
                حفظ المنتج في القائمة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {catModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleSaveCategory}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/30 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              {editingCategory ? 'تعديل الفئة' : 'إضافة فئة جديدة'}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">اسم الفئة بالعربية *</label>
                <input
                  type="text"
                  required
                  value={catNameAr}
                  onChange={(e) => setCatNameAr(e.target.value)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الاسم بالفرنسية</label>
                <input
                  type="text"
                  value={catNameFr}
                  onChange={(e) => setCatNameFr(e.target.value)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">ترتيب العرض</label>
                <input
                  type="number"
                  value={catSortOrder}
                  onChange={(e) => setCatSortOrder(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCatModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs"
              >
                حفظ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 2. INVENTORY, WASTE, STOCK COUNT & RECIPES VIEW
// ============================================================================

export const InventoryRecipesView: React.FC = () => {
  const {
    ingredients,
    stockMovements,
    wasteRecords,
    stockCounts,
    apiRequest,
    refreshAll,
    addNotification,
  } = usePos();

  const [subTab, setSubTab] = useState<'STOCK' | 'MOVEMENTS' | 'WASTE' | 'STOCK_COUNT'>('STOCK');

  // Modals
  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState<Ingredient | null>(null);
  const [showWasteModal, setShowWasteModal] = useState(false);

  // Add Ingredient Form
  const [ingNameAr, setIngNameAr] = useState('');
  const [ingUnitCode, setIngUnitCode] = useState<'kg' | 'g' | 'l' | 'ml' | 'pcs'>('kg');
  const [ingCurrentStock, setIngCurrentStock] = useState(20);
  const [ingMinStock, setIngMinStock] = useState(5);
  const [ingUnitCost, setIngUnitCost] = useState(1200);

  // Adjust Stock Form
  const [adjType, setAdjType] = useState<'STOCK_IN' | 'STOCK_OUT' | 'ADJUSTMENT'>('STOCK_IN');
  const [adjQty, setAdjQty] = useState(5);
  const [adjNotes, setAdjNotes] = useState('');

  // Waste Form
  const [wasteIngId, setWasteIngId] = useState(ingredients[0]?.id || '');
  const [wasteQty, setWasteQty] = useState(1);
  const [wasteReason, setWasteReason] = useState<WasteReason>('Expired');
  const [wasteNotes, setWasteNotes] = useState('');

  // Stock Count Form
  const [countInputs, setCountInputs] = useState<Record<string, number>>({});
  const [countNotes, setCountNotes] = useState('جرد دوري للمخزن');

  const handleCreateIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ingNameAr.trim()) return;
    try {
      await apiRequest('/api/inventory/ingredients', {
        method: 'POST',
        body: JSON.stringify({
          nameAr: ingNameAr.trim(),
          unitCode: ingUnitCode,
          currentStock: Number(ingCurrentStock),
          minStock: Number(ingMinStock),
          unitCost: Number(ingUnitCost),
        }),
      });
      await refreshAll();
      setShowAddIngModal(false);
      setIngNameAr('');
      addNotification('INFO', 'إضافة مادة خام', 'تمت إضافة المادة للمخزن بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showAdjustModal) return;
    try {
      await apiRequest('/api/inventory/adjust', {
        method: 'POST',
        body: JSON.stringify({
          ingredientId: showAdjustModal.id,
          movementType: adjType,
          quantity: Number(adjQty),
          notes: adjNotes || 'تعديل مخزني',
        }),
      });
      await refreshAll();
      setShowAdjustModal(null);
      setAdjNotes('');
      addNotification('INFO', 'تحديث المخزون', 'تم تسجيل حركة المخزون بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleRecordWaste = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = wasteIngId || ingredients[0]?.id;
    if (!targetId) return;
    try {
      await apiRequest('/api/inventory/waste', {
        method: 'POST',
        body: JSON.stringify({
          ingredientId: targetId,
          quantity: Number(wasteQty),
          reason: wasteReason,
          notes: wasteNotes,
        }),
      });
      await refreshAll();
      setShowWasteModal(false);
      setWasteNotes('');
      addNotification('INFO', 'تسجيل الهدر (Waste)', 'تم خصم الكمية التالفة وحساب تكلفتها.');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handlePerformStockCount = async () => {
    const items = ingredients.map((ing) => ({
      ingredientId: ing.id,
      actualQuantity: countInputs[ing.id] !== undefined ? Number(countInputs[ing.id]) : ing.currentStock,
    }));
    try {
      await apiRequest('/api/inventory/stock-count', {
        method: 'POST',
        body: JSON.stringify({ notes: countNotes, items }),
      });
      await refreshAll();
      addNotification('INFO', 'اعتماد الجرد الفعلي', 'تمت مطابقة المخزون وتحديث الأرصدة الفورية.');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ في الجرد', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Package className="w-6 h-6 text-[#D4AF37]" />
            <span>إدارة المخزون، الجرد، والهدر (Inventory & Waste Control)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            مراقبة الأرصدة الحية للمواد الخام، حركات الخصم التلقائي للوصفات، الجرد الفعلي، وتقرير التوالف
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('STOCK')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'STOCK'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            المواد الخام ({ingredients.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('STOCK_COUNT')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'STOCK_COUNT'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            الجرد الفعلي (Stock Count)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('WASTE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'WASTE'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            سجل الهدر والتوالف ({wasteRecords.length})
          </button>
          <button
            type="button"
            onClick={() => setSubTab('MOVEMENTS')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
              subTab === 'MOVEMENTS'
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-black/40 text-neutral-300 border-white/10'
            }`}
          >
            حركات المخزون ({stockMovements.length})
          </button>

          <button
            type="button"
            onClick={() => {
              setWasteIngId(ingredients[0]?.id || '');
              setShowWasteModal(true);
            }}
            className="px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 font-bold text-xs"
          >
            + تسجيل هدر / تالف
          </button>

          <button
            type="button"
            onClick={() => setShowAddIngModal(true)}
            className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
            <span>مادة خام جديدة</span>
          </button>
        </div>
      </div>

      {/* TAB 1: INGREDIENTS STOCK */}
      {subTab === 'STOCK' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-4">المادة الخام</th>
                  <th className="py-3.5 px-4">الرصيد الحالي</th>
                  <th className="py-3.5 px-4">الحد الأدنى للتنبيه</th>
                  <th className="py-3.5 px-4">تكلفة الوحدة</th>
                  <th className="py-3.5 px-4">القيمة الإجمالية</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-left">تعديل الرصيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ingredients.map((ing) => {
                  const isLow = ing.currentStock <= ing.minStock;
                  return (
                    <tr key={ing.id} className="hover:bg-white/[0.02]">
                      <td className="py-3.5 px-4 font-bold text-white">{ing.nameAr}</td>
                      <td className="py-3.5 px-4 font-extrabold text-sm tabular-nums text-[#F3E5AB]">
                        {ing.currentStock.toFixed(2)} {ing.unitNameAr || ing.unitCode}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-400 tabular-nums">
                        {ing.minStock} {ing.unitCode}
                      </td>
                      <td className="py-3.5 px-4 text-neutral-300 tabular-nums">
                        {ing.unitCost.toLocaleString('en-US')} د.ج
                      </td>
                      <td className="py-3.5 px-4 font-bold text-white tabular-nums">
                        {Math.round(ing.currentStock * ing.unitCost).toLocaleString('en-US')} د.ج
                      </td>
                      <td className="py-3.5 px-4">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-500/15 border border-red-500/40 text-red-300 font-bold text-[11px]">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>منخفض جدًا</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-md bg-emerald-500/15 text-emerald-300 font-bold text-[11px]">
                            متوفر جيدًا
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-left">
                        <button
                          type="button"
                          onClick={() => {
                            setShowAdjustModal(ing);
                            setAdjType('STOCK_IN');
                            setAdjQty(5);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-[#D4AF37]"
                        >
                          إدخال / إخراج / تسوية
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: STOCK COUNT (الجرد الفعلي) */}
      {subTab === 'STOCK_COUNT' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-[#D4AF37]" />
                <span>مطابقة الجرد الفعلي مع رصيد النظام</span>
              </h2>
              <p className="text-xs text-neutral-400 mt-0.5">
                أدخل الكمية الفعلية الموجودة في المخزن ليقوم النظام بحساب الفروقات وتحديث الأرصدة تلقائيًا.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePerformStockCount}
              className="px-5 py-2.5 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs"
            >
              اعتماد وحفظ الجرد الفعلي
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/40 text-neutral-400">
                <tr>
                  <th className="py-3 px-4">المادة</th>
                  <th className="py-3 px-4">رصيد النظام</th>
                  <th className="py-3 px-4">الكمية الفعلية (الجرد)</th>
                  <th className="py-3 px-4">الفرق (Difference)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {ingredients.map((ing) => {
                  const actual = countInputs[ing.id] !== undefined ? countInputs[ing.id] : ing.currentStock;
                  const diff = Number((actual - ing.currentStock).toFixed(3));
                  return (
                    <tr key={ing.id}>
                      <td className="py-3 px-4 font-bold text-white">{ing.nameAr}</td>
                      <td className="py-3 px-4 tabular-nums text-neutral-300">
                        {ing.currentStock.toFixed(2)} {ing.unitCode}
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          step="0.1"
                          value={actual}
                          onChange={(e) =>
                            setCountInputs((prev) => ({ ...prev, [ing.id]: Number(e.target.value) }))
                          }
                          className="w-32 rounded-lg bg-black/50 border border-white/15 px-3 py-1.5 text-xs text-white tabular-nums"
                        />
                      </td>
                      <td
                        className={`py-3 px-4 font-bold tabular-nums ${
                          diff < 0 ? 'text-red-400' : diff > 0 ? 'text-emerald-400' : 'text-neutral-500'
                        }`}
                      >
                        {diff > 0 ? `+${diff}` : diff} {ing.unitCode}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: WASTE RECORDS */}
      {subTab === 'WASTE' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">المادة</th>
                  <th className="py-3 px-4">الكمية التالفة</th>
                  <th className="py-3 px-4">السبب</th>
                  <th className="py-3 px-4">إجمالي الخسارة</th>
                  <th className="py-3 px-4">المسؤول</th>
                  <th className="py-3 px-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {wasteRecords.map((w: any) => (
                  <tr key={w.id}>
                    <td className="py-3 px-4 font-bold text-white">{w.ingredientNameAr}</td>
                    <td className="py-3 px-4 text-red-300 font-bold tabular-nums">
                      {w.quantity} {w.unitCode}
                    </td>
                    <td className="py-3 px-4 text-neutral-300">
                      {WASTE_REASONS_AR[w.reason as WasteReason] || w.reason}
                    </td>
                    <td className="py-3 px-4 font-bold text-red-400 tabular-nums">
                      {w.totalCost.toLocaleString('en-US')} د.ج
                    </td>
                    <td className="py-3 px-4 text-neutral-300">{w.reportedByName}</td>
                    <td className="py-3 px-4 text-neutral-400 tabular-nums">
                      {new Date(w.reportedAt).toLocaleString('ar-DZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: STOCK MOVEMENTS */}
      {subTab === 'MOVEMENTS' && (
        <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
                <tr>
                  <th className="py-3 px-4">المادة</th>
                  <th className="py-3 px-4">نوع الحركة</th>
                  <th className="py-3 px-4">الكمية</th>
                  <th className="py-3 px-4">الرصيد السابق</th>
                  <th className="py-3 px-4">الرصيد الجديد</th>
                  <th className="py-3 px-4">البيان</th>
                  <th className="py-3 px-4">التاريخ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stockMovements.slice(0, 60).map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 px-4 font-bold text-white">{m.ingredientNameAr}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-neutral-200 font-mono text-[11px]">
                        {m.movementType}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 font-bold tabular-nums ${
                        m.quantity >= 0 ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity}
                    </td>
                    <td className="py-3 px-4 text-neutral-400 tabular-nums">{m.previousStock}</td>
                    <td className="py-3 px-4 font-bold text-white tabular-nums">{m.newStock}</td>
                    <td className="py-3 px-4 text-neutral-300">{m.notes}</td>
                    <td className="py-3 px-4 text-neutral-400 tabular-nums">
                      {new Date(m.createdAt).toLocaleString('ar-DZ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD INGREDIENT MODAL */}
      {showAddIngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleCreateIngredient}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">إضافة مادة خام جديدة للمخزن</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">اسم المادة بالعربية *</label>
                <input
                  type="text"
                  required
                  value={ingNameAr}
                  onChange={(e) => setIngNameAr(e.target.value)}
                  placeholder="مثال: لحم غنم طازج / زيت زيتون"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">وحدة القياس</label>
                  <select
                    value={ingUnitCode}
                    onChange={(e) => setIngUnitCode(e.target.value as any)}
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                  >
                    <option value="kg">كيلوغرام (kg)</option>
                    <option value="g">غرام (g)</option>
                    <option value="l">لتر (l)</option>
                    <option value="ml">مللتر (ml)</option>
                    <option value="pcs">قطعة (pcs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">تكلفة الوحدة (د.ج)</label>
                  <input
                    type="number"
                    min={0}
                    value={ingUnitCost}
                    onChange={(e) => setIngUnitCost(Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">الرصيد الافتتاحي</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingCurrentStock}
                    onChange={(e) => setIngCurrentStock(Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">الحد الأدنى للتنبيه</label>
                  <input
                    type="number"
                    step="0.1"
                    value={ingMinStock}
                    onChange={(e) => setIngMinStock(Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddIngModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs"
              >
                حفظ المادة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* STOCK ADJUST MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleAdjustStock}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              تعديل رصيد: {showAdjustModal.nameAr}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {(['STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAdjType(t)}
                  className={`py-2 rounded-lg text-xs font-bold border ${
                    adjType === t
                      ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                      : 'bg-black/40 text-neutral-300 border-white/10'
                  }`}
                >
                  {t === 'STOCK_IN' ? 'توريد (+)' : t === 'STOCK_OUT' ? 'صرف (-)' : 'تعيين مباشر'}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">
                الكمية ({showAdjustModal.unitCode})
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={adjQty}
                onChange={(e) => setAdjQty(Number(e.target.value))}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
              />
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">ملاحظات / سبب الحركة</label>
              <input
                type="text"
                value={adjNotes}
                onChange={(e) => setAdjNotes(e.target.value)}
                placeholder="مثال: استلام بضاعة صباحية"
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAdjustModal(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs"
              >
                تنفيذ الحركة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WASTE MODAL */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleRecordWaste}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-red-500/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">تسجيل هدر أو تلف مواد خام (Waste)</h3>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">المادة الخام</label>
              <select
                value={wasteIngId}
                onChange={(e) => setWasteIngId(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              >
                {ingredients.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nameAr} (المتوفر: {i.currentStock} {i.unitCode})
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الكمية التالفة</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={wasteQty}
                  onChange={(e) => setWasteQty(Number(e.target.value))}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">سبب التلف</label>
                <select
                  value={wasteReason}
                  onChange={(e) => setWasteReason(e.target.value as WasteReason)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                >
                  <option value="Expired">منتهي الصلاحية</option>
                  <option value="Damaged">تالف</option>
                  <option value="Burned">احتراق</option>
                  <option value="Spilled">انسكاب</option>
                  <option value="Other">أخرى</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs text-neutral-400 block mb-1">ملاحظات إضافية</label>
              <input
                type="text"
                value={wasteNotes}
                onChange={(e) => setWasteNotes(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowWasteModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-red-500 text-white font-bold text-xs"
              >
                تسجيل الهدر وخصم الرصيد
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// 3. SUPPLIERS & PURCHASES VIEW
// ============================================================================

export const SuppliersPurchasesView: React.FC = () => {
  const { suppliers, purchases, ingredients, apiRequest, refreshAll, addNotification } = usePos();

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supName, setSupName] = useState('');
  const [supPhone, setSupPhone] = useState('');
  const [supAddress, setSupAddress] = useState('');
  const [supNotes, setSupNotes] = useState('');

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purSupplierId, setPurSupplierId] = useState(suppliers[0]?.id || '');
  const [purInvoiceNum, setPurInvoiceNum] = useState('');
  const [purNotes, setPurNotes] = useState('');
  const [purItems, setPurItems] = useState<
    { ingredientId: string; quantity: number; unitCost: number }[]
  >([]);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supName.trim()) return;
    try {
      await apiRequest('/api/suppliers', {
        method: 'POST',
        body: JSON.stringify({
          name: supName.trim(),
          phone: supPhone.trim(),
          address: supAddress.trim(),
          notes: supNotes.trim(),
        }),
      });
      await refreshAll();
      setShowSupplierModal(false);
      setSupName('');
      setSupPhone('');
      addNotification('INFO', 'إضافة مورد', 'تم تسجيل المورد الجديد بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleCreatePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (purItems.length === 0) return;
    try {
      await apiRequest('/api/purchases', {
        method: 'POST',
        body: JSON.stringify({
          supplierId: purSupplierId || suppliers[0]?.id,
          invoiceNumber: purInvoiceNum || `INV-${Date.now().toString().slice(-5)}`,
          notes: purNotes,
          items: purItems,
        }),
      });
      await refreshAll();
      setShowPurchaseModal(false);
      setPurItems([]);
      addNotification(
        'INFO',
        'فاتورة مشتريات جديدة',
        'تم تسجيل فاتورة الشراء وزيادة رصيد المواد الخام في المخزن تلقائيًا.'
      );
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-[#D4AF37]" />
            <span>الموردون وفواتير المشتريات (Suppliers & Purchases)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            إدارة الموردين وتسجيل فواتير التوريد مع التحديث الفوري لأرصدة وتكاليف المخزون
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSupplierModal(true)}
            className="px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white"
          >
            + إضافة مورد جديد
          </button>
          <button
            type="button"
            onClick={() => {
              setPurSupplierId(suppliers[0]?.id || '');
              setPurItems(
                ingredients[0]
                  ? [{ ingredientId: ingredients[0].id, quantity: 10, unitCost: ingredients[0].unitCost }]
                  : []
              );
              setShowPurchaseModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs"
          >
            + تسجيل فاتورة شراء (توريد مخزني)
          </button>
        </div>
      </div>

      {/* Suppliers Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="rounded-xl bg-[#141419] border border-white/10 p-4 flex items-center justify-between"
          >
            <div>
              <h3 className="text-sm font-bold text-white">{s.name}</h3>
              <div className="text-xs text-neutral-400 mt-0.5 tabular-nums">{s.phone} • {s.address}</div>
              {s.notes && <div className="text-[11px] text-neutral-500 mt-1">{s.notes}</div>}
            </div>
            <div className="text-left">
              <div className="text-[11px] text-neutral-400">إجمالي التوريدات</div>
              <div className="text-sm font-extrabold text-[#D4AF37] tabular-nums">
                {s.totalPurchases.toLocaleString('en-US')} د.ج
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Purchases Table */}
      <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
        <div className="p-4 border-b border-white/10">
          <h2 className="text-base font-bold text-white">سجل فواتير المشتريات والتوريد</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
              <tr>
                <th className="py-3 px-4">رقم الفاتورة</th>
                <th className="py-3 px-4">المورد</th>
                <th className="py-3 px-4">المواد الموردة</th>
                <th className="py-3 px-4">الإجمالي</th>
                <th className="py-3 px-4">المستلم</th>
                <th className="py-3 px-4">التاريخ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {purchases.map((pur) => (
                <tr key={pur.id}>
                  <td className="py-3 px-4 font-mono font-bold text-[#F3E5AB]">{pur.invoiceNumber}</td>
                  <td className="py-3 px-4 font-bold text-white">{pur.supplierName}</td>
                  <td className="py-3 px-4 text-neutral-300">
                    {pur.items.map((i) => `${i.ingredientNameAr} (${i.quantity} ${i.unitCode})`).join('، ')}
                  </td>
                  <td className="py-3 px-4 font-bold text-emerald-400 tabular-nums">
                    {pur.totalAmount.toLocaleString('en-US')} د.ج
                  </td>
                  <td className="py-3 px-4 text-neutral-300">{pur.createdByName}</td>
                  <td className="py-3 px-4 text-neutral-400 tabular-nums">
                    {new Date(pur.createdAt).toLocaleDateString('ar-DZ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleCreateSupplier}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">إضافة مورد جديد</h3>
            <div className="space-y-3">
              <input
                type="text"
                required
                placeholder="اسم المورد / الشركة *"
                value={supName}
                onChange={(e) => setSupName(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="رقم الهاتف"
                value={supPhone}
                onChange={(e) => setSupPhone(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="العنوان"
                value={supAddress}
                onChange={(e) => setSupAddress(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
              <input
                type="text"
                placeholder="ملاحظات"
                value={supNotes}
                onChange={(e) => setSupNotes(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSupplierModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs"
              >
                حفظ المورد
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Purchase Invoice Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleCreatePurchase}
            className="w-full max-w-2xl rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">تسجيل فاتورة مشتريات وتوريد مخزني</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">المورد</label>
                <select
                  value={purSupplierId}
                  onChange={(e) => setPurSupplierId(e.target.value)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                >
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">رقم الفاتورة</label>
                <input
                  type="text"
                  value={purInvoiceNum}
                  onChange={(e) => setPurInvoiceNum(e.target.value)}
                  placeholder="مثال: INV-2026-09"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#F3E5AB]">الأصناف المشتراة:</span>
                <button
                  type="button"
                  onClick={() => {
                    const first = ingredients[0];
                    if (!first) return;
                    setPurItems((prev) => [
                      ...prev,
                      { ingredientId: first.id, quantity: 5, unitCost: first.unitCost },
                    ]);
                  }}
                  className="px-2.5 py-1 rounded bg-white/10 text-xs text-white"
                >
                  + إضافة بند
                </button>
              </div>
              {purItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 items-center">
                  <select
                    value={item.ingredientId}
                    onChange={(e) =>
                      setPurItems((prev) =>
                        prev.map((row, i) => (i === idx ? { ...row, ingredientId: e.target.value } : row))
                      )
                    }
                    className="rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white"
                  >
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.nameAr} ({ing.unitCode})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={item.quantity}
                    onChange={(e) =>
                      setPurItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, quantity: Number(e.target.value) } : row
                        )
                      )
                    }
                    placeholder="الكمية"
                    className="rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                  <input
                    type="number"
                    min="0"
                    value={item.unitCost}
                    onChange={(e) =>
                      setPurItems((prev) =>
                        prev.map((row, i) =>
                          i === idx ? { ...row, unitCost: Number(e.target.value) } : row
                        )
                      )
                    }
                    placeholder="سعر الوحدة"
                    className="rounded bg-black/50 border border-white/15 px-2.5 py-1.5 text-xs text-white tabular-nums"
                  />
                  <button
                    type="button"
                    onClick={() => setPurItems((prev) => prev.filter((_, i) => i !== idx))}
                    className="text-xs text-red-400 hover:underline text-left"
                  >
                    حذف
                  </button>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowPurchaseModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs"
              >
                حفظ الفاتورة وتوريد للمخزن
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
