import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftRight,
  Bell,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Merge,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Truck,
  Users,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { usePos } from '../context/PosContext.tsx';
import {
  KitchenStationCode,
  Order,
  OrderStatus,
  RestaurantTable,
  TableStatus,
} from '../db/types.ts';
import { ReceiptPrinterModal } from '../components/ReceiptPrinterModal.tsx';

const TABLE_STATUS_STYLE: Record<
  TableStatus,
  { label: string; badgeBg: string; border: string; dot: string }
> = {
  AVAILABLE: {
    label: 'متاحة',
    badgeBg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    border: 'border-emerald-500/30 hover:border-emerald-400',
    dot: 'bg-emerald-400',
  },
  OCCUPIED: {
    label: 'مشغولة',
    badgeBg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    border: 'border-amber-500/40 hover:border-amber-400',
    dot: 'bg-amber-400',
  },
  RESERVED: {
    label: 'محجوزة',
    badgeBg: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
    border: 'border-sky-500/35 hover:border-sky-400',
    dot: 'bg-sky-400',
  },
  CLEANING: {
    label: 'قيد التنظيف',
    badgeBg: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
    border: 'border-purple-500/35 hover:border-purple-400',
    dot: 'bg-purple-400',
  },
};

const ORDER_STATUS_AR: Record<OrderStatus, { label: string; color: string }> = {
  NEW: { label: 'جديد', color: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  CONFIRMED: { label: 'مؤكد', color: 'bg-blue-500/15 text-blue-300 border-blue-500/30' },
  PREPARING: { label: 'قيد التحضير', color: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  READY: { label: 'جاهز للتقديم', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  OUT_FOR_DELIVERY: { label: 'في الطريق للتوصيل', color: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30' },
  DELIVERED: { label: 'تم التوصيل', color: 'bg-teal-500/15 text-teal-300 border-teal-500/30' },
  COMPLETED: { label: 'مكتمل', color: 'bg-neutral-500/15 text-neutral-300 border-neutral-500/30' },
  CANCELLED: { label: 'ملغى', color: 'bg-red-500/15 text-red-300 border-red-500/30' },
  HELD: { label: 'معلق', color: 'bg-orange-500/15 text-orange-300 border-orange-500/30' },
};

const STATION_NAMES: Record<KitchenStationCode | 'ALL', string> = {
  ALL: 'جميع المحطات',
  MAIN_KITCHEN: 'المطبخ الرئيسي',
  GRILL: 'محطة المشاوي (الجمر)',
  DRINKS: 'محطة المشروبات',
  DESSERT: 'محطة الحلويات',
};

function playKitchenChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12); // A5
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    // ignore audio block
  }
}

// ============================================================================
// 1. TABLES MANAGEMENT VIEW
// ============================================================================

export const TablesView: React.FC<{ onOpenTableInPos: (tableId: string) => void }> = ({
  onOpenTableInPos,
}) => {
  const { tableZones, tables, orders, settings, apiRequest, refreshAll, can, addNotification } = usePos();

  const [selectedZone, setSelectedZone] = useState<string>('ALL');
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showAddTableModal, setShowAddTableModal] = useState(false);
  const [showAddZoneModal, setShowAddZoneModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);

  // Add Table Form
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const [newTableZoneId, setNewTableZoneId] = useState(tableZones[0]?.id || '');
  const [newTableCapacity, setNewTableCapacity] = useState(4);

  // Add Zone Form
  const [newZoneNameAr, setNewZoneNameAr] = useState('');
  const [newZoneNameFr, setNewZoneNameFr] = useState('');

  // Reservation Form
  const [resName, setResName] = useState('');
  const [resTime, setResTime] = useState('20:00');

  // Transfer / Merge Form
  const [targetTableId, setTargetTableId] = useState('');
  const [transferMode, setTransferMode] = useState<'TRANSFER' | 'MERGE'>('TRANSFER');

  // Print modal
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);

  const filteredTables = useMemo(() => {
    if (selectedZone === 'ALL') return tables;
    return tables.filter((t) => t.zoneId === selectedZone);
  }, [tables, selectedZone]);

  const handleUpdateTableStatus = async (
    tableId: string,
    status: TableStatus,
    extra?: { reservationName?: string; reservationTime?: string }
  ) => {
    try {
      await apiRequest(`/api/tables/${tableId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...extra }),
      });
      await refreshAll();
      addNotification('INFO', 'تحديث الطاولة', `تم تغيير حالة الطاولة إلى ${TABLE_STATUS_STYLE[status].label}`);
      setSelectedTable(null);
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'تعذر تحديث الطاولة', err.message);
    }
  };

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTableNumber.trim()) return;
    try {
      await apiRequest('/api/tables', {
        method: 'POST',
        body: JSON.stringify({
          zoneId: newTableZoneId || tableZones[0]?.id,
          number: newTableNumber.trim(),
          nameAr: newTableName.trim() || `طاولة ${newTableNumber.trim()}`,
          capacity: Number(newTableCapacity) || 4,
        }),
      });
      await refreshAll();
      setShowAddTableModal(false);
      setNewTableNumber('');
      setNewTableName('');
      addNotification('INFO', 'إضافة طاولة', 'تمت إضافة الطاولة بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleCreateZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newZoneNameAr.trim()) return;
    try {
      await apiRequest('/api/tables/zones', {
        method: 'POST',
        body: JSON.stringify({ nameAr: newZoneNameAr.trim(), nameFr: newZoneNameFr.trim() }),
      });
      await refreshAll();
      setShowAddZoneModal(false);
      setNewZoneNameAr('');
      setNewZoneNameFr('');
      addNotification('INFO', 'إضافة منطقة', 'تم إنشاء منطقة الطاولات بنجاح');
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ', err.message);
    }
  };

  const handleTransferOrMerge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTable || !targetTableId) return;
    try {
      await apiRequest('/api/tables/transfer-or-merge', {
        method: 'POST',
        body: JSON.stringify({
          sourceTableId: selectedTable.id,
          targetTableId,
          mode: transferMode,
        }),
      });
      await refreshAll();
      setShowTransferModal(false);
      setSelectedTable(null);
      addNotification(
        'INFO',
        transferMode === 'MERGE' ? 'تم دمج الطاولتين' : 'تم نقل الطاولة',
        'تم تحديث الطلبات وحالة الطاولات بنجاح.'
      );
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'تعذر النقل/الدمج', err.message);
    }
  };

  const stats = useMemo(() => {
    return {
      total: tables.length,
      available: tables.filter((t) => t.status === 'AVAILABLE').length,
      occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
      reserved: tables.filter((t) => t.status === 'RESERVED').length,
      cleaning: tables.filter((t) => t.status === 'CLEANING').length,
    };
  }, [tables]);

  return (
    <div className="space-y-6">
      {/* Header & Summary */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Utensils className="w-6 h-6 text-[#D4AF37]" />
            <span>إدارة الطاولات والصالات — القصر الذهبي</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            تتبع مباشر لحالة الطاولات، الحجوزات، نقل الطلبات، ودمج الفواتير
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/40 border border-white/5 text-xs">
            <span className="text-neutral-400">الإجمالي: <strong className="text-white tabular-nums">{stats.total}</strong></span>
            <span className="text-emerald-400">متاحة: <strong className="tabular-nums">{stats.available}</strong></span>
            <span className="text-amber-400">مشغولة: <strong className="tabular-nums">{stats.occupied}</strong></span>
            <span className="text-sky-400">محجوزة: <strong className="tabular-nums">{stats.reserved}</strong></span>
            <span className="text-purple-400">تنظيف: <strong className="tabular-nums">{stats.cleaning}</strong></span>
          </div>

          {can('tables:manage') && (
            <>
              <button
                type="button"
                onClick={() => setShowAddZoneModal(true)}
                className="px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-neutral-200 flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>منطقة جديدة</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setNewTableZoneId(tableZones[0]?.id || '');
                  setShowAddTableModal(true);
                }}
                className="px-3.5 py-2 rounded-lg bg-[#D4AF37] hover:bg-[#c5a030] text-black font-bold text-xs flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>إضافة طاولة</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Zones Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={() => setSelectedZone('ALL')}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border ${
            selectedZone === 'ALL'
              ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
              : 'bg-[#141419] text-neutral-300 border-white/10 hover:border-white/25'
          }`}
        >
          كل الصالات ({tables.length})
        </button>
        {tableZones.map((z) => {
          const count = tables.filter((t) => t.zoneId === z.id).length;
          return (
            <button
              key={z.id}
              type="button"
              onClick={() => setSelectedZone(z.id)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shrink-0 border ${
                selectedZone === z.id
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'bg-[#141419] text-neutral-300 border-white/10 hover:border-white/25'
              }`}
            >
              {z.nameAr} ({count})
            </button>
          );
        })}
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {filteredTables.map((tbl) => {
          const st = TABLE_STATUS_STYLE[tbl.status];
          const activeOrder = tbl.currentOrderId
            ? orders.find((o) => o.id === tbl.currentOrderId)
            : orders.find((o) => o.tableId === tbl.id && o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED');

          return (
            <div
              key={tbl.id}
              onClick={() => {
                setSelectedTable(tbl);
                setResName(tbl.reservationName || '');
                setResTime(tbl.reservationTime || '20:00');
              }}
              className={`group cursor-pointer rounded-xl bg-[#141419] border p-4 transition-all flex flex-col justify-between min-h-[165px] ${st.border}`}
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[11px] text-neutral-400 block">{tbl.zoneNameAr}</span>
                    <h3 className="text-base font-bold text-white mt-0.5">{tbl.nameAr}</h3>
                  </div>
                  <span className={`px-2 py-0.5 rounded-md text-[11px] font-bold border ${st.badgeBg}`}>
                    {st.label}
                  </span>
                </div>

                <div className="mt-3 flex items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1 tabular-nums">
                    <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                    {tbl.capacity} مقاعد
                  </span>
                  <span className="text-neutral-600">•</span>
                  <span className="font-mono text-[11px] text-neutral-300">#{tbl.number}</span>
                </div>

                {tbl.status === 'RESERVED' && tbl.reservationName && (
                  <div className="mt-2.5 p-2 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-200">
                    <div>حجز: {tbl.reservationName}</div>
                    {tbl.reservationTime && <div className="tabular-nums">الموعد: {tbl.reservationTime}</div>}
                  </div>
                )}

                {activeOrder && (
                  <div className="mt-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/25 text-xs">
                    <div className="flex items-center justify-between text-amber-200 font-semibold">
                      <span>#{activeOrder.orderNumber}</span>
                      <span className="tabular-nums">{activeOrder.totalAmount.toLocaleString('en-US')} د.ج</span>
                    </div>
                    <div className="text-[11px] text-neutral-400 mt-0.5">
                      {activeOrder.items.length} أصناف • {ORDER_STATUS_AR[activeOrder.status]?.label}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-3 pt-2.5 border-t border-white/5 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenTableInPos(tbl.id);
                  }}
                  className="text-xs font-bold text-[#D4AF37] hover:underline flex items-center gap-1"
                >
                  <span>فتح في الكاشير</span>
                </button>
                {activeOrder && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrintingOrder(activeOrder);
                    }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300"
                    title="طباعة الفاتورة"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Table Action Modal */}
      {selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl bg-[#141419] border border-[#D4AF37]/30 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <span className="text-xs text-[#D4AF37]">{selectedTable.zoneNameAr}</span>
                <h3 className="text-lg font-bold text-white">
                  {selectedTable.nameAr} (رقم {selectedTable.number})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTable(null)}
                className="p-1.5 rounded-lg bg-white/5 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-neutral-400">تغيير حالة الطاولة السريع:</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'CLEANING'] as TableStatus[]).map((stKey) => (
                  <button
                    key={stKey}
                    type="button"
                    onClick={() =>
                      handleUpdateTableStatus(
                        selectedTable.id,
                        stKey,
                        stKey === 'RESERVED' ? { reservationName: resName || 'ضيف القصر', reservationTime: resTime } : undefined
                      )
                    }
                    className={`py-2.5 px-3 rounded-lg text-xs font-bold border transition-all ${
                      selectedTable.status === stKey
                        ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                        : 'bg-black/40 text-neutral-200 border-white/10 hover:border-white/25'
                    }`}
                  >
                    {TABLE_STATUS_STYLE[stKey].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reservation Details Input */}
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/10 space-y-3">
              <div className="text-xs font-bold text-sky-300">بيانات الحجز (لطاولة محجوزة):</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">اسم صاحب الحجز</label>
                  <input
                    type="text"
                    value={resName}
                    onChange={(e) => setResName(e.target.value)}
                    placeholder="مثال: عائلة بن علي"
                    className="w-full rounded-lg bg-[#141419] border border-white/10 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-neutral-400 block mb-1">وقت الحجز</label>
                  <input
                    type="time"
                    value={resTime}
                    onChange={(e) => setResTime(e.target.value)}
                    className="w-full rounded-lg bg-[#141419] border border-white/10 px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  handleUpdateTableStatus(selectedTable.id, 'RESERVED', {
                    reservationName: resName || 'ضيف القصر',
                    reservationTime: resTime,
                  })
                }
                className="w-full py-2 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 border border-sky-500/40 text-sky-200 text-xs font-bold"
              >
                حفظ وتأكيد الحجز
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => {
                  const id = selectedTable.id;
                  setSelectedTable(null);
                  onOpenTableInPos(id);
                }}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-bold text-xs flex items-center justify-center gap-2"
              >
                <Utensils className="w-4 h-4" />
                <span>طلب جديد / فتح في نقطة البيع</span>
              </button>

              {selectedTable.status === 'OCCUPIED' && (
                <button
                  type="button"
                  onClick={() => {
                    const otherTables = tables.filter((t) => t.id !== selectedTable.id);
                    setTargetTableId(otherTables[0]?.id || '');
                    setShowTransferModal(true);
                  }}
                  className="py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs flex items-center gap-1.5"
                >
                  <ArrowLeftRight className="w-4 h-4 text-[#D4AF37]" />
                  <span>نقل أو دمج الطاولة</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Transfer or Merge Modal */}
      {showTransferModal && selectedTable && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleTransferOrMerge}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/40 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Merge className="w-4 h-4 text-[#D4AF37]" />
                <span>نقل أو دمج {selectedTable.nameAr}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTransferMode('TRANSFER')}
                className={`py-2.5 rounded-lg text-xs font-bold border ${
                  transferMode === 'TRANSFER'
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-black/40 text-neutral-300 border-white/10'
                }`}
              >
                نقل الطلب لطاولة أخرى
              </button>
              <button
                type="button"
                onClick={() => setTransferMode('MERGE')}
                className={`py-2.5 rounded-lg text-xs font-bold border ${
                  transferMode === 'MERGE'
                    ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                    : 'bg-black/40 text-neutral-300 border-white/10'
                }`}
              >
                دمج الفاتورتين معًا
              </button>
            </div>

            <div>
              <label className="block text-xs text-neutral-400 mb-1.5">الطاولة المستهدفة:</label>
              <select
                value={targetTableId}
                onChange={(e) => setTargetTableId(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2.5 text-xs text-white"
              >
                {tables
                  .filter((t) => t.id !== selectedTable.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.nameAr} ({t.zoneNameAr}) — {TABLE_STATUS_STYLE[t.status].label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowTransferModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs"
              >
                تأكيد التنفيذ
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Table Modal */}
      {showAddTableModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateTable}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/30 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">إضافة طاولة جديدة</h3>
              <button type="button" onClick={() => setShowAddTableModal(false)} className="text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الصالة / المنطقة</label>
                <select
                  value={newTableZoneId}
                  onChange={(e) => setNewTableZoneId(e.target.value)}
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                >
                  {tableZones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.nameAr}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">رقم الطاولة</label>
                  <input
                    type="text"
                    required
                    value={newTableNumber}
                    onChange={(e) => setNewTableNumber(e.target.value)}
                    placeholder="مثال: T-15"
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div>
                  <label className="text-xs text-neutral-400 block mb-1">عدد المقاعد</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={newTableCapacity}
                    onChange={(e) => setNewTableCapacity(Number(e.target.value))}
                    className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">اسم الطاولة بالعربية</label>
                <input
                  type="text"
                  value={newTableName}
                  onChange={(e) => setNewTableName(e.target.value)}
                  placeholder="مثال: طاولة العائلات 15"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddTableModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs">
                حفظ الطاولة
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Add Zone Modal */}
      {showAddZoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <form
            onSubmit={handleCreateZone}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-[#D4AF37]/30 p-6 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-base font-bold text-white">إضافة صالة / منطقة جديدة</h3>
              <button type="button" onClick={() => setShowAddZoneModal(false)} className="text-neutral-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-neutral-400 block mb-1">اسم المنطقة بالعربية</label>
                <input
                  type="text"
                  required
                  value={newZoneNameAr}
                  onChange={(e) => setNewZoneNameAr(e.target.value)}
                  placeholder="مثال: التراس الخارجي / قاعة VIP"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block mb-1">الاسم بالفرنسية (اختياري)</label>
                <input
                  type="text"
                  value={newZoneNameFr}
                  onChange={(e) => setNewZoneNameFr(e.target.value)}
                  placeholder="Terrasse / Salon VIP"
                  className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddZoneModal(false)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button type="submit" className="px-5 py-2 rounded-lg bg-[#D4AF37] text-black font-bold text-xs">
                حفظ المنطقة
              </button>
            </div>
          </form>
        </div>
      )}

      {printingOrder && (
        <ReceiptPrinterModal
          order={printingOrder}
          settings={settings}
          mode="CUSTOMER_RECEIPT"
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// 2. KITCHEN DISPLAY SYSTEM (KDS)
// ============================================================================

export const KitchenKdsView: React.FC = () => {
  const { orders, settings, updateOrderStatusAction, can } = usePos();
  const [selectedStation, setSelectedStation] = useState<KitchenStationCode | 'ALL'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [nowTick, setNowTick] = useState(Date.now());
  const [printingTicketOrder, setPrintingTicketOrder] = useState<Order | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNowTick(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);

  const kitchenOrders = useMemo(() => {
    return orders
      .filter((o) => ['NEW', 'CONFIRMED', 'PREPARING', 'READY'].includes(o.status))
      .map((order) => {
        const stationItems =
          selectedStation === 'ALL'
            ? order.items
            : order.items.filter((i) => i.kitchenStation === selectedStation);
        return { ...order, stationItems };
      })
      .filter((o) => o.stationItems.length > 0)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [orders, selectedStation]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    if (soundEnabled) playKitchenChime();
    await updateOrderStatusAction(
      orderId,
      nextStatus,
      selectedStation === 'ALL' ? undefined : selectedStation
    );
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <ChefHat className="w-6 h-6 text-[#D4AF37]" />
            <span>شاشة المطبخ الفورية (KDS — Kitchen Display System)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            إدارة فورية لطلبات الطاولات والسفري والتوصيل حسب المحطة مع مؤقت التحضير
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playKitchenChime();
            }}
            className={`px-3.5 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 ${
              soundEnabled
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                : 'bg-white/5 border-white/10 text-neutral-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span>{soundEnabled ? 'التنبيه الصوتي مفعل' : 'الصوت مكتوم'}</span>
          </button>
        </div>
      </div>

      {/* Station Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {(['ALL', 'MAIN_KITCHEN', 'GRILL', 'DRINKS', 'DESSERT'] as const).map((station) => (
          <button
            key={station}
            type="button"
            onClick={() => setSelectedStation(station)}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shrink-0 border flex items-center gap-2 ${
              selectedStation === station
                ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                : 'bg-[#141419] text-neutral-300 border-white/10 hover:border-white/25'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>{STATION_NAMES[station]}</span>
          </button>
        ))}
      </div>

      {/* Active Tickets Grid */}
      {kitchenOrders.length === 0 ? (
        <div className="rounded-2xl bg-[#141419] border border-white/10 p-12 text-center space-y-3">
          <ChefHat className="w-12 h-12 text-neutral-600 mx-auto" />
          <h3 className="text-base font-bold text-neutral-300">لا توجد طلبات نشطة في هذه المحطة حاليًا</h3>
          <p className="text-xs text-neutral-500">ستظهر الطلبات الجديدة هنا فور إرسالها من الكاشير أو النادل.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {kitchenOrders.map((order) => {
            const elapsedMinutes = Math.max(
              0,
              Math.floor((nowTick - new Date(order.createdAt).getTime()) / 60000)
            );
            const isLate = elapsedMinutes >= 20 && order.status !== 'READY';

            return (
              <div
                key={order.id}
                className={`rounded-2xl bg-[#141419] border flex flex-col justify-between overflow-hidden shadow-xl ${
                  isLate
                    ? 'border-red-500/60'
                    : order.status === 'READY'
                    ? 'border-emerald-500/50'
                    : order.status === 'PREPARING'
                    ? 'border-amber-500/50'
                    : 'border-sky-500/40'
                }`}
              >
                {/* Ticket Header */}
                <div>
                  <div
                    className={`px-4 py-3 border-b border-white/10 flex items-center justify-between ${
                      isLate
                        ? 'bg-red-500/15'
                        : order.status === 'READY'
                        ? 'bg-emerald-500/15'
                        : order.status === 'PREPARING'
                        ? 'bg-amber-500/15'
                        : 'bg-sky-500/15'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-extrabold text-white font-mono">
                          #{order.orderNumber}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-black/50 text-[#F3E5AB]">
                          {order.orderType === 'DINE_IN'
                            ? order.tableName || 'طاولة'
                            : order.orderType === 'TAKEAWAY'
                            ? 'سفري Takeaway'
                            : 'توصيل Delivery'}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-300 mt-0.5">
                        بواسطة: {order.createdByName}
                      </div>
                    </div>

                    <div className="text-left">
                      <div
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold tabular-nums ${
                          isLate ? 'bg-red-500 text-white' : 'bg-black/40 text-neutral-200'
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        <span>{elapsedMinutes} دقيقة</span>
                      </div>
                      <div className="text-[11px] text-neutral-300 mt-1">
                        {ORDER_STATUS_AR[order.status]?.label}
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 space-y-2.5 divide-y divide-white/5">
                    {order.stationItems.map((item) => (
                      <div key={item.id} className="pt-2.5 first:pt-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#F3E5AB] font-extrabold text-sm tabular-nums shrink-0">
                              {item.quantity}×
                            </span>
                            <div>
                              <div className="text-sm font-bold text-white">
                                {item.productNameAr}
                                {item.variantNameAr && (
                                  <span className="mr-1.5 text-xs text-[#D4AF37]">
                                    ({item.variantNameAr})
                                  </span>
                                )}
                              </div>
                              {item.addons.length > 0 && (
                                <div className="text-xs text-emerald-300 mt-0.5">
                                  + إضافات: {item.addons.map((a) => a.nameAr).join('، ')}
                                </div>
                              )}
                              {item.notes && (
                                <div className="mt-1 px-2 py-1 rounded bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 font-semibold">
                                  ملاحظة: {item.notes}
                                </div>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-white/5 text-neutral-400">
                            {STATION_NAMES[item.kitchenStation]}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {order.notes && (
                    <div className="mx-4 mb-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-xs text-red-200">
                      <strong>ملاحظة عامة للطلب:</strong> {order.notes}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="p-3.5 bg-black/40 border-t border-white/10 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setPrintingTicketOrder(order)}
                    className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300"
                    title="طباعة تذكرة المطبخ"
                  >
                    <Printer className="w-4 h-4" />
                  </button>

                  {can('kitchen:update') && (
                    <div className="flex-1 flex items-center justify-end gap-2">
                      {(order.status === 'NEW' || order.status === 'CONFIRMED') && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'PREPARING')}
                          className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Flame className="w-4 h-4" />
                          <span>بدء التحضير (Preparing)</span>
                        </button>
                      )}

                      {order.status === 'PREPARING' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'READY')}
                          className="flex-1 py-2 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
                        >
                          <Bell className="w-4 h-4" />
                          <span>جاهز للتقديم (Ready)</span>
                        </button>
                      )}

                      {order.status === 'READY' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(order.id, 'COMPLETED')}
                          className="flex-1 py-2 px-3 rounded-xl bg-[#D4AF37] hover:bg-[#c5a030] text-black font-extrabold text-xs flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تم التسليم (Completed)</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {printingTicketOrder && (
        <ReceiptPrinterModal
          order={printingTicketOrder}
          settings={settings}
          mode="KITCHEN_TICKET"
          onClose={() => setPrintingTicketOrder(null)}
        />
      )}
    </div>
  );
};

// ============================================================================
// 3. ORDERS & DELIVERY MANAGEMENT VIEW
// ============================================================================

export const OrdersAndDeliveryView: React.FC = () => {
  const {
    orders,
    settings,
    updateOrderStatusAction,
    processPaymentAction,
    refundOrderAction,
    can,
    addNotification,
  } = usePos();

  const [filterType, setFilterType] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY'>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [printingOrder, setPrintingOrder] = useState<Order | null>(null);
  const [refundModalOrder, setRefundModalOrder] = useState<Order | null>(null);
  const [refundReason, setRefundReason] = useState('استرجاع بطلب العميل');
  const [driverInputs, setDriverInputs] = useState<Record<string, string>>({});

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (filterType !== 'ALL' && o.orderType !== filterType) return false;
      if (filterStatus !== 'ALL' && o.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchNum = o.orderNumber.toLowerCase().includes(q);
        const matchCust = (o.customerName || '').toLowerCase().includes(q);
        const matchPhone = (o.customerPhone || '').toLowerCase().includes(q);
        const matchTable = (o.tableName || '').toLowerCase().includes(q);
        if (!matchNum && !matchCust && !matchPhone && !matchTable) return false;
      }
      return true;
    });
  }, [orders, filterType, filterStatus, searchQuery]);

  const handleQuickCashSettle = async (order: Order) => {
    const remaining = Math.max(0, order.totalAmount - order.paidAmount);
    if (remaining <= 0) return;
    try {
      await processPaymentAction({
        orderId: order.id,
        allocations: [{ method: 'CASH', amount: remaining }],
      });
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'تعذر تحصيل الدفعة', err.message);
    }
  };

  const handleConfirmRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundModalOrder) return;
    try {
      await refundOrderAction(refundModalOrder.id, refundReason);
      setRefundModalOrder(null);
    } catch (err: any) {
      addNotification('SYNC_ERROR', 'خطأ في الاسترجاع', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#141419] border border-white/10 rounded-xl p-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2.5">
            <Truck className="w-6 h-6 text-[#D4AF37]" />
            <span>سجل الطلبات وإدارة التوصيل (Orders & Delivery)</span>
          </h1>
          <p className="text-xs text-neutral-400 mt-1">
            متابعة شاملة لجميع الفواتير، حالات التوصيل، التحصيل السريع، والطباعة الحرارية
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(['ALL', 'DINE_IN', 'TAKEAWAY', 'DELIVERY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setFilterType(t)}
              className={`px-3.5 py-2 rounded-lg text-xs font-bold border ${
                filterType === t
                  ? 'bg-[#D4AF37] text-black border-[#D4AF37]'
                  : 'bg-black/40 text-neutral-300 border-white/10'
              }`}
            >
              {t === 'ALL'
                ? 'كل الطلبات'
                : t === 'DINE_IN'
                ? 'داخل المطعم'
                : t === 'TAKEAWAY'
                ? 'سفري'
                : 'توصيل Delivery'}
            </button>
          ))}
        </div>
      </div>

      {/* Filters Row */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-neutral-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ابحث برقم الفاتورة، اسم العميل، الهاتف، أو الطاولة..."
            className="w-full rounded-xl bg-[#141419] border border-white/10 pr-10 pl-4 py-2.5 text-xs text-white"
          />
        </div>

        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="rounded-xl bg-[#141419] border border-white/10 px-4 py-2.5 text-xs text-white"
        >
          <option value="ALL">جميع الحالات</option>
          <option value="NEW">جديد (NEW)</option>
          <option value="PREPARING">قيد التحضير (PREPARING)</option>
          <option value="READY">جاهز (READY)</option>
          <option value="OUT_FOR_DELIVERY">في الطريق للتوصيل</option>
          <option value="DELIVERED">تم التوصيل</option>
          <option value="COMPLETED">مكتمل (COMPLETED)</option>
          <option value="CANCELLED">ملغى (CANCELLED)</option>
        </select>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-[#141419] border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-black/50 text-neutral-400 border-b border-white/10">
              <tr>
                <th className="py-3.5 px-4">رقم الفاتورة</th>
                <th className="py-3.5 px-4">النوع / الوجهة</th>
                <th className="py-3.5 px-4">الأصناف</th>
                <th className="py-3.5 px-4">الإجمالي</th>
                <th className="py-3.5 px-4">الدفع</th>
                <th className="py-3.5 px-4">الحالة / التوصيل</th>
                <th className="py-3.5 px-4">التوقيت</th>
                <th className="py-3.5 px-4 text-left">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredOrders.map((order) => {
                const st = ORDER_STATUS_AR[order.status] || { label: order.status, color: '' };
                return (
                  <tr key={order.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-[#F3E5AB]">
                      #{order.orderNumber}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white">
                        {order.orderType === 'DINE_IN'
                          ? order.tableName || 'طاولة'
                          : order.orderType === 'TAKEAWAY'
                          ? 'طلب سفري'
                          : `توصيل: ${order.customerName || 'عميل'}`}
                      </div>
                      {order.customerPhone && (
                        <div className="text-[11px] text-neutral-400 tabular-nums">
                          هاتف: {order.customerPhone}
                        </div>
                      )}
                      {order.deliveryAddress && (
                        <div className="text-[11px] text-amber-300/90 truncate max-w-[200px]">
                          العنوان: {order.deliveryAddress}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-300">
                      {order.items.map((i) => `${i.quantity}× ${i.productNameAr}`).join('، ')}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white tabular-nums">
                      {order.totalAmount.toLocaleString('en-US')} د.ج
                      {order.deliveryFee > 0 && (
                        <div className="text-[10px] text-neutral-400">
                          شامل توصيل {order.deliveryFee} د.ج
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-1 rounded-md text-[11px] font-bold ${
                          order.paymentStatus === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : order.paymentStatus === 'PARTIAL'
                            ? 'bg-amber-500/15 text-amber-300'
                            : order.paymentStatus === 'REFUNDED'
                            ? 'bg-red-500/15 text-red-300'
                            : 'bg-white/10 text-neutral-300'
                        }`}
                      >
                        {order.paymentStatus === 'PAID'
                          ? 'مدفوع بالكامل'
                          : order.paymentStatus === 'PARTIAL'
                          ? `جزئي (${order.paidAmount} د.ج)`
                          : order.paymentStatus === 'REFUNDED'
                          ? 'مسترجع'
                          : 'غير مدفوع'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 space-y-1.5">
                      <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border ${st.color}`}>
                        {st.label}
                      </span>

                      {order.orderType === 'DELIVERY' && order.status !== 'CANCELLED' && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <input
                            type="text"
                            placeholder="اسم السائق..."
                            value={driverInputs[order.id] ?? order.deliveryDriver ?? ''}
                            onChange={(e) =>
                              setDriverInputs((prev) => ({ ...prev, [order.id]: e.target.value }))
                            }
                            className="w-28 rounded bg-black/50 border border-white/10 px-2 py-1 text-[11px] text-white"
                          />
                          {order.status !== 'OUT_FOR_DELIVERY' && order.status !== 'DELIVERED' && (
                            <button
                              type="button"
                              onClick={() =>
                                updateOrderStatusAction(
                                  order.id,
                                  'OUT_FOR_DELIVERY',
                                  undefined,
                                  driverInputs[order.id] || order.deliveryDriver || 'سائق القصر'
                                )
                              }
                              className="px-2 py-1 rounded bg-indigo-500/20 border border-indigo-500/40 text-indigo-200 text-[10px] font-bold"
                            >
                              إرسال للتوصيل
                            </button>
                          )}
                          {order.status === 'OUT_FOR_DELIVERY' && (
                            <button
                              type="button"
                              onClick={() => updateOrderStatusAction(order.id, 'DELIVERED')}
                              className="px-2 py-1 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-[10px] font-bold"
                            >
                              تأكيد التسليم
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-neutral-400 tabular-nums">
                      {new Date(order.createdAt).toLocaleTimeString('ar-DZ', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPrintingOrder(order)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-200"
                          title="طباعة الفاتورة"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        {order.paymentStatus !== 'PAID' &&
                          order.paymentStatus !== 'REFUNDED' &&
                          order.status !== 'CANCELLED' && (
                            <button
                              type="button"
                              onClick={() => handleQuickCashSettle(order)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 font-bold text-[11px]"
                            >
                              تحصيل نقدي
                            </button>
                          )}

                        {order.paymentStatus === 'PAID' && can('orders:refund') && (
                          <button
                            type="button"
                            onClick={() => setRefundModalOrder(order)}
                            className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/25 text-red-300"
                            title="استرجاع الفاتورة (Refund)"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Confirmation Modal */}
      {refundModalOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <form
            onSubmit={handleConfirmRefund}
            className="w-full max-w-md rounded-2xl bg-[#141419] border border-red-500/40 p-6 space-y-4"
          >
            <h3 className="text-base font-bold text-white">
              تأكيد استرجاع الفاتورة #{refundModalOrder.orderNumber}
            </h3>
            <p className="text-xs text-neutral-300">
              سيتم إرجاع مبلغ{' '}
              <strong className="text-red-300 tabular-nums">
                {refundModalOrder.paidAmount.toLocaleString('en-US')} د.ج
              </strong>{' '}
              وتسجيل حركة استرجاع في الصندوق وسجل المراجعة.
            </p>
            <div>
              <label className="block text-xs text-neutral-400 mb-1">سبب الاسترجاع:</label>
              <input
                type="text"
                required
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                className="w-full rounded-lg bg-black/50 border border-white/15 px-3 py-2 text-xs text-white"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRefundModalOrder(null)}
                className="px-4 py-2 rounded-lg bg-white/5 text-xs text-neutral-300"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold text-xs"
              >
                تأكيد الاسترجاع
              </button>
            </div>
          </form>
        </div>
      )}

      {printingOrder && (
        <ReceiptPrinterModal
          order={printingOrder}
          settings={settings}
          mode="CUSTOMER_RECEIPT"
          onClose={() => setPrintingOrder(null)}
        />
      )}
    </div>
  );
};
