import React, { useState, useEffect, useRef } from 'react';
import {
  Printer,
  Sliders,
  Image as ImageIcon,
  FileText,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Wifi,
  QrCode,
  Barcode,
  Building,
  DollarSign,
  Phone,
  Sparkles,
  RefreshCw,
  Eye,
  Type,
  ShieldCheck,
  Check,
  Upload,
  Trash2,
} from 'lucide-react';
import { usePos } from '../context/PosContext';
import type { RestaurantSettings } from '../db/types';
import {
  ThermalReceiptPreview,
  SAMPLE_MOCK_ORDER,
  SAMPLE_MOCK_PAYMENT,
} from '../components/ThermalReceiptPreview';
import { generateThermalReceiptHtml } from '../utils/thermalReceiptTemplate';

// Predefined royalty presets for Algerian / Oriental grill restaurants
const LOGO_PRESETS = [
  {
    id: 'gold_crest',
    name: 'التاج الملكي الفاخر (Royal Crest)',
    icon: Sparkles,
    dataUrl: '', // uses vector crest by default
  },
  {
    id: 'grill_skewer',
    name: 'مشاوي وشواء على الجمر',
    icon: FlameIcon,
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>',
  },
  {
    id: 'coffee_dining',
    name: 'ضيافة وفنجان تقليدي',
    icon: CoffeeIcon,
    dataUrl:
      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="1.8"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" y1="2" x2="6" y2="4"/><line x1="10" y1="2" x2="10" y2="4"/><line x1="14" y1="2" x2="14" y2="4"/></svg>',
  },
];

function FlameIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function CoffeeIcon(props: any) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
      <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
      <line x1="6" y1="2" x2="6" y2="4" />
      <line x1="10" y1="2" x2="10" y2="4" />
      <line x1="14" y1="2" x2="14" y2="4" />
    </svg>
  );
}

