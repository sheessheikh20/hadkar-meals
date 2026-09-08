import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Meal, OrderType, HalfTiffinChoice, Order, MenuItem } from '../types';
import { ServiceStatusBanner } from '../components/ServiceStatusBanner';
import { formatDateDDMMYYYY, formatTime12Hour } from '../utils/dateUtils';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  X,
  ShoppingCart,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { requestNotificationPermission, onForegroundMessage } from '../utils/firebase';

// ─────── TYPES ───────
interface CartItem {
  localId: string;
  orderType: OrderType;
  halfTiffinChoice: HalfTiffinChoice;
  selectedSabzi: string;
  extraRotis: number;
  quantity: number;
}

function calcCartItemPrice(item: CartItem, halfPrice: number, fullPrice: number): number {
  const baseUnit = item.orderType === 'FULL' ? fullPrice : halfPrice;
  const rotiAddon = (item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') ? 0 : item.extraRotis * 6;
  return baseUnit * item.quantity + rotiAddon;
}

// ─────── MAIN COMPONENT ───────
export const StudentDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [statusInfo, setStatusInfo] = useState<{ serviceStatus: string; serviceBannerText: string; alerts: string[] }>({
    serviceStatus: 'OPEN',
    serviceBannerText: '🟢 Dinner Service is OPEN',
    alerts: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [orderActionLoading, setOrderActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Cart & UI State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [mealsData, balData, statData] = await Promise.all([
        api.getTodayMenu(),
        api.getMyBalance().catch(() => ({ balance: 0, studentId: 0 })),
        api.getCurrentServiceStatus().catch(() => ({
          serviceStatus: 'OPEN',
          serviceBannerText: '🟢 Hadkar Meals Dinner Service is OPEN',
          alerts: [],
        })),
      ]);

      setMeals(mealsData);
      setBalance(balData.balance);
      setStatusInfo(statData);

      const dinner = mealsData.find((m: any) => m.mealType === 'DINNER') || mealsData[0];
      if (!dinner || dinner.status !== 'PUBLISHED' || dinner.cutoffReached || dinner.notOpenYet) {
        setCart([]);
        setIsCartSheetOpen(false);
      }
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    const unsubscribe = onForegroundMessage((payload) => {
      setMessage({
        text: `${payload.notification?.title || 'Notification'}: ${payload.notification?.body || ''}`,
        type: 'success',
      });
      loadData();
    });
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [loadData]);

  // Derived State
  const dinnerMeal = meals.find((m) => m.mealType === 'DINNER') || (meals.length > 0 ? meals[0] : null);
  const sabziOptions = dinnerMeal?.menuItems?.filter((i) => i.category === 'SABZI') || [];
  const halfPrice = dinnerMeal ? Number(dinnerMeal.halfPrice) : 65;
  const fullPrice = dinnerMeal ? Number(dinnerMeal.fullPrice) : 100;
  const isDalRiceClosed = dinnerMeal?.menuItems?.some(
    (m) => (m.category === 'DAL' || m.name.toLowerCase().includes('dal')) && m.active === false
  ) || false;

  const activeOrders: Order[] = dinnerMeal?.userActiveOrders && dinnerMeal.userActiveOrders.length > 0
    ? dinnerMeal.userActiveOrders
    : (dinnerMeal?.userActiveOrder ? [dinnerMeal.userActiveOrder] : []);

  const validActiveOrders = activeOrders.filter((o) => o.status !== 'CANCELLED');
  const isOrdersOpen = Boolean(dinnerMeal && dinnerMeal.status === 'PUBLISHED' && !dinnerMeal.cutoffReached && !dinnerMeal.notOpenYet && dinnerMeal.open !== false);
  const isOrdersClosed = !isOrdersOpen;
  const allDelivered = validActiveOrders.length > 0 && validActiveOrders.every((o) => o.status === 'DELIVERED');

  // Cart Operations
  const addToCart = (type: OrderType, choice: HalfTiffinChoice = 'SABZI_ROTI') => {
    if (isOrdersClosed) return;
    const defaultSabzi = sabziOptions[0]?.name || '';
    const newItem: CartItem = {
      localId: `cart-${Date.now()}-${Math.random()}`,
      orderType: type,
      halfTiffinChoice: choice,
      selectedSabzi: defaultSabzi,
      extraRotis: 0,
      quantity: 1,
    };
    setCart((prev) => [...prev, newItem]);
  };

  const updateCartItem = (localId: string, updated: CartItem) => {
    setCart((prev) => prev.map((c) => (c.localId === localId ? updated : c)));
  };

  const removeCartItem = (localId: string) => {
    setCart((prev) => {
      const next = prev.filter((c) => c.localId !== localId);
      if (next.length === 0) setIsCartSheetOpen(false);
      return next;
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + calcCartItemPrice(item, halfPrice, fullPrice), 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group cart items to show quick add/minus in menu list
  const getQuantityForType = (type: OrderType, choice: HalfTiffinChoice) => {
    return cart.filter(c => c.orderType === type && c.halfTiffinChoice === choice).reduce((sum, item) => sum + item.quantity, 0);
  };

  const handlePlaceAllOrders = async () => {
    if (!dinnerMeal || cart.length === 0) return;
    
    setOrderActionLoading(true);
    let successCount = 0;
    let lastError = '';

    for (const item of cart) {
      try {
        let chosenSabzi = item.selectedSabzi || (sabziOptions[0]?.name || "Today's Sabzi");
        let rotis = item.extraRotis;
        let choiceToSend: string = item.orderType === 'FULL' ? 'FULL' : item.halfTiffinChoice;

        if (item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') {
          chosenSabzi = 'Dal + Steamed Rice';
          rotis = 0;
        }

        await api.placeOrder(dinnerMeal.id, item.orderType, chosenSabzi, rotis, choiceToSend, item.quantity);
        successCount++;
      } catch (err: any) {
        lastError = err.message || 'Failed to place order';
      }
    }

    if (successCount > 0) {
      setMessage({ text: `✅ Order Placed Successfully!`, type: 'success' });
      setCart([]);
      setIsCartSheetOpen(false);
    } else {
      setMessage({ text: lastError || 'Failed to place orders.', type: 'error' });
    }

    setOrderActionLoading(false);
    await loadData();
  };

  // ─────── RENDERERS ───────
  
  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-slate-200 mb-2"></div>
          <div className="h-4 w-24 bg-slate-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-32 font-sans">
      <ServiceStatusBanner serviceStatus={statusInfo.serviceStatus as any} serviceBannerText={statusInfo.serviceBannerText} />

      {/* Hero / Date / Info */}
      <div className="bg-white pt-2 pb-4 px-4 shadow-sm border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Today's Dinner</h1>
          <div className="bg-slate-100 px-3 py-1 rounded-full text-[10px] font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {dinnerMeal ? `${formatTime12Hour(dinnerMeal.orderOpenTime)} - ${formatTime12Hour(dinnerMeal.orderCutoffTime)}` : 'Closed'}
          </div>
        </div>
        
        {/* Active Order Alert */}
        {validActiveOrders.length > 0 && (
          <Link to="/student/orders" className="mt-4 block p-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white flex items-center justify-between shadow-sm shadow-emerald-500/20 active:scale-[0.98] transition-transform">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                {allDelivered ? '🛵' : '👨‍🍳'}
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-wider">{allDelivered ? 'Order Delivered' : 'Order Preparing'}</p>
                <p className="text-[10px] text-emerald-50 font-medium">{validActiveOrders.length} tiffin(s) • Tap to view</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-emerald-100" />
          </Link>
        )}
      </div>

      {message && (
        <div className="mx-4 mt-4 p-3 rounded-xl bg-slate-800 text-white text-xs font-bold flex items-center justify-between shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2">
            {message.type === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertCircle className="w-4 h-4 text-red-400" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)}><X className="w-4 h-4 text-slate-400" /></button>
        </div>
      )}

      {(!dinnerMeal || dinnerMeal.status !== 'PUBLISHED') ? (
        <div className="px-4 py-12 text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UtensilsCrossed className="w-8 h-8 text-slate-300" />
          </div>
          <h2 className="text-lg font-black text-slate-800">Menu not ready yet</h2>
          <p className="text-sm text-slate-500 mt-1">The kitchen is still preparing today's menu.</p>
        </div>
      ) : (
        <div className="px-4 mt-6 space-y-6">
          
          {/* Menu Showcase Horizontal Scroll */}
          {dinnerMeal.menuItems && dinnerMeal.menuItems.length > 0 && (
            <div>
              <h2 className="text-sm font-black text-slate-900 mb-3 tracking-tight">What's Cooking?</h2>
              <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 snap-x hide-scrollbar">
                {dinnerMeal.menuItems.map(item => (
                  <div key={item.id} className="snap-start shrink-0 w-28 p-3 rounded-2xl bg-white border border-slate-100 shadow-xs flex flex-col items-center text-center">
                    <div className="text-2xl mb-1">{item.category === 'SABZI' ? '🥘' : item.category === 'DAL' ? '🍲' : item.category === 'RICE' ? '🍚' : '🫓'}</div>
                    <span className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">{item.name}</span>
                    <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider mt-1">{item.category}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tiffin Options List */}
          <div>
            <h2 className="text-sm font-black text-slate-900 mb-3 tracking-tight">Order Tiffin</h2>
            <div className="space-y-4">
              
              {/* Full Tiffin */}
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded bg-orange-100 border border-orange-500 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                    </span>
                    <h3 className="text-base font-black text-slate-900">Full Tiffin</h3>
                  </div>
                  <p className="text-sm font-black text-slate-800">₹{fullPrice}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">Sabzi, 4 Roti, Dal, Steam Rice</p>
                </div>
                <div className="shrink-0 relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center text-4xl shadow-inner border border-orange-100">
                    🍱
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    {getQuantityForType('FULL', 'SABZI_ROTI') === 0 ? (
                      <button 
                        onClick={() => addToCart('FULL')}
                        disabled={isOrdersClosed}
                        className="bg-white text-brand-600 font-black text-sm px-6 py-1.5 rounded-xl border border-brand-200 shadow-sm shadow-brand-100 uppercase tracking-wide hover:bg-brand-50 disabled:opacity-50"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="bg-white flex items-center justify-between w-[90px] border border-brand-200 rounded-xl shadow-sm shadow-brand-100 text-brand-600 font-black">
                        <button onClick={() => {
                          const item = cart.find(c => c.orderType === 'FULL');
                          if(item) removeCartItem(item.localId);
                        }} className="px-2.5 py-1.5 hover:bg-brand-50 rounded-l-xl"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm">{getQuantityForType('FULL', 'SABZI_ROTI')}</span>
                        <button onClick={() => addToCart('FULL')} className="px-2.5 py-1.5 hover:bg-brand-50 rounded-r-xl"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Half Tiffin */}
              <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs flex justify-between gap-4 mt-6">
                <div className="flex-1">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="w-3 h-3 rounded bg-amber-100 border border-amber-500 flex items-center justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    </span>
                    <h3 className="text-base font-black text-slate-900">Half Tiffin</h3>
                  </div>
                  <p className="text-sm font-black text-slate-800">₹{halfPrice}</p>
                  <p className="text-[11px] text-slate-500 mt-1 leading-snug">Choose between Sabzi + 4 Roti OR Dal + Steam Rice.</p>
                </div>
                <div className="shrink-0 relative">
                  <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 flex items-center justify-center text-4xl shadow-inner border border-amber-100">
                    🥘
                  </div>
                  <div className="absolute -bottom-3 left-1/2 -translate-x-1/2">
                    {getQuantityForType('HALF', 'SABZI_ROTI') + getQuantityForType('HALF', 'DAL_RICE') === 0 ? (
                      <button 
                        onClick={() => addToCart('HALF')}
                        disabled={isOrdersClosed}
                        className="bg-white text-brand-600 font-black text-sm px-6 py-1.5 rounded-xl border border-brand-200 shadow-sm shadow-brand-100 uppercase tracking-wide hover:bg-brand-50 disabled:opacity-50"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="bg-white flex items-center justify-between w-[90px] border border-brand-200 rounded-xl shadow-sm shadow-brand-100 text-brand-600 font-black">
                        <button onClick={() => {
                          const item = cart.find(c => c.orderType === 'HALF');
                          if(item) removeCartItem(item.localId);
                        }} className="px-2.5 py-1.5 hover:bg-brand-50 rounded-l-xl"><Minus className="w-3.5 h-3.5" /></button>
                        <span className="text-sm">{getQuantityForType('HALF', 'SABZI_ROTI') + getQuantityForType('HALF', 'DAL_RICE')}</span>
                        <button onClick={() => addToCart('HALF')} className="px-2.5 py-1.5 hover:bg-brand-50 rounded-r-xl"><Plus className="w-3.5 h-3.5" /></button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Cart Bar (Like Zomato) */}
      {cart.length > 0 && !isCartSheetOpen && (
        <div className="fixed bottom-[72px] md:bottom-6 left-0 right-0 px-4 z-40 animate-slideUp">
          <button 
            onClick={() => setIsCartSheetOpen(true)}
            className="w-full bg-brand-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-brand-600/30 active:scale-[0.98] transition-transform"
          >
            <div className="flex flex-col text-left">
              <span className="text-[10px] font-bold text-brand-100 uppercase tracking-widest">{totalItems} Item{totalItems !== 1 ? 's' : ''} added</span>
              <span className="text-base font-black flex items-center gap-1">₹{cartTotal} <span className="text-[10px] font-medium text-brand-200 mt-1">plus taxes</span></span>
            </div>
            <div className="flex items-center gap-2 font-black text-sm uppercase tracking-wide">
              View Cart <ChevronRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* Cart Bottom Sheet Drawer */}
      {isCartSheetOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 animate-fadeIn" onClick={() => setIsCartSheetOpen(false)} />
          <div className="fixed bottom-0 left-0 right-0 bg-slate-50 rounded-t-[2rem] shadow-2xl z-50 flex flex-col max-h-[90vh] animate-slideUp">
            
            <div className="flex items-center justify-between p-5 pb-4 bg-white rounded-t-[2rem] shadow-sm relative z-10">
              <div>
                <h2 className="text-lg font-black text-slate-900 leading-tight">Your Cart</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{user?.hostelName || 'Delivery Location'}</p>
              </div>
              <button onClick={() => setIsCartSheetOpen(false)} className="p-2 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto pb-28 space-y-4 relative z-0">
              {cart.map((item, idx) => (
                <div key={item.localId} className="bg-white p-4 rounded-3xl border border-slate-100 shadow-xs relative">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-start gap-2">
                      <span className="w-3 h-3 mt-1 rounded bg-orange-100 border border-orange-500 flex items-center justify-center shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                      </span>
                      <div>
                        <span className="text-sm font-black text-slate-900 leading-tight block">
                          {item.orderType === 'FULL' ? 'Full Tiffin' : item.halfTiffinChoice === 'DAL_RICE' ? 'Half Tiffin (Dal Rice)' : 'Half Tiffin (Sabzi Roti)'}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500">₹{item.orderType === 'FULL' ? fullPrice : halfPrice}</span>
                      </div>
                    </div>
                    
                    {/* Item Quantity in Cart */}
                    <div className="bg-white flex items-center justify-between w-20 border border-brand-200 rounded-lg shadow-xs text-brand-600 font-black">
                      <button onClick={() => {
                        if(item.quantity > 1) {
                          updateCartItem(item.localId, {...item, quantity: item.quantity - 1});
                        } else {
                          removeCartItem(item.localId);
                        }
                      }} className="px-2 py-1"><Minus className="w-3 h-3" /></button>
                      <span className="text-xs">{item.quantity}</span>
                      <button onClick={() => updateCartItem(item.localId, {...item, quantity: item.quantity + 1})} className="px-2 py-1"><Plus className="w-3 h-3" /></button>
                    </div>
                  </div>

                  {/* Half Tiffin Combo Switcher */}
                  {item.orderType === 'HALF' && (
                    <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200">
                      <button 
                        onClick={() => updateCartItem(item.localId, {...item, halfTiffinChoice: 'SABZI_ROTI'})}
                        className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-colors ${item.halfTiffinChoice === 'SABZI_ROTI' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        Sabzi + Roti
                      </button>
                      <button 
                        onClick={() => updateCartItem(item.localId, {...item, halfTiffinChoice: 'DAL_RICE', extraRotis: 0})}
                        disabled={isDalRiceClosed}
                        className={`flex-1 py-1.5 text-[11px] font-black rounded-lg transition-colors ${item.halfTiffinChoice === 'DAL_RICE' ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : isDalRiceClosed ? 'opacity-40 text-red-600 line-through' : 'text-slate-500 hover:bg-slate-200'}`}
                      >
                        Dal + Rice
                      </button>
                    </div>
                  )}

                  {/* Customizations */}
                  <div className="space-y-3 mt-3 pt-3 border-t border-slate-50">
                    {!(item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') && sabziOptions.length > 0 && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sabzi Choice</span>
                        <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
                          {sabziOptions.map(s => (
                            <button
                              key={s.id}
                              disabled={s.active === false}
                              onClick={() => updateCartItem(item.localId, {...item, selectedSabzi: s.name})}
                              className={`shrink-0 px-3 py-1.5 rounded-xl border text-[11px] font-bold transition-colors ${s.active === false ? 'opacity-40 border-slate-200 bg-slate-50 text-slate-500' : item.selectedSabzi === s.name ? 'border-brand-500 bg-brand-50 text-brand-700 shadow-sm' : 'border-slate-200 bg-white text-slate-700'}`}
                            >
                              {s.name} {s.active === false && '(Sold Out)'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {!(item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') && (
                      <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <span className="text-[11px] font-black text-slate-700 block">Extra Roti</span>
                          <span className="text-[9px] font-bold text-slate-400 block">₹6 per piece</span>
                        </div>
                        <div className="flex items-center gap-3 bg-white rounded-lg p-1 border border-slate-200 shadow-xs">
                          <button onClick={() => updateCartItem(item.localId, {...item, extraRotis: Math.max(0, item.extraRotis - 1)})} className="w-6 h-6 flex items-center justify-center text-slate-600 hover:bg-slate-100 rounded"><Minus className="w-3 h-3" /></button>
                          <span className="text-xs font-black w-3 text-center">{item.extraRotis}</span>
                          <button onClick={() => updateCartItem(item.localId, {...item, extraRotis: item.extraRotis + 1})} className="w-6 h-6 flex items-center justify-center text-brand-600 hover:bg-brand-50 rounded"><Plus className="w-3 h-3" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="absolute top-4 right-4 text-sm font-black text-slate-900">
                    ₹{calcCartItemPrice(item, halfPrice, fullPrice)}
                  </div>
                </div>
              ))}

              {/* Bill Details */}
              <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-xs">
                <h3 className="text-sm font-black text-slate-900 mb-3 tracking-tight">Bill Details</h3>
                <div className="space-y-2.5 text-xs font-bold text-slate-500">
                  <div className="flex justify-between">
                    <span>Item Total</span>
                    <span className="text-slate-800">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span className="text-brand-600">FREE</span>
                  </div>
                  <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between font-black text-slate-900 text-sm">
                    <span>To Pay</span>
                    <span>₹{cartTotal}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Place Order CTA Bottom Fixed */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-6 bg-white border-t border-slate-200 shadow-[0_-10px_20px_rgba(0,0,0,0.05)] rounded-t-3xl z-20">
              <button 
                onClick={handlePlaceAllOrders}
                disabled={orderActionLoading}
                className="w-full py-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-95 text-white font-black text-base transition-transform shadow-lg shadow-brand-600/30 flex items-center justify-between px-6"
              >
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-bold text-brand-200 uppercase tracking-wider">{totalItems} Item{totalItems !== 1 ? 's' : ''}</span>
                  <span className="text-lg">₹{cartTotal}</span>
                </div>
                <div className="flex items-center gap-2">
                  {orderActionLoading ? 'Processing...' : 'Place Order'} <ChevronRight className="w-5 h-5" />
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboardPage;
