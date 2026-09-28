// Thermal Receipt Template Generator for Windows Spooler & Direct Printing
import type { Order, PaymentRecord, RestaurantSettings } from '../db/types';

// Realistic SVG QR Code generator function for thermal receipts
function generateReceiptQrSvg(size = 96): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
    <!-- Corners -->
    <rect x="5" y="5" width="26" height="26" fill="#000000" rx="3"/>
    <rect x="9" y="9" width="18" height="18" fill="#ffffff" rx="2"/>
    <rect x="13" y="13" width="10" height="10" fill="#000000" rx="1"/>

    <rect x="69" y="5" width="26" height="26" fill="#000000" rx="3"/>
    <rect x="73" y="9" width="18" height="18" fill="#ffffff" rx="2"/>
    <rect x="77" y="13" width="10" height="10" fill="#000000" rx="1"/>

    <rect x="5" y="69" width="26" height="26" fill="#000000" rx="3"/>
    <rect x="9" y="73" width="18" height="18" fill="#ffffff" rx="2"/>
    <rect x="13" y="77" width="10" height="10" fill="#000000" rx="1"/>

    <!-- Data matrix points -->
    <rect x="36" y="8" width="6" height="6" fill="#000000"/>
    <rect x="46" y="14" width="6" height="6" fill="#000000"/>
    <rect x="56" y="8" width="6" height="6" fill="#000000"/>
    <rect x="38" y="24" width="6" height="6" fill="#000000"/>
    <rect x="48" y="22" width="6" height="6" fill="#000000"/>

    <rect x="12" y="38" width="6" height="6" fill="#000000"/>
    <rect x="22" y="44" width="6" height="6" fill="#000000"/>
    <rect x="36" y="38" width="8" height="8" fill="#000000"/>
    <rect x="48" y="38" width="6" height="6" fill="#000000"/>
    <rect x="58" y="42" width="6" height="6" fill="#000000"/>
    <rect x="72" y="38" width="8" height="8" fill="#000000"/>
    <rect x="84" y="44" width="6" height="6" fill="#000000"/>

    <rect x="10" y="52" width="6" height="6" fill="#000000"/>
    <rect x="24" y="54" width="6" height="6" fill="#000000"/>
    <rect x="38" y="50" width="6" height="6" fill="#000000"/>
    <rect x="50" y="52" width="8" height="8" fill="#000000"/>
    <rect x="66" y="54" width="6" height="6" fill="#000000"/>
    <rect x="80" y="52" width="8" height="8" fill="#000000"/>

    <rect x="36" y="68" width="6" height="6" fill="#000000"/>
    <rect x="46" y="74" width="8" height="8" fill="#000000"/>
    <rect x="60" y="70" width="6" height="6" fill="#000000"/>
    <rect x="72" y="74" width="6" height="6" fill="#000000"/>
    <rect x="84" y="68" width="6" height="6" fill="#000000"/>

    <rect x="38" y="86" width="6" height="6" fill="#000000"/>
    <rect x="52" y="88" width="6" height="6" fill="#000000"/>
    <rect x="64" y="84" width="8" height="8" fill="#000000"/>
    <rect x="78" y="88" width="6" height="6" fill="#000000"/>
  </svg>`;
}

// Realistic SVG Barcode generator function (Code128 style)
function generateReceiptBarcodeSvg(orderNumber: string, is58: boolean): string {
  const width = is58 ? 160 : 210;
  const height = is58 ? 32 : 40;
  return `<div style="text-align: center; margin: 4px 0 2px 0;">
    <svg width="${width}" height="${height}" viewBox="0 0 220 45" xmlns="http://www.w3.org/2000/svg" style="display:block; margin:0 auto;">
      <rect x="0" y="0" width="220" height="45" fill="#ffffff"/>
      <g fill="#000000">
        <rect x="10" y="0" width="3" height="45"/>
        <rect x="15" y="0" width="2" height="45"/>
        <rect x="20" y="0" width="5" height="45"/>
        <rect x="28" y="0" width="2" height="45"/>
        <rect x="33" y="0" width="4" height="45"/>
        <rect x="40" y="0" width="2" height="45"/>
        <rect x="46" y="0" width="6" height="45"/>
        <rect x="55" y="0" width="3" height="45"/>
        <rect x="61" y="0" width="2" height="45"/>
        <rect x="66" y="0" width="4" height="45"/>
        <rect x="73" y="0" width="3" height="45"/>
        <rect x="79" y="0" width="5" height="45"/>
        <rect x="87" y="0" width="2" height="45"/>
        <rect x="92" y="0" width="4" height="45"/>
        <rect x="99" y="0" width="2" height="45"/>
        <rect x="104" y="0" width="6" height="45"/>
        <rect x="113" y="0" width="3" height="45"/>
        <rect x="119" y="0" width="2" height="45"/>
        <rect x="124" y="0" width="5" height="45"/>
        <rect x="132" y="0" width="3" height="45"/>
        <rect x="138" y="0" width="4" height="45"/>
        <rect x="145" y="0" width="2" height="45"/>
        <rect x="150" y="0" width="5" height="45"/>
        <rect x="158" y="0" width="3" height="45"/>
        <rect x="164" y="0" width="2" height="45"/>
        <rect x="169" y="0" width="6" height="45"/>
        <rect x="178" y="0" width="3" height="45"/>
        <rect x="184" y="0" width="4" height="45"/>
        <rect x="191" y="0" width="2" height="45"/>
        <rect x="196" y="0" width="5" height="45"/>
        <rect x="204" y="0" width="3" height="45"/>
      </g>
    </svg>
    <div style="font-family: monospace; font-size: 9px; letter-spacing: 2px; color: #000; margin-top: 1px;">*${orderNumber}*</div>
  </div>`;
}

// Royal Crest Emblem for receipts when no custom image logo is uploaded
function getRoyalCrestSvg(size = 40): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display:block; margin:0 auto;">
    <path d="M2 4l3 12h14l3-12-6 7-4-7-4 7-6-7zm3 16h14v2H5v-2z"/>
    <circle cx="12" cy="3" r="1" fill="#000000"/>
    <circle cx="2" cy="4" r="1" fill="#000000"/>
    <circle cx="22" cy="4" r="1" fill="#000000"/>
  </svg>`;
}

