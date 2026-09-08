import React, { useState } from 'react';
import { api } from '../api/client';
import { X, PlusCircle, Sparkles } from 'lucide-react';

interface Props {
  isOpen: boolean;
  studentId: number;
  studentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESETS = [
  { desc: 'Extra Roti', price: 10 },
  { desc: 'Extra Rice', price: 20 },
  { desc: 'Fresh Curd', price: 15 },
  { desc: 'Sweet (Gulab Jamun)', price: 25 },
  { desc: 'Special Meal Add-on', price: 50 },
];

export const AddExtraChargeModal: React.FC<Props> = ({
  isOpen,
  studentId,
  studentName,
  onClose,
  onSuccess,
}) => {
  const [itemDescription, setItemDescription] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [unitPrice, setUnitPrice] = useState<string>('10');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const total = (parseFloat(unitPrice) || 0) * (quantity || 1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemDescription.trim()) {
      setError('Please provide an item description.');
      return;
    }
    const price = parseFloat(unitPrice);
    if (isNaN(price) || price <= 0) {
      setError('Unit price must be greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.addExtraCharge({
        studentId,
        itemDescription: itemDescription.trim(),
        quantity,
        unitPrice: price,
        notes: notes.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add extra charge');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-brand-600 px-6 py-4 flex items-center justify-between text-white">
          <div className="flex items-center gap-2 font-bold text-lg">
            <PlusCircle className="w-6 h-6" />
            <span>Add Extra Charge</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/20 text-white/80 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <p className="text-xs font-semibold text-slate-500 uppercase">Student</p>
            <p className="text-base font-bold text-slate-800">{studentName}</p>
          </div>

          {/* Quick Presets */}
          <div>
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              Quick Presets
            </p>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <button
                  type="button"
                  key={p.desc}
                  onClick={() => {
                    setItemDescription(p.desc);
                    setUnitPrice(String(p.price));
                  }}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-brand-100 hover:text-brand-800 text-slate-700 border border-slate-200 transition-colors"
                >
                  {p.desc} (₹{p.price})
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Item Description <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="e.g. Extra Roti, Curd, Sweet..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Quantity
              </label>
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="px-3 py-2 bg-slate-100 font-bold hover:bg-slate-200"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  className="w-full text-center py-2 text-sm font-bold focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setQuantity(quantity + 1)}
                  className="px-3 py-2 bg-slate-100 font-bold hover:bg-slate-200"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Unit Price (₹) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-slate-400 font-bold">₹</span>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* Total Preview */}
          <div className="p-3 bg-brand-50 rounded-xl border border-brand-200 flex justify-between items-center text-brand-900 font-bold">
            <span>Total Charge:</span>
            <span className="text-lg">₹{total.toFixed(2)}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Requested during dinner"
              className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-brand-600 hover:bg-brand-700 text-white shadow-md shadow-brand-600/20 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Extra Charge'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
