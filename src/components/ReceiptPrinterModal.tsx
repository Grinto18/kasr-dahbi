import React, { useState, useEffect } from 'react';
import {
  Printer,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  FileText,
  Volume2,
  Sparkles,
  Wifi,
  Barcode,
  QrCode,
} from 'lucide-react';
import type { Order, PaymentRecord, RestaurantSettings } from '../db/types';
import { generateThermalReceiptHtml } from '../utils/thermalReceiptTemplate';

interface PrinterDevice {
  name: string;
  displayName: string;
  description: string;
  status: number;
  isDefault: boolean;
}

export interface ReceiptPrinterModalProps {
  order: Order;
  payment?: PaymentRecord | null;
  settings: RestaurantSettings;
  mode?: 'CUSTOMER_RECEIPT' | 'KITCHEN_TICKET' | string;
  onClose: () => void;
}

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return null;
};

const PAYMENT_METHOD_AR: Record<string, string> = {
  CASH: 'نقداً',
  CARD: 'بطاقة بنكية',
  CCP: 'بريد الجزائر',
  BARIDIMOB: 'بريدي موب',
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
  const [paperSize, setPaperSize] = useState<'58mm' | '80mm' | 'A4'>(
    settings.receiptSize || '80mm'
  );
  const [printers, setPrinters] = useState<PrinterDevice[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>(
    settings.printerName || ''
  );
  const [isDetectingPrinters, setIsDetectingPrinters] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printStatus, setPrintStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });
  const [silentMode, setSilentMode] = useState<boolean>(true);

  // Check if running in Electron environment with Windows Printer Spooler access
  const isElectron = Boolean(
    typeof window !== 'undefined' && (window as any).electronPos
  );

  // Load available Windows printers on mount
  useEffect(() => {
    fetchInstalledPrinters();
  }, []);

  const fetchInstalledPrinters = async () => {
    const electronPos = (window as any).electronPos;
    if (!electronPos?.getPrinters) return;

    setIsDetectingPrinters(true);
    try {
      const list: PrinterDevice[] = await electronPos.getPrinters();
      setPrinters(list);

      // If user hasn't selected a printer yet, default to the Windows default printer or saved setting
      if (!selectedPrinter && list.length > 0) {
        const defaultPrinter = list.find((p) => p.isDefault) || list[0];
        setSelectedPrinter(defaultPrinter.name);
      }
    } catch (err: any) {
      console.warn('Failed to detect Windows printers:', err);
    } finally {
      setIsDetectingPrinters(false);
    }
  };

  const handlePrint = async () => {
    setIsPrinting(true);
    setPrintStatus({ type: 'idle' });

    try {
      const electronPos = (window as any).electronPos;

      // 1. Electron Desktop Native Print Spooler Integration
      if (electronPos?.printReceiptHtml) {
        // Generate pristine UTF-8 HTML with arabic typography and exact width styling
        const receiptHtml = generateThermalReceiptHtml(
          order,
          payment || null,
          settings,
          paperSize
        );

        const result = await electronPos.printReceiptHtml({
          html: receiptHtml,
          deviceName: selectedPrinter || undefined,
          paperSize,
          silent: silentMode,
        });

        if (result.success) {
          setPrintStatus({
            type: 'success',
            message: `تم إرسال أمر الطباعة بنجاح إلى الطابعة (${
              selectedPrinter || 'الطابعة الافتراضية'
            }) عبر Windows Spooler!`,
          });
        } else {
          setPrintStatus({
            type: 'error',
            message:
              result.error ||
              'تعذر إرسال مهمة الطباعة إلى الطابعة. يرجى التأكد من توصيل الطابعة الحرارية أو اختيارها من القائمة.',
          });
        }
      } else {
        // 2. Web browser fallback: trigger standard Windows print dialog
        window.print();
        setPrintStatus({
          type: 'success',
          message: 'تم إرسال الفاتورة إلى نافذة الطباعة بنجاح.',
        });
      }
    } catch (err: any) {
      console.error('Print trigger error:', err);
      setPrintStatus({
        type: 'error',
        message: err.message || 'حدث خطأ غير متوقع أثناء معالجة الطباعة.',
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const widthClass =
    paperSize === '58mm'
      ? 'max-w-[270px] text-[11px]'
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
      <div className="w-full max-w-4xl rounded-2xl bg-[#141419] border border-white/10 shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white flex flex-col max-h-[95vh]">
        {/* Top Header & Settings Toolbar (Hidden when printing) */}
        <div className="px-6 py-4 bg-[#1C1C24] border-b border-white/10 print:hidden space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37]">
                <Printer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>طباعة الفاتورة الحرارية</span>
                  <span className="font-mono text-[#D4AF37]">#{order.orderNumber}</span>
                </h3>
                <p className="text-[11px] text-neutral-400">
                  إرسال مباشر إلى Windows Print Spooler مع دعم كامل للغة العربية RTL
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={isPrinting}
                className="flex items-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-2.5 text-xs font-black text-black hover:bg-[#e5c247] transition-all shadow-lg shadow-[#D4AF37]/20 disabled:opacity-50 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {isPrinting ? 'جاري الإرسال للطابعة...' : `طباعة الفاتورة (${paperSize})`}
                </span>
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-neutral-200 hover:bg-white/15 transition-colors cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </div>

          {/* Windows Printer Selection & Paper Size Row */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/5 text-xs">
            {/* Paper Size selector */}
            <div className="flex items-center gap-2">
              <span className="text-neutral-400 font-medium">مقاس الإيصال:</span>
              {(['58mm', '80mm', 'A4'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setPaperSize(sz)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                    paperSize === sz
                      ? 'bg-[#D4AF37] text-black shadow-sm'
                      : 'bg-white/5 text-neutral-300 hover:bg-white/10'
                  }`}
                >
                  {sz === '58mm'
                    ? '58mm (حراري صغير)'
                    : sz === '80mm'
                    ? '80mm (حراري كاشير قياسي)'
                    : 'A4 (عادي)'}
                </button>
              ))}
            </div>

            {/* Printer Selector */}
            <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
              <span className="text-neutral-400 font-medium whitespace-nowrap">الطابعة:</span>
              {printers.length > 0 ? (
                <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                  <select
                    value={selectedPrinter}
                    onChange={(e) => setSelectedPrinter(e.target.value)}
                    className="w-full bg-[#0B0B0E] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="">(الطابعة الافتراضية لويندوز)</option>
                    {printers.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.displayName || p.name} {p.isDefault ? '⭐ [افتراضية]' : ''}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    title="تحديث قائمة الطابعات"
                    onClick={fetchInstalledPrinters}
                    disabled={isDetectingPrinters}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isDetectingPrinters ? 'animate-spin' : ''}`}
                    />
                  </button>
                </div>
              ) : isElectron ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={fetchInstalledPrinters}
                    className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/15 text-neutral-300 text-xs flex items-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>كشف طابعات Windows</span>
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-neutral-400 bg-white/5 px-2.5 py-1 rounded-lg">
                  وضع المتصفح (مربع حوار النظام)
                </span>
              )}

              {/* Silent print toggle for Electron */}
              {isElectron && (
                <label className="flex items-center gap-1.5 text-neutral-300 cursor-pointer text-[11px] select-none ml-2">
                  <input
                    type="checkbox"
                    checked={silentMode}
                    onChange={(e) => setSilentMode(e.target.checked)}
                    className="accent-[#D4AF37]"
                  />
                  <span>طباعة صامتة ومباشرة</span>
                </label>
              )}
            </div>
          </div>

          {/* Feedback status message */}
          {printStatus.type !== 'idle' && (
            <div
              className={`p-3 rounded-xl text-xs flex items-start gap-2.5 transition-all ${
                printStatus.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
              }`}
            >
              {printStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 font-medium">{printStatus.message}</div>
            </div>
          )}
        </div>

        {/* Printable Receipt Container Area (Visible on screen and rendered to print) */}
        <div className="p-6 flex-1 overflow-y-auto flex justify-center bg-[#0B0B0E] print:bg-white print:p-0 print:overflow-visible">
          <div
            id="printable-receipt-area"
            dir="rtl"
            className={`w-full ${widthClass} bg-white text-black p-5 rounded-md shadow-2xl print:shadow-none print:max-w-full font-sans transition-all`}
          >
            {/* Header */}
            <div className="text-center border-b-2 border-dashed border-black/80 pb-3">
              {settings.showLogo !== false && (
                <div className="mb-2 flex justify-center">
                  {settings.logoUrl && settings.logoUrl.trim().length > 0 ? (
                    <img
                      src={settings.logoUrl}
                      alt="Logo"
                      className="max-h-12 max-w-[180px] object-contain filter grayscale contrast-150"
                    />
                  ) : (
                    <div className="p-1.5 rounded-full border border-black/80 inline-flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-black" />
                    </div>
                  )}
                </div>
              )}
              <h1 className="text-lg font-black tracking-tight">{settings.restaurantName}</h1>
              <p className="font-bold text-xs mt-0.5 text-neutral-900">{settings.brandTitle}</p>
              {settings.receiptHeaderMessage && (
                <p className="text-[10px] font-semibold text-neutral-800 my-1 bg-neutral-100 px-2 py-0.5 rounded leading-tight">
                  {settings.receiptHeaderMessage}
                </p>
              )}
              <p className="text-[11px] text-neutral-800 mt-1">{settings.address}</p>
              {settings.landmark && (
                <p className="text-[11px] text-neutral-700">{settings.landmark}</p>
              )}
              <p className="text-xs font-mono font-bold mt-1 tracking-wider" dir="ltr">
                Tel: {settings.phone}
              </p>

              {/* Tax Block */}
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

            {/* Meta Info */}
            <div className="py-2.5 border-b border-dashed border-black/70 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="font-bold">رقم الفاتورة:</span>
                <span className="font-mono font-black text-sm">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">التاريخ والوقت:</span>
                <span className="font-mono">
                  {dateStr} — {timeStr}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold">نوع الطلب:</span>
                <span className="font-extrabold">
                  {ORDER_TYPE_AR[order.orderType] || order.orderType}
                </span>
              </div>
              {order.tableName && (
                <div className="flex justify-between">
                  <span className="font-bold">الطاولة:</span>
                  <span className="font-black bg-neutral-100 px-1.5 py-0.5 rounded">
                    {order.tableName}
                  </span>
                </div>
              )}
              {order.customerName && (
                <div className="flex justify-between">
                  <span className="font-bold">العميل:</span>
                  <span>
                    {order.customerName} {order.customerPhone ? `(${order.customerPhone})` : ''}
                  </span>
                </div>
              )}
              {order.deliveryAddress && (
                <div className="flex justify-between">
                  <span className="font-bold">العنوان:</span>
                  <span>{order.deliveryAddress}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="font-bold">الكاشير:</span>
                <span>{payment?.cashierName || order.createdByName}</span>
              </div>
            </div>

            {/* Items Table */}
            <table className="w-full my-2.5 text-right border-collapse">
              <thead>
                <tr className="border-b-2 border-black text-[11px]">
                  <th className="py-1 font-black">الصنف</th>
                  <th className="py-1 text-center font-black">الكمية</th>
                  <th className="py-1 text-left font-black">السعر</th>
                  <th className="py-1 text-left font-black">الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dashed divide-black/30">
                {order.items.map((item) => (
                  <tr key={item.id} className="align-top">
                    <td className="py-1.5 pr-0.5">
                      <div className="font-bold leading-tight">{item.productNameAr}</div>
                      {item.variantNameAr && (
                        <div className="text-[10px] text-neutral-700">
                          الحجم: {item.variantNameAr}
                        </div>
                      )}
                      {item.addons && item.addons.length > 0 && (
                        <div className="text-[10px] text-neutral-700">
                          إضافات: {item.addons.map((a) => `${a.nameAr} (+${a.price})`).join('، ')}
                        </div>
                      )}
                      {item.notes && (
                        <div className="text-[10px] italic text-neutral-800">
                          ملاحظة: {item.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-1.5 text-center font-mono font-bold">{item.quantity}</td>
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
                <span className="font-mono font-bold">
                  {order.subtotal.toLocaleString('en-US')} {settings.currency}
                </span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between font-bold">
                  <span>الخصم (Discount):</span>
                  <span className="font-mono">
                    -{order.discountAmount.toLocaleString('en-US')} {settings.currency}
                  </span>
                </div>
              )}
              {order.taxAmount > 0 && (
                <div className="flex justify-between">
                  <span>الضريبة ({settings.taxRatePercent}%):</span>
                  <span className="font-mono font-bold">
                    {order.taxAmount.toLocaleString('en-US')} {settings.currency}
                  </span>
                </div>
              )}
              {order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>رسوم التوصيل:</span>
                  <span className="font-mono font-bold">
                    {order.deliveryFee.toLocaleString('en-US')} {settings.currency}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t-2 border-black pt-1.5 mt-1">
                <span>الإجمالي النهائي (Total):</span>
                <span className="font-mono">
                  {order.totalAmount.toLocaleString('en-US')} {settings.currency}
                </span>
              </div>

              {/* Payment Breakdown */}
              <div className="pt-2 border-t border-dashed border-black/50 space-y-1 text-[11px]">
                {payment && payment.allocations && payment.allocations.length > 0 ? (
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
                      <div className="flex justify-between font-bold border-t border-dashed border-black/40 pt-1">
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
                        ? 'خالص بالكامل (Paid)'
                        : order.paymentStatus === 'PARTIAL'
                        ? `مدفوع جزئيًا (${order.paidAmount} ${settings.currency})`
                        : 'غير مدفوع بعد'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="mt-4 pt-3 border-t-2 border-dashed border-black text-center space-y-1.5">
              {settings.showWifiInfo && (settings.wifiSsid || settings.wifiPassword) && (
                <div className="border border-dashed border-black/60 rounded px-2 py-1 text-[9px] bg-neutral-50 leading-tight">
                  <div className="flex items-center justify-center gap-1 font-bold text-black mb-0.5">
                    <Wifi className="w-2.5 h-2.5" />
                    <span>خدمة واي فاي الزبائن (Wi-Fi)</span>
                  </div>
                  {settings.wifiSsid && (
                    <div>
                      الشبكة: <span className="font-mono font-bold">{settings.wifiSsid}</span>
                    </div>
                  )}
                  {settings.wifiPassword && (
                    <div>
                      الرمز السري: <span className="font-mono font-bold">{settings.wifiPassword}</span>
                    </div>
                  )}
                </div>
              )}

              <p className="font-bold text-xs">{settings.receiptFooterMessage}</p>

              {settings.showReturnPolicy && settings.returnPolicyText && (
                <p className="text-[8px] text-neutral-600 leading-tight italic">
                  {settings.returnPolicyText}
                </p>
              )}

              {settings.showSocialMedia && settings.socialHandle && (
                <p className="text-[9.5px] font-mono font-bold text-black direction-ltr" dir="ltr">
                  {settings.socialHandle}
                </p>
              )}

              {settings.showBarcode !== false && (
                <div className="py-1">
                  <div
                    className="mx-auto h-6 w-44 bg-repeat-x flex items-center justify-center"
                    style={{
                      backgroundImage: `repeating-linear-gradient(90deg, #000 0, #000 2px, transparent 2px, transparent 4px, #000 4px, #000 7px, transparent 7px, transparent 9px)`,
                    }}
                  />
                  <div className="text-[8px] font-mono tracking-widest text-black mt-0.5">
                    *{order.orderNumber}*
                  </div>
                </div>
              )}

              {settings.showQrCode !== false && (
                <div className="flex flex-col items-center justify-center pt-0.5">
                  <div className="p-1 border border-black/80 rounded bg-white">
                    <QrCode className="w-14 h-14 text-black" />
                  </div>
                  <span className="text-[8px] text-neutral-600 mt-0.5">
                    امسح للتحقق الإلكتروني من الفاتورة
                  </span>
                </div>
              )}

              <div className="pt-1.5 border-t border-dotted border-black/40 text-[8px] text-neutral-500 font-mono">
                <div>GOLDEN PALACE POS • HUSSEIN DEY</div>
                <div>طُبعت الفاتورة عبر نظام الكاشير المباشر</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
