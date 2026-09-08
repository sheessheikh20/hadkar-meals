import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { DashboardStats } from '../types';
import { BarChart3, Moon, IndianRupee, Users, ShoppingBag } from 'lucide-react';

export const AdminReportsPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.getDashboardStats().then(setStats).catch(console.error);
  }, []);

  const fullCount = stats?.dinner?.fullCount || 0;
  const halfCount = stats?.dinner?.halfCount || 0;
  const totalCount = stats?.dinner?.totalCount || (fullCount + halfCount);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-brand-600" />
          <span>Dinner Reports & Analytics</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Dinner tiffin consumption patterns, revenue performance, and collection metrics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Full vs Half Ratio */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Dinner Portion Ratio (Today)
          </h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Full Dinner Tiffins</span>
                <span className="text-brand-600">{fullCount} orders</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 rounded-full"
                  style={{
                    width: `${(fullCount / Math.max(1, totalCount)) * 100}%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Half Dinner Tiffins</span>
                <span className="text-slate-800">{halfCount} orders</span>
              </div>
              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-800 rounded-full"
                  style={{
                    width: `${(halfCount / Math.max(1, totalCount)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dinner Volume Summary */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Dinner Volume (Today)
          </h3>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
              <span className="text-xs font-bold text-amber-900 block">🌙 Dinner Orders</span>
              <span className="text-2xl font-black text-amber-900 mt-1 block">
                {totalCount}
              </span>
              <span className="text-[10px] text-amber-700">Tiffins</span>
            </div>

            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
              <span className="text-xs font-bold text-emerald-900 block">Est. Revenue</span>
              <span className="text-2xl font-black text-emerald-900 mt-1 block">
                ₹{Number(stats?.todayEstimatedRevenue || 0).toFixed(0)}
              </span>
              <span className="text-[10px] text-emerald-700">From today's orders</span>
            </div>
          </div>
        </div>

        {/* Financial Collection Efficiency */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-sm text-slate-800 uppercase tracking-wider">
            Collection Overview
          </h3>

          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2 text-xs">
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Total Outstanding:</span>
              <span className="text-red-600 font-bold">₹{Number(stats?.totalOutstandingAmount || 0).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Pending Bills Count:</span>
              <span className="font-bold text-slate-800">{stats?.pendingBillsCount || 0} students</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span className="text-slate-500">Active Students:</span>
              <span className="font-bold text-slate-800">{stats?.activeStudentsCount || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
