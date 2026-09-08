import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Meal, OrderType, HalfTiffinChoice, Order, MenuItem } from '../types';
import { ServiceStatusBanner } from '../components/ServiceStatusBanner';
import { formatDateDDMMYYYY } from '../utils/dateUtils';
import {
  UtensilsCrossed,
  Clock,
  CheckCircle2,
  AlertCircle,
  IndianRupee,
  RefreshCw,
  ShoppingBag,
  MapPin,
  Plus,
  Minus,
  XCircle,
  Lock,
  Edit3,
  X,
  Sparkles,
  Bell,
  Trash2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  CheckCheck,
  Zap
} from 'lucide-react';
import { requestNotificationPermission, onForegroundMessage } from '../utils/firebase';

// ─────── CART ITEM TYPE ───────
interface CartItem {
  localId: string;
  orderType: OrderType;
  halfTiffinChoice: HalfTiffinChoice;
  selectedSabzi: string;
  extraRotis: number;
  quantity: number;
}

function calcCartItemPrice(
  item: CartItem,
  halfPrice: number,
  fullPrice: number
): number {
  const baseUnit = item.orderType === 'FULL' ? fullPrice : halfPrice;
  const rotiAddon = (item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') ? 0 : item.extraRotis * 6;
  return baseUnit * item.quantity + rotiAddon;
}

function cartItemLabel(item: CartItem): string {
  if (item.orderType === 'FULL') {
    return `Full Tiffin${item.quantity > 1 ? ` ×${item.quantity}` : ''} — ${item.selectedSabzi || 'Sabzi'}${item.extraRotis > 0 ? ` +${item.extraRotis} Roti` : ''}`;
  }
  if (item.halfTiffinChoice === 'DAL_RICE') {
    return `Half Tiffin${item.quantity > 1 ? ` ×${item.quantity}` : ''} — Dal + Steam Rice`;
  }
  return `Half Tiffin${item.quantity > 1 ? ` ×${item.quantity}` : ''} — ${item.selectedSabzi || 'Sabzi'}${item.extraRotis > 0 ? ` +${item.extraRotis} Roti` : ''}`;
}

// ─────── CART ITEM CONFIGURATOR ───────
interface CartItemConfigProps {
  item: CartItem;
  sabziOptions: MenuItem[];
  halfPrice: number;
  fullPrice: number;
  isDalRiceClosed?: boolean;
  onChange: (updated: CartItem) => void;
  onRemove: () => void;
  onSplit?: () => void;
  onAddAnother?: () => void;
  index: number;
}

const CartItemConfig: React.FC<CartItemConfigProps> = ({
  item, sabziOptions, halfPrice, fullPrice, isDalRiceClosed, onChange, onRemove, onSplit, onAddAnother, index
}) => {
  const [expanded, setExpanded] = useState(true);
  const price = calcCartItemPrice(item, halfPrice, fullPrice);

  return (
    <div className="border-2 border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-black flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div>
            <span className="text-sm font-black text-slate-900 block leading-tight">{cartItemLabel(item)}</span>
            <span className="text-xs font-bold text-brand-600">₹{price}</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-200 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={onRemove}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Portion Type */}
          <div>
            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Portion</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => onChange({ ...item, orderType: 'FULL', halfTiffinChoice: 'SABZI_ROTI' })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                  item.orderType === 'FULL'
                    ? 'border-orange-500 bg-orange-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      item.orderType === 'FULL' ? 'border-orange-600 bg-orange-600' : 'border-slate-300'
                    }`}>
                      {item.orderType === 'FULL' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                    <div>
                      <span className="text-sm font-black text-slate-900 block">Full Tiffin</span>
                      <span className="text-[11px] text-slate-500 font-medium">Sabzi + 4 Roti + Dal + Rice</span>
                    </div>
                  </div>
                  <span className="text-base font-black text-orange-600">₹{fullPrice}</span>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onChange({ ...item, orderType: 'HALF' })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative ${
                  item.orderType === 'HALF'
                    ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      item.orderType === 'HALF' ? 'border-amber-600 bg-amber-600' : 'border-slate-300'
                    }`}>
                      {item.orderType === 'HALF' && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                    </span>
                    <div>
                      <span className="text-sm font-black text-slate-900 block">Half Tiffin</span>
                      <span className="text-[11px] text-slate-500 font-medium">Sabzi+Roti OR Dal+Rice</span>
                    </div>
                  </div>
                  <span className="text-base font-black text-amber-700">₹{halfPrice}</span>
                </div>
              </button>
            </div>
          </div>

          {/* Half Tiffin Sub-choice */}
          {item.orderType === 'HALF' && (
            <div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Half Tiffin Combo</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onChange({ ...item, halfTiffinChoice: 'SABZI_ROTI' })}
                  className={`py-2 px-3 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                    item.halfTiffinChoice === 'SABZI_ROTI'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">🥘</span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Sabzi + 4 Roti</span>
                  </div>
                </button>
                <button
                  type="button"
                  disabled={isDalRiceClosed}
                  onClick={() => !isDalRiceClosed && onChange({ ...item, halfTiffinChoice: 'DAL_RICE', extraRotis: 0 })}
                  className={`py-2 px-3 rounded-xl border-2 text-left transition-all flex items-center gap-2 ${
                    isDalRiceClosed
                      ? 'border-red-200 bg-red-50/60 opacity-60 cursor-not-allowed'
                      : item.halfTiffinChoice === 'DAL_RICE'
                      ? 'border-amber-500 bg-amber-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span className="text-lg">🍲</span>
                  <div>
                    <span className="text-xs font-black text-slate-900 block">Dal + Steam Rice</span>
                    {isDalRiceClosed && (
                      <span className="text-[10px] text-red-600 font-black block">❌ Orders Closed</span>
                    )}
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Sabzi Selection */}
          {!(item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') && sabziOptions.length > 0 && (
            <div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-2">Choose Sabzi</span>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sabziOptions.map((s) => {
                  const isSelected = item.selectedSabzi === s.name;
                  const isOutOfStock = s.active === false;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => !isOutOfStock && onChange({ ...item, selectedSabzi: s.name })}
                      className={`py-2 px-2.5 rounded-xl border-2 text-left transition-all ${
                        isOutOfStock
                          ? 'border-red-200 bg-red-50/60 opacity-60 cursor-not-allowed'
                          : isSelected
                          ? 'border-brand-600 bg-brand-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <span className="text-xs font-bold text-slate-900 leading-tight line-clamp-2 block">{s.name}</span>
                      {isOutOfStock ? (
                        <span className="text-[10px] text-red-600 font-black block mt-0.5">❌ Sold Out</span>
                      ) : isSelected ? (
                        <span className="text-[10px] text-brand-600 font-black block mt-0.5">✓ Selected</span>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Quantity + Extra Rotis Row */}
          <div className="grid grid-cols-2 gap-3">
            {/* Quantity */}
            <div>
              <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Qty</span>
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => onChange({ ...item, quantity: Math.max(1, item.quantity - 1) })}
                  disabled={item.quantity <= 1}
                  className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold disabled:opacity-40 shrink-0"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-base font-black text-slate-900 flex-1 text-center">{item.quantity}</span>
                <button
                  type="button"
                  onClick={() => onChange({ ...item, quantity: Math.min(10, item.quantity + 1) })}
                  className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Extra Rotis */}
            {!(item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') ? (
              <div>
                <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Extra Roti (+₹6)</span>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => onChange({ ...item, extraRotis: Math.max(0, item.extraRotis - 1) })}
                    disabled={item.extraRotis === 0}
                    className="w-8 h-8 rounded-lg bg-white border border-slate-300 text-slate-700 flex items-center justify-center font-bold disabled:opacity-40 shrink-0"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-base font-black text-slate-900 flex-1 text-center">{item.extraRotis}</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...item, extraRotis: Math.min(15, item.extraRotis + 1) })}
                    className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-end">
                <div className="p-2 bg-slate-50 rounded-xl border border-slate-200 w-full text-center">
                  <span className="text-[11px] text-slate-500 font-bold">No Rotis</span>
                  <span className="block text-[10px] text-slate-400">Dal+Rice combo</span>
                </div>
              </div>
            )}
          </div>

          {/* ── SPLIT / DIFFERENT SABZI BANNER ── */}
          {item.quantity > 1 && onSplit && (
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-start gap-2.5">
                <span className="text-xl shrink-0">💡</span>
                <div>
                  <p className="text-xs font-black text-amber-950">
                    Want different vegetables in each of these {item.quantity} tiffins?
                  </p>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Currently both will have <strong>{item.selectedSabzi || "the selected sabzi"}</strong>. Tap "Split Tiffins" to choose different sabzis for each!
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onSplit}
                className="w-full sm:w-auto px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-black shrink-0 transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <span>🔀 Split into {item.quantity} Separate Tiffins</span>
              </button>
            </div>
          )}

          {/* Quick Add Another Tiffin */}
          {onAddAnother && (
            <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={onAddAnother}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 text-xs font-bold transition-colors border border-orange-200"
              >
                <Plus className="w-3.5 h-3.5 text-orange-600" />
                <span>+ Add Another {item.orderType === 'FULL' ? 'Full' : 'Half'} Tiffin</span>
              </button>
              <span className="text-xs font-bold text-slate-500">₹{price}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

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

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

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
      if (!dinner || dinner.status !== 'PUBLISHED' || dinner.cutoffReached) {
        setCart([]);
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
  const isOrdersOpen = Boolean(
    dinnerMeal &&
    dinnerMeal.status === 'PUBLISHED' &&
    !dinnerMeal.cutoffReached &&
    dinnerMeal.open !== false
  );
  const isOrdersClosed = !isOrdersOpen;
  const allDelivered = validActiveOrders.length > 0 && validActiveOrders.every((o) => o.status === 'DELIVERED');

  // Auto pre-populate 1 order card if cart is empty and student hasn't ordered yet
  useEffect(() => {
    if (
      dinnerMeal &&
      dinnerMeal.status === 'PUBLISHED' &&
      !dinnerMeal.cutoffReached &&
      cart.length === 0 &&
      activeOrders.length === 0 &&
      sabziOptions.length > 0
    ) {
      setCart([
        {
          localId: `cart-initial-${Date.now()}`,
          orderType: 'FULL',
          halfTiffinChoice: 'SABZI_ROTI',
          selectedSabzi: sabziOptions[0].name,
          extraRotis: 0,
          quantity: 1,
        },
      ]);
    }
  }, [dinnerMeal?.status, dinnerMeal?.id, activeOrders.length, sabziOptions.length]);

  // Cart helpers
  const addToCart = (type: OrderType) => {
    if (!dinnerMeal || dinnerMeal.status !== 'PUBLISHED' || dinnerMeal.cutoffReached) {
      setMessage({
        text: '⚠️ Ordering is not open. The dinner menu has not been published yet or orders are closed.',
        type: 'error',
      });
      return;
    }
    const defaultSabzi = sabziOptions[0]?.name || '';
    const newItem: CartItem = {
      localId: `cart-${Date.now()}-${Math.random()}`,
      orderType: type,
      halfTiffinChoice: 'SABZI_ROTI',
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
    setCart((prev) => prev.filter((c) => c.localId !== localId));
  };

  const splitCartItem = (localId: string) => {
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.localId === localId);
      if (idx === -1) return prev;
      const target = prev[idx];
      if (target.quantity <= 1) return prev;

      const newItems: CartItem[] = [];
      const remainingSabzis = sabziOptions.filter((s) => s.name !== target.selectedSabzi);

      for (let i = 0; i < target.quantity; i++) {
        let chosenSabzi = target.selectedSabzi;
        if (i > 0 && remainingSabzis.length > 0) {
          chosenSabzi = remainingSabzis[(i - 1) % remainingSabzis.length].name;
        }

        newItems.push({
          ...target,
          localId: `cart-${Date.now()}-${i}-${Math.random()}`,
          quantity: 1,
          selectedSabzi: chosenSabzi,
          extraRotis: i === 0 ? target.extraRotis : 0,
        });
      }

      const copy = [...prev];
      copy.splice(idx, 1, ...newItems);
      return copy;
    });
  };

  const addAnotherWithDifferentSabzi = (baseType: OrderType, currentSabzi: string) => {
    const remaining = sabziOptions.filter((s) => s.name !== currentSabzi);
    const nextSabzi = remaining[0]?.name || sabziOptions[0]?.name || '';
    const newItem: CartItem = {
      localId: `cart-${Date.now()}-${Math.random()}`,
      orderType: baseType,
      halfTiffinChoice: 'SABZI_ROTI',
      selectedSabzi: nextSabzi,
      extraRotis: 0,
      quantity: 1,
    };
    setCart((prev) => [...prev, newItem]);
  };

  const cartTotal = cart.reduce((sum, item) => sum + calcCartItemPrice(item, halfPrice, fullPrice), 0);
  const totalTiffinsInCart = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Place all cart orders
  const handlePlaceAllOrders = async () => {
    if (!dinnerMeal || cart.length === 0) return;

    // 1. Check if tonight's dinner orders are closed
    if (dinnerMeal.status === 'CLOSED') {
      setMessage({
        text: `⛔ Orders for tonight's dinner are currently closed by the kitchen.`,
        type: 'error',
      });
      return;
    }

    // 2. Check if any cart item has a dish with closed orders
    for (const item of cart) {
      if (item.orderType === 'HALF' && item.halfTiffinChoice === 'DAL_RICE') {
        if (isDalRiceClosed) {
          setMessage({
            text: `⚠️ Orders for "Dal + Steamed Rice" are currently closed by the kitchen. Please select Sabzi + Roti.`,
            type: 'error',
          });
          return;
        }
      } else {
        const sabziObj = sabziOptions.find((s) => s.name.toLowerCase() === (item.selectedSabzi || '').toLowerCase());
        if (sabziObj && sabziObj.active === false) {
          setMessage({
            text: `⚠️ Orders for "${sabziObj.name}" are currently closed by the kitchen. Please select another vegetable.`,
            type: 'error',
          });
          return;
        }
      }
    }

    setOrderActionLoading(true);
    setMessage(null);

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
      setMessage({
        text: `✅ ${successCount} order${successCount > 1 ? 's' : ''} placed successfully! Your dinner is confirmed.`,
        type: 'success',
      });
      setCart([]);
    } else {
      setMessage({ text: lastError || 'Failed to place orders. Please try again.', type: 'error' });
    }

    setOrderActionLoading(false);
    await loadData();
  };

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-4 sm:py-8 space-y-4 sm:space-y-6">
      {/* Service Banner */}
      <ServiceStatusBanner
        serviceStatus={statusInfo.serviceStatus as any}
        serviceBannerText={statusInfo.serviceBannerText}
      />

      {/* ── TOP HEADER: Welcome + Balance ── */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center text-xl font-bold shrink-0">
              👤
            </div>
            <div className="min-w-0">
              <h1 className="text-base sm:text-xl font-black text-slate-900 truncate">
                Hey, {user?.fullName?.split(' ')[0] || 'Customer'} 👋
              </h1>
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-1 flex-wrap">
                <MapPin className="w-3 h-3 text-brand-600 shrink-0" />
                <span className="truncate">{user?.hostelName || 'Delivery Location'}</span>
                <span className="mx-0.5 hidden sm:inline">•</span>
                <span className="hidden sm:inline">{formatDateDDMMYYYY(new Date())}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200 text-right">
              <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Balance Due</span>
              <span className={`text-sm sm:text-base font-black ${balance > 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                ₹{Number(balance).toFixed(0)}
              </span>
            </div>

            <button
              onClick={async () => {
                const token = await requestNotificationPermission();
                setMessage(token
                  ? { text: '🔔 Push notifications enabled!', type: 'success' }
                  : { text: '⚠️ Notification permission not granted.', type: 'error' }
                );
              }}
              className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
              title="Enable Notifications"
            >
              <Bell className="w-4 h-4 text-amber-600" />
            </button>

            <button
              onClick={loadData}
              className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── ALERT TOAST ── */}
      {message && (
        <div
          className={`p-3 sm:p-4 rounded-2xl text-xs font-bold flex items-start justify-between gap-3 animate-fadeIn ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          <div className="flex items-start gap-2">
            {message.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              : <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            }
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} className="shrink-0 text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── MAIN DINNER CARD ── */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold text-xs">
          Loading tonight's dinner menu...
        </div>
      ) : !dinnerMeal ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center">
          <UtensilsCrossed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-lg font-black text-slate-800">No Dinner Menu Published Yet</h3>
          <p className="text-xs text-slate-500 mt-1">
            Tonight's dinner menu has not been published by the kitchen yet. Check back shortly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* ── DINNER HERO BANNER ── */}
          <div className="rounded-2xl sm:rounded-3xl overflow-hidden shadow-md">
            <div className="p-4 sm:p-6 bg-gradient-to-br from-brand-700 via-brand-600 to-amber-600 text-white">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] font-black uppercase tracking-wider">
                      🌙 Tonight's Dinner
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      dinnerMeal.status === 'PUBLISHED' && !dinnerMeal.cutoffReached
                        ? 'bg-emerald-400 text-slate-900'
                        : 'bg-black/30 text-white'
                    }`}>
                      {dinnerMeal.status === 'PUBLISHED' && !dinnerMeal.cutoffReached
                        ? '🟢 ACCEPTING ORDERS'
                        : '⛔ ORDERS CLOSED'}
                    </span>
                    <span className="text-xs text-amber-100 font-bold">
                      {formatDateDDMMYYYY(dinnerMeal.mealDate)}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black mt-1.5">Fresh Homestyle Dinner Tiffin</h2>
                  <p className="text-xs text-amber-100 mt-0.5">
                    Delivered hot to <strong>{user?.hostelName || 'your hostel'}</strong>
                  </p>
                </div>
                <div className="bg-black/20 backdrop-blur-sm px-4 py-2.5 rounded-2xl border border-white/20 self-start sm:self-auto shrink-0 text-left sm:text-right">
                  <span className="text-[10px] uppercase font-bold text-amber-200 block">Daily Ordering Window</span>
                  <span className="text-base sm:text-lg font-black text-white flex items-center sm:justify-end gap-1.5">
                    <Clock className="w-4 h-4 text-amber-300" />
                    <span>{dinnerMeal.orderOpenTime?.slice(0, 5) || '19:00'} – {dinnerMeal.orderCutoffTime?.slice(0, 5) || '20:00'}</span>
                  </span>
                </div>
              </div>

              {/* Tonight's Menu Items Preview */}
              {dinnerMeal.menuItems && dinnerMeal.menuItems.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {dinnerMeal.menuItems.slice(0, 6).map((item) => (
                    <span
                      key={item.id}
                      className="px-2.5 py-1 rounded-full bg-white/15 border border-white/20 text-white text-xs font-bold"
                    >
                      {item.category === 'SABZI' ? '🥘' : item.category === 'DAL' ? '🍲' : item.category === 'RICE' ? '🍚' : item.category === 'ROTI' ? '🫓' : '🍽️'} {item.name}
                    </span>
                  ))}
                  {dinnerMeal.menuItems.length > 6 && (
                    <span className="px-2.5 py-1 rounded-full bg-white/10 text-amber-200 text-xs font-bold">
                      +{dinnerMeal.menuItems.length - 6} more
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Pricing Strip */}
            <div className="bg-slate-900 px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between sm:justify-start gap-3 sm:gap-6 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Full Tiffin</span>
                <span className="text-base sm:text-lg font-black text-white">₹{fullPrice}</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Half Tiffin</span>
                <span className="text-base sm:text-lg font-black text-amber-400">₹{halfPrice}</span>
              </div>
              <div className="hidden sm:block w-px h-5 bg-slate-700" />
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Extra Roti</span>
                <span className="text-xs sm:text-sm font-black text-slate-300">₹6/pc</span>
              </div>
            </div>
          </div>

          {/* ── SLEEK ACTIVE ORDER NOTIFICATION (Dynamic: Open vs Closed/Locked vs Delivered) ── */}
          {validActiveOrders.length > 0 && (
            allDelivered ? (
              /* State 1: All Orders Delivered */
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0 font-bold">
                    🛵
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
                        Tonight's Meal Delivered
                      </span>
                      <span className="text-xs font-semibold text-emerald-100">
                        {validActiveOrders.length} {validActiveOrders.length > 1 ? 'orders' : 'order'} arrived
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                      Tonight's dinner has been delivered to <strong>{user?.hostelName || 'your hostel'}</strong>. Enjoy your meal!
                    </p>
                  </div>
                </div>
                <Link
                  to="/student/orders"
                  className="px-4 py-2 rounded-xl bg-white text-emerald-900 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-xs shrink-0 text-center"
                >
                  View in My Orders →
                </Link>
              </div>
            ) : isOrdersClosed ? (
              /* State 2: Orders Are Closed / Cutoff Reached - Food in Prep (Locked) */
              <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-md border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-lg shrink-0 font-bold text-amber-300">
                    🔒
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <span>●</span>
                        <span>Orders Closed • Meal In Prep</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-300">
                        {validActiveOrders.length} {validActiveOrders.length > 1 ? 'orders' : 'order'} locked
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-slate-200 mt-0.5">
                      Orders for tonight are closed. Your meal is currently being prepared by the kitchen and can no longer be edited or cancelled.
                    </p>
                  </div>
                </div>
                <Link
                  to="/student/orders"
                  className="px-4 py-2 rounded-xl bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors shadow-xs shrink-0 text-center"
                >
                  Track in My Orders →
                </Link>
              </div>
            ) : (
              /* State 3: Orders Are Open - Can Edit or Cancel Until Cutoff */
              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fadeIn">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl shrink-0 font-bold">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                        Tonight's Order Placed
                      </span>
                      <span className="text-xs font-semibold text-emerald-100">
                        {validActiveOrders.length} {validActiveOrders.length > 1 ? 'orders' : 'order'} confirmed
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm font-bold text-white mt-0.5">
                      Your meal is registered with the kitchen. You can edit or cancel your orders in My Orders until closing time ({dinnerMeal?.orderCutoffTime?.slice(0, 5) || '8:00 PM'}).
                    </p>
                  </div>
                </div>
                <Link
                  to="/student/orders"
                  className="px-4 py-2 rounded-xl bg-white text-emerald-800 font-bold text-xs hover:bg-emerald-50 transition-colors shadow-xs shrink-0 text-center"
                >
                  View & Edit in My Orders →
                </Link>
              </div>
            )
          )}

          {/* ── ORDERING & CART SECTION (ONLY IF MENU IS PUBLISHED & OPEN) ── */}
          {dinnerMeal.status === 'PUBLISHED' && !dinnerMeal.cutoffReached ? (
            <div className="space-y-3">
              {/* Section header */}
              <div className="flex items-center justify-between px-1">
                <h3 className="text-sm font-black text-slate-800 flex items-center gap-2">
                  <span>🍱</span>
                  <span>{activeOrders.length > 0 ? 'Add Additional Tiffin' : 'Customize Tonight\'s Tiffin'}</span>
                  {cart.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-brand-50 border border-brand-200 text-brand-700 text-[10px] font-black">
                      {totalTiffinsInCart} tiffin{totalTiffinsInCart !== 1 ? 's' : ''}
                    </span>
                  )}
                </h3>
                {cart.length > 1 && (
                  <button
                    onClick={() => setCart([])}
                    className="text-xs text-red-500 hover:text-red-700 font-bold flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>

              {/* If cart is empty, show instant add buttons */}
              {cart.length === 0 && (
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs text-center space-y-4">
                  <div>
                    <h4 className="font-black text-slate-900 text-base">Ready for tonight's dinner?</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Select your portion below to begin ordering</p>
                  </div>
                  <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
                    <button
                      type="button"
                      onClick={() => addToCart('FULL')}
                      className="p-4 rounded-2xl bg-brand-50 border-2 border-brand-500 hover:bg-brand-100 text-brand-950 font-black text-xs transition-all active:scale-95 shadow-sm"
                    >
                      <span className="text-xl block mb-1">🍱</span>
                      <span className="block text-sm">Full Tiffin</span>
                      <span className="text-brand-600 font-extrabold">₹{fullPrice}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => addToCart('HALF')}
                      className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-500 hover:bg-amber-100 text-amber-950 font-black text-xs transition-all active:scale-95 shadow-sm"
                    >
                      <span className="text-xl block mb-1">🍲</span>
                      <span className="block text-sm">Half Tiffin</span>
                      <span className="text-amber-600 font-extrabold">₹{halfPrice}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Cart Items */}
              {cart.length > 0 && (
                <div className="space-y-3">
                  {cart.map((item, idx) => (
                    <CartItemConfig
                      key={item.localId}
                      item={item}
                      index={idx}
                      sabziOptions={sabziOptions}
                      halfPrice={halfPrice}
                      fullPrice={fullPrice}
                      isDalRiceClosed={isDalRiceClosed}
                      onChange={(updated) => updateCartItem(item.localId, updated)}
                      onRemove={() => removeCartItem(item.localId)}
                      onSplit={() => splitCartItem(item.localId)}
                      onAddAnother={() => addAnotherWithDifferentSabzi(item.orderType, item.selectedSabzi)}
                    />
                  ))}

                  {/* Place Order Bar */}
                  <div className="sticky bottom-16 sm:bottom-4 z-20 mt-3">
                    <div className="bg-slate-900/95 backdrop-blur-md rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-3 shadow-2xl border border-slate-700">
                      <div className="min-w-0">
                        <span className="text-[10px] text-orange-400 font-black uppercase tracking-wider block">Order Summary</span>
                        <span className="text-xs text-slate-200 font-bold truncate block">
                          {totalTiffinsInCart} Tiffin{totalTiffinsInCart !== 1 ? 's' : ''} ({cart.length} item{cart.length !== 1 ? 's' : ''}) • {user?.hostelName || 'Your Hostel'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-bold block">TOTAL</span>
                          <span className="text-xl font-black text-amber-400">₹{cartTotal}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handlePlaceAllOrders}
                          disabled={orderActionLoading}
                          className="px-5 sm:px-6 py-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 text-white font-black text-xs sm:text-sm shadow-lg shadow-orange-500/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                        >
                          {orderActionLoading ? (
                            <span>Placing...</span>
                          ) : (
                            <>
                              <Zap className="w-4 h-4 fill-white" />
                              <span>Place Order</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty cart hint */}
              {cart.length === 0 && (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200">
                  <span className="text-2xl">🍱</span>
                  <div>
                    <span className="text-sm font-bold text-slate-700 block">
                      {activeOrders.length > 0 ? 'Want to add more tiffins?' : 'Ready to order dinner?'}
                    </span>
                    <span className="text-xs text-slate-500">
                      Tap the buttons above to add Full or Half Tiffins. You can mix and choose different sabzis!
                    </span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ── CLOSED OR CUTOFF REACHED BANNER ── */
            <div className="p-6 rounded-3xl bg-slate-100 border-2 border-slate-200 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-slate-200 text-slate-600 flex items-center justify-center mx-auto text-2xl">
                <Lock className="w-6 h-6 text-slate-500" />
              </div>
              <p className="font-black text-slate-900 text-base">
                Dinner Orders Closed for Tonight
              </p>
              <p className="text-xs text-slate-600 max-w-md mx-auto">
                {validActiveOrders.length > 0
                  ? "Orders for tonight are closed. Your meal is registered and is being prepared in the kitchen."
                  : "Ordering for today's dinner has closed. Fresh menus will reopen tomorrow evening!"}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentDashboardPage;
