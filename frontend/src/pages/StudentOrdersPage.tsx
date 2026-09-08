import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Order, Meal, MenuItem, OrderType, HalfTiffinChoice } from '../types';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import {
  ChefHat,
  Calendar,
  RefreshCw,
  Lock,
  XCircle,
  ArrowRight,
  Utensils,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Clock,
  X
} from 'lucide-react';

export const StudentOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'PAST'>('ALL');

  // Tonight's meal for edit modal options
  const [dinnerMeal, setDinnerMeal] = useState<Meal | null>(null);
  const [sabziOptions, setSabziOptions] = useState<MenuItem[]>([]);
  const [halfPrice, setHalfPrice] = useState<number>(65);
  const [fullPrice, setFullPrice] = useState<number>(100);

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editPortion, setEditPortion] = useState<OrderType>('FULL');
  const [editHalfChoice, setEditHalfChoice] = useState<HalfTiffinChoice>('SABZI_ROTI');
  const [editSabzi, setEditSabzi] = useState<string>('');
  const [editExtraRotis, setEditExtraRotis] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

  const loadData = async () => {
    try {
      setLoading(true);
      const [orderData, menuData] = await Promise.all([
        api.getMyOrders(),
        api.getTodayMenu().catch(() => [] as Meal[])
      ]);
      setOrders(orderData);

      const dinner = menuData.find((m) => m.mealType === 'DINNER') || menuData[0] || null;
      if (dinner) {
        setDinnerMeal(dinner);
        if (dinner.halfPrice) setHalfPrice(Number(dinner.halfPrice));
        if (dinner.fullPrice) setFullPrice(Number(dinner.fullPrice));
        const sabzis = (dinner.menuItems || []).filter((i) => i.category === 'SABZI');
        setSabziOptions(sabzis);
      }
    } catch (e: any) {
      console.error('Failed to load orders:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCancel = async (orderId: number) => {
    if (!window.confirm('Cancel this dinner order? The full amount will be credited back to your balance immediately.')) return;
    setCancellingId(orderId);
    setMsg(null);
    try {
      await api.cancelOrder(orderId, 'Cancelled from My Orders');
      setMsg({ text: 'Order cancelled successfully. Amount credited to your ledger balance.', type: 'success' });
      await loadData();
    } catch (e: any) {
      setMsg({ text: e.message || 'Cannot cancel order. Kitchen prep has already started.', type: 'error' });
    } finally {
      setCancellingId(null);
    }
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditPortion(order.orderType);
    setEditHalfChoice(order.halfTiffinChoice === 'DAL_RICE' ? 'DAL_RICE' : 'SABZI_ROTI');
    setEditSabzi(
      order.selectedSabzi && !order.selectedSabzi.includes('Dal')
        ? order.selectedSabzi
        : sabziOptions[0]?.name || ''
    );
    setEditExtraRotis(order.extraRotis || 0);
    setEditQuantity(order.quantity || 1);
  };

  const editBasePrice = editPortion === 'FULL' ? fullPrice : halfPrice;
  const editExtraRotiPrice = editPortion === 'HALF' && editHalfChoice === 'DAL_RICE' ? 0 : editExtraRotis * 6;
  const editTotalPrice = editBasePrice * editQuantity + editExtraRotiPrice;

  const handleSaveEditOrder = async () => {
    if (!editingOrder || !dinnerMeal) return;

    let chosenSabzi = editSabzi || (sabziOptions[0]?.name || "Today's Sabzi");
    let rotis = editExtraRotis;
    let choiceToSend: string = editPortion === 'FULL' ? 'FULL' : editHalfChoice;

    if (editPortion === 'HALF' && editHalfChoice === 'DAL_RICE') {
      chosenSabzi = 'Dal + Steamed Rice';
      rotis = 0;
    }

    setSavingEdit(true);
    setMsg(null);
    try {
      await api.editOrder(editingOrder.id, {
        mealId: dinnerMeal.id,
        orderType: editPortion,
        selectedSabzi: chosenSabzi,
        extraRotis: rotis,
        halfTiffinChoice: choiceToSend,
        quantity: editQuantity,
      });
      setMsg({ text: `Order #${editingOrder.id} updated successfully!`, type: 'success' });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update order. Cutoff may have passed.', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'CONFIRMED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">Confirmed</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
      case 'CANCELLED_BY_ADMIN':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-800 border border-red-200">Cancelled by Kitchen</span>;
      case 'DELIVERED':
      case 'COMPLETED':
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800 border border-blue-200">Delivered ✓</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-slate-100 text-slate-800 border border-slate-200">{status}</span>;
    }
  };

  const yesterdayObj = new Date();
  yesterdayObj.setDate(yesterdayObj.getDate() - 1);
  const yesterdayStr = new Date(yesterdayObj.getTime() - yesterdayObj.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')[0];

  const formatPartitionDate = (dateStr: string) => {
    if (!dateStr) return { title: 'Unknown Date', subtitle: '', isToday: false, isYesterday: false };
    if (dateStr === todayStr) {
      return { title: "Today's Orders", subtitle: formatDateDDMMYYYY(dateStr), isToday: true, isYesterday: false };
    }
    if (dateStr === yesterdayStr) {
      return { title: 'Yesterday', subtitle: formatDateDDMMYYYY(dateStr), isToday: false, isYesterday: true };
    }
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dt = new Date(y, m - 1, d);
      const weekday = dt.toLocaleDateString('en-IN', { weekday: 'long' });
      return {
        title: `${weekday}, ${formatDateDDMMYYYY(dateStr)}`,
        subtitle: '',
        isToday: false,
        isYesterday: false,
      };
    } catch {
      return { title: formatDateDDMMYYYY(dateStr), subtitle: '', isToday: false, isYesterday: false };
    }
  };

  const filteredOrders = orders.filter((o) => {
    const isToday = o.orderDate === todayStr;
    if (activeTab === 'TODAY') return isToday;
    if (activeTab === 'PAST') return !isToday;
    return true;
  });

  // Sort orders descending by orderDate, then by id desc
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateComp = (b.orderDate || '').localeCompare(a.orderDate || '');
    if (dateComp !== 0) return dateComp;
    return (b.id || 0) - (a.id || 0);
  });

  // Group by orderDate for Date Partitioning
  const groupedOrders: { date: string; orders: Order[] }[] = [];
  sortedOrders.forEach((o) => {
    const d = o.orderDate || 'UNKNOWN';
    let group = groupedOrders.find((g) => g.date === d);
    if (!group) {
      group = { date: d, orders: [] };
      groupedOrders.push(group);
    }
    group.orders.push(o);
  });

  const todayOrdersCount = orders.filter((o) => o.orderDate === todayStr).length;
  const pastOrdersCount = orders.filter((o) => o.orderDate !== todayStr).length;

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-8 space-y-5 sm:space-y-6 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            <span>My Dinner Orders</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Full history of your orders with real-time status and live order editing
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/student/dashboard"
            className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Browse Menu</span>
          </Link>
          <button
            onClick={loadData}
            className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            title="Refresh Orders"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert toast */}
      {msg && (
        <div
          className={`p-3.5 rounded-2xl text-xs font-bold flex items-start justify-between gap-3 animate-fadeIn ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {msg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)} className="shrink-0 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'ALL'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Orders ({orders.length})
        </button>
        <button
          onClick={() => setActiveTab('TODAY')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'TODAY'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Today's Orders ({todayOrdersCount})
        </button>
        <button
          onClick={() => setActiveTab('PAST')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors ${
            activeTab === 'PAST'
              ? 'bg-orange-500 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Past Orders ({pastOrdersCount})
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-slate-100 animate-pulse rounded-2xl border border-slate-200/60" />
          ))}
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="bg-white rounded-3xl p-8 sm:p-12 text-center border border-slate-200 shadow-sm max-w-lg mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center text-3xl mx-auto shadow-inner">
            🍱
          </div>
          <div>
            <h3 className="font-black text-slate-800 text-lg">
              {activeTab === 'TODAY'
                ? "No Orders Placed For Tonight Yet"
                : activeTab === 'PAST'
                ? 'No Past Orders'
                : 'No Orders Placed Yet'}
            </h3>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Check out tonight's dinner menu and place your homestyle tiffin with 1 click!
            </p>
          </div>
          <div>
            <Link
              to="/student/dashboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs shadow-md shadow-orange-500/20 hover:from-orange-600 hover:to-amber-600 transition-all active:scale-95"
            >
              <Utensils className="w-4 h-4" />
              <span>Browse Tonight's Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedOrders.map((group) => {
            const dateMeta = formatPartitionDate(group.date);
            const totalTiffins = group.orders.reduce((sum, o) => sum + (o.quantity || 1), 0);
            const totalAmount = group.orders.reduce((sum, o) => sum + Number(o.priceAtOrder || 0), 0);

            return (
              <div key={group.date} className="space-y-2.5">
                {/* ── Date Partition Header ── */}
                <div
                  className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-2xl border transition-all ${
                    dateMeta.isToday
                      ? 'bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-orange-50/40 border-orange-200 shadow-2xs'
                      : dateMeta.isYesterday
                      ? 'bg-slate-100/90 border-slate-200/90'
                      : 'bg-slate-50/90 border-slate-200/80'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${
                        dateMeta.isToday
                          ? 'bg-orange-500 text-white shadow-orange-500/20'
                          : dateMeta.isYesterday
                          ? 'bg-slate-700 text-white'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm sm:text-base font-black text-slate-900">
                          {dateMeta.title}
                        </span>
                        {dateMeta.isToday && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-wider shadow-2xs">
                            Tonight
                          </span>
                        )}
                        {dateMeta.subtitle && (
                          <span className="text-xs text-slate-500 font-semibold">
                            • {dateMeta.subtitle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 text-xs font-bold text-slate-600 self-end sm:self-center">
                    <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-700 shadow-2xs text-[11px] font-bold">
                      {totalTiffins} {totalTiffins === 1 ? 'Tiffin' : 'Tiffins'} ({group.orders.length} {group.orders.length === 1 ? 'order' : 'orders'})
                    </span>
                    <span className="bg-white px-2.5 py-1 rounded-xl border border-slate-200 text-slate-900 font-black shadow-2xs text-[11px]">
                      ₹{totalAmount.toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* ── Orders For This Date ── */}
                <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
                  {group.orders.map((o) => {
                    const isDelivered = o.status === 'DELIVERED' || o.status === 'COMPLETED';
                    const isDalRice = o.orderType === 'HALF' && o.halfTiffinChoice === 'DAL_RICE';
                    const isToday = o.orderDate === todayStr;

                    return (
                      <div
                        key={o.id}
                        className="p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 transition-colors"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-base shrink-0 mt-0.5 ${
                            isDelivered ? 'bg-emerald-100 text-emerald-700' : 'bg-brand-50 text-brand-600'
                          }`}>
                            {isDelivered ? '✓' : '🍱'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-black text-slate-900 text-base leading-tight">
                                {o.quantity && o.quantity > 1 ? `${o.quantity}× ` : ''}
                                {o.orderType === 'FULL' ? 'Full Tiffin' : 'Half Tiffin'}
                                {' — '}
                                {isDalRice ? 'Dal + Steamed Rice' : o.selectedSabzi || "Today's Sabzi"}
                              </h4>
                              {isToday && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                                  Tonight
                                </span>
                              )}
                              {getStatusBadge(o.status)}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-slate-500 mt-1">
                              <span className="flex items-center gap-1 font-semibold text-slate-700">
                                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                {formatDateDDMMYYYY(o.orderDate)}
                              </span>
                              <span>•</span>
                              <span className="font-black text-slate-900">₹{Number(o.priceAtOrder).toFixed(0)}</span>
                              {o.extraRotis && o.extraRotis > 0 ? (
                                <>
                                  <span>•</span>
                                  <span className="text-orange-700 font-bold">+{o.extraRotis} Extra Rotis</span>
                                </>
                              ) : null}
                              {o.cancellationReason && (
                                <>
                                  <span>•</span>
                                  <span className="text-red-600 font-medium italic">Reason: {o.cancellationReason}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions: Edit & Cancel right from My Orders */}
                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          {o.canCancel && o.status === 'CONFIRMED' ? (
                            <>
                              <button
                                onClick={() => openEditModal(o)}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 transition-colors flex items-center gap-1.5 shadow-2xs"
                                title="Edit portion or sabzi"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-brand-600" />
                                <span>Edit Order</span>
                              </button>
                              <button
                                onClick={() => handleCancel(o.id)}
                                disabled={cancellingId === o.id}
                                className="px-3 py-1.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors flex items-center gap-1 shadow-2xs disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{cancellingId === o.id ? 'Cancelling...' : 'Cancel'}</span>
                              </button>
                            </>
                          ) : o.status === 'CONFIRMED' ? (
                            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-100">
                              <Lock className="w-3 h-3 text-slate-400" />
                              <span>Prep begun (Locked)</span>
                            </span>
                          ) : isDelivered ? (
                            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                              Enjoy your meal! 🍽️
                            </span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── EDIT ORDER MODAL ── */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-brand-600" />
                  <span>Edit Order #{editingOrder.id}</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Update your portion, sabzi, or rotis before the kitchen begins cooking
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Portion Selection */}
            <div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                Choose Portion
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditPortion('FULL');
                    setEditHalfChoice('SABZI_ROTI');
                  }}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    editPortion === 'FULL'
                      ? 'border-orange-500 bg-orange-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Full Tiffin</span>
                      <span className="text-[10px] text-slate-500">Sabzi + 4 Roti + Dal + Rice</span>
                    </div>
                    <span className="text-sm font-black text-orange-600">₹{fullPrice}</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditPortion('HALF')}
                  className={`p-3 rounded-2xl border-2 text-left transition-all ${
                    editPortion === 'HALF'
                      ? 'border-amber-500 bg-amber-50/70 shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-black text-slate-900 block">Half Tiffin</span>
                      <span className="text-[10px] text-slate-500">Choice of 1 Item</span>
                    </div>
                    <span className="text-sm font-black text-amber-600">₹{halfPrice}</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Half Choice Options */}
            {editPortion === 'HALF' && (
              <div className="p-3 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <span className="text-[10px] font-black text-amber-900 uppercase tracking-wider block">
                  Half Tiffin Type
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditHalfChoice('SABZI_ROTI')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      editHalfChoice === 'SABZI_ROTI'
                        ? 'border-amber-600 bg-white text-amber-950 shadow-2xs'
                        : 'border-amber-200 bg-amber-50/50 text-slate-600'
                    }`}
                  >
                    🥘 Sabzi + 4 Roti
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditHalfChoice('DAL_RICE')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                      editHalfChoice === 'DAL_RICE'
                        ? 'border-amber-600 bg-white text-amber-950 shadow-2xs'
                        : 'border-amber-200 bg-amber-50/50 text-slate-600'
                    }`}
                  >
                    🍲 Dal + Steamed Rice
                  </button>
                </div>
              </div>
            )}

            {/* Sabzi Selector */}
            {!(editPortion === 'HALF' && editHalfChoice === 'DAL_RICE') && (
              <div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">
                  Select Tonight's Sabzi
                </span>
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-0.5">
                  {sabziOptions.map((s) => {
                    const isOutOfStock = s.active === false;
                    const isSelected = editSabzi === s.name;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => !isOutOfStock && setEditSabzi(s.name)}
                        className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all ${
                          isOutOfStock
                            ? 'border-red-200 bg-red-50/60 opacity-60 cursor-not-allowed'
                            : isSelected
                            ? 'border-brand-600 bg-brand-50 text-brand-900 shadow-2xs'
                            : 'border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>🥘 {s.name}</span>
                          {isOutOfStock && <span className="text-[9px] text-red-600 font-black">Sold Out</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Quantity and Extra Rotis */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">Quantity</span>
                <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100"
                  >
                    -
                  </button>
                  <span className="font-black text-slate-900 flex-1 text-center text-sm">{editQuantity}</span>
                  <button
                    type="button"
                    onClick={() => setEditQuantity(Math.min(10, editQuantity + 1))}
                    className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-black hover:bg-brand-700"
                  >
                    +
                  </button>
                </div>
              </div>

              {!(editPortion === 'HALF' && editHalfChoice === 'DAL_RICE') && (
                <div>
                  <span className="text-xs font-bold text-slate-700 block mb-1.5">Extra Rotis (+₹6)</span>
                  <div className="flex items-center gap-2 p-1.5 bg-slate-50 rounded-xl border border-slate-200">
                    <button
                      type="button"
                      onClick={() => setEditExtraRotis(Math.max(0, editExtraRotis - 1))}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 flex items-center justify-center font-black text-slate-700 hover:bg-slate-100"
                    >
                      -
                    </button>
                    <span className="font-black text-slate-900 flex-1 text-center text-sm">{editExtraRotis}</span>
                    <button
                      type="button"
                      onClick={() => setEditExtraRotis(Math.min(15, editExtraRotis + 1))}
                      className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-black hover:bg-brand-700"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Total Amount</span>
                <span className="text-xl font-black text-slate-900">₹{editTotalPrice}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-100"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSaveEditOrder}
                  disabled={savingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-black shadow-md shadow-orange-500/20 disabled:opacity-50 transition-all"
                >
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentOrdersPage;
