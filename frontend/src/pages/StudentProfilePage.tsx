import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, MapPin, LogOut, ChefHat, Receipt, FileText, ChevronRight } from 'lucide-react';

export const StudentProfilePage: React.FC = () => {
  const { user, logout } = useAuth();

  return (
    <div className="max-w-md mx-auto px-4 py-6 sm:py-8 space-y-5 pb-24 md:pb-8">
      <div className="text-center bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-orange-500 to-amber-400 text-white flex items-center justify-center text-3xl font-black mx-auto shadow-lg shadow-orange-500/20 mb-3">
          {user?.fullName ? user.fullName[0].toUpperCase() : 'S'}
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900">{user?.fullName || 'Student'}</h1>
        <p className="text-xs text-slate-500 font-semibold mt-0.5">+91 {user?.phoneNumber}</p>
        <div className="mt-2.5">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Active Student
          </span>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Delivery Details</h3>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Service Location / Hostel</span>
            <span className="font-bold text-slate-900 text-sm">{user?.hostelName || 'Not Assigned'}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block">Registered Mobile</span>
            <span className="font-bold text-slate-900 text-sm">+91 {user?.phoneNumber}</span>
          </div>
        </div>
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-3xl border border-slate-200 p-3 shadow-sm divide-y divide-slate-100">
        <Link
          to="/student/orders"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <ChefHat className="w-4 h-4 text-orange-600" />
            <span>My Dinner Orders</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
        <Link
          to="/student/bills"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <Receipt className="w-4 h-4 text-emerald-600" />
            <span>Monthly Bills & Invoices</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
        <Link
          to="/student/ledger"
          className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition-colors text-xs font-bold text-slate-800"
        >
          <div className="flex items-center gap-2.5">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Audit Ledger Trail</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      <button
        onClick={logout}
        className="w-full py-3.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-xs"
      >
        <LogOut className="w-4 h-4" />
        <span>Sign Out of Hadkar Meals</span>
      </button>
    </div>
  );
};