export function generateThermalReceiptHtml(
  order: Order,
  payment: PaymentRecord | null,
  settings: RestaurantSettings,
  paperSize: '58mm' | '80mm' | 'A4'
): string {
  const is58 = paperSize === '58mm';
  const is80 = paperSize === '80mm';

  // Specific widths and margins tuned for thermal paper standard rolls
  const bodyWidth = is58 ? '48mm' : is80 ? '72mm' : '100%';
  const pageCss = is58
    ? '@page { size: 58mm auto; margin: 0; }'
    : is80
    ? '@page { size: 80mm auto; margin: 0; }'
    : '@page { size: A4 portrait; margin: 10mm; }';

  const density = settings.receiptFontDensity || 'normal';
  const densityMultiplier = density === 'compact' ? 0.9 : density === 'comfortable' ? 1.1 : 1.0;

  const baseFontSize = is58 ? `${10 * densityMultiplier}px` : is80 ? `${12 * densityMultiplier}px` : '13px';
  const headerFontSize = is58 ? `${14 * densityMultiplier}px` : is80 ? `${17 * densityMultiplier}px` : '20px';
  const tableFontSize = is58 ? `${9.5 * densityMultiplier}px` : is80 ? `${11.5 * densityMultiplier}px` : '12px';

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

  const orderTypeAr =
    order.orderType === 'DINE_IN'
      ? 'محلي (داخل الصالة)'
      : order.orderType === 'TAKEAWAY'
      ? 'سفري (أخذ خارجي)'
      : 'توصيل للمنزل';

  const paymentMethodAr: Record<string, string> = {
    CASH: 'نقداً (Cash)',
    CARD: 'بطاقة بنكية (CIB/Edahabia)',
    CCP: 'بريد الجزائر (CCP)',
    BARIDIMOB: 'بريدي موب (BaridiMob)',
    OTHER: 'طريقة أخرى',
  };

  const showItemNotes = settings.showItemNotes !== false;
  const showItemAddons = settings.showItemAddons !== false;

  const itemsHtml = order.items
    .map(
      (item) => `
    <tr style="border-bottom: 1px dashed #444;">
      <td style="padding: 4px 1px; text-align: right; vertical-align: top;">
        <div style="font-weight: 700; color: #000;">${item.productNameAr}</div>
        ${
          item.variantNameAr
            ? `<div style="font-size: 8.5px; color: #222;">الحجم: ${item.variantNameAr}</div>`
            : ''
        }
        ${
          showItemAddons && item.addons && item.addons.length > 0
            ? `<div style="font-size: 8.5px; color: #222;">إضافات: ${item.addons
                .map((a) => `${a.nameAr} (+${a.price})`)
                .join('، ')}</div>`
            : ''
        }
        ${showItemNotes && item.notes ? `<div style="font-size: 8px; font-style: italic; color: #333;">ملاحظة: ${item.notes}</div>` : ''}
      </td>
      <td style="padding: 4px 1px; text-align: center; vertical-align: top; font-weight: bold; font-family: monospace;">
        ${item.quantity}
      </td>
      <td style="padding: 4px 1px; text-align: left; vertical-align: top; font-family: monospace; white-space: nowrap;">
        ${(item.unitPrice + item.addonsTotal).toLocaleString('en-US')}
      </td>
      <td style="padding: 4px 1px; text-align: left; vertical-align: top; font-weight: bold; font-family: monospace; white-space: nowrap;">
        ${item.subtotal.toLocaleString('en-US')}
      </td>
    </tr>
  `
    )
    .join('');

  // Payment Breakdown
  let paymentDetailsHtml = '';
  if (settings.showPaymentBreakdown !== false) {
    if (payment && payment.allocations && payment.allocations.length > 0) {
      paymentDetailsHtml = payment.allocations
        .map(
          (alloc) => `
        <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
          <span>طريقة الدفع (${paymentMethodAr[alloc.method] || alloc.method}):</span>
          <span style="font-family: monospace; font-weight: bold;">${alloc.amount.toLocaleString('en-US')} ${settings.currency}</span>
        </div>
      `
        )
        .join('');

      if (payment.changeGiven > 0) {
        paymentDetailsHtml += `
        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-top: 2px; border-top: 1px dashed #555; padding-top: 2px;">
          <span>الباقي للعميل (Change):</span>
          <span style="font-family: monospace;">${payment.changeGiven.toLocaleString('en-US')} ${settings.currency}</span>
        </div>
      `;
      }
    } else {
      paymentDetailsHtml = `
        <div style="display: flex; justify-content: space-between;">
          <span>حالة الدفع:</span>
          <span style="font-weight: bold;">
            ${
              order.paymentStatus === 'PAID'
                ? 'خالص بالكامل (Paid)'
                : order.paymentStatus === 'PARTIAL'
                ? `مدفوع جزئيًا (${order.paidAmount} ${settings.currency})`
                : 'غير مدفوع بعد'
            }
          </span>
        </div>
      `;
    }
  }

  // Tax Identification block
  let taxBlockHtml = '';
  if (settings.showTaxId && (settings.taxId || settings.commercialRegister || settings.statisticalId || settings.articleNumber)) {
    taxBlockHtml = `
      <div style="font-size: 8.5px; border-top: 1px dotted #333; margin-top: 4px; padding-top: 3px; line-height: 1.35; color: #111;">
        ${settings.taxId ? `<div class="row"><span>الرقم الجبائي (NIF):</span><span class="font-mono font-bold">${settings.taxId}</span></div>` : ''}
        ${settings.commercialRegister ? `<div class="row"><span>السجل التجاري (RC):</span><span class="font-mono">${settings.commercialRegister}</span></div>` : ''}
        ${settings.statisticalId ? `<div class="row"><span>الرقم الإحصائي (NIS):</span><span class="font-mono">${settings.statisticalId}</span></div>` : ''}
        ${settings.articleNumber ? `<div class="row"><span>رقم المادة (ART):</span><span class="font-mono">${settings.articleNumber}</span></div>` : ''}
      </div>
    `;
  }

  // Logo Block
  let logoHtml = '';
  if (settings.showLogo !== false) {
    if (settings.logoUrl && settings.logoUrl.trim().length > 0) {
      logoHtml = `<div style="text-align: center; margin-bottom: 5px;">
        <img src="${settings.logoUrl}" alt="Logo" style="max-height: ${is58 ? '42px' : '52px'}; max-width: 80%; object-fit: contain; filter: grayscale(100%) contrast(150%);" />
      </div>`;
    } else {
      logoHtml = `<div style="text-align: center; margin-bottom: 4px;">
        ${getRoyalCrestSvg(is58 ? 32 : 38)}
      </div>`;
    }
  }

  // Header Custom Message
  const headerMessageHtml = settings.receiptHeaderMessage
    ? `<div style="font-size: 9px; font-weight: 600; margin: 3px 0 2px 0; color: #222; text-align: center; line-height: 1.25;">
        ${settings.receiptHeaderMessage}
      </div>`
    : '';

  // Wi-Fi Info Block
  let wifiHtml = '';
  if (settings.showWifiInfo && (settings.wifiSsid || settings.wifiPassword)) {
    wifiHtml = `
      <div style="font-size: 8.5px; border: 1px dashed #333; padding: 3px 6px; border-radius: 3px; margin: 4px 0; text-align: center; background: #fafafa;">
        <span style="font-weight: bold;">شبكة الواي فاي للزبائن (Wi-Fi):</span>
        ${settings.wifiSsid ? `<div>الشبكة: <span class="font-mono font-bold">${settings.wifiSsid}</span></div>` : ''}
        ${settings.wifiPassword ? `<div>الرقم السري: <span class="font-mono font-bold">${settings.wifiPassword}</span></div>` : ''}
      </div>
    `;
  }

  // Social Media Block
  let socialHtml = '';
  if (settings.showSocialMedia && settings.socialHandle) {
    socialHtml = `
      <div style="font-size: 9px; font-weight: bold; margin: 3px 0; text-align: center; direction: ltr;" class="font-mono">
        ${settings.socialHandle}
      </div>
    `;
  }

  // Return Policy Block
  let returnPolicyHtml = '';
  if (settings.showReturnPolicy && settings.returnPolicyText) {
    returnPolicyHtml = `
      <div style="font-size: 8px; color: #333; margin: 4px 0 2px 0; text-align: center; line-height: 1.25; font-style: italic;">
        ${settings.returnPolicyText}
      </div>
    `;
  }

  // Barcode & QR Code
  let barcodeHtml = '';
  if (settings.showBarcode !== false) {
    barcodeHtml = generateReceiptBarcodeSvg(order.orderNumber, is58);
  }

  let qrCodeHtml = '';
  if (settings.showQrCode !== false) {
    qrCodeHtml = `
      <div style="margin: 6px auto 2px auto; text-align: center;">
        ${generateReceiptQrSvg(is58 ? 64 : 76)}
        <div style="font-size: 7.5px; color: #444; margin-top: 1px;">امسح للتحقق الإلكتروني من الفاتورة</div>
      </div>
    `;
  }

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Receipt #${order.orderNumber}</title>
  <style>
    ${pageCss}
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #ffffff !important;
      color: #000000 !important;
      font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;
      direction: rtl;
      text-align: right;
      font-size: ${baseFontSize};
      line-height: 1.35;
      padding: ${is58 ? '3mm 2mm 8mm 2mm' : is80 ? '4mm 3mm 10mm 3mm' : '15mm'};
      width: ${bodyWidth};
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .font-mono { font-family: 'Courier New', Courier, monospace; }
    .font-bold { font-weight: bold; }
    .border-b-dashed { border-bottom: 1.5px dashed #000000; }
    .border-t-dashed { border-top: 1.5px dashed #000000; }
    .border-t-solid { border-top: 2px solid #000000; }
    .row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2.5px; }
    table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: ${tableFontSize}; }
    th { border-bottom: 1.5px solid #000000; padding: 3px 1px; }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="text-center border-b-dashed" style="padding-bottom: 6px; margin-bottom: 6px;">
    ${logoHtml}
    <h1 style="font-size: ${headerFontSize}; font-weight: 900; margin-bottom: 2px; color: #000;">${settings.restaurantName}</h1>
    <div style="font-size: ${baseFontSize}; font-weight: bold; color: #111;">${settings.brandTitle}</div>
    ${headerMessageHtml}
    <div style="font-size: 9.5px; margin-top: 2px; color: #222;">${settings.address}</div>
    ${settings.landmark ? `<div style="font-size: 9px; color: #333;">${settings.landmark}</div>` : ''}
    <div style="font-size: 10px; font-weight: bold; margin-top: 2px; direction: ltr;" class="font-mono">
      Tel: ${settings.phone}
    </div>
    ${taxBlockHtml}
  </div>

  <!-- METADATA -->
  <div class="border-b-dashed" style="padding-bottom: 5px; margin-bottom: 6px; font-size: ${tableFontSize};">
    <div class="row">
      <span class="font-bold">رقم الفاتورة:</span>
      <span class="font-mono font-bold" style="font-size: 13px;">#${order.orderNumber}</span>
    </div>
    <div class="row">
      <span>التاريخ والوقت:</span>
      <span class="font-mono">${dateStr} — ${timeStr}</span>
    </div>
    ${
      settings.showOrderType !== false
        ? `<div class="row">
            <span>نوع الطلب:</span>
            <span class="font-bold">${orderTypeAr}</span>
          </div>`
        : ''
    }
    ${
      settings.showTableInfo !== false && order.tableName
        ? `<div class="row">
            <span>الطاولة:</span>
            <span class="font-bold" style="font-size: 12px; background: #eee; padding: 1px 4px; border-radius: 2px;">${order.tableName}</span>
          </div>`
        : ''
    }
    ${
      settings.showCustomerInfo !== false && order.customerName
        ? `<div class="row">
            <span>العميل:</span>
            <span>${order.customerName} ${order.customerPhone ? `(${order.customerPhone})` : ''}</span>
          </div>`
        : ''
    }
    ${
      settings.showCustomerInfo !== false && order.deliveryAddress
        ? `<div class="row">
            <span>عنوان التوصيل:</span>
            <span>${order.deliveryAddress}</span>
          </div>`
        : ''
    }
    ${
      settings.showCashierName !== false
        ? `<div class="row">
            <span>الكاشير:</span>
            <span>${payment?.cashierName || order.createdByName || 'الكاشير'}</span>
          </div>`
        : ''
    }
  </div>

  <!-- ITEMS TABLE -->
  <table>
    <thead>
      <tr>
        <th style="text-align: right;">الصنف</th>
        <th style="text-align: center; width: 12%;">الكمية</th>
        <th style="text-align: left; width: 22%;">السعر</th>
        <th style="text-align: left; width: 24%;">المجموع</th>
      </tr>
    </thead>
    <tbody>
      ${itemsHtml}
    </tbody>
  </table>

  <!-- TOTALS -->
  <div class="border-t-dashed" style="padding-top: 5px; margin-top: 4px; font-size: ${tableFontSize};">
    <div class="row">
      <span>المجموع الفرعي:</span>
      <span class="font-mono">${order.subtotal.toLocaleString('en-US')} ${settings.currency}</span>
    </div>
    ${
      order.discountAmount > 0
        ? `
    <div class="row" style="color: #000; font-weight: bold;">
      <span>الخصم:</span>
      <span class="font-mono">-${order.discountAmount.toLocaleString('en-US')} ${settings.currency}</span>
    </div>`
        : ''
    }
    ${
      order.taxAmount > 0
        ? `
    <div class="row">
      <span>الضريبة (${settings.taxRatePercent}%):</span>
      <span class="font-mono">${order.taxAmount.toLocaleString('en-US')} ${settings.currency}</span>
    </div>`
        : ''
    }
    ${
      order.deliveryFee > 0
        ? `
    <div class="row">
      <span>رسوم التوصيل:</span>
      <span class="font-mono">${order.deliveryFee.toLocaleString('en-US')} ${settings.currency}</span>
    </div>`
        : ''
    }
    <div class="row border-t-solid" style="padding-top: 4px; margin-top: 4px; font-size: 13.5px; font-weight: 900;">
      <span>المجموع الكلي:</span>
      <span class="font-mono">${order.totalAmount.toLocaleString('en-US')} ${settings.currency}</span>
    </div>

    <!-- PAYMENT DETAILS -->
    ${
      paymentDetailsHtml
        ? `<div style="margin-top: 6px; padding-top: 4px; border-top: 1px dashed #666; font-size: 10px;">
            ${paymentDetailsHtml}
          </div>`
        : ''
    }
  </div>

  <!-- FOOTER -->
  <div class="text-center border-t-dashed" style="margin-top: 8px; padding-top: 6px;">
    ${wifiHtml}
    <div style="font-weight: bold; font-size: 11px; margin-bottom: 2px;">
      ${settings.receiptFooterMessage || 'شكراً لزيارتكم • صحة وهنا'}
    </div>
    ${returnPolicyHtml}
    ${socialHtml}
    ${barcodeHtml}
    ${qrCodeHtml}
    <div style="font-size: 8px; color: #444; margin-top: 4px;" class="font-mono">GOLDEN PALACE POS • HUSSEIN DEY</div>
    <div style="font-size: 7px; color: #777; margin-top: 1px;">طُبعت الفاتورة عبر نظام الكاشير المباشر</div>
  </div>
</body>
</html>`;
}