export const ReceiptConfigPage: React.FC = () => {
  const { settings, apiRequest, refreshAll, addNotification, can } = usePos();

  // Local configuration form state
  const [formConfig, setFormConfig] = useState<RestaurantSettings>(settings);
  const [activeTab, setActiveTab] = useState<'HEADER' | 'TAX' | 'CONTENT' | 'FOOTER' | 'PRINTER'>(
    'HEADER'
  );
  const [previewPaperSize, setPreviewPaperSize] = useState<'58mm' | '80mm'>(
    settings.receiptSize === '58mm' ? '58mm' : '80mm'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isTestPrinting, setIsTestPrinting] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{
    type: 'idle' | 'success' | 'error';
    message?: string;
  }>({ type: 'idle' });

  // Windows system printers
  const [systemPrinters, setSystemPrinters] = useState<
    Array<{ name: string; displayName: string; isDefault: boolean }>
  >([]);
  const [isDetectingPrinters, setIsDetectingPrinters] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync with global settings when loaded
  useEffect(() => {
    setFormConfig(settings);
    if (settings.receiptSize === '58mm') {
      setPreviewPaperSize('58mm');
    }
  }, [settings]);

  // Load system printers from Electron if available
  useEffect(() => {
    fetchInstalledPrinters();
  }, []);

  const fetchInstalledPrinters = async () => {
    const electronPos = (window as any).electronPos;
    if (!electronPos?.getPrinters) return;

    setIsDetectingPrinters(true);
    try {
      const list = await electronPos.getPrinters();
      setSystemPrinters(list);
    } catch (err) {
      console.warn('Could not query system printers:', err);
    } finally {
      setIsDetectingPrinters(false);
    }
  };

  const handleUpdate = <K extends keyof RestaurantSettings>(
    key: K,
    value: RestaurantSettings[K]
  ) => {
    setFormConfig((prev) => ({
      ...prev,
      [key]: value,
    }));
    setSaveStatus({ type: 'idle' });
  };

  // Image Upload handler to convert file to base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addNotification('SYNC_ERROR', 'خطأ في الصورة', 'يرجى اختيار ملف صورة صالح (PNG, JPG, SVG)');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      addNotification('SYNC_ERROR', 'حجم كبير', 'حجم الصورة يجب أن لا يتجاوز 2 ميغابايت لضمان سرعة الطباعة الحرارية');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      handleUpdate('logoUrl', base64);
      handleUpdate('showLogo', true);
      addNotification('INFO', 'تم رفع الشعار', 'تم تحميل شعار المطعم بنجاح وتحديث المعاينة');
    };
    reader.readAsDataURL(file);
  };

  // Save Settings to Backend API
  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveStatus({ type: 'idle' });

    try {
      await apiRequest('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify(formConfig),
      });
      await refreshAll();

      setSaveStatus({
        type: 'success',
        message: 'تم حفظ كافة إعدادات وتخصيصات الفاتورة الحرارية بنجاح!',
      });
      addNotification(
        'INFO',
        'تخصيص الفاتورة',
        'تم تطبيق التعديلات على جميع فواتير الكاشير والطباعة'
      );
    } catch (err: any) {
      console.error('Failed to save receipt settings:', err);
      setSaveStatus({
        type: 'error',
        message: err.message || 'حدث خطأ أثناء حفظ الإعدادات في الخادم',
      });
      addNotification('SYNC_ERROR', 'خطأ في الحفظ', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  // Test Print Execution
  const handleTestPrint = async (size: '58mm' | '80mm') => {
    setIsTestPrinting(true);
    setSaveStatus({ type: 'idle' });

    try {
      const electronPos = (window as any).electronPos;

      // 1. Electron Direct Windows Spooler Native Print
      if (electronPos?.printReceiptHtml) {
        const testHtml = generateThermalReceiptHtml(
          SAMPLE_MOCK_ORDER,
          SAMPLE_MOCK_PAYMENT,
          formConfig,
          size
        );

        const result = await electronPos.printReceiptHtml({
          html: testHtml,
          deviceName: formConfig.printerName || undefined,
          paperSize: size,
          silent: true,
        });

        if (result.success) {
          setSaveStatus({
            type: 'success',
            message: `تم إرسال الفاتورة التجريبية (${size}) بنجاح إلى الطابعة [${
              formConfig.printerName || 'الافتراضية'
            }] عبر Windows Spooler!`,
          });
        } else {
          setSaveStatus({
            type: 'error',
            message:
              result.error ||
              'فشل إرسال أمر الطباعة إلى الطابعة المحددة. يرجى التأكد من تشغيل الطابعة وتوصيل الكابل.',
          });
        }
      } else {
        // 2. Web Browser fallback: render print preview
        window.print();
        setSaveStatus({
          type: 'success',
          message: 'تم فتح نافذة الطباعة التجريبية بنجاح.',
        });
      }
    } catch (err: any) {
      setSaveStatus({
        type: 'error',
        message: err.message || 'خطأ غير متوقع أثناء إرسال الفاتورة التجريبية',
      });
    } finally {
      setIsTestPrinting(false);
    }
  };

  // Reset to Recommended Golden Palace Defaults
  const handleResetDefaults = () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في استعادة الإعدادات النموذجية الافتراضية للفاتورة؟')) {
      return;
    }

    setFormConfig((prev) => ({
      ...prev,
      restaurantName: 'القصر الذهبي',
      brandTitle: 'عند الجيجلي • حسين داي',
      address: 'شارع بلهوشات، حسين داي، الجزائر العاصمة',
      landmark: 'بجانب فندق Oasis ومحطة المترو',
      phone: '0791755614',
      receiptHeaderMessage: 'أهلاً وسهلاً بكم في مطعم القصر الذهبي • مأكولات تقليدية ومشاوي على الجمر',
      receiptFooterMessage: 'شكرًا لزيارتكم لمطعم القصر الذهبي — عند الجيجلي • صحة وهنا!',
      showLogo: true,
      logoUrl: '',
      showTaxId: true,
      taxId: '001916012345678',
      commercialRegister: '16/00-1234567A20',
      statisticalId: '099016123456789',
      articleNumber: '16120034567',
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
      receiptFontDensity: 'normal',
    }));

    setSaveStatus({
      type: 'success',
      message: 'تم استعادة القيم الافتراضية بنجاح. اضغط "حفظ التغييرات" لتثبيتها.',
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12" dir="rtl">
      {/* Top Banner & Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141419] p-6 rounded-2xl border border-white/10 shadow-xl">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] shadow-inner">
            <Printer className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-white">تخصيص الفاتورة الحرارية (Receipt Configuration)</h1>
              <span className="text-[10px] font-mono font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full border border-[#D4AF37]/30">
                58mm & 80mm RTL
              </span>
            </div>
            <p className="text-xs text-neutral-400 mt-1 max-w-2xl leading-relaxed">
              تحكم كامل في رأس وتذييل الفاتورة، شعار المطعم، الأرقام الضريبية (NIF/RC)، نصوص الترحيب، بيانات الواي فاي، والباركود مع معاينة حية ومطابقة لمواصفات طابعات نقاط البيع.
            </p>
          </div>
        </div>

        {/* Global Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="flex items-center gap-2 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-xs font-semibold text-neutral-300 hover:bg-white/10 hover:text-white transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>استعادة الافتراضي</span>
          </button>
          <button
            type="button"
            onClick={() => handleSave()}
            disabled={isSaving}
            className="flex items-center gap-2 rounded-xl bg-[#D4AF37] hover:bg-[#e5c247] text-black px-6 py-2.5 text-xs font-black transition-all shadow-lg shadow-[#D4AF37]/25 disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'جاري الحفظ...' : 'حفظ التغييرات'}</span>
          </button>
        </div>
      </div>

      {/* Status Alert Banner */}
      {saveStatus.type !== 'idle' && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 transition-all ${
            saveStatus.type === 'success'
              ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {saveStatus.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 shrink-0" />
            )}
            <span className="font-bold">{saveStatus.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSaveStatus({ type: 'idle' })}
            className="text-neutral-400 hover:text-white text-xs underline"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* Main Grid: Controls (Left) & Real-time Live Thermal Preview (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Configuration Controls (Tabs & Forms) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Sub Navigation Tabs */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-xl bg-[#141419] border border-white/10">
            {[
              { id: 'HEADER', label: 'رأس الفاتورة والشعار', icon: ImageIcon },
              { id: 'TAX', label: 'البيانات الضريبية (NIF/RC)', icon: Building },
              { id: 'CONTENT', label: 'محتوى وبنود الفاتورة', icon: Sliders },
              { id: 'FOOTER', label: 'تذييل الفاتورة والباركود', icon: FileText },
              { id: 'PRINTER', label: 'إعدادات الطابعة والورق', icon: Printer },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#D4AF37] text-black shadow-sm'
                      : 'text-neutral-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* Form Content Cards */}
          <div className="rounded-2xl bg-[#141419] border border-white/10 p-6 space-y-6 shadow-xl">
            {/* TAB 1: HEADER & LOGO CUSTOMIZATION */}
            {activeTab === 'HEADER' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                    <span>تخصيص الشعار والرأس (Logo & Header)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    حدد صورة الشعار واسم المنشأة الذي يظهر في أعلى الوصل الحراري.
                  </p>
                </div>

                {/* Logo Uploader & Presets */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-2">
                      <span>إظهار الشعار في أعلى الإيصال</span>
                    </label>
                    <input
                      type="checkbox"
                      checked={formConfig.showLogo !== false}
                      onChange={(e) => handleUpdate('showLogo', e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                    />
                  </div>

                  {formConfig.showLogo !== false && (
                    <div className="space-y-4 pt-2 border-t border-white/5">
                      {/* Logo Preview & Custom Upload */}
                      <div className="flex flex-wrap items-center gap-4">
                        <div className="w-20 h-20 rounded-xl bg-white p-2 flex items-center justify-center border border-white/20 shadow-md">
                          {formConfig.logoUrl ? (
                            <img
                              src={formConfig.logoUrl}
                              alt="Uploaded logo"
                              className="max-h-full max-w-full object-contain filter grayscale contrast-150"
                            />
                          ) : (
                            <Sparkles className="w-8 h-8 text-black" />
                          )}
                        </div>

                        <div className="space-y-2 flex-1">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                          <div className="flex flex-wrap items-center gap-2">
                            <button
                              type="button"
                              onClick={() => fileInputRef.current?.click()}
                              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>رفع شعار خاص (PNG / JPG / SVG)</span>
                            </button>
                            {formConfig.logoUrl && (
                              <button
                                type="button"
                                onClick={() => handleUpdate('logoUrl', '')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 text-xs font-semibold transition-all cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>إزالة الشعار الخاص</span>
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] text-neutral-400">
                            يُفضل استخدام صورة أحادية اللون بخلفية شفافة أو بيضاء لدقة وضوح ممتازة على الورق الحراري.
                          </p>
                        </div>
                      </div>

                      {/* Presets Selection */}
                      <div>
                        <span className="text-[11px] text-neutral-400 block mb-2 font-medium">
                          أو اختر أحد النماذج الجاهزة:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {LOGO_PRESETS.map((preset) => {
                            const Icon = preset.icon;
                            const isSelected = formConfig.logoUrl === preset.dataUrl;
                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleUpdate('logoUrl', preset.dataUrl)}
                                className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-right text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                                    : 'bg-black/20 border-white/10 text-neutral-300 hover:bg-white/5'
                                }`}
                              >
                                <Icon className="w-4 h-4 text-[#D4AF37] shrink-0" />
                                <span className="truncate">{preset.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Restaurant Identity Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      اسم المطعم / المنشأة الرئيسي
                    </label>
                    <input
                      type="text"
                      value={formConfig.restaurantName || ''}
                      onChange={(e) => handleUpdate('restaurantName', e.target.value)}
                      placeholder="مثال: القصر الذهبي"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      العنوان الفرعي / البراند
                    </label>
                    <input
                      type="text"
                      value={formConfig.brandTitle || ''}
                      onChange={(e) => handleUpdate('brandTitle', e.target.value)}
                      placeholder="مثال: عند الجيجلي • مشاوي ومأكولات فاخرة"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Custom Greeting Note */}
                <div>
                  <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                    رسالة الترحيب العلوية (Header Greeting)
                  </label>
                  <input
                    type="text"
                    value={formConfig.receiptHeaderMessage || ''}
                    onChange={(e) => handleUpdate('receiptHeaderMessage', e.target.value)}
                    placeholder="مثال: أهلاً وسهلاً بكم في مطعم القصر الذهبي • مأكولات تقليدية ومشاوي على الجمر"
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                  <span className="text-[11px] text-neutral-500 mt-1 block">
                    تظهر مباشرة تحت اسم المطعم للترحيب بالزبائن أو التنويه بنوع الخدمة.
                  </span>
                </div>

                {/* Address & Contacts */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      العنوان والفرع
                    </label>
                    <input
                      type="text"
                      value={formConfig.address || ''}
                      onChange={(e) => handleUpdate('address', e.target.value)}
                      placeholder="مثال: شارع بلهوشات، حسين داي، الجزائر"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      نقطة العلام (Landmark)
                    </label>
                    <input
                      type="text"
                      value={formConfig.landmark || ''}
                      onChange={(e) => handleUpdate('landmark', e.target.value)}
                      placeholder="مثال: بجانب فندق Oasis ومحطة المترو"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                    أرقام الهواتف والطلبات
                  </label>
                  <input
                    type="text"
                    value={formConfig.phone || ''}
                    onChange={(e) => handleUpdate('phone', e.target.value)}
                    placeholder="مثال: 0791755614 / 023 77 88 99"
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* TAB 2: TAX & COMMERCIAL IDENTIFICATION */}
            {activeTab === 'TAX' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#D4AF37]" />
                    <span>البيانات الضريبية والتجارية (Tax & Legal Identification)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    إضافة البيانات القانونية الرسمية للفواتير الضريبية المعتمدة في الجزائر (NIF / RC / NIS / ART).
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">
                      إظهار البيانات الضريبية على الفاتورة الحرارية
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      طباعة أرقام NIF و RC بشكل مدمج في ترويسة الفاتورة
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formConfig.showTaxId !== false}
                    onChange={(e) => handleUpdate('showTaxId', e.target.checked)}
                    className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      الرقم التعريفي الجبائي (NIF)
                    </label>
                    <input
                      type="text"
                      value={formConfig.taxId || ''}
                      onChange={(e) => handleUpdate('taxId', e.target.value)}
                      placeholder="مثال: 001916012345678"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      رقم السجل التجاري (RC)
                    </label>
                    <input
                      type="text"
                      value={formConfig.commercialRegister || ''}
                      onChange={(e) => handleUpdate('commercialRegister', e.target.value)}
                      placeholder="مثال: 16/00-1234567A20"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      الرقم التعريفي الإحصائي (NIS)
                    </label>
                    <input
                      type="text"
                      value={formConfig.statisticalId || ''}
                      onChange={(e) => handleUpdate('statisticalId', e.target.value)}
                      placeholder="مثال: 099016123456789"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                      رقم المادة الضريبية (ART)
                    </label>
                    <input
                      type="text"
                      value={formConfig.articleNumber || ''}
                      onChange={(e) => handleUpdate('articleNumber', e.target.value)}
                      placeholder="مثال: 16120034567"
                      className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Tax Rate setting shortcut */}
                <div className="p-4 rounded-xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-[#F3E5AB]">
                      حساب وتطبيق ضريبة القيمة المضافة (TVA)
                    </div>
                    <div className="text-[11px] text-neutral-300 mt-0.5">
                      تفعيل الحساب التلقائي للضريبة ({formConfig.taxRatePercent || 9}%) في مجموع الفاتورة
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={formConfig.taxRatePercent || 9}
                      onChange={(e) => handleUpdate('taxRatePercent', Number(e.target.value))}
                      className="w-20 rounded-lg bg-black/60 border border-white/20 px-2 py-1 text-xs text-white font-mono text-center"
                    />
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formConfig.taxEnabled}
                        onChange={(e) => handleUpdate('taxEnabled', e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37]"
                      />
                      <span>تفعيل</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: CONTENT & RECEIPT BODY */}
            {activeTab === 'CONTENT' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-[#D4AF37]" />
                    <span>محتوى وبنود الإيصال (Receipt Body & Toggles)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    حدد العناصر والتفاصيل التي ترغب في طباعتها أو إخفائها لتوفير ورق الرول الحراري.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    {
                      key: 'showCashierName' as const,
                      label: 'إظهار اسم الكاشير المسؤول',
                      desc: 'طباعة اسم مستخدم نقطة البيع الذي حرر الوصل',
                    },
                    {
                      key: 'showTableInfo' as const,
                      label: 'إظهار الطاولة وموقع الجلوس',
                      desc: 'طباعة اسم ورقم الطاولة للطلبات الداخلية',
                    },
                    {
                      key: 'showOrderType' as const,
                      label: 'إظهار نوع الطلب (محلي / سفري / دليفري)',
                      desc: 'طباعة تصنيف نوع الخدمة بخط بارز',
                    },
                    {
                      key: 'showCustomerInfo' as const,
                      label: 'إظهار اسم وهاتف العميل',
                      desc: 'مفيد لطلبات التوصيل والطلبات المسبقة',
                    },
                    {
                      key: 'showItemAddons' as const,
                      label: 'إظهار الإضافات والصلصات لكل صنف',
                      desc: 'طباعة الإضافات الاختيارية وأسعارها',
                    },
                    {
                      key: 'showItemNotes' as const,
                      label: 'إظهار ملاحظات الزبون لكل صنف',
                      desc: 'طباعة الملاحظات الخاصة (مثال: بدون حار)',
                    },
                    {
                      key: 'showPaymentBreakdown' as const,
                      label: 'تفصيل طرق الدفع ومبلغ الباقي',
                      desc: 'طباعة كم دفع العميل والباقي المرجع',
                    },
                  ].map((item) => (
                    <label
                      key={item.key}
                      className="p-3.5 rounded-xl bg-black/40 border border-white/10 hover:border-white/20 transition-all flex items-start gap-3 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formConfig[item.key] !== false}
                        onChange={(e) => handleUpdate(item.key, e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37] mt-0.5 shrink-0"
                      />
                      <div>
                        <div className="text-xs font-bold text-white">{item.label}</div>
                        <div className="text-[11px] text-neutral-400 mt-0.5">{item.desc}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* Font Density Selector */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                  <label className="text-xs font-bold text-white block">
                    كثافة وحجم نصوص الإيصال (Font Density)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'compact', label: 'مضغوط (توفير الورق)', sub: 'خطوط صغيرة ومسافات دقيقة' },
                      { id: 'normal', label: 'قياسي (موصى به)', sub: 'توازن مثالي للوضوح والقراءة' },
                      { id: 'comfortable', label: 'مريح وبارز', sub: 'خطوط أكبر لكبار السن والزبائن' },
                    ].map((den) => (
                      <button
                        key={den.id}
                        type="button"
                        onClick={() => handleUpdate('receiptFontDensity', den.id as any)}
                        className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                          formConfig.receiptFontDensity === den.id || (!formConfig.receiptFontDensity && den.id === 'normal')
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white'
                            : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{den.label}</div>
                        <div className="text-[10px] text-neutral-400 mt-0.5">{den.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: FOOTER, WI-FI, POLICIES & BARCODES */}
            {activeTab === 'FOOTER' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <FileText className="w-4 h-4 text-[#D4AF37]" />
                    <span>تخصيص تذييل الفاتورة (Receipt Footer & Barcodes)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    إضافة رسائل الشكر، بيانات شبكة الواي فاي للزبائن، الرمز الشريطي والباركود، وسياسات المحل.
                  </p>
                </div>

                {/* Primary Thank You Message */}
                <div>
                  <label className="text-xs text-neutral-300 block mb-1.5 font-bold">
                    رسالة الشكر الرئيسية أسفل الإيصال
                  </label>
                  <textarea
                    rows={2}
                    value={formConfig.receiptFooterMessage || ''}
                    onChange={(e) => handleUpdate('receiptFooterMessage', e.target.value)}
                    placeholder="مثال: شكرًا لزيارتكم لمطعم القصر الذهبي — عند الجيجلي • صحة وهنا! يسعدنا استقبالكم دائمًا"
                    className="w-full rounded-xl bg-black/50 border border-white/15 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {/* Customer Wi-Fi Credentials */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-[#D4AF37]" />
                      <span className="text-xs font-bold text-white">
                        طباعة بيانات شبكة الواي فاي للزبائن
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={formConfig.showWifiInfo !== false}
                      onChange={(e) => handleUpdate('showWifiInfo', e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                    />
                  </div>

                  {formConfig.showWifiInfo !== false && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-white/5">
                      <div>
                        <label className="text-[11px] text-neutral-300 block mb-1">اسم الشبكة (SSID)</label>
                        <input
                          type="text"
                          value={formConfig.wifiSsid || ''}
                          onChange={(e) => handleUpdate('wifiSsid', e.target.value)}
                          placeholder="مثال: GoldenPalace-Guest"
                          className="w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-neutral-300 block mb-1">كلمة المرور (Password)</label>
                        <input
                          type="text"
                          value={formConfig.wifiPassword || ''}
                          onChange={(e) => handleUpdate('wifiPassword', e.target.value)}
                          placeholder="مثال: palace2026"
                          className="w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Social Media Handle */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      طباعة حسابات التواصل الاجتماعي (Social Media)
                    </span>
                    <input
                      type="checkbox"
                      checked={formConfig.showSocialMedia !== false}
                      onChange={(e) => handleUpdate('showSocialMedia', e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                    />
                  </div>
                  {formConfig.showSocialMedia !== false && (
                    <div className="pt-2 border-t border-white/5">
                      <input
                        type="text"
                        value={formConfig.socialHandle || ''}
                        onChange={(e) => handleUpdate('socialHandle', e.target.value)}
                        placeholder="مثال: @goldenpalace.dz • Instagram / Facebook"
                        className="w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-xs text-white font-mono"
                      />
                    </div>
                  )}
                </div>

                {/* Return Policy Text */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">
                      سياسة الإرجاع أو الملاحظات القانونية
                    </span>
                    <input
                      type="checkbox"
                      checked={formConfig.showReturnPolicy !== false}
                      onChange={(e) => handleUpdate('showReturnPolicy', e.target.checked)}
                      className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                    />
                  </div>
                  {formConfig.showReturnPolicy !== false && (
                    <div className="pt-2 border-t border-white/5">
                      <input
                        type="text"
                        value={formConfig.returnPolicyText || ''}
                        onChange={(e) => handleUpdate('returnPolicyText', e.target.value)}
                        placeholder="مثال: المأكولات والمشروبات غير قابلة للإرجاع بعد الاستلام • الرجاء الاحتفاظ بالوصل"
                        className="w-full rounded-lg bg-black/60 border border-white/15 px-3 py-2 text-xs text-white"
                      />
                    </div>
                  )}
                </div>

                {/* Barcode & QR Code Toggles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Barcode className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-bold text-white">رمز الباركود الشريطي</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formConfig.showBarcode !== false}
                        onChange={(e) => handleUpdate('showBarcode', e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      طباعة باركود Code128 يحمل رقم الفاتورة لسرعة مسحه بجهاز الباركود عند الاسترجاع أو المراجعة.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-[#D4AF37]" />
                        <span className="text-xs font-bold text-white">رمز الاستجابة السريع (QR Code)</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={formConfig.showQrCode !== false}
                        onChange={(e) => handleUpdate('showQrCode', e.target.checked)}
                        className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                      />
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      طباعة QR Code للتحقق الإلكتروني من الفاتورة أو توجيه الزبون لصفحة تقييم الخدمة.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: PRINTER & HARDWARE SETTINGS */}
            {activeTab === 'PRINTER' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Printer className="w-4 h-4 text-[#D4AF37]" />
                    <span>إعدادات الطابعة والورق (Printer & Hardware Settings)</span>
                  </h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    ربط الطابعة الحرارية وتحديد حجم الرول الافتراضي (58mm أو 80mm).
                  </p>
                </div>

                {/* Default Paper Size */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <label className="text-xs font-bold text-white block">
                    مقاس الورق الافتراضي لنظام الكاشير
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        size: '80mm' as const,
                        title: '80mm (قياسي لمطاعم الكاشير)',
                        desc: 'أفضل عرض للفواتير المفصلة، الجداول، وطابعات EPSON/Xprinter',
                      },
                      {
                        size: '58mm' as const,
                        title: '58mm (حراري مدمج وصغير)',
                        desc: 'مناسب للطابعات المتنقلة البلوتوث والرولات الاقتصادية',
                      },
                      {
                        size: 'A4' as const,
                        title: 'A4 (ورق مكتبي عادي)',
                        desc: 'للفواتير الضريبية الكبيرة والمطالبات المؤسساتية',
                      },
                    ].map((opt) => (
                      <button
                        key={opt.size}
                        type="button"
                        onClick={() => {
                          handleUpdate('receiptSize', opt.size);
                          if (opt.size === '58mm' || opt.size === '80mm') {
                            setPreviewPaperSize(opt.size);
                          }
                        }}
                        className={`p-3.5 rounded-xl border text-right transition-all cursor-pointer ${
                          formConfig.receiptSize === opt.size
                            ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white shadow-md'
                            : 'bg-black/30 border-white/10 text-neutral-400 hover:text-white'
                        }`}
                      >
                        <div className="text-xs font-bold">{opt.title}</div>
                        <div className="text-[10px] text-neutral-400 mt-1 leading-relaxed">
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Windows Target Printer Selector */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-white block">
                        الطابعة المستهدفة في نظام Windows
                      </label>
                      <span className="text-[11px] text-neutral-400">
                        إرسال مباشر إلى Windows Print Spooler بدون فتح نوافذ منبثقة
                      </span>
                    </div>
                    {systemPrinters.length > 0 && (
                      <button
                        type="button"
                        onClick={fetchInstalledPrinters}
                        disabled={isDetectingPrinters}
                        className="text-xs text-[#D4AF37] hover:underline flex items-center gap-1 cursor-pointer"
                      >
                        <RefreshCw className={`w-3 h-3 ${isDetectingPrinters ? 'animate-spin' : ''}`} />
                        <span>تحديث الطابعات</span>
                      </button>
                    )}
                  </div>

                  {systemPrinters.length > 0 ? (
                    <select
                      value={formConfig.printerName || ''}
                      onChange={(e) => handleUpdate('printerName', e.target.value)}
                      className="w-full rounded-xl bg-black/60 border border-white/20 px-3.5 py-2.5 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="">(طابعة النظام الافتراضية لويندوز)</option>
                      {systemPrinters.map((p) => (
                        <option key={p.name} value={p.name}>
                          {p.displayName || p.name} {p.isDefault ? '⭐ [افتراضية النظام]' : ''}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={formConfig.printerName || ''}
                        onChange={(e) => handleUpdate('printerName', e.target.value)}
                        placeholder="مثال: POS-80C أو XP-58 أو اتركها فارغة للافتراضية"
                        className="w-full rounded-xl bg-black/60 border border-white/20 px-3.5 py-2.5 text-xs text-white font-mono focus:border-[#D4AF37] focus:outline-none"
                      />
                      <p className="text-[11px] text-neutral-400">
                        في بيئة Electron سيتم اكتشاف طابعات Windows تلقائيًا عند تشغيل التطبيق.
                      </p>
                    </div>
                  )}
                </div>

                {/* Auto-print toggle */}
                <div className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-bold text-white">الطباعة التلقائية فور الدفع</div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      إخراج الفاتورة الحرارية مباشرة عند استلام المبلغ وإغلاق الفاتورة
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formConfig.autoPrintReceipt}
                    onChange={(e) => handleUpdate('autoPrintReceipt', e.target.checked)}
                    className="w-4 h-4 accent-[#D4AF37] cursor-pointer"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Interactive Live Preview (Sticky on desktop) */}
        <div className="lg:col-span-5 sticky top-20">
          <div className="rounded-2xl bg-[#141419] border border-white/10 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#D4AF37]" />
                <h3 className="text-sm font-bold text-white">معاينة الفاتورة الحية (Live Preview)</h3>
              </div>
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                تحديث فوري RTL
              </span>
            </div>

            {/* Embedded Live Preview Component */}
            <div className="bg-[#0B0B0E] p-3 rounded-xl border border-white/5 flex justify-center">
              <ThermalReceiptPreview
                settings={formConfig}
                paperSize={previewPaperSize}
                onPaperSizeChange={setPreviewPaperSize}
                onPrintTest={handleTestPrint}
                isPrinting={isTestPrinting}
              />
            </div>

            {/* Bottom Quick Advice */}
            <div className="text-[11px] text-neutral-400 bg-white/5 p-3 rounded-xl border border-white/5 flex items-start gap-2 leading-relaxed">
              <HelpCircle className="w-4 h-4 text-[#D4AF37] shrink-0 mt-0.5" />
              <span>
                المعاينة أعلاه تمثل المظهر الحقيقي التام للمطبوعات الحرارية على الورق بعرض{' '}
                <strong className="text-white font-mono">{previewPaperSize}</strong> مع كامل التنسيقات والخطوط العربية المتصلة.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ReceiptConfigPage;
