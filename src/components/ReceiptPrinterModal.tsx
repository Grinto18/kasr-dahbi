import React, { useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { Order, PaymentRecord, RestaurantSettings } from '../db/types.ts';
import { usePWAInstall } from '../lib/usePWAInstall.ts';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={async () => {
          if (isInstallable) {
            await install();
          } else {
            setShowGuide(true);
          }
        }}
        className="flex items-center gap-2 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-3 py-1.5 text-xs font-semibold text-[#F3E5AB] hover:bg-[#D4AF37]/25 transition-colors whitespace-nowrap shrink-0"
      >
        <Download className="w-3.5 h-3.5 text-[#D4AF37]" />
        <span>تثبيت التطبيق PWA</span>
      </button>

      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-xl bg-[#141419] border border-[#D4AF37]/30 p-6 shadow-2xl text-right">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-base font-bold text-[#F3E5AB]">
                تثبيت تطبيق Golden Palace POS على جهازك
              </h3>
              <button
                type="button"
                onClick={() => setShowGuide(false)}
                className="text-neutral-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-neutral-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p className="font-semibold text-white">لتثبيت التطبيق على iPhone / iPad:</p>
                  <p>1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.</p>
                  <p>2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.</p>
                </>
              ) : (
                <>
                  <p className="font-semibold text-white">لتثبيت التطبيق على Windows أو Android:</p>
                  <p>1. في متصفح <strong>Google Chrome</strong> أو <strong>Microsoft Edge</strong>، اضغط على أيقونة التثبيت في شريط العنوان (أو القائمة ⋮ أعلى اليسار).</p>
                  <p>2. اختر <strong>تثبيت Golden Palace POS (Install App)</strong> ليعمل في نافذة مستقلة وحتى بدون إنترنت.</p>
                </>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowGuide(false)}
              className="mt-5 w-full rounded-lg bg-[#D4AF37] py-2.5 text-sm font-bold text-black hover:bg-[#e3be42] transition-colors"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}
    </>
  );
};

interface ReceiptPrinterModalProps {
  order: Order;
  payment?: PaymentRecord | null;
  settings: RestaurantSettings;
  mode?: 'CUSTOMER_RECEIPT' | 'KITCHEN_TICKET';
  onClose: () => void;
}

const PAYMENT_METHOD_AR: Record<string, string> = {
  CASH: 'نقدًا (Cash)',
  CARD: 'بطاقة بنكية / CIB / الذهبية',
  CCP: 'حساب بريدي CCP',
  BARIDIMOB: 'بريدي موب BaridiMob',
  OTHER: 'طريقة أخرى',
};

const ORDER_TYPE_AR: Record<string, string> = {
  DINE_IN: 'محلي داخل الصالة',
  TAKEAWAY: 'سفري (أخذ خارجي)',
  DELIVERY: 'توصيل للمنزل',
};

