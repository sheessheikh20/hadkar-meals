import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Order, Meal, MenuItem, OrderType, HalfTiffinChoice } from '../types';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import {
  RefreshCw,
  XCircle,
  Edit3,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Plus,
  Minus
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const StudentOrdersPage: React.FC = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [activeTab, setActiveTab] = useState<'ALL' | 'TODAY' | 'PAST'>('ALL');

  // Edit Modal State
  const [dinnerMeal, setDinnerMeal] = useState<Meal | null>(null);
  const [sabziOptions, setSabziOptions] = useState<MenuItem[]>([]);
  const [halfPrice, setHalfPrice] = useState<number>(65);
  const [fullPrice, setFullPrice] = useState<number>(100);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editPortion, setEditPortion] = useState<OrderType>('FULL');
  const [editHalfChoice, setEditHalfChoice] = useState<HalfTiffinChoice>('SABZI_ROTI');
  const [editSabzi, setEditSabzi] = useState<string>('');
  const [editExtraRotis, setEditExtraRotis] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [savingEdit, setSavingEdit] = useState<boolean>(false);

  const todayStr = new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0];

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
    if (!window.confirm('Cancel this dinner order?')) return;
    setCancellingId(orderId);
    setMsg(null);
    try {
      await api.cancelOrder(orderId, 'Cancelled from My Orders');
      setMsg({ text: 'Order cancelled successfully.', type: 'success' });
      await loadData();
    } catch (e: any) {
      setMsg({ text: e.message || 'Cannot cancel order.', type: 'error' });
    } finally {
      setCancellingId(null);
    }
  };

  const openEditModal = (order: Order) => {
    setEditingOrder(order);
    setEditPortion(order.orderType);
    setEditHalfChoice(order.halfTiffinChoice === 'DAL_RICE' ? 'DAL_RICE' : 'SABZI_ROTI');
    setEditSabzi(order.selectedSabzi && !order.selectedSabzi.includes('Dal') ? order.selectedSabzi : sabziOptions[0]?.name || '');
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
      setMsg({ text: `Order updated!`, type: 'success' });
      setEditingOrder(null);
      await loadData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to update order.', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const isToday = o.orderDate === todayStr;
    if (activeTab === 'TODAY') return isToday;
    if (activeTab === 'PAST') return !isToday;
    return true;
  }).sort((a, b) => {
    const dateComp = (b.orderDate || '').localeCompare(a.orderDate || '');
    if (dateComp !== 0) return dateComp;
    return (b.id || 0) - (a.id || 0);
  });

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans">
      
      {/* Header */}
      <div className="bg-white pt-2 pb-4 px-4 shadow-sm border-b border-slate-100 flex items-center justify-between">
        <h1 className="text-xl font-black text-slate-900 tracking-tight">Your Orders</h1>
        <button onClick={loadData} className="p-2 rounded-full bg-slate-50 border border-slate-100 text-slate-500 hover:bg-slate-100">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alert toast */}
      {msg && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            {msg.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{msg.text}</span>
          </div>
          <button onClick={() => setMsg(null)}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 px-4 mt-4 pb-2 overflow-x-auto hide-scrollbar">
        <button onClick={() => setActiveTab('ALL')} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
          All Orders
        </button>
        <button onClick={() => setActiveTab('TODAY')} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'TODAY' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
          Today
        </button>
        <button onClick={() => setActiveTab('PAST')} className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeTab === 'PAST' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
          Past Orders
        </button>
      </div>

      <div className="px-4 mt-4 space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-slate-200/50 animate-pulse rounded-3xl" />)}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center text-3xl mx-auto mb-4">🍽️</div>
            <h3 className="font-black text-slate-800 text-lg">No orders found</h3>
            <p className="text-sm text-slate-500 mt-1">Looks like you haven't ordered yet.</p>
          </div>
        ) : (
          filteredOrders.map((o) => {
            const isToday = o.orderDate === todayStr;
            const isDelivered = o.status === 'DELIVERED' || o.status === 'COMPLETED';
            const isCancelled = o.status?.includes('CANCELLED');
            
            return (
              <div key={o.id} className="bg-white rounded-3xl p-4 shadow-xs border border-slate-100 relative">
                {isToday && (
                  <span className="absolute -top-2.5 right-4 px-2 py-0.5 bg-brand-500 text-white text-[9px] font-black uppercase tracking-wider rounded-md shadow-sm">
                    Today
                  </span>
                )}
                
                <div className="flex items-start justify-between mb-3 border-b border-slate-50 pb-3">
                  <div className="flex gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 border border-amber-100 flex items-center justify-center text-xl shadow-inner shrink-0">
                      🍱
                    </div>
                    <div>
                      <h4 className="font-black text-slate-900 text-sm">Hadkar Meals</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{user?.hostelName || 'Hostel Delivery'}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{formatDateDDMMYYYY(o.orderDate || '')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Amount</span>
                    <span className="text-sm font-black text-slate-900">₹{Number(o.priceAtOrder || 0).toFixed(0)}</span>
                  </div>
                </div>

                <div className="mb-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                    <span className="w-4 h-4 rounded-full bg-slate-100 flex items-center justify-center text-[10px]">{o.quantity}</span>
                    <span>× {o.orderType === 'FULL' ? 'Full Tiffin' : 'Half Tiffin'} ({o.halfTiffinChoice === 'DAL_RICE' ? 'Dal Rice' : o.selectedSabzi})</span>
                  </div>
                  {o.extraRotis && o.extraRotis > 0 ? (
                    <div className="flex items-center gap-2 text-xs font-medium text-slate-500 mt-1 pl-6">
                      +{o.extraRotis} Extra Rotis
                    </div>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <span className={`text-[11px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${isDelivered ? 'bg-emerald-50 text-emerald-700' : isCancelled ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-700'}`}>
                    {isDelivered ? '✓ Delivered' : isCancelled ? '× Cancelled' : '● Preparing'}
                  </span>
                  
                  <div className="flex gap-2">
                    {o.canCancel && o.status === 'CONFIRMED' && (
                      <>
                        <button onClick={() => handleCancel(o.id)} className="text-[11px] font-bold text-red-600 border border-red-200 px-3 py-1.5 rounded-xl hover:bg-red-50">Cancel</button>
                        <button onClick={() => openEditModal(o)} className="text-[11px] font-bold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl hover:bg-slate-50">Edit</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* ── EDIT ORDER MODAL ── */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center animate-fadeIn p-0 sm:p-4">
          <div className="bg-slate-50 rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] animate-slideUp">
            
            <div className="flex items-center justify-between p-5 pb-3 bg-white rounded-t-[2rem] sm:rounded-t-[2rem] border-b border-slate-100">
              <div>
                <h3 className="text-lg font-black text-slate-900">Edit Order</h3>
              </div>
              <button onClick={() => setEditingOrder(null)} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded bg-orange-100 border border-orange-500 flex items-center justify-center shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    </span>
                    <span className="text-sm font-black text-slate-900 leading-tight block">
                      Change Portion
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 bg-slate-50 p-1 rounded-xl border border-slate-200 mb-4">
                  <button onClick={() => { setEditPortion('FULL'); setEditHalfChoice('SABZI_ROTI'); }} className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors ${editPortion === 'FULL' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Full Tiffin</button>
                  <button onClick={() => setEditPortion('HALF')} className={`flex-1 py-2 text-xs font-black rounded-lg transition-colors ${editPortion === 'HALF' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Half Tiffin</button>
                </div>

                {editPortion === 'HALF' && (
                  <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200">
                    <button onClick={() => setEditHalfChoice('SABZI_ROTI')} className={`flex-1 py-1.5 text-[11px] font-black rounded-lg ${editHalfChoice === 'SABZI_ROTI' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Sabzi + Roti</button>
                    <button onClick={() => setEditHalfChoice('DAL_RICE')} className={`flex-1 py-1.5 text-[11px] font-black rounded-lg ${editHalfChoice === 'DAL_RICE' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500'}`}>Dal + Rice</button>
                  </div>
                )}

                {!(editPortion === 'HALF' && editHalfChoice === 'DAL_RICE') && sabziOptions.length > 0 && (
                  <div className="mb-4">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sabzi Choice</span>
                    <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                      {sabziOptions.map(s => (
                        <button key={s.id} onClick={() => setEditSabzi(s.name)} className={`shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-bold ${editSabzi === s.name ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700'}`}>
                          {s.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-2">
                  <span className="text-[11px] font-black text-slate-700 block">Quantity</span>
                  <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-slate-200 shadow-xs">
                    <button onClick={() => setEditQuantity(Math.max(1, editQuantity - 1))} className="w-6 h-6 flex items-center justify-center text-slate-600 rounded"><Minus className="w-3 h-3" /></button>
                    <span className="text-xs font-black w-3 text-center">{editQuantity}</span>
                    <button onClick={() => setEditQuantity(editQuantity + 1)} className="w-6 h-6 flex items-center justify-center text-brand-600 rounded"><Plus className="w-3 h-3" /></button>
                  </div>
                </div>

                {!(editPortion === 'HALF' && editHalfChoice === 'DAL_RICE') && (
                  <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="text-[11px] font-black text-slate-700 block">Extra Roti (+₹6)</span>
                    <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-slate-200 shadow-xs">
                      <button onClick={() => setEditExtraRotis(Math.max(0, editExtraRotis - 1))} className="w-6 h-6 flex items-center justify-center text-slate-600 rounded"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs font-black w-3 text-center">{editExtraRotis}</span>
                      <button onClick={() => setEditExtraRotis(editExtraRotis + 1)} className="w-6 h-6 flex items-center justify-center text-brand-600 rounded"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] sm:rounded-b-[2rem]">
              <button onClick={handleSaveEditOrder} disabled={savingEdit} className="w-full py-4 rounded-2xl bg-brand-600 active:scale-95 text-white font-black text-base shadow-lg shadow-brand-600/30 flex items-center justify-between px-6">
                <span className="text-[10px] font-bold uppercase tracking-wider block">Total ₹{editTotalPrice}</span>
                <div className="flex items-center gap-2">{savingEdit ? 'Saving...' : 'Update Order'} <ChevronRight className="w-5 h-5" /></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentOrdersPage;
