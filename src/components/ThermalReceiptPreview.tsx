import React, { useState } from 'react';
import {
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  CheckCircle2,
  FileText,
  Sparkles,
  Wifi,
  QrCode,
  Barcode,
  Layers,
} from 'lucide-react';
import type { Order, PaymentRecord, RestaurantSettings } from '../db/types';
import { generateThermalReceiptHtml } from '../utils/thermalReceiptTemplate';

// Realistic sample mock order for live preview
export const SAMPLE_MOCK_ORDER: Order = {
  id: 'ord_sample_preview',
  orderNumber: '00128',
  status: 'COMPLETED',
  paymentStatus: 'PAID',
  orderType: 'DINE_IN',
  tableId: 'tbl_5',
  tableName: 'طاولة رقم 5 (صالة العائلات)',
  customerName: 'الأستاذ عبد الرحمن بلقاسم',
  customerPhone: '0550 12 34 56',
  deliveryAddress: null,
  items: [
    {
      id: 'item_1',
      orderId: 'ord_sample_preview',
      productId: 'p_1',
      productNameAr: 'شواية مشكل فاخر (قصر)',
      variantId: 'v_large',
      variantNameAr: 'صحن عائلي كبير (Large)',
      quantity: 2,
      unitPrice: 2400,
      unitCost: 1500,
      addonsTotal: 200,
      addons: [
        { id: 'add_1', addonId: 'a1', nameAr: 'صلصة حارة جزائرية', price: 100 },
        { id: 'add_2', addonId: 'a2', nameAr: 'جبن شيدر ذائب', price: 100 },
      ],
      notes: 'بدون شحم زائد على الفحم',
      subtotal: 5200,
    },
    {
      id: 'item_2',
      orderId: 'ord_sample_preview',
      productId: 'p_2',
      productNameAr: 'شخشوخة قسنطينية حارة بالدجاج البلدي',
      quantity: 1,
      unitPrice: 1100,
      unitCost: 650,
      addonsTotal: 0,
      addons: [],
      notes: 'حار وسط مع فلفل حار جانبي',
      subtotal: 1100,
    },
    {
      id: 'item_3',
      orderId: 'ord_sample_preview',
      productId: 'p_3',
      productNameAr: 'شربة فريك جزائرية بلحم الضأن',
      quantity: 2,
      unitPrice: 450,
      unitCost: 200,
      addonsTotal: 0,
      addons: [],
      notes: '',
      subtotal: 900,
    },
    {
      id: 'item_4',
      orderId: 'ord_sample_preview',
      productId: 'p_4',
      productNameAr: 'مشروب غازي كوكا كولا زجاج 33cl',
      quantity: 3,
      unitPrice: 150,
      unitCost: 80,
      addonsTotal: 0,
      addons: [],
      notes: '',
      subtotal: 450,
    },
  ],
  subtotal: 7650,
  discountAmount: 350,
  taxAmount: 657,
  deliveryFee: 0,
  totalAmount: 7957,
  paidAmount: 8000,
  notes: 'طلب زبون دائم — خصم ترحيبي',
  createdBy: 'usr_cashier',
  createdByName: 'ياسين جيجلي (كاشير رئيسي)',
  inventoryDeducted: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export const SAMPLE_MOCK_PAYMENT: PaymentRecord = {
  id: 'pay_sample_preview',
  orderId: 'ord_sample_preview',
  orderNumber: '00128',
  idempotencyKey: 'idemp_sample_128',
  totalDue: 7957,
  totalTendered: 8000,
  changeGiven: 43,
  allocations: [
    { method: 'CASH', amount: 5000 },
    { method: 'BARIDIMOB', amount: 3000, referenceNumber: 'TXN-998822' },
  ],
  status: 'COMPLETED',
  cashierId: 'usr_cashier',
  cashierName: 'ياسين جيجلي (كاشير رئيسي)',
  createdAt: new Date().toISOString(),
};

interface ThermalReceiptPreviewProps {
  settings: RestaurantSettings;
  paperSize?: '58mm' | '80mm';
  onPaperSizeChange?: (size: '58mm' | '80mm') => void;
  onPrintTest?: (size: '58mm' | '80mm') => void;
  isPrinting?: boolean;
}

export const ThermalReceiptPreview: React.FC<ThermalReceiptPreviewProps> = ({
  settings,
  paperSize: controlledPaperSize,
  onPaperSizeChange,
  onPrintTest,
  isPrinting = false,
}) => {
  const [internalPaperSize, setInternalPaperSize] = useState<'58mm' | '80mm'>('80mm');
  const [zoomLevel, setZoomLevel] = useState<number>(100);

  const activePaperSize = controlledPaperSize || internalPaperSize;

  const handleSizeSelect = (size: '58mm' | '80mm') => {
    if (onPaperSizeChange) {
      onPaperSizeChange(size);
    } else {
      setInternalPaperSize(size);
    }
  };

  const is58 = activePaperSize === '58mm';

  // Container styling width to simulate exact paper roll proportions
  const paperContainerWidth = is58 ? 'w-[280px]' : 'w-[360px]';

  const orderDate = new Date(SAMPLE_MOCK_ORDER.createdAt);
  const dateStr = orderDate.toLocaleDateString('ar-DZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const timeStr = orderDate.toLocaleTimeString('ar-DZ', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex flex-col items-center w-full">
      {/* Top Preview Control Bar */}
      <div className="w-full flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-white/10 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="text-neutral-400 font-medium">عرض الورق:</span>
          <div className="inline-flex rounded-lg bg-black/60 p-0.5 border border-white/15">
            <button
              type="button"
              onClick={() => handleSizeSelect('58mm')}
              className={`px-3 py-1 rounded-md font-mono font-bold text-xs transition-all ${
                is58
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              58mm (حراري صغير)
            </button>
            <button
              type="button"
              onClick={() => handleSizeSelect('80mm')}
              className={`px-3 py-1 rounded-md font-mono font-bold text-xs transition-all ${
                !is58
                  ? 'bg-[#D4AF37] text-black shadow-sm'
                  : 'text-neutral-300 hover:text-white'
              }`}
            >
              80mm (قياسي POS)
            </button>
          </div>
        </div>

        {/* Paper details & Zoom */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 border border-white/10 text-[#D4AF37]">
            {is58 ? '384 Dots • 48mm نافذ' : '576 Dots • 72mm نافذ'}
          </span>

          <div className="flex items-center bg-black/50 border border-white/10 rounded-lg p-0.5">
            <button
              type="button"
              title="تصغير المعاينة"
              onClick={() => setZoomLevel((prev) => Math.max(80, prev - 10))}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-[10px] font-mono px-1.5 text-neutral-300">{zoomLevel}%</span>
            <button
              type="button"
              title="تكبير المعاينة"
              onClick={() => setZoomLevel((prev) => Math.min(130, prev + 10))}
              className="p-1 text-neutral-400 hover:text-white transition-colors"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {onPrintTest && (
            <button
              type="button"
              onClick={() => onPrintTest(activePaperSize)}
              disabled={isPrinting}
              className="flex items-center gap-1.5 bg-[#D4AF37] hover:bg-[#e6c148] text-black px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-md shadow-[#D4AF37]/20 disabled:opacity-50 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isPrinting ? 'جاري الإرسال...' : 'تجربة طباعة'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Realistic Thermal Receipt Paper Container */}
      <div className="w-full flex justify-center py-2 overflow-x-auto">
        <div
          style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top center' }}
          className="transition-transform duration-200"
        >
          {/* Top Jagged Receipt Paper Tear Edge */}
          <div
            className={`${paperContainerWidth} h-2.5 mx-auto bg-repeat-x opacity-90`}
            style={{
              backgroundImage: `radial-gradient(circle, transparent, transparent 50%, #ffffff 50%, #ffffff 100%)`,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 -4px',
            }}
          />

          {/* Thermal Paper Slip Body */}
          <div
            id="thermal-preview-slip"
            dir="rtl"
            className={`${paperContainerWidth} bg-[#ffffff] text-[#000000] p-4 sm:p-5 shadow-2xl rounded-xs select-none transition-all font-sans relative`}
            style={{
              fontFamily: "'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif",
              minHeight: '480px',
            }}
          >
            {/* Top Paper Header slot subtle line */}
            <div className="w-12 h-1 bg-neutral-200 rounded-full mx-auto mb-2 opacity-60" />

            {/* HEADER CUSTOMIZATION SECTION */}
            <div className="text-center border-b-2 border-dashed border-black/80 pb-3 mb-3">
              {/* Logo / Crest */}
              {settings.showLogo !== false && (
                <div className="mb-2 flex justify-center">
                  {settings.logoUrl && settings.logoUrl.trim().length > 0 ? (
                    <img
                      src={settings.logoUrl}
                      alt="Restaurant Logo"
                      className={`object-contain filter grayscale contrast-150 ${
                        is58 ? 'max-h-9 max-w-[140px]' : 'max-h-12 max-w-[180px]'
                      }`}
                    />
                  ) : (
                    <div className="p-1.5 rounded-full border border-black/80 inline-flex items-center justify-center">
                      <Sparkles className={`${is58 ? 'w-5 h-5' : 'w-6 h-6'} text-black`} />
                    </div>
                  )}
                </div>
              )}

              {/* Restaurant Name */}
              <h1
                className={`font-black tracking-tight text-black leading-tight ${
                  is58 ? 'text-sm' : 'text-base sm:text-lg'
                }`}
              >
                {settings.restaurantName || 'القصر الذهبي'}
              </h1>

              {/* Brand Title */}
              {settings.brandTitle && (
                <p className={`font-bold text-neutral-900 mt-0.5 ${is58 ? 'text-[10px]' : 'text-xs'}`}>
                  {settings.brandTitle}
                </p>
              )}

              {/* Custom Header Message */}
              {settings.receiptHeaderMessage && (
                <p
                  className={`font-semibold text-neutral-800 my-1 bg-neutral-100/80 px-2 py-0.5 rounded leading-tight ${
                    is58 ? 'text-[9px]' : 'text-[10px]'
                  }`}
                >
                  {settings.receiptHeaderMessage}
                </p>
              )}

              {/* Address & Landmark */}
              <p className={`text-neutral-800 mt-1 leading-tight ${is58 ? 'text-[9.5px]' : 'text-[11px]'}`}>
                {settings.address || 'شارع بلهوشات، حسين داي، الجزائر'}
              </p>
              {settings.landmark && (
                <p className={`text-neutral-700 leading-tight ${is58 ? 'text-[8.5px]' : 'text-[10px]'}`}>
                  {settings.landmark}
                </p>
              )}

              {/* Phone */}
              <p className="text-[11px] font-mono font-bold mt-1 tracking-wider text-black" dir="ltr">
                Tel: {settings.phone || '0791755614'}
              </p>

              {/* Tax & Commercial Identification Block */}
              {settings.showTaxId && (
                <div className="mt-2 pt-2 border-t border-dotted border-black/60 text-[9px] text-neutral-800 space-y-0.5 text-right font-mono">
                  {settings.taxId && (
                    <div className="flex justify-between">
                      <span className="font-sans font-bold">الرقم الجبائي (NIF):</span>
                      <span className="font-bold">{settings.taxId}</span>
                    </div>
                  )}
                  {settings.commercialRegister && (
                    <div className="flex justify-between">
                      <span className="font-sans">السجل التجاري (RC):</span>
                      <span>{settings.commercialRegister}</span>
                    </div>
                  )}
                  {settings.statisticalId && (
                    <div className="flex justify-between">
                      <span className="font-sans">التعريف الإحصائي (NIS):</span>
                      <span>{settings.statisticalId}</span>
                    </div>
                  )}
                  {settings.articleNumber && (
                    <div className="flex justify-between">
                      <span className="font-sans">رقم المادة (ART):</span>
                      <span>{settings.articleNumber}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* METADATA SECTION */}
            <div className={`py-2 border-b border-dashed border-black/70 space-y-1 ${is58 ? 'text-[9.5px]' : 'text-[11px]'}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold">رقم الفاتورة:</span>
                <span className="font-mono font-black text-sm">#{SAMPLE_MOCK_ORDER.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span>التاريخ والوقت:</span>
                <span className="font-mono">
                  {dateStr} — {timeStr}
                </span>
              </div>

              {settings.showOrderType !== false && (
                <div className="flex justify-between">
                  <span>نوع الطلب:</span>
                  <span className="font-bold">محلي (داخل الصالة)</span>
                </div>
              )}

              {settings.showTableInfo !== false && (
                <div className="flex justify-between items-center">
                  <span>الموقع / الطاولة:</span>
                  <span className="font-black bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-900">
                    {SAMPLE_MOCK_ORDER.tableName}
                  </span>
                </div>
              )}

              {settings.showCustomerInfo !== false && (
                <div className="flex justify-between">
                  <span>العميل:</span>
                  <span className="font-medium">{SAMPLE_MOCK_ORDER.customerName}</span>
                </div>
              )}

              {settings.showCashierName !== false && (
                <div className="flex justify-between">
                  <span>الكاشير:</span>
                  <span>{SAMPLE_MOCK_PAYMENT.cashierName}</span>
                </div>
              )}
            </div>

            {/* ITEMS TABLE */}
            <table className="w-full my-2 text-right border-collapse">
              <thead>
                <tr className={`border-b-2 border-black ${is58 ? 'text-[9.5px]' : 'text-[11px]'}`}>
                  <th className="py-1 font-black">الصنف</th>
                  <th className="py-1 text-center font-black w-8">الكمية</th>
                  <th className="py-1 text-left font-black w-14">السعر</th>
                  <th className="py-1 text-left font-black w-16">المجموع</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-black/25">
                {SAMPLE_MOCK_ORDER.items.map((item) => (
                  <tr key={item.id} className={`align-top ${is58 ? 'text-[9.5px]' : 'text-[11px]'}`}>
                    <td className="py-1.5 pr-0.5">
                      <div className="font-bold leading-tight">{item.productNameAr}</div>
                      {item.variantNameAr && (
                        <div className="text-[9px] text-neutral-700">{item.variantNameAr}</div>
                      )}
                      {settings.showItemAddons !== false && item.addons && item.addons.length > 0 && (
                        <div className="text-[8.5px] text-neutral-600">
                          إضافات: {item.addons.map((a) => `${a.nameAr} (+${a.price})`).join('، ')}
                        </div>
                      )}
                      {settings.showItemNotes !== false && item.notes && (
                        <div className="text-[8.5px] italic text-neutral-600">
                          ملاحظة: {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 text-center font-mono font-bold">{item.quantity}</td>
                    <td className="py-1.5 text-left font-mono whitespace-nowrap">
                      {(item.unitPrice + item.addonsTotal).toLocaleString('en-US')}
                    </td>
                    <td className="py-1.5 text-left font-mono font-bold whitespace-nowrap">
                      {item.subtotal.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* TOTALS SECTION */}
            <div className={`border-t-2 border-dashed border-black pt-2 space-y-1 ${is58 ? 'text-[10px]' : 'text-xs'}`}>
              <div className="flex justify-between">
                <span>المجموع الفرعي:</span>
                <span className="font-mono font-bold">
                  {SAMPLE_MOCK_ORDER.subtotal.toLocaleString('en-US')} {settings.currency || 'د.ج'}
                </span>
              </div>

              {SAMPLE_MOCK_ORDER.discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>خصم ترويجي:</span>
                  <span className="font-mono">
                    -{SAMPLE_MOCK_ORDER.discountAmount.toLocaleString('en-US')}{' '}
                    {settings.currency || 'د.ج'}
                  </span>
                </div>
              )}

              {settings.taxEnabled && (
                <div className="flex justify-between">
                  <span>الرسم الضريبي ({settings.taxRatePercent || 9}%):</span>
                  <span className="font-mono font-bold">
                    {SAMPLE_MOCK_ORDER.taxAmount.toLocaleString('en-US')}{' '}
                    {settings.currency || 'د.ج'}
                  </span>
                </div>
              )}

              <div className="flex justify-between font-black border-t-2 border-black pt-1.5 mt-1 text-sm">
                <span>الإجمالي الصافي:</span>
                <span className="font-mono font-black">
                  {SAMPLE_MOCK_ORDER.totalAmount.toLocaleString('en-US')} {settings.currency || 'د.ج'}
                </span>
              </div>

              {/* PAYMENT BREAKDOWN */}
              {settings.showPaymentBreakdown !== false && (
                <div className="pt-2 border-t border-dashed border-black/40 space-y-0.5 text-[10px]">
                  {SAMPLE_MOCK_PAYMENT.allocations.map((alloc, idx) => (
                    <div key={idx} className="flex justify-between">
                      <span>طريقة الدفع ({alloc.method === 'CASH' ? 'نقداً' : 'بريدي موب'}):</span>
                      <span className="font-mono font-bold">
                        {alloc.amount.toLocaleString('en-US')} {settings.currency || 'د.ج'}
                      </span>
                    </div>
                  ))}
                  {SAMPLE_MOCK_PAYMENT.changeGiven > 0 && (
                    <div className="flex justify-between font-bold border-t border-dashed border-black/30 pt-1">
                      <span>الباقي المرجع للعميل:</span>
                      <span className="font-mono">
                        {SAMPLE_MOCK_PAYMENT.changeGiven.toLocaleString('en-US')}{' '}
                        {settings.currency || 'د.ج'}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* FOOTER CUSTOMIZATION SECTION */}
            <div className="mt-3 pt-2.5 border-t-2 border-dashed border-black text-center space-y-1.5">
              {/* Wi-Fi Customer Credentials */}
              {settings.showWifiInfo && (settings.wifiSsid || settings.wifiPassword) && (
                <div className="border border-dashed border-black/60 rounded px-2 py-1 text-[9px] bg-neutral-50/80 leading-tight">
                  <div className="flex items-center justify-center gap-1 font-bold text-black mb-0.5">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>خدمة واي فاي الزبائن (Wi-Fi)</span>
                  </div>
                  {settings.wifiSsid && (
                    <div>
                      اسم الشبكة: <span className="font-mono font-bold">{settings.wifiSsid}</span>
                    </div>
                  )}
                  {settings.wifiPassword && (
                    <div>
                      الرمز السري: <span className="font-mono font-bold">{settings.wifiPassword}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Thank You Custom Message */}
              <p
                className={`font-black text-neutral-900 leading-snug ${
                  is58 ? 'text-[10px]' : 'text-xs'
                }`}
              >
                {settings.receiptFooterMessage ||
                  'شكرًا لزيارتكم لمطعم القصر الذهبي — عند الجيجلي • صحة وهنا!'}
              </p>

              {/* Return Policy */}
              {settings.showReturnPolicy && settings.returnPolicyText && (
                <p className="text-[8px] text-neutral-600 leading-tight italic">
                  {settings.returnPolicyText}
                </p>
              )}

              {/* Social Media Handle */}
              {settings.showSocialMedia && settings.socialHandle && (
                <p className="text-[9.5px] font-mono font-bold text-black direction-ltr" dir="ltr">
                  {settings.socialHandle}
                </p>
              )}

              {/* Barcode Simulation */}
              {settings.showBarcode !== false && (
                <div className="py-1">
                  <div
                    className={`mx-auto h-7 bg-repeat-x flex items-center justify-center ${
                      is58 ? 'w-36' : 'w-48'
                    }`}
                    style={{
                      backgroundImage: `repeating-linear-gradient(90deg, #000 0, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 9px)`,
                    }}
                  />
                  <div className="text-[8.5px] font-mono tracking-widest text-black mt-0.5">
                    *{SAMPLE_MOCK_ORDER.orderNumber}*
                  </div>
                </div>
              )}

              {/* QR Code Simulation */}
              {settings.showQrCode !== false && (
                <div className="flex flex-col items-center justify-center pt-0.5">
                  <div className="p-1 border border-black/80 rounded bg-white">
                    <QrCode className={`${is58 ? 'w-14 h-14' : 'w-16 h-16'} text-black`} />
                  </div>
                  <span className="text-[8px] text-neutral-600 mt-0.5">
                    امسح للتحقق الإلكتروني من الفاتورة
                  </span>
                </div>
              )}

              {/* Machine & System Branding */}
              <div className="pt-1.5 border-t border-dotted border-black/40 text-[8px] text-neutral-500 font-mono">
                <div>GOLDEN PALACE POS • HUSSEIN DEY</div>
                <div>طُبعت الفاتورة عبر نظام الكاشير المباشر</div>
              </div>
            </div>
          </div>

          {/* Bottom Jagged Receipt Paper Tear Edge */}
          <div
            className={`${paperContainerWidth} h-2.5 mx-auto bg-repeat-x opacity-90`}
            style={{
              backgroundImage: `radial-gradient(circle, #ffffff, #ffffff 50%, transparent 50%, transparent 100%)`,
              backgroundSize: '8px 8px',
              backgroundPosition: '0 0',
            }}
          />
        </div>
      </div>
    </div>
  );
};
