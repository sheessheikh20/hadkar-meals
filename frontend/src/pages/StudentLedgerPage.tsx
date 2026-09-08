import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { LedgerTransaction } from '../types';
import { Sparkles, ArrowDownRight, ArrowUpRight, History, Calendar, RefreshCw } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';

export const StudentLedgerPage: React.FC = () => {
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      const [txs, bal] = await Promise.all([api.getMyLedger(), api.getMyBalance()]);
      setTransactions(txs);
      setBalance(bal.balance);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const isDebit = (type: string) => {
    return ['ORDER_CHARGE', 'EXTRA_CHARGE', 'PREVIOUS_BALANCE'].includes(type);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 space-y-6 pb-20 md:pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <History className="w-6 h-6 text-brand-600" />
            <span>Ledger Statement</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable transaction history. Every single rupee charged, reversed, or credited.
          </p>
        </div>
        <button
          onClick={loadData}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 text-xs font-semibold flex items-center gap-1"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Balance Highlight Banner */}
      <div className="p-6 rounded-3xl bg-slate-900 text-white flex justify-between items-center shadow-lg">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Calculated Net Outstanding
          </span>
          <p className="text-3xl font-black text-amber-400 mt-1">₹{Number(balance).toFixed(2)}</p>
          <p className="text-[11px] text-slate-400 mt-1">Calculated from {transactions.length} recent transactions</p>
        </div>
        <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-amber-400">
          <Sparkles className="w-6 h-6" />
        </div>
      </div>

      {/* Transactions List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <p className="text-slate-500 text-sm">No transactions recorded yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-slate-200 divide-y divide-slate-100 overflow-hidden shadow-xs">
          {transactions.map((t) => {
            const debit = isDebit(t.type);
            return (
              <div key={t.id} className="p-4 sm:p-5 flex justify-between items-center gap-3 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      debit ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600'
                    }`}
                  >
                    {debit ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownRight className="w-5 h-5" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{t.description}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                        {t.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        {formatDateTimeDDMMYYYY(t.createdAt)}
                      </span>
                      {t.referenceId && <span>• Ref: {t.referenceId}</span>}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-base font-black ${
                      debit ? 'text-slate-900' : 'text-emerald-600'
                    }`}
                  >
                    {debit ? '+' : '-'}₹{Number(t.amount).toFixed(2)}
                  </span>
                  <span className="block text-[10px] text-slate-400 font-medium">
                    {debit ? 'Debited to Bill' : 'Credit / Payment'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