export const ReceiptPrinterModal: React.FC<ReceiptPrinterModalProps> = ({
  order,
  payment,
  settings,
  onClose,
}) => {
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm' | 'A4'>(settings.receiptSize || '80mm');

  const handlePrint = () => {
    window.print();
  };

  const widthClass =
    paperSize === '58mm'
      ? 'max-w-[260px] text-[11px]'
      : paperSize === '80mm'
      ? 'max-w-[340px] text-xs'
      : 'max-w-[680px] text-sm';

  const orderDate = new Date(order.createdAt);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 overflow-y-auto print:bg-white print:p-0">
      <div className="w-full max-w-3xl rounded-xl bg-[#141419] border border-white/10 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white">
        {/* Toolbar (Hidden when printing) */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 bg-[#1C1C24] border-b border-white/10 print:hidden">
          <div className="flex items-center gap-3">
            <Printer className="w-5 h-5 text-[#D4AF37]" />
            <h3 className="text-base font-bold text-white">معاينة وطباعة الفاتورة — #{order.orderNumber}</h3>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">مقاس الورق:</span>
            {(['58mm', '80mm', 'A4'] as const).map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setPaperSize(sz)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors ${
                  paperSize === sz
                    ? 'bg-[#D4AF37] text-black'
                    : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-[#D4AF37] px-4 py-2 text-xs font-bold text-black hover:bg-[#e5c247] transition-colors"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن ({paperSize})</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold text-neutral-200 hover:bg-white/15"
            >
              إغلاق
            </button>
          </div>
        </div>

        {/* Printable Receipt Container */}
        <div className="p-6 flex justify-center bg-[#0B0B0E] print:bg-white print:p-0">
          <div
            id="printable-receipt"
            dir="rtl"
            className={`w-full ${widthClass} bg-white text-black p-5 rounded-md shadow-lg print:shadow-none print:max-w-full`}
          >
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-black/80 pb-3">
              <h1 className="text-lg font-extrabold tracking-tight">{settings.restaurantName}</h1>
              <p className="font-bold text-xs mt-0.5">{settings.brandTitle}</p>
              <p className="text-[11px] text-neutral-800 mt-1">{settings.address}</p>
              {settings.landmark && <p className="text-[11px] text-neutral-800">{settings.landmark}</p>}
              <p className="text-xs font-mono font-bold mt-1" dir="ltr">
                Tel: {settings.phone}
              </p>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 border-b border-dashed border-black/70 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-semibold">رقم الفاتورة:</span>
                <span className="font-mono font-bold">{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">التاريخ والوقت:</span>
                <span className="font-mono">
                  {dateStr} — {timeStr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold">نوع الطلب:</span>
                <span className="font-bold">{ORDER_TYPE_AR[order.orderType] || order.orderType}</span>
              </div>
              {order.tableName && (
                <div className="flex justify-between">
                  <span className="font-semibold">الطاولة:</span>
                  <span className="font-bold">{order.tableName}</span>
                </div>
              )}
              {order.customerName && (
                <div className="flex justify-between">
                  <span className="font-semibold">العميل:</span>
                  <span>
                    {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                  </span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex justify-between">
                  <span className="font-semibold">العنوان:</span>
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-semibold">الكاشير:</span>
                <span>{payment?.cashierName || order.createdByName}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full my-2.5 text-right border-collapse">
              <thead>
                <tr className="border-b border-black text-[11px]">
                  <th className="py-1 font-bold">الصنف</th>
                  <th className="py-1 text-center font-bold">الكمية</th>
                  <th className="py-1 text-left font-bold">السعر</th>
                  <th className="py-1 text-left font-bold">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-black/30">
                {order.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="py-1.5 pr-0.5">
                      <div className="font-bold">{item.productNameAr}</div>
                      {item.variantNameAr && (
                        <div className="text-[10px] text-neutral-700">الحجم: {item.variantNameAr}</div>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[10px] text-neutral-700">
                          إضافات: {item.addons.map((a) => `${a.nameAr} (+${a.price})`).join('، ')}
                        </div>
                      )}
                      {item.notes && <div className="text-[10px] italic">ملاحظة: {item.notes}</div>}
                    </td>
                    <td className="py-1.5 text-center font-mono font-semibold">{item.quantity}</td>
                    <td className="py-1.5 text-left font-mono">
                      {(item.unitPrice + item.addonsTotal).toLocaleString('en-US')}
                    </td>
                    <td className="py-1.5 text-left font-mono font-bold">
                      {item.subtotal.toLocaleString('en-US')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="border-t-2 border-dashed border-black pt-2 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>المجموع الفرعي (Subtotal):</span>
                <span className="font-mono font-semibold">
                  {order.subtotal.toLocaleString('en-US')} {settings.currency}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between">
                  <span>الخصم (Discount):</span>
                  <span className="font-mono font-semibold">
                    -{order.discountAmount.toLocaleString('en-US')} {settings.currency}
                  </span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>الضريبة ({settings.taxRatePercent}%):</span>
                  <span className="font-mono font-semibold">
                    {order.taxAmount.toLocaleString('en-US')} {settings.currency}
                  </span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono font-semibold">
                    {order.deliveryFee.toLocaleString('en-US')} {settings.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold border-t border-black pt-1.5 mt-1">
                <span>الإجمالي النهائي (Total):</span>
                <span className="font-mono">
                  {order.totalAmount.toLocaleString('en-US')} {settings.currency}
                </span>
              </div>

              {/* Payment Breakdown */}
              <div className="pt-2 border-t border-dashed border-black/50 space-y-1 text-[11px]">
                {payment && payment.allocations.length > 0 ? (
                  <>
                    {payment.allocations.map((alloc, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>طريقة الدفع ({PAYMENT_METHOD_AR[alloc.method] || alloc.method}):</span>
                        <span className="font-mono font-bold">
                          {alloc.amount.toLocaleString('en-US')} {settings.currency}
                        </span>
                      </div>
                    ))}
                    {payment.changeGiven > 0 && (
                      <div className="flex justify-between font-bold">
                        <span>الباقي للعميل (Change):</span>
                        <span className="font-mono">
                          {payment.changeGiven.toLocaleString('en-US')} {settings.currency}
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span>حالة الدفع:</span>
                    <span className="font-bold">
                      {order.paymentStatus === 'PAID'
                        ? 'خالص (Paid)'
                        : order.paymentStatus === 'PARTIAL'
                        ? `مدفوع جزئيًا (${order.paidAmount} ${settings.currency})`
                        : 'غير مدفوع بعد'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t border-dashed border-black text-center space-y-1">
              <p className="font-bold text-xs">{settings.receiptFooterMessage}</p>
              <p className="text-[10px] font-mono text-neutral-700">GOLDEN PALACE POS • HUSSEIN DEY</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
