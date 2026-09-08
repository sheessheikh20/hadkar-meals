import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Meal, MenuItem } from '../types';
import { UtensilsCrossed, Clock, Bell, Moon, Trash2, StopCircle, PlayCircle, RefreshCw, X, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const AdminMenuPage: React.FC = () => {
  const [mealDate, setMealDate] = useState<string>(
    new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]
  );
  const [halfPrice, setHalfPrice] = useState<string>('65');
  const [fullPrice, setFullPrice] = useState<string>('100');
  const [openTime, setOpenTime] = useState<string>('19:00'); // Default 7:00 PM
  const [cutoffTime, setCutoffTime] = useState<string>('20:00'); // Default 8:00 PM
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [availableItems, setAvailableItems] = useState<MenuItem[]>([]);
  const [notifyStudents, setNotifyStudents] = useState<boolean>(true);

  const [currentMeal, setCurrentMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Modals
  const [showSpecificItemModal, setShowSpecificItemModal] = useState<boolean>(false);
  const [confirmCloseAllModal, setConfirmCloseAllModal] = useState<boolean>(false);
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const items = await api.getMenuItems();
      setAvailableItems(items);

      const meals = await api.getTodayMenu();
      const dinner = meals.find((m) => m.mealType === 'DINNER') || meals[0];

      if (dinner) {
        setCurrentMeal(dinner);
        if (dinner.halfPrice != null) setHalfPrice(String(dinner.halfPrice));
        if (dinner.fullPrice != null) setFullPrice(String(dinner.fullPrice));
        if (dinner.orderOpenTime) {
          setOpenTime(dinner.orderOpenTime.slice(0, 5));
        } else {
          setOpenTime('19:00');
        }
        if (dinner.orderCutoffTime) {
          const cut = dinner.orderCutoffTime.slice(0, 5);
          setCutoffTime(cut === '23:59' ? '20:00' : cut);
        } else {
          setCutoffTime('20:00');
        }
        if (dinner.mealDate) setMealDate(dinner.mealDate);

        if (dinner.menuItems && dinner.menuItems.length > 0) {
          const sabziIds = dinner.menuItems
            .filter((i) => i.category === 'SABZI')
            .map((i) => i.id);
          if (sabziIds.length > 0) {
            setSelectedItemIds(sabziIds);
          }
        }
      } else {
        setCurrentMeal(null);
        setOpenTime('19:00');
        setCutoffTime('20:00');
      }
    } catch (err) {
      console.error('Failed to load menu data:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const toggleItem = (id: number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // 1. Close All Orders
  const handleConfirmCloseAll = async () => {
    if (!currentMeal) return;
    setLoading(true);
    setMsg(null);
    setConfirmCloseAllModal(false);

    try {
      await api.closeMeal(currentMeal.id, 'Dinner orders are closed for tonight');
      setMsg({ text: "Tonight's dinner orders have been CLOSED. Students can no longer place orders.", type: 'success' });
      await loadData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to stop orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 2. Re-Open All Orders
  const handleReopenAllOrders = async () => {
    if (!currentMeal) return;
    setLoading(true);
    setMsg(null);

    try {
      await api.reopenMeal(currentMeal.id);
      setMsg({ text: "Tonight's dinner orders are now RE-OPENED for students.", type: 'success' });
      await loadData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to re-open orders', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 3. Toggle single vegetable or dal-rice
  const handleToggleSingleItem = async (itemId: number) => {
    try {
      const updated = await api.toggleMenuItem(itemId);
      setAvailableItems((prev) => prev.map((item) => (item.id === itemId ? updated : item)));
      if (currentMeal && currentMeal.menuItems) {
        setCurrentMeal({
          ...currentMeal,
          menuItems: currentMeal.menuItems.map((item) => (item.id === itemId ? updated : item)),
        });
      }
      setMsg({
        text: `"${updated.name}": Orders ${updated.active ? 'are now RE-OPENED 🟢' : 'are now CLOSED 🔴'}.`,
        type: 'success',
      });
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to toggle item', type: 'error' });
    }
  };

  // 4. Delete / Reset Menu
  const handleConfirmDelete = async () => {
    if (!currentMeal) return;
    setLoading(true);
    setMsg(null);
    setConfirmDeleteModal(false);

    try {
      await api.deleteMeal(currentMeal.id);
      setMsg({ text: "Tonight's dinner menu has been reset successfully.", type: 'success' });
      setCurrentMeal(null);
      setSelectedItemIds([]);
      await loadData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to reset dinner menu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 5. Save or Publish Menu Directly
  const handleSaveMenu = async () => {
    if (selectedItemIds.length === 0) {
      setMsg({ text: 'Please select at least one Sabzi for tonight.', type: 'error' });
      return;
    }

    setLoading(true);
    setMsg(null);

    try {
      const baseItemIds = availableItems
        .filter((i) => i.category === 'ROTI' || i.category === 'DAL' || i.category === 'RICE')
        .map((i) => i.id);

      const allMenuItemIds = Array.from(new Set([...selectedItemIds, ...baseItemIds]));

      const meal = await api.createMeal({
        mealDate,
        mealType: 'DINNER',
        halfPrice: parseFloat(halfPrice),
        fullPrice: parseFloat(fullPrice),
        orderOpenTime: openTime.length === 5 ? openTime + ':00' : openTime,
        orderCutoffTime: cutoffTime.length === 5 ? cutoffTime + ':00' : cutoffTime,
        menuItemIds: allMenuItemIds,
      });

      if (!currentMeal || currentMeal.status !== 'PUBLISHED') {
        await api.publishMeal(meal.id, true);
        setMsg({
          text: `Success! Dinner menu for ${formatDateDDMMYYYY(mealDate)} has been published and is now live!`,
          type: 'success',
        });
      } else {
        setMsg({
          text: `Success! Dinner menu changes for ${formatDateDDMMYYYY(mealDate)} have been saved.`,
          type: 'success',
        });
      }

      await loadData();
    } catch (err: any) {
      setMsg({ text: err.message || 'Failed to save menu', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Published sabzis for tonight
  const publishedSabzis = (currentMeal?.menuItems || []).filter((i) => i.category === 'SABZI');
  // Dal item for tonight
  const publishedDal = (currentMeal?.menuItems || []).find((i) => i.category === 'DAL')
    || availableItems.find((i) => i.category === 'DAL');

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <UtensilsCrossed className="w-6 h-6 text-brand-600" />
            <span>Daily Dinner Menu Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure today's dinner service, prices, order cutoff time, and publish
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {msg && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold border flex justify-between items-center ${
            msg.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
              : 'bg-red-50 text-red-900 border-red-200'
          }`}
        >
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="underline ml-2">Dismiss</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Meal Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Moon className="w-4 h-4 text-brand-600" />
              <span>{currentMeal ? "Edit Tonight's Dinner Service" : "Configure Tonight's Dinner Service"}</span>
            </h2>
            <span className="text-xs font-bold text-slate-400">🌙 Dinner Only</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Service Date
              </label>
              <input
                type="date"
                required
                value={mealDate}
                onChange={(e) => setMealDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Orders Open Time</span>
              </label>
              <input
                type="time"
                required
                value={openTime}
                onChange={(e) => setOpenTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-orange-600" />
                <span>Order Closing Time</span>
              </label>
              <input
                type="time"
                required
                value={cutoffTime}
                onChange={(e) => setCutoffTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Half Tiffin (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={halfPrice}
                  onChange={(e) => setHalfPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Full Tiffin (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  value={fullPrice}
                  onChange={(e) => setFullPrice(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Sabzi Selection */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Select Tonight's Sabzis
                </label>
                <p className="text-[11px] text-slate-500">
                  Tap dishes to offer them to customers for tonight's dinner
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-80 overflow-y-auto p-1">
              {availableItems.filter((i) => i.category === 'SABZI').map((item) => {
                const selected = selectedItemIds.includes(item.id);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    className={`py-3 px-3.5 rounded-2xl border-2 transition-all text-left flex items-center justify-between gap-2.5 select-none active:scale-[0.98] cursor-pointer ${
                      selected
                        ? 'bg-gradient-to-r from-brand-600 to-amber-600 text-white border-brand-600 shadow-sm font-black'
                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 font-bold hover:border-slate-300 shadow-2xs'
                    }`}
                  >
                    <span className="text-xs truncate flex items-center gap-2">
                      <span className="text-base leading-none">{selected ? '🥘' : '🍲'}</span>
                      <span className="truncate">{item.name}</span>
                    </span>
                    <span
                      className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 transition-all ${
                        selected
                          ? 'bg-white/25 text-white'
                          : 'bg-slate-100 text-slate-400 group-hover:text-slate-600'
                      }`}
                    >
                      {selected ? '✓ Added' : '+ Add'}
                    </span>
                  </button>
                );
              })}
            </div>


          </div>

          {/* Actions */}
          <div className="pt-2">
            {currentMeal ? (
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveMenu}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={loading}
                onClick={handleSaveMenu}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 flex items-center justify-center gap-2 active:scale-98"
              >
                <UtensilsCrossed className="w-4 h-4" />
                <span>{loading ? 'Publishing...' : 'Publish Dinner Menu'}</span>
              </button>
            )}
          </div>
        </div>

        {/* Right Column: Live Student Preview & Operational Controls */}
        <div className="space-y-4">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">
            Live Student Preview
          </span>

          <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-5">
            <div className="flex flex-wrap sm:flex-nowrap justify-between items-start gap-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  {formatDateDDMMYYYY(mealDate)}
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  🌙 Today's Dinner
                </h3>
              </div>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black shrink-0 ${
                currentMeal?.status === 'PUBLISHED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {currentMeal?.status === 'PUBLISHED'
                  ? '🟢 ACCEPTING ORDERS'
                  : '⛔ ORDERS CLOSED'}
              </span>
            </div>

            <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap">
              <Clock className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span>Ordering Window: <strong className="text-slate-800">{(() => {
                const fmt = (t: string) => {
                  if (!t) return '';
                  const [hStr, mStr] = t.split(':');
                  const h = parseInt(hStr, 10);
                  if (isNaN(h)) return t;
                  const ampm = h >= 12 ? 'PM' : 'AM';
                  const h12 = h % 12 === 0 ? 12 : h % 12;
                  return `${h12}:${mStr || '00'} ${ampm}`;
                };
                return `${fmt(openTime)} – ${fmt(cutoffTime)}`;
              })()}</strong></span>
            </div>

            {/* Selected Sabzis Tonight */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Selected Sabzis Tonight
              </span>
              <div className="flex flex-wrap gap-1.5">
                {selectedItemIds.length === 0 ? (
                  <span className="text-xs text-slate-400 italic">No sabzi selected yet</span>
                ) : (
                  availableItems
                    .filter((i) => selectedItemIds.includes(i.id))
                    .map((item) => (
                      <span
                        key={item.id}
                        className={`px-2.5 py-1 rounded-xl border text-xs font-bold flex items-center gap-1 ${
                          item.active !== false
                            ? 'bg-brand-50 border-brand-200 text-brand-950'
                            : 'bg-red-50 border-red-200 text-red-700 line-through'
                        }`}
                      >
                        <span>🥘 {item.name}</span>
                        {item.active === false && (
                          <span className="text-[9px] font-black text-red-600 no-underline">(Closed)</span>
                        )}
                      </span>
                    ))
                )}
              </div>
            </div>

            {/* Staples */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                Standard Included Staples
              </span>
              <p className="text-xs font-semibold text-slate-700">
                🫓 Phulka Roti + 🍲 Dal Tadka + 🍚 Steamed Rice
              </p>
              {publishedDal && publishedDal.active === false && (
                <span className="text-[10px] font-black text-red-600 block">⚠️ Dal+Rice orders are currently stopped</span>
              )}
            </div>

            {/* Pricing */}
            <div className="flex items-center gap-4 py-2 border-t border-slate-100 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block">Half Dinner</span>
                <span className="text-base font-black text-slate-900">₹{halfPrice}</span>
              </div>
              <div className="h-6 w-px bg-slate-200" />
              <div>
                <span className="text-slate-400 font-semibold block">Full Dinner</span>
                <span className="text-base font-black text-brand-600">₹{fullPrice}</span>
              </div>
            </div>

            {/* ── OPERATIONAL CONTROLS (DIRECTLY IN PREVIEW CARD) ── */}
            {currentMeal && (
              <div className="pt-3 border-t border-slate-100 space-y-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Order Taking Controls
                </span>

                {/* 1. Close / Reopen Accepting Orders Button */}
                {currentMeal.status === 'PUBLISHED' ? (
                  <button
                    type="button"
                    onClick={() => setConfirmCloseAllModal(true)}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Close Accepting Orders</span>
                  </button>
                ) : currentMeal.status === 'CLOSED' ? (
                  <button
                    type="button"
                    onClick={handleReopenAllOrders}
                    disabled={loading}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>Re-Open Accepting Orders</span>
                  </button>
                ) : null}

                {/* 2. Close Orders for a Specific Sabzi Button */}
                <button
                  type="button"
                  onClick={() => setShowSpecificItemModal(true)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-98"
                >
                  <UtensilsCrossed className="w-4 h-4 text-amber-400" />
                  <span>Close Orders for a Specific Sabzi</span>
                </button>

                {/* 3. Reset / Delete Menu Button */}
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal(true)}
                  disabled={loading}
                  className="w-full py-2 text-slate-400 hover:text-red-600 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Reset / Delete Tonight's Menu</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL: CONFIRM CLOSE ALL ORDERS ── */}
      {confirmCloseAllModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Close Accepting Orders?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to stop accepting all dinner orders for tonight? Students will no longer be able to place new orders.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmCloseAllModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCloseAll}
                disabled={loading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-black text-xs shadow-sm"
              >
                Yes, Stop Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CONFIRM RESET / DELETE MENU ── */}
      {confirmDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto text-2xl">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h3 className="text-lg font-black text-slate-900">Reset Tonight's Dinner Menu?</h3>
              <p className="text-xs text-slate-500 mt-1">
                If you published the wrong vegetables or made a mistake, this will safely reset tonight's menu so you can select and publish fresh.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmDeleteModal(false)}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={loading}
                className="flex-1 py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs shadow-sm"
              >
                Yes, Reset Menu
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CLOSE ORDERS FOR SPECIFIC SABZI / DAL-RICE ── */}
      {showSpecificItemModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 shadow-2xl border border-slate-200 animate-scaleUp max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <UtensilsCrossed className="w-5 h-5 text-brand-600" />
                  <span>Close Orders for a Specific Sabzi</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Stop orders for any specific vegetable or Dal+Rice when it runs out. Other dishes remain open!
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSpecificItemModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Tonight's Published Vegetables ({publishedSabzis.length})
              </span>

              {publishedSabzis.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl">
                  No sabzis published in tonight's dinner menu yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {publishedSabzis.map((item) => {
                    const isAccepting = item.active !== false;

                    return (
                      <div
                        key={item.id}
                        className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                          isAccepting
                            ? 'bg-slate-50/70 border-slate-200'
                            : 'bg-red-50/70 border-red-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xl">🥘</span>
                          <div className="min-w-0">
                            <span className={`text-xs font-bold block truncate ${isAccepting ? 'text-slate-900' : 'text-red-950 line-through'}`}>
                              {item.name}
                            </span>
                            <span className={`text-[10px] font-black ${isAccepting ? 'text-emerald-700' : 'text-red-600'}`}>
                              {isAccepting ? '🟢 Accepting Orders' : '🔴 Orders Closed'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleSingleItem(item.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 active:scale-95 ${
                            isAccepting
                              ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                          }`}
                        >
                          {isAccepting ? '⛔ Close Orders' : '🟢 Re-Open Orders'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Constant Dal + Steamed Rice Control */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Constant Staples (Daily Menu)
                </span>

                {publishedDal && (
                  <div
                    className={`p-3.5 rounded-2xl border-2 flex items-center justify-between gap-3 transition-all ${
                      publishedDal.active !== false
                        ? 'bg-slate-50/70 border-slate-200'
                        : 'bg-red-50/70 border-red-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xl">🍲</span>
                      <div className="min-w-0">
                        <span className={`text-xs font-bold block truncate ${publishedDal.active !== false ? 'text-slate-900' : 'text-red-950 line-through'}`}>
                          Dal + Steamed Rice Combo
                        </span>
                        <span className={`text-[10px] font-black ${publishedDal.active !== false ? 'text-emerald-700' : 'text-red-600'}`}>
                          {publishedDal.active !== false ? '🟢 Accepting Orders' : '🔴 Orders Closed'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleSingleItem(publishedDal.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 active:scale-95 ${
                        publishedDal.active !== false
                          ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                      }`}
                    >
                      {publishedDal.active !== false ? '⛔ Close Orders' : '🟢 Re-Open Orders'}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setShowSpecificItemModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminMenuPage;
