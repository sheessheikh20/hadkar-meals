import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { KitchenSheet } from '../types';
import { ChefHat, Printer, RefreshCw, PhoneCall, Building, Utensils } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const AdminKitchenPage: React.FC = () => {
  const [date, setDate] = useState<string>(new Date(new Date().getTime() - new Date().getTimezoneOffset() * 60000).toISOString().split('T')[0]);
  const [sheet, setSheet] = useState<KitchenSheet | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const loadSheet = async () => {
    setLoading(true);
    try {
      const data = await api.getKitchenSheet(date);
      setSheet(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSheet();
  }, [date]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 print:hidden">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 flex items-center gap-2">
            <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            <span>Dinner Kitchen Sheet</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Location-wise tiffin cooking counts and delivery roster
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white shadow-xs"
          />

          <button
            onClick={loadSheet}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors shadow-xs"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={handlePrint}
            className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print Sheet</span>
          </button>
        </div>
      </div>

      {/* Printable Sheet Wrapper */}
      <div id="printable-section" className="space-y-6">
        {/* Printable Header only visible when printing */}
        <div className="hidden print:block text-center border-b pb-4 mb-4">
          <h1 className="text-2xl font-black text-slate-900">🍱 HADKAR MEALS — DINNER PREPARATION SHEET</h1>
          <p className="text-xs text-slate-600">
            Dinner Service • Date: {formatDateDDMMYYYY(date)} • Generated: {new Date().toLocaleTimeString()}
          </p>
        </div>

        {/* Summary Metric Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Full Tiffins</span>
            <p className="text-3xl font-black text-brand-600 mt-1">{sheet?.totalFull || 0}</p>
            <span className="text-[11px] text-slate-400 font-medium">Large dinner portion</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-200 shadow-xs text-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Half Tiffins</span>
            <p className="text-3xl font-black text-slate-900 mt-1">{sheet?.totalHalf || 0}</p>
            <span className="text-[11px] text-slate-400 font-medium">Standard dinner portion</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-brand-200 bg-brand-50/50 shadow-xs text-center">
            <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Total Orders</span>
            <p className="text-3xl font-black text-brand-900 mt-1">{sheet?.totalOrders || 0}</p>
            <span className="text-[11px] text-brand-600 font-bold">Total tiffins to pack</span>
          </div>

          <div className="bg-white p-4 sm:p-5 rounded-3xl border border-amber-200 bg-amber-50/50 shadow-xs text-center">
            <span className="text-xs font-bold text-amber-800 uppercase tracking-wider">Total Rotis</span>
            <p className="text-3xl font-black text-amber-900 mt-1">
              {sheet?.totalRotis != null ? sheet.totalRotis : ((sheet?.totalOrders || 0) * 4)}
            </p>
            <span className="text-[11px] text-amber-700 font-bold">Base 4/tiffin + extras</span>
          </div>
        </div>

        {/* Sabzi Breakdown Cards */}
        {sheet?.sabziBreakdown && Object.keys(sheet.sabziBreakdown).length > 0 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2 flex items-center gap-1.5">
              <Utensils className="w-3.5 h-3.5 text-brand-600" />
              <span>Sabzi Preparation Breakdown</span>
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {Object.entries(sheet.sabziBreakdown).map(([sabzi, count]) => (
                <div key={sabzi} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
                  <span className="text-slate-500 font-semibold block truncate">{sabzi}</span>
                  <span className="text-xl font-black text-slate-900 mt-0.5 block">{count}</span>
                  <span className="text-[10px] text-slate-400">servings requested</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Location-wise Summary Chips */}
        {sheet?.hostelBreakdown && Object.keys(sheet.hostelBreakdown).length > 0 && (
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Service Location Distribution
            </span>
            <div className="flex flex-wrap gap-2">
              {Object.entries(sheet.hostelBreakdown).map(([location, count]) => (
                <div
                  key={location}
                  className="px-3 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs flex items-center gap-2"
                >
                  <Building className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-bold text-slate-800">{location}:</span>
                  <span className="font-bold text-brand-600">{count.full} Full</span>
                  <span>•</span>
                  <span className="font-bold text-slate-700">{count.half} Half</span>
                  <span className="px-1.5 py-0.5 rounded-md bg-slate-200 text-[10px] font-black">
                    Total {count.total}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table of Location-wise orders */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-extrabold text-slate-900 text-sm">
              Detailed Dinner Order Roster ({sheet?.items.length || 0} customers)
            </h3>
            <span className="text-xs text-slate-400">Date: {formatDateDDMMYYYY(date)}</span>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading dinner preparation sheet...</div>
          ) : !sheet || sheet.items.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-xs">
              No confirmed dinner orders found for {formatDateDDMMYYYY(date)}.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
                    <th className="py-3 px-4">Service Location</th>
                    <th className="py-3 px-4">Customer Name</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Dinner Type</th>
                    <th className="py-3 px-4 text-center">Qty</th>
                    <th className="py-3 px-4">Sabzi Choice</th>
                    <th className="py-3 px-4">Extra Rotis</th>
                    <th className="py-3 px-4">Order Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                  {sheet.items.map((item) => (
                    <tr key={item.orderId} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-bold text-slate-900">{item.hostelName}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{item.studentName}</td>
                      <td className="py-3 px-4">
                        <a
                          href={`tel:${item.studentPhone}`}
                          className="inline-flex items-center gap-1 font-mono text-slate-600 hover:text-brand-600 hover:underline"
                        >
                          <PhoneCall className="w-3 h-3 text-emerald-600" />
                          <span>{item.studentPhone}</span>
                        </a>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black tracking-wide ${
                            item.orderType === 'FULL'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-blue-100 text-blue-900 border border-blue-300'
                          }`}
                        >
                          {item.orderType} DINNER
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-slate-100 border border-slate-200 font-black text-xs text-slate-900">
                          {item.quantity || 1}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.selectedSabzi || '—'}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-700">
                        {item.extraRotis && item.extraRotis > 0 ? `+${item.extraRotis} extra` : '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{item.orderedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

