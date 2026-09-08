import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Phone, MapPin, LogOut, ChefHat, Receipt, FileText, ChevronRight, ShieldCheck, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

export const StudentProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await api.deleteMyAccount();
      await logout();
    } catch (err: any) {
      setDeleteError(err.message || 'Failed to delete account. Please try again.');
      setDeleteLoading(false);
    }
  };

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
            <span>Transaction History</span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>

      {/* LOGOUT */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mt-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center shrink-0">
            <LogOut className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Sign Out</h3>
            <p className="text-sm text-slate-500 mb-4">Log out of your account on this device securely.</p>
            <button 
              onClick={logout}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-sm shadow-md transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>

      {/* DELETE ACCOUNT */}
      <div className="bg-white p-6 rounded-3xl border border-red-100 shadow-sm mt-8">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Delete Account</h3>
            <p className="text-sm text-slate-500 mb-4">
              Permanently delete your account and all associated data. You will need to recreate your account to use the service again.
            </p>
            <button 
              onClick={() => setDeleteConfirmOpen(true)}
              className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl text-sm transition-colors border border-red-200"
            >
              Delete My Account
            </button>
          </div>
        </div>
      </div>

      {/* DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {deleteConfirmOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <motion.div initial={{scale:0.95, opacity:0}} animate={{scale:1, opacity:1}} exit={{scale:0.95, opacity:0}} className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl relative">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-xl font-black text-slate-900 mb-2">Are you absolutely sure?</h3>
              <p className="text-sm text-slate-600 mb-6">
                This action cannot be undone. This will permanently delete your account, active orders, transaction history, and remove your data from our servers.
              </p>
              
              {deleteError && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
                  {deleteError}
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setDeleteConfirmOpen(false)}
                  disabled={deleteLoading}
                  className="flex-1 py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm transition-colors shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  {deleteLoading ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="pt-8 pb-4 flex flex-col items-center justify-center opacity-50 grayscale">
        <div className="w-8 h-8 rounded-xl bg-slate-200 flex items-center justify-center mb-2">
          <ShieldCheck className="w-4 h-4 text-slate-500" />
        </div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Secured by Hadkar Meals</span>
      </div>
    </div>
  );
};
