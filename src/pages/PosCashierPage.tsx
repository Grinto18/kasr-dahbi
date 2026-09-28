import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChefHat,
  CreditCard,
  Minus,
  PauseCircle,
  PlayCircle,
  Plus,
  Printer,
  Search,
  Split,
  Trash2,
  Utensils,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.tsx';
import {
  Order,
  OrderType,
  PaymentAllocation,
  PaymentMethodCode,
  PaymentRecord,
  Product,
} from '../db/types.ts';
import { ReceiptPrinterModal } from '../components/ReceiptPrinterModal.tsx';

interface CartItem {
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
}

interface PosCashierPageProps {
  preselectedTableId?: string | null;
  onClearPreselectedTable?: () => void;
}

const STATION_AR: Record<string, string> = {
  MAIN_KITCHEN: 'المطبخ الرئيسي',
  GRILL: 'قسم المشاوي',
  DRINKS: 'قسم المشروبات',
  DESSERT: 'قسم الحلويات',
};

export const PosCashierPage: React.FC<PosCashierPageProps> = ({
  preselectedTableId,
  onClearPreselectedTable,
}) => {
  const {
    categories,
    products,
    tables,
    customers,
    settings,
    heldCarts,
    holdCart,
    removeHeldCart,
    createOrderAction,
    processPaymentAction,
    can,
  } = usePos();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [orderType, setOrderType] = useState<OrderType>('DINE_IN');
  const [selectedTableId, setSelectedTableId] = useState<string>(preselectedTableId || '');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryFee, setDeliveryFee] = useState<number>(settings.defaultDeliveryFee || 200);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [orderNotes, setOrderNotes] = useState('');

  const [cart, setCart] = useState<CartItem[]>([]);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  // Product Customization Modal
  const [customizingProduct, setCustomizingProduct] = useState<Product | null>(null);
  const [chosenVariantId, setChosenVariantId] = useState<string>('');
  const [chosenAddonIds, setChosenAddonIds] = useState<string[]>([]);
  const [itemNotes, setItemNotes] = useState<string>('');
  const [itemQty, setItemQty] = useState<number>(1);

  // Held Orders Modal
  const [showHeldModal, setShowHeldModal] = useState(false);

  // Payment & Split Bill Modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'SINGLE' | 'MULTI' | 'SPLIT_ITEMS'>('SINGLE');
  const [singleMethod, setSingleMethod] = useState<PaymentMethodCode>('CASH');
  const [cashTendered, setCashTendered] = useState<number>(0);
  const [multiAllocations, setMultiAllocations] = useState<{ method: PaymentMethodCode; amount: number }[]>([
    { method: 'CASH', amount: 0 },
    { method: 'CARD', amount: 0 },
  ]);
  const [splitEqualCount, setSplitEqualCount] = useState<number>(2);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  // Receipt Print Modal
  const [receiptData, setReceiptData] = useState<{ order: Order; payment?: PaymentRecord | null } | null>(null);

  // Sync preselectedTableId if passed from Tables screen
  React.useEffect(() => {
    if (preselectedTableId) {
      setOrderType('DINE_IN');
      setSelectedTableId(preselectedTableId);
      onClearPreselectedTable?.();
    }
  }, [preselectedTableId, onClearPreselectedTable]);

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return products.filter((p) => {
      if (p.isDeleted) return false;
      if (selectedCategory !== 'ALL' && p.categoryId !== selectedCategory) return false;
      if (!q) return true;
      return (
        p.nameAr.toLowerCase().includes(q) ||
        p.nameFr.toLowerCase().includes(q) ||
        p.nameEn.toLowerCase().includes(q) ||
        p.barcode.toLowerCase().includes(q)
      );
    });
  }, [products, selectedCategory, searchQuery]);

  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((sum, item) => {
      const addonsSum = item.addons.reduce((a, ad) => a + ad.price, 0);
      return sum + (item.unitPrice + addonsSum) * item.quantity;
    }, 0);
    const maxAllowedDiscount = Math.round((subtotal * (settings.maxDiscountPercent || 25)) / 100);
    const effectiveDiscount = Math.min(discountAmount, maxAllowedDiscount, subtotal);
    const taxable = Math.max(0, subtotal - effectiveDiscount);
    const taxAmount = settings.taxEnabled
      ? Math.round((taxable * settings.taxRatePercent) / 100)
      : 0;
    const deliv = orderType === 'DELIVERY' ? Number(deliveryFee || 0) : 0;
    const totalAmount = taxable + taxAmount + deliv;
    return { subtotal, effectiveDiscount, taxAmount, deliveryFee: deliv, totalAmount };
  }, [cart, discountAmount, settings, orderType, deliveryFee]);

  const handleProductClick = (product: Product) => {
    if (!product.isAvailable) return;
    if ((product.variants && product.variants.length > 0) || (product.addons && product.addons.length > 0)) {
      const defaultVar = product.variants.find((v) => v.isDefault) || product.variants[0];
      setCustomizingProduct(product);
      setChosenVariantId(defaultVar?.id || '');
      setChosenAddonIds([]);
      setItemNotes('');
      setItemQty(1);
    } else {
      addDirectToCart(product, undefined, [], '', 1);
    }
  };

  const addDirectToCart = (
    product: Product,
    variantId?: string,
    addonIds: string[] = [],
    notes = '',
    qty = 1
  ) => {
    const variant = product.variants.find((v) => v.id === variantId);
    const unitPrice = product.price + (variant?.priceDelta || 0);
    const addons = addonIds
      .map((id) => product.addons.find((a) => a.id === id))
      .filter(Boolean)
      .map((a: any) => ({ id: a.id, nameAr: a.nameAr, price: a.price }));

    const signature = `${product.id}_${variantId || 'novar'}_${[...addonIds].sort().join('-')}_${notes.trim()}`;

    setCart((prev) => {
      const existingIdx = prev.findIndex((i) => i.cartItemId === signature);
      if (existingIdx > -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          quantity: copy[existingIdx].quantity + qty,
        };
        return copy;
      }
      return [
        ...prev,
        {
          cartItemId: signature,
          productId: product.id,
          productNameAr: product.nameAr,
          variantId,
          variantNameAr: variant?.nameAr,
          unitPrice,
          quantity: qty,
          addonIds,
          addons,
          notes: notes.trim(),
        },
      ];
    });
  };

  const confirmCustomProduct = () => {
    if (!customizingProduct) return;
    addDirectToCart(customizingProduct, chosenVariantId || undefined, chosenAddonIds, itemNotes, itemQty);
    setCustomizingProduct(null);
  };

  const updateCartItemQty = (cartItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.cartItemId === cartItemId ? { ...item, quantity: item.quantity + delta } : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setOrderNotes('');
    setFeedbackError(null);
  };

  const handleHoldCurrentCart = async () => {
    if (cart.length === 0) return;
    const tbl = tables.find((t) => t.id === selectedTableId);
    const label =
      orderType === 'DINE_IN' && tbl
        ? `طلب معلق - ${tbl.nameAr}`
        : customerName
        ? `طلب معلق - ${customerName}`
        : `طلب معلق (${cart.length} أصناف)`;

    await holdCart({
      label,
      orderType,
      tableId: selectedTableId || null,
      customerId: selectedCustomerId || null,
      customerName,
      customerPhone,
      deliveryAddress,
      discountAmount: cartTotals.effectiveDiscount,
      notes: orderNotes,
      items: cart,
    });
    clearCart();
  };

  const handleResumeHeldCart = async (heldId: string) => {
    const found = heldCarts.find((h) => h.id === heldId);
    if (!found) return;
    setOrderType(found.orderType);
    setSelectedTableId(found.tableId || '');
    setSelectedCustomerId(found.customerId || '');
    setCustomerName(found.customerName);
    setCustomerPhone(found.customerPhone);
    setDeliveryAddress(found.deliveryAddress);
    setDiscountAmount(found.discountAmount);
    setOrderNotes(found.notes);
    setCart(found.items);
    await removeHeldCart(heldId);
    setShowHeldModal(false);
  };

  const buildOrderPayload = (status: 'NEW' | 'CONFIRMED' | 'HELD' = 'NEW') => {
    return {
      idempotencyKey: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      orderType,
      status,
      tableId: orderType === 'DINE_IN' ? selectedTableId || null : null,
      customerId: selectedCustomerId || null,
      customerName: customerName || null,
      customerPhone: customerPhone || null,
      deliveryAddress: orderType === 'DELIVERY' ? deliveryAddress || 'حسين داي، الجزائر' : null,
      deliveryFee: cartTotals.deliveryFee,
      discountAmount: cartTotals.effectiveDiscount,
      notes: orderNotes,
      items: cart.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
        notes: i.notes,
        addonIds: i.addonIds,
      })),
    };
  };

  const handleSendToKitchenOnly = async () => {
    if (cart.length === 0) return;
    setFeedbackError(null);
    setIsProcessing(true);
    try {
      const created = await createOrderAction(buildOrderPayload('NEW'));
      clearCart();
      setReceiptData({ order: created, payment: null });
    } catch (err: any) {
      setFeedbackError(err.message || 'فشل إرسال الطلب للمطبخ');
    } finally {
      setIsProcessing(false);
    }
  };

  const openPaymentDialog = (initialMode: 'SINGLE' | 'MULTI' | 'SPLIT_ITEMS' = 'SINGLE') => {
    if (cart.length === 0) return;
    setFeedbackError(null);
    setPaymentMode(initialMode);
    setCashTendered(cartTotals.totalAmount);
    const half = Math.floor(cartTotals.totalAmount / 2);
    setMultiAllocations([
      { method: 'CASH', amount: half },
      { method: 'CARD', amount: cartTotals.totalAmount - half },
    ]);
    setShowPaymentModal(true);
  };

  const handleCompleteOrderAndPayment = async () => {
    setFeedbackError(null);
    let allocations: PaymentAllocation[] = [];

    if (paymentMode === 'SINGLE' || paymentMode === 'SPLIT_ITEMS') {
      const amt = singleMethod === 'CASH' ? Math.max(cashTendered, cartTotals.totalAmount) : cartTotals.totalAmount;
      if (singleMethod === 'CASH' && cashTendered < cartTotals.totalAmount) {
        setFeedbackError('المبلغ النقدي المستلم أقل من إجمالي الفاتورة');
        return;
      }
      allocations = [{ method: singleMethod, amount: amt }];
    } else {
      const validAllocs = multiAllocations.filter((a) => a.amount > 0);
      const sumAllocs = validAllocs.reduce((s, a) => s + Number(a.amount), 0);
      if (sumAllocs < cartTotals.totalAmount) {
        setFeedbackError(
          `مجموع المبالغ المدخلة (${sumAllocs} د.ج) أقل من إجمالي الفاتورة (${cartTotals.totalAmount} د.ج)`
        );
        return;
      }
      allocations = validAllocs;
    }

    setIsProcessing(true);
    try {
      const createdOrder = await createOrderAction(buildOrderPayload('CONFIRMED'));
      const paymentResult = await processPaymentAction({
        orderId: createdOrder.id,
        idempotencyKey: `pay_${createdOrder.id}_${Date.now()}`,
        allocations,
      });
      setShowPaymentModal(false);
      clearCart();
      setReceiptData({ order: paymentResult.order, payment: paymentResult.payment });
    } catch (err: any) {
      setFeedbackError(err.message || 'حدث خطأ أثناء معالجة الدفع');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
      {/* RIGHT AREA (7 cols): Categories, Search & Product Grid */}
      <div className="lg:col-span-7 xl:col-span-8 space-y-4">
        {/* Search & Held Orders Bar */}
        <div className="flex flex-wrap items-center gap-3 bg-[#141419] border border-white/10 rounded-xl p-3.5">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث عن طبق بالاسم أو الباركود (مشاوي، شخشوخة، دجاج، عصير...)"
              className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 pr-10 pl-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setShowHeldModal(true)}
            className="flex items-center gap-2 rounded-lg bg-amber-500/15 border border-amber-500/40 px-3.5 py-2 text-xs font-bold text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
          >
            <PlayCircle className="w-4 h-4" />
            <span>الطلبات المعلقة ({heldCarts.length})</span>
          </button>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-[#D4AF37] text-black'
                : 'bg-[#141419] border border-white/10 text-neutral-300 hover:text-white'
            }`}
          >
            كل القائمة ({products.filter((p) => !p.isDeleted).length})
          </button>
          {categories
            .filter((c) => c.isActive)
            .map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-[#141419] border border-white/10 text-neutral-300 hover:text-white'
                }`}
              >
                {cat.nameAr}
              </button>
            ))}
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3.5">
          {filteredProducts.map((product) => {
            const imgBroken = brokenImages[product.id];
            return (
              <button
                key={product.id}
                type="button"
                disabled={!product.isAvailable}
                onClick={() => handleProductClick(product)}
                className={`text-right rounded-xl bg-[#141419] border border-white/10 overflow-hidden transition-all flex flex-col justify-between group ${
                  product.isAvailable
                    ? 'hover:border-[#D4AF37]/70 hover:bg-[#191920]'
                    : 'opacity-45 cursor-not-allowed'
                }`}
              >
                <div>
                  <div className="h-36 w-full bg-[#1C1C24] relative overflow-hidden">
                    {product.imageUrl && !imgBroken ? (
                      <img
                        src={product.imageUrl}
                        alt={product.nameAr}
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenImages((prev) => ({ ...prev, [product.id]: true }))}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#1C1C24] to-[#0F0F13] text-[#D4AF37]/70">
                        <Utensils className="w-8 h-8 mb-1" />
                        <span className="text-[11px] text-neutral-400">{product.nameAr}</span>
                      </div>
                    )}
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent p-2.5 flex items-end justify-between">
                      <span className="text-[11px] text-neutral-300">
                        {STATION_AR[product.kitchenStation] || product.kitchenStation}
                      </span>
                      <span className="text-sm font-extrabold font-mono text-[#F3E5AB]">
                        {product.price.toLocaleString('en-US')} {settings.currency}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5">
                    <h3 className="text-sm font-bold text-white group-hover:text-[#F3E5AB] line-clamp-1">
                      {product.nameAr}
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2">
                      {product.description || product.nameFr}
                    </p>
                  </div>
                </div>

                <div className="px-3.5 pb-3 pt-1 flex items-center justify-between text-[11px] text-neutral-400 border-t border-white/5">
                  <span>
                    {product.variants.length > 0 ? `${product.variants.length} أحجام` : 'حجم قياسي'} ·{' '}
                    {product.addons.length > 0 ? `${product.addons.length} إضافات` : 'إضافة سريعة'}
                  </span>
                  <span className="text-[#D4AF37] font-bold">
                    {product.isAvailable ? '+ إضافة للطلب' : 'غير متوفر'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* LEFT AREA (5 cols): Active Order Cart & Checkout */}
      <div className="lg:col-span-5 xl:col-span-4 rounded-xl bg-[#141419] border border-[#D4AF37]/30 p-4 flex flex-col justify-between sticky top-4">
        <div>
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <h2 className="text-base font-extrabold text-white">فاتورة الكاشير الحالية</h2>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearCart}
                className="text-xs text-red-400 hover:underline flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>إفراغ السلة</span>
              </button>
            )}
          </div>

          {/* Order Type Selector (DINE_IN / TAKEAWAY / DELIVERY) */}
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#0B0B0E] rounded-lg my-3 border border-white/10">
            {(
              [
                { code: 'DINE_IN', label: 'طاولة (محلي)' },
                { code: 'TAKEAWAY', label: 'سفري (خارجي)' },
                { code: 'DELIVERY', label: 'توصيل (Delivery)' },
              ] as const
            ).map((t) => (
              <button
                key={t.code}
                type="button"
                onClick={() => setOrderType(t.code)}
                className={`py-2 rounded-md text-xs font-bold transition-colors ${
                  orderType === t.code
                    ? 'bg-[#D4AF37] text-black'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Contextual Fields by Order Type */}
          {orderType === 'DINE_IN' && (
            <div className="mb-3">
              <label className="block text-[11px] font-semibold text-neutral-400 mb-1">
                اختر الطاولة:
              </label>
              <select
                value={selectedTableId}
                onChange={(e) => setSelectedTableId(e.target.value)}
                className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-3 py-2 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="">-- بدون طاولة محددة (صالة مباشرة) --</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nameAr} ({t.zoneNameAr}) — {t.status === 'AVAILABLE' ? 'متاحة' : t.status}
                  </option>
                ))}
              </select>
            </div>
          )}

          {orderType === 'DELIVERY' && (
            <div className="mb-3 space-y-2 p-3 rounded-lg bg-[#0B0B0E] border border-white/10">
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="اسم العميل"
                  className="rounded-md bg-[#141419] border border-white/15 px-2.5 py-1.5 text-xs text-white"
                />
                <input
                  type="text"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="رقم الهاتف"
                  className="rounded-md bg-[#141419] border border-white/15 px-2.5 py-1.5 text-xs text-white font-mono"
                />
              </div>
              <input
                type="text"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="عنوان التوصيل بالتفصيل (مثال: شارع بلهوشات، حسين داي)"
                className="w-full rounded-md bg-[#141419] border border-white/15 px-2.5 py-1.5 text-xs text-white"
              />
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">رسوم التوصيل (د.ج):</span>
                <input
                  type="number"
                  min={0}
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(Number(e.target.value))}
                  className="w-24 rounded-md bg-[#141419] border border-white/15 px-2 py-1 text-left font-mono text-xs text-white"
                />
              </div>
            </div>
          )}

          {orderType !== 'DELIVERY' && (
            <div className="mb-3">
              <select
                value={selectedCustomerId}
                onChange={(e) => {
                  const cid = e.target.value;
                  setSelectedCustomerId(cid);
                  const found = customers.find((c) => c.id === cid);
                  if (found) {
                    setCustomerName(found.name);
                    setCustomerPhone(found.phone);
                  }
                }}
                className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-3 py-1.5 text-xs text-neutral-300"
              >
                <option value="">-- ربط بعميل مسجل (اختياري) --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.phone})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Cart Items List */}
          <div className="max-h-72 overflow-y-auto space-y-2 my-2 pr-0.5">
            {cart.length === 0 ? (
              <div className="py-12 text-center text-xs text-neutral-500 border border-dashed border-white/10 rounded-lg">
                السلة فارغة — اضغط على أي طبق من القائمة لإضافته فورًا
              </div>
            ) : (
              cart.map((item) => {
                const addonsPrice = item.addons.reduce((s, a) => s + a.price, 0);
                const lineTotal = (item.unitPrice + addonsPrice) * item.quantity;
                return (
                  <div
                    key={item.cartItemId}
                    className="p-2.5 rounded-lg bg-[#1C1C24] border border-white/10 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-white">{item.productNameAr}</div>
                        {item.variantNameAr && (
                          <div className="text-[11px] text-[#D4AF37]">الحجم: {item.variantNameAr}</div>
                        )}
                        {item.addons.length > 0 && (
                          <div className="text-[11px] text-neutral-400">
                            + {item.addons.map((a) => `${a.nameAr} (${a.price})`).join('، ')}
                          </div>
                        )}
                        {item.notes && (
                          <div className="text-[11px] text-amber-300">ملاحظة: {item.notes}</div>
                        )}
                      </div>
                      <div className="font-mono font-bold text-[#F3E5AB] whitespace-nowrap">
                        {lineTotal.toLocaleString('en-US')} {settings.currency}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5">
                      <span className="text-[11px] font-mono text-neutral-400">
                        سعر الوحدة: {(item.unitPrice + addonsPrice).toLocaleString('en-US')}
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.cartItemId, -1)}
                          className="w-6 h-6 rounded bg-white/10 flex items-center justify-center hover:bg-white/20"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-bold w-6 text-center">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartItemQty(item.cartItemId, 1)}
                          className="w-6 h-6 rounded bg-[#D4AF37] text-black flex items-center justify-center hover:bg-[#e5c247]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Totals & Action Buttons */}
        <div className="pt-3 border-t border-white/10 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">خصم (د.ج):</label>
              <input
                type="number"
                min={0}
                disabled={!can('pos:discount')}
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value)))}
                className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-2.5 py-1.5 text-xs font-mono text-white disabled:opacity-40"
              />
            </div>
            <div>
              <label className="block text-[11px] text-neutral-400 mb-1">ملاحظة للمطبخ:</label>
              <input
                type="text"
                value={orderNotes}
                onChange={(e) => setOrderNotes(e.target.value)}
                placeholder="بدون بصل، مستعجل..."
                className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-2.5 py-1.5 text-xs text-white"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-[#0B0B0E] border border-white/10 space-y-1.5 text-xs">
            <div className="flex justify-between text-neutral-400">
              <span>المجموع الفرعي:</span>
              <span className="font-mono">{cartTotals.subtotal.toLocaleString('en-US')} {settings.currency}</span>
            </div>
            {cartTotals.effectiveDiscount > 0 && (
              <div className="flex justify-between text-emerald-400">
                <span>الخصم المطبق:</span>
                <span className="font-mono">-{cartTotals.effectiveDiscount.toLocaleString('en-US')} {settings.currency}</span>
              </div>
            )}
            {cartTotals.taxAmount > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>الضريبة ({settings.taxRatePercent}%):</span>
                <span className="font-mono">{cartTotals.taxAmount.toLocaleString('en-US')} {settings.currency}</span>
              </div>
            )}
            {cartTotals.deliveryFee > 0 && (
              <div className="flex justify-between text-neutral-400">
                <span>رسوم التوصيل:</span>
                <span className="font-mono">{cartTotals.deliveryFee.toLocaleString('en-US')} {settings.currency}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-extrabold text-[#F3E5AB] pt-1.5 border-t border-white/10">
              <span>الإجمالي النهائي:</span>
              <span className="font-mono tabular-nums">
                {cartTotals.totalAmount.toLocaleString('en-US')} {settings.currency}
              </span>
            </div>
          </div>

          {feedbackError && (
            <div className="rounded-lg bg-red-500/15 border border-red-500/40 p-2.5 text-xs text-red-300">
              {feedbackError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleHoldCurrentCart}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-white/15 py-2.5 text-xs font-bold text-amber-300 hover:bg-white/10 disabled:opacity-40"
            >
              <PauseCircle className="w-4 h-4" />
              <span>تعليق الطلب (Hold)</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || isProcessing}
              onClick={handleSendToKitchenOnly}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 border border-white/15 py-2.5 text-xs font-bold text-white hover:bg-white/15 disabled:opacity-40"
            >
              <ChefHat className="w-4 h-4 text-[#D4AF37]" />
              <span>إرسال للمطبخ فقط</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              disabled={cart.length === 0 || isProcessing}
              onClick={() => openPaymentDialog('MULTI')}
              className="col-span-1 flex items-center justify-center gap-1 rounded-lg bg-blue-500/15 border border-blue-500/40 py-3 text-xs font-bold text-blue-300 hover:bg-blue-500/25 disabled:opacity-40"
            >
              <Split className="w-4 h-4" />
              <span>تقسيم الفاتورة</span>
            </button>

            <button
              type="button"
              disabled={cart.length === 0 || isProcessing}
              onClick={() => openPaymentDialog('SINGLE')}
              className="col-span-2 flex items-center justify-center gap-2 rounded-lg bg-[#D4AF37] py-3 text-sm font-extrabold text-black hover:bg-[#e5c247] transition-colors disabled:opacity-40"
            >
              <CreditCard className="w-4 h-4" />
              <span>الدفع والطباعة ({cartTotals.totalAmount.toLocaleString('en-US')})</span>
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          MODAL 1: PRODUCT VARIANTS & ADD-ONS CUSTOMIZATION
      ===================================================================== */}
      {customizingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-xl bg-[#141419] border border-[#D4AF37]/40 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-extrabold text-white">{customizingProduct.nameAr}</h3>
                <p className="text-xs text-[#D4AF37] font-mono">
                  السعر الأساسي: {customizingProduct.price.toLocaleString('en-US')} {settings.currency}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {customizingProduct.variants.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  اختر الحجم (Variant):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingProduct.variants.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setChosenVariantId(v.id)}
                      className={`p-2.5 rounded-lg border text-right text-xs transition-colors ${
                        chosenVariantId === v.id
                          ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white font-bold'
                          : 'bg-[#0B0B0E] border-white/10 text-neutral-300'
                      }`}
                    >
                      <div>{v.nameAr}</div>
                      <div className="font-mono text-[11px] text-[#D4AF37] mt-0.5">
                        {(customizingProduct.price + v.priceDelta).toLocaleString('en-US')} {settings.currency}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {customizingProduct.addons.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-neutral-300 mb-2">
                  الإضافات الاختيارية (Add-ons):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {customizingProduct.addons.map((addon) => {
                    const selected = chosenAddonIds.includes(addon.id);
                    return (
                      <button
                        key={addon.id}
                        type="button"
                        onClick={() =>
                          setChosenAddonIds((prev) =>
                            selected ? prev.filter((id) => id !== addon.id) : [...prev, addon.id]
                          )
                        }
                        className={`p-2.5 rounded-lg border text-right text-xs flex items-center justify-between transition-colors ${
                          selected
                            ? 'bg-emerald-500/20 border-emerald-400 text-white font-bold'
                            : 'bg-[#0B0B0E] border-white/10 text-neutral-300'
                        }`}
                      >
                        <span>{addon.nameAr}</span>
                        <span className="font-mono text-[#F3E5AB]">+{addon.price}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs text-neutral-400 mb-1">الكمية:</label>
                <input
                  type="number"
                  min={1}
                  value={itemQty}
                  onChange={(e) => setItemQty(Math.max(1, Number(e.target.value)))}
                  className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-3 py-2 text-sm font-mono text-white"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs text-neutral-400 mb-1">ملاحظة خاصة بالطبق:</label>
                <input
                  type="text"
                  value={itemNotes}
                  onChange={(e) => setItemNotes(e.target.value)}
                  placeholder="مثال: مشوي جيدًا، بدون حار..."
                  className="w-full rounded-lg bg-[#0B0B0E] border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setCustomizingProduct(null)}
                className="px-4 py-2 rounded-lg bg-white/10 text-xs font-semibold text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={confirmCustomProduct}
                className="px-6 py-2 rounded-lg bg-[#D4AF37] text-xs font-extrabold text-black hover:bg-[#e5c247]"
              >
                إضافة إلى الفاتورة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 2: HELD ORDERS (RESUME / DELETE)
      ===================================================================== */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl rounded-xl bg-[#141419] border border-white/15 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-extrabold text-white">
                الطلبات المعلقة المحفوظة ({heldCarts.length})
              </h3>
              <button
                type="button"
                onClick={() => setShowHeldModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {heldCarts.length === 0 ? (
              <div className="py-10 text-center text-xs text-neutral-400">
                لا توجد طلبات معلقة حاليًا. يمكنك تعليق أي فاتورة جارية بالضغط على زر "تعليق الطلب (Hold)".
              </div>
            ) : (
              <div className="space-y-2.5 max-h-96 overflow-y-auto">
                {heldCarts.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-lg bg-[#1C1C24] border border-white/10 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-sm text-white">{h.label}</div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        {h.items.map((i) => `${i.quantity}x ${i.productNameAr}`).join('، ')}
                      </div>
                      <div className="text-[11px] font-mono text-neutral-500 mt-1">
                        {new Date(h.createdAt).toLocaleTimeString('ar-DZ')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleResumeHeldCart(h.id)}
                        className="px-3.5 py-2 rounded-lg bg-[#D4AF37] text-xs font-bold text-black hover:bg-[#e5c247]"
                      >
                        استرجاع (Resume)
                      </button>
                      <button
                        type="button"
                        onClick={() => removeHeldCart(h.id)}
                        className="p-2 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 3: PAYMENT & SPLIT BILL (SINGLE / MULTI-METHOD / SPLIT BY CUSTOMERS)
      ===================================================================== */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto">
          <div className="w-full max-w-xl rounded-xl bg-[#141419] border border-[#D4AF37]/40 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-lg font-extrabold text-white">تحصيل الفاتورة وتقسيم الدفع</h3>
                <p className="text-xs text-neutral-400">
                  الإجمالي المطلوب:{' '}
                  <span className="font-mono font-bold text-[#F3E5AB] text-sm">
                    {cartTotals.totalAmount.toLocaleString('en-US')} {settings.currency}
                  </span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payment Mode Tabs */}
            <div className="grid grid-cols-3 gap-2 p-1 bg-[#0B0B0E] rounded-lg border border-white/10">
              <button
                type="button"
                onClick={() => setPaymentMode('SINGLE')}
                className={`py-2 rounded-md text-xs font-bold ${
                  paymentMode === 'SINGLE' ? 'bg-[#D4AF37] text-black' : 'text-neutral-400'
                }`}
              >
                دفع مباشر (طريقة واحدة)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('MULTI')}
                className={`py-2 rounded-md text-xs font-bold ${
                  paymentMode === 'MULTI' ? 'bg-[#D4AF37] text-black' : 'text-neutral-400'
                }`}
              >
                متعدد الطرق (نقدًا + بطاقة)
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('SPLIT_ITEMS')}
                className={`py-2 rounded-md text-xs font-bold ${
                  paymentMode === 'SPLIT_ITEMS' ? 'bg-[#D4AF37] text-black' : 'text-neutral-400'
                }`}
              >
                تقسيم على الأشخاص
              </button>
            </div>

            {paymentMode === 'SINGLE' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-300 mb-2">طريقة الدفع:</label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {(
                      [
                        { code: 'CASH', label: 'نقدًا (Cash)' },
                        { code: 'CARD', label: 'بطاقة بنكية' },
                        { code: 'CCP', label: 'حساب CCP' },
                        { code: 'BARIDIMOB', label: 'بريدي موب' },
                        { code: 'OTHER', label: 'أخرى' },
                      ] as const
                    ).map((m) => (
                      <button
                        key={m.code}
                        type="button"
                        onClick={() => setSingleMethod(m.code)}
                        className={`p-2.5 rounded-lg border text-xs font-bold transition-colors ${
                          singleMethod === m.code
                            ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-[#F3E5AB]'
                            : 'bg-[#0B0B0E] border-white/10 text-neutral-400'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {singleMethod === 'CASH' && (
                  <div className="space-y-3 p-4 rounded-xl bg-[#0B0B0E] border border-white/10">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-neutral-300">المبلغ النقدي المستلم:</label>
                      <input
                        type="number"
                        min={cartTotals.totalAmount}
                        value={cashTendered}
                        onChange={(e) => setCashTendered(Number(e.target.value))}
                        className="w-36 rounded-lg bg-[#141419] border border-[#D4AF37]/50 px-3 py-1.5 text-left font-mono text-sm font-bold text-white"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[
                        cartTotals.totalAmount,
                        Math.ceil(cartTotals.totalAmount / 500) * 500,
                        Math.ceil(cartTotals.totalAmount / 1000) * 1000,
                        cartTotals.totalAmount + 1000,
                        cartTotals.totalAmount + 2000,
                      ]
                        .filter((v, i, arr) => arr.indexOf(v) === i)
                        .map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setCashTendered(preset)}
                            className="px-3 py-1.5 rounded-md bg-white/5 border border-white/10 text-xs font-mono text-neutral-200 hover:bg-white/10"
                          >
                            {preset.toLocaleString('en-US')} د.ج
                          </button>
                        ))}
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-white/10 text-sm font-bold">
                      <span className="text-neutral-400">الباقي للعميل (Change):</span>
                      <span className="font-mono text-emerald-400">
                        {Math.max(0, cashTendered - cartTotals.totalAmount).toLocaleString('en-US')}{' '}
                        {settings.currency}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {paymentMode === 'MULTI' && (
              <div className="space-y-3 p-4 rounded-xl bg-[#0B0B0E] border border-white/10">
                <p className="text-xs text-neutral-400">
                  قسّم قيمة الفاتورة ({cartTotals.totalAmount.toLocaleString('en-US')} د.ج) على عدة طرق دفع (مثال: 3000 د.ج نقدًا + 2000 د.ج بطاقة):
                </p>
                {multiAllocations.map((alloc, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <select
                      value={alloc.method}
                      onChange={(e) => {
                        const copy = [...multiAllocations];
                        copy[idx].method = e.target.value as PaymentMethodCode;
                        setMultiAllocations(copy);
                      }}
                      className="rounded-lg bg-[#141419] border border-white/15 px-3 py-2 text-xs text-white"
                    >
                      <option value="CASH">نقدًا (Cash)</option>
                      <option value="CARD">بطاقة بنكية (Card)</option>
                      <option value="CCP">حساب بريدي (CCP)</option>
                      <option value="BARIDIMOB">بريدي موب (BaridiMob)</option>
                      <option value="OTHER">طريقة أخرى</option>
                    </select>
                    <input
                      type="number"
                      min={0}
                      value={alloc.amount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        const copy = [...multiAllocations];
                        copy[idx].amount = val;
                        if (idx === 0 && copy.length === 2) {
                          copy[1].amount = Math.max(0, cartTotals.totalAmount - val);
                        }
                        setMultiAllocations(copy);
                      }}
                      className="flex-1 rounded-lg bg-[#141419] border border-white/15 px-3 py-2 text-left font-mono text-xs text-white"
                    />
                    <span className="text-xs text-neutral-400">{settings.currency}</span>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setMultiAllocations([...multiAllocations, { method: 'BARIDIMOB', amount: 0 }])
                  }
                  className="text-xs text-[#D4AF37] hover:underline"
                >
                  + إضافة طريقة دفع أخرى
                </button>
              </div>
            )}

            {paymentMode === 'SPLIT_ITEMS' && (
              <div className="space-y-3 p-4 rounded-xl bg-[#0B0B0E] border border-white/10">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-neutral-300">عدد الأشخاص لتقسيم الفاتورة:</span>
                  <input
                    type="number"
                    min={2}
                    max={20}
                    value={splitEqualCount}
                    onChange={(e) => setSplitEqualCount(Math.max(2, Number(e.target.value)))}
                    className="w-24 rounded-lg bg-[#141419] border border-white/15 px-3 py-1.5 text-center font-mono text-sm text-white"
                  />
                </div>
                <div className="p-3 rounded-lg bg-[#141419] border border-[#D4AF37]/30 flex items-center justify-between">
                  <span className="text-xs text-neutral-300">حصة كل شخص بالتساوي:</span>
                  <span className="font-mono font-extrabold text-base text-[#F3E5AB]">
                    {Math.ceil(cartTotals.totalAmount / splitEqualCount).toLocaleString('en-US')}{' '}
                    {settings.currency}
                  </span>
                </div>
                <div className="space-y-1 pt-2 border-t border-white/10">
                  <div className="text-[11px] text-neutral-400 font-semibold">أو حسب الأصناف في السلة:</div>
                  {cart.map((c) => (
                    <div key={c.cartItemId} className="flex justify-between text-xs text-neutral-300">
                      <span>
                        {c.quantity}x {c.productNameAr}
                      </span>
                      <span className="font-mono">
                        {((c.unitPrice + c.addons.reduce((s, a) => s + a.price, 0)) * c.quantity).toLocaleString(
                          'en-US'
                        )}{' '}
                        {settings.currency}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {feedbackError && (
              <div className="rounded-lg bg-red-500/15 border border-red-500/40 p-3 text-xs text-red-300">
                {feedbackError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2.5 rounded-lg bg-white/10 text-xs font-semibold text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCompleteOrderAndPayment}
                className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-[#D4AF37] text-xs font-extrabold text-black hover:bg-[#e5c247]"
              >
                <CheckCircle2 className="w-4 h-4" />
                <Printer className="w-4 h-4" />
                <span>{isProcessing ? 'جاري التسجيل...' : 'تأكيد الدفع وطباعة الفاتورة'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          MODAL 4: THERMAL & A4 RECEIPT PRINTER
      ===================================================================== */}
      {receiptData && (
        <ReceiptPrinterModal
          order={receiptData.order}
          payment={receiptData.payment}
          settings={settings}
          onClose={() => setReceiptData(null)}
        />
      )}
    </div>
  );
};
