import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Order, Hostel } from '../types';
import { ShoppingBag, RefreshCw, Truck, CheckCircle2, XCircle, MapPin, AlertCircle } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const AdminOrdersPage: React.FC = () => {
  const [date, setDate] = useState<string>(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<number | string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [ordersData, hostelsData] = await Promise.all([
        api.getAllOrders(date || undefined),
        api.getHostels().catch(() => []),
      ]);
      setOrders(ordersData);
      setHostels(hostelsData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [date]);

  const handleDeliverHostel = async (hostel: Hostel) => {
    const confirmedCount = orders.filter(
      (o) => (o.hostelName === hostel.name) && o.status === 'CONFIRMED'
    ).length;

    if (confirmedCount === 0) {
      alert(`No pending orders for ${hostel.name} today.`);
      return;
    }

    if (!window.confirm(`Mark all ${confirmedCount} orders for ${hostel.name} as DELIVERED?\nThis will immediately send in-app delivery notifications to all ${confirmedCount} students.`)) {
      return;
    }

    setActionLoading(`hostel-${hostel.id}`);
    setStatusMessage(null);
    try {
      const res = await api.deliverOrdersByHostel(hostel.id, date);
      setStatusMessage(`🎉 Delivered ${res.deliveredCount} orders for ${hostel.name}! Notifications sent to all students.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark orders delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeliverSingle = async (orderId: number) => {
    setActionLoading(`order-${orderId}`);
    setStatusMessage(null);
    try {
      await api.deliverOrder(orderId);
      setStatusMessage(`🎉 Order #${orderId} marked delivered! Notification sent to student.`);
      await loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to mark order delivered');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminCancel = async (orderId: number) => {
    const reason = prompt('Please enter cancellation reason for this order (amount will be refunded to student):', 'Cancelled by kitchen admin');
    if (!reason || !reason.trim()) return;

    setActionLoading(`cancel-${orderId}`);
    try {
      await api.adminCancelOrder(orderId, reason.trim());
      setStatusMessage(`Order #${orderId} cancelled and amount refunded.`);
      await loadData();
    } catch (e: any) {
      alert(e.message || 'Failed to cancel order');
    } finally {
      setActionLoading(null);
    }
  };

  // Compute breakdown by hostel
  const hostelSummaries = hostels.map((h) => {
    const hostelOrders = orders.filter((o) => o.hostelName === h.name);
    const confirmed = hostelOrders.filter((o) => o.status === 'CONFIRMED').length;
    const delivered = hostelOrders.filter((o) => o.status === 'DELIVERED').length;
    const cancelled = hostelOrders.filter((o) => o.status === 'CANCELLED' || o.status === 'CANCELLED_BY_ADMIN').length;
    return {
      hostel: h,
      confirmed,
      delivered,
      cancelled,
      total: hostelOrders.length,
    };
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-brand-600" />
            <span>Dinner Orders Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage live dinner orders, portions, extra rotis, and dispatch hostel-wise deliveries
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold shadow-xs"
          />
          <button onClick={loadData} className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 shadow-xs" title="Refresh">
            <RefreshCw className="w-4 h-4 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Status Toast */}
      {statusMessage && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* ── SECTION: LOCATION-WISE DELIVERY ACTION CARDS ── */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Hostel Dispatch Panel</span>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Truck className="w-5 h-5 text-brand-600" />
              <span>Hostel-Wise Delivery & Broadcast</span>
            </h3>
          </div>
          <span className="text-xs font-bold text-slate-500">
            Total Orders: {orders.length} ({orders.filter(o => o.status === 'CONFIRMED').length} Pending, {orders.filter(o => o.status === 'DELIVERED').length} Delivered)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hostelSummaries.map((summary) => (
            <div
              key={summary.hostel.id}
              className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 flex flex-col justify-between gap-3 shadow-2xs hover:border-slate-300 transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-brand-600" />
                    {summary.hostel.name}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {summary.total} Total
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs mt-2">
                  <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-black text-[11px]">
                    {summary.confirmed} Pending
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 font-black text-[11px]">
                    {summary.delivered} Delivered
                  </span>
                  {summary.cancelled > 0 && (
                    <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 font-bold text-[11px]">
                      {summary.cancelled} Cancelled
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeliverHostel(summary.hostel)}
                disabled={summary.confirmed === 0 || actionLoading === `hostel-${summary.hostel.id}`}
                className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Truck className="w-4 h-4" />
                <span>
                  {actionLoading === `hostel-${summary.hostel.id}`
                    ? 'Delivering...'
                    : summary.confirmed > 0
                    ? `Mark ${summary.confirmed} Orders Delivered`
                    : 'All Orders Delivered ✓'}
                </span>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── SECTION: ORDERS TABLE ── */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500 text-[11px]">
                <th className="py-3 px-4">Order ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Delivery Location</th>
                <th className="py-3 px-4">Quantity & Portion</th>
                <th className="py-3 px-4">Included Items / Choice</th>
                <th className="py-3 px-4">Extra Rotis</th>
                <th className="py-3 px-4">Total Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    Loading dinner orders...
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-bold">
                    No dinner orders found for {formatDateDDMMYYYY(date)}.
                  </td>
                </tr>
              ) : (
                orders.map((o) => {
                  const isDelivered = o.status === 'DELIVERED';
                  const isConfirmed = o.status === 'CONFIRMED';
                  const isDalRice = o.orderType === 'HALF' && o.halfTiffinChoice === 'DAL_RICE';

                  return (
                    <tr key={o.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900">#{o.id}</td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-slate-900 block">{o.studentName}</span>
                        <span className="text-[11px] text-slate-400">{o.studentPhone}</span>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-800 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                        <span>{o.hostelName || 'Mahadev Hostel'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            o.orderType === 'FULL'
                              ? 'bg-brand-100 text-brand-900'
                              : 'bg-amber-100 text-amber-900'
                          }`}
                        >
                          {o.quantity && o.quantity > 1 ? `${o.quantity}x ` : ''}
                          {o.orderType} TIFFIN
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-800">
                        {isDalRice ? (
                          <span className="text-amber-800 font-bold">🍲 Dal + Steam Rice (No Rotis)</span>
                        ) : o.orderType === 'FULL' ? (
                          <span>🥘 {o.selectedSabzi || "Today's Sabzi"} + 4 Rotis + Dal + Rice</span>
                        ) : (
                          <span>🥘 {o.selectedSabzi || "Today's Sabzi"} + 4 Rotis</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-700">
                        {o.extraRotis && o.extraRotis > 0 ? (
                          <span className="text-brand-700">+{o.extraRotis} rotis</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                        ₹{Number(o.priceAtOrder).toFixed(0)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                            isDelivered
                              ? 'bg-emerald-100 text-emerald-800'
                              : isConfirmed
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {isDelivered ? 'Delivered ✓' : isConfirmed ? 'Confirmed' : o.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {isConfirmed && (
                          <>
                            <button
                              onClick={() => handleDeliverSingle(o.id)}
                              disabled={actionLoading === `order-${o.id}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors shadow-2xs"
                              title="Mark this single order delivered"
                            >
                              🚚 Deliver
                            </button>
                            <button
                              onClick={() => handleAdminCancel(o.id)}
                              disabled={actionLoading === `cancel-${o.id}`}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-red-600 hover:bg-red-50 border border-red-200 transition-colors shadow-2xs"
                            >
                              Cancel
                            </button>
                          </>
                        )}
                        {isDelivered && (
                          <span className="text-[11px] font-bold text-emerald-700">Delivered</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AdminOrdersPage;
