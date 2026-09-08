import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { DashboardStats, Order } from '../types';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import {
  ShoppingBag,
  IndianRupee,
  Users,
  ChefHat,
  UtensilsCrossed,
  Clock,
  RefreshCw,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  BellRing
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [liveOrders, setLiveOrders] = useState<Order[]>([]);
  const [todayMenu, setTodayMenu] = useState<any>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [reminderMsg, setReminderMsg] = useState<string | null>(null);
  const [sendingReminder, setSendingReminder] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadAll = async () => {
    try {
      const [statsData, ordersData, menuData] = await Promise.all([
        api.getDashboardStats(),
        api.getAllOrders(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)),
        api.getTodayMenu().catch(() => []),
      ]);

      setStats(statsData);
      setLiveOrders(ordersData);
      if (menuData && menuData.length > 0) {
        setTodayMenu(menuData[0]);
      }
    } catch (e) {
      console.error('Failed to load dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 15000); // Poll every 15s for live orders
    return () => clearInterval(interval);
  }, []);

  const handleSendReminder = async () => {
    setSendingReminder(true);
    setReminderMsg(null);
    try {
      const res = await api.sendClosingReminder(15);
      setReminderMsg(`Closing reminder sent to ${res.notifiedUnorderedStudents} customers.`);
    } catch (err: any) {
      setReminderMsg(err.message || 'Failed to send reminder.');
    } finally {
      setSendingReminder(false);
    }
  };

  const handleDeliverSingle = async (orderId: number) => {
    setActionLoading(orderId);
    try {
      await api.deliverOrder(orderId);
      await loadAll();
    } catch (e: any) {
      alert(e.message || 'Failed to mark order delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminCancel = async (orderId: number) => {
    const reason = window.prompt('Enter cancellation reason (amount will be credited back to customer):', 'Kitchen cancelled by client');
    if (!reason) return;

    setActionLoading(orderId);
    try {
      await api.adminCancelOrder(orderId, reason);
      await loadAll();
    } catch (e: any) {
      alert(e.message || 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  const activeOrdersCount = liveOrders.filter((o) => o.status === 'CONFIRMED' || o.status === 'DELIVERED').length;
  const fullTiffinsCount = liveOrders.filter((o) => o.orderType === 'FULL').reduce((s, o) => s + (o.quantity || 1), 0);
  const halfTiffinsCount = liveOrders.filter((o) => o.orderType === 'HALF').reduce((s, o) => s + (o.quantity || 1), 0);
  const extraRotisCount = liveOrders.reduce((s, o) => s + (o.extraRotis || 0), 0);
  const deliveredCount = liveOrders.filter((o) => o.status === 'DELIVERED').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Minimal Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Kitchen Operations
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time orders, dinner menu status & quick delivery desk
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-600 font-bold bg-slate-100 px-3 py-1.5 rounded-xl">
            📅 {formatDateDDMMYYYY(new Date())}
          </span>
          <button
            onClick={loadAll}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Refresh Live Data"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Reminder notification toast */}
      {reminderMsg && (
        <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex justify-between items-center">
          <span>{reminderMsg}</span>
          <button onClick={() => setReminderMsg(null)} className="underline text-xs">Dismiss</button>
        </div>
      )}

      {/* Alerts Banner (if any) */}
      {stats?.alerts && stats.alerts.length > 0 && (
        <div className="space-y-1.5">
          {stats.alerts.map((a, i) => (
            <div key={i} className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{a}</span>
            </div>
          ))}
        </div>
      )}

      {/* 4 Clean Minimal KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tonight's Tiffins</span>
            <div className="p-1.5 rounded-lg bg-brand-50 text-brand-600">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {loading ? '...' : stats?.todayOrdersCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Total tiffins ordered tonight</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Today's Revenue</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            ₹{loading ? '...' : Number(stats?.todayEstimatedRevenue || 0).toFixed(0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Confirmed tonight</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Active Customers</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 mt-1.5">
            {loading ? '...' : stats?.activeStudentsCount ?? 0}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Subscribed students</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs">
          <div className="flex justify-between items-start">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pending Dues</span>
            <div className="p-1.5 rounded-lg bg-red-50 text-red-600">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-red-600 mt-1.5">
            ₹{loading ? '...' : Number(stats?.totalOutstandingAmount || 0).toFixed(0)}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">Live student ledger balances</p>
        </div>
      </div>

      {/* ── REDESIGNED TONIGHT'S SERVICE & MENU CARD ── */}
      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
        {/* Top Action Bar: Status, Cutoff & Buttons */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50/90 via-white to-slate-50/90 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-base font-black text-slate-900 flex items-center gap-2">
              <span>🌙</span>
              <span>Tonight's Dinner</span>
            </span>

            <span className={`px-2.5 py-1 rounded-full text-xs font-black inline-flex items-center gap-1 ${
              todayMenu?.status === 'PUBLISHED'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-amber-100 text-amber-800'
            }`}>
              {todayMenu?.status === 'PUBLISHED'
                ? '🟢 ACCEPTING ORDERS'
                : '⛔ ORDERS CLOSED'}
            </span>

            {todayMenu && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 shadow-2xs">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Ordering Window: <strong className="text-slate-900">{todayMenu.orderOpenTime?.slice(0, 5) || '19:00'} – {todayMenu.orderCutoffTime?.slice(0, 5) || '20:00'}</strong></span>
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:flex sm:items-center gap-2 w-full md:w-auto shrink-0">
            {todayMenu?.status === 'PUBLISHED' && (
              <button
                onClick={handleSendReminder}
                disabled={sendingReminder}
                className="px-3.5 py-2 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                title="Send reminder to students who haven't ordered yet"
              >
                <BellRing className="w-3.5 h-3.5 text-amber-600" />
                <span>{sendingReminder ? 'Sending...' : 'Remind Students'}</span>
              </button>
            )}

            <Link
              to="/admin/kitchen"
              className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
            >
              <ChefHat className="w-3.5 h-3.5" />
              <span>Kitchen Sheet</span>
            </Link>

            <Link
              to="/admin/menu"
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-orange-500/20"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Manage Menu</span>
            </Link>
          </div>
        </div>

        {/* Bottom Section: Published Sabzis Chips & Staples */}
        <div className="p-4 sm:p-5 space-y-3.5">
          {todayMenu ? (
            <div className="space-y-3">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Tonight's Published Dishes ({todayMenu.menuItems?.filter((i: any) => i.category === 'SABZI').length || 0})
                </span>

                {todayMenu.menuItems?.filter((i: any) => i.category === 'SABZI').length > 0 ? (
                  <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-0.5">
                    {todayMenu.menuItems
                      ?.filter((i: any) => i.category === 'SABZI')
                      .map((s: any) => (
                        <span
                          key={s.id}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold shadow-2xs transition-all ${
                            s.active !== false
                              ? 'bg-amber-50/70 border-amber-200/80 text-amber-950'
                              : 'bg-red-50 border-red-200 text-red-700 line-through opacity-75'
                          }`}
                        >
                          <span>🥘</span>
                          <span>{s.name}</span>
                          {s.active === false && (
                            <span className="text-[9px] font-black text-red-600 no-underline">(Closed)</span>
                          )}
                        </span>
                      ))}
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No sabzi selected yet for tonight</span>
                )}
              </div>

              {/* Standard Staples & Pricing Strip */}
              <div className="pt-2.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-2 text-slate-600">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Included Staples:</span>
                  <span className="font-semibold text-slate-800">🫓 Phulka Roti + 🍲 Dal Tadka + 🍚 Steamed Rice</span>
                </div>
                <div className="text-slate-500 font-medium">
                  Pricing: Half <strong className="text-slate-900">₹{todayMenu.halfPrice}</strong> • Full <strong className="text-brand-600">₹{todayMenu.fullPrice}</strong>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-3 text-xs text-slate-500">
              <span>No dinner menu published yet for tonight. Click <strong>"Manage Menu"</strong> above to select today's sabzi and open orders.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── TONIGHT'S LIVE OPERATIONS & QUICK ORDERS DISPATCH ── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden space-y-4 p-5 sm:p-6">
        {/* Section Header & Counters */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-brand-600" />
              <span>Tonight's Operations Summary</span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-bold">
                {activeOrdersCount} Orders Placed
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live orders overview. Detailed hostel-wise packaging is available in the Kitchen Sheet.
            </p>
          </div>

          <Link
            to="/admin/kitchen"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs shrink-0 self-start md:self-auto"
          >
            <span>Open Full Kitchen Sheet ({activeOrdersCount})</span>
            <span>→</span>
          </Link>
        </div>

        {/* 4 Operations Metric Pills */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-2xl bg-orange-50/70 border border-orange-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-orange-800 block">Full Tiffins</span>
            <span className="text-xl font-black text-orange-950 mt-0.5 block">{fullTiffinsCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-amber-50/70 border border-amber-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 block">Half Tiffins</span>
            <span className="text-xl font-black text-amber-950 mt-0.5 block">{halfTiffinsCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-800 block">Extra Rotis</span>
            <span className="text-xl font-black text-blue-950 mt-0.5 block">{extraRotisCount}</span>
          </div>
          <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 block">Delivered</span>
            <span className="text-xl font-black text-emerald-950 mt-0.5 block">{deliveredCount} / {activeOrdersCount}</span>
          </div>
        </div>

        {/* Recent Live Orders Stream (Clean & uncluttered: top 5 recent) */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
              Recent Orders Tonight
            </span>
            {liveOrders.length > 5 && (
              <Link to="/admin/kitchen" className="text-xs font-bold text-brand-600 hover:underline">
                +{liveOrders.length - 5} more in Kitchen Sheet →
              </Link>
            )}
          </div>

          {liveOrders.length === 0 ? (
            <div className="p-8 text-center bg-slate-50/60 rounded-2xl border border-slate-100 text-slate-400 text-xs font-medium">
              No orders placed yet for tonight's dinner.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
              {liveOrders.slice(0, 5).map((o) => {
                const isDelivered = o.status === 'DELIVERED';
                const isConfirmed = o.status === 'CONFIRMED';
                const isDalRice = o.orderType === 'HALF' && o.halfTiffinChoice === 'DAL_RICE';

                return (
                  <div key={o.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="font-mono text-xs font-bold text-slate-400 shrink-0">
                        #{o.id}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-black text-slate-900">{o.studentName}</span>
                          <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-brand-600 shrink-0" />
                            {o.hostelName || 'Hostel'}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 mt-0.5 flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-800">
                            {o.quantity && o.quantity > 1 ? `${o.quantity}× ` : ''}
                            {o.orderType} Tiffin
                          </span>
                          <span>•</span>
                          <span>{isDalRice ? '🍲 Dal + Rice' : `🥘 ${o.selectedSabzi || 'Sabzi'}`}</span>
                          {o.extraRotis && o.extraRotis > 0 ? <span>(+{o.extraRotis} Roti)</span> : null}
                          <span>•</span>
                          <span className="font-bold text-slate-900">₹{Number(o.priceAtOrder).toFixed(0)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        isDelivered
                          ? 'bg-emerald-100 text-emerald-800'
                          : isConfirmed
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isDelivered ? 'Delivered ✓' : isConfirmed ? 'Confirmed' : o.status}
                      </span>

                      {isConfirmed && (
                        <button
                          onClick={() => handleDeliverSingle(o.id)}
                          disabled={actionLoading === o.id}
                          className="px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-colors disabled:opacity-50"
                        >
                          🚚 Deliver
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
