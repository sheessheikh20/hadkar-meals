import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  UtensilsCrossed,
  Bell,
  LogOut,
  ChefHat,
  Receipt,
  FileSpreadsheet,
  Users,
  LayoutDashboard,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, isAdmin, isStudent, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (isStudent && user) {
      api.getUnreadNotificationsCount()
        .then((res) => setUnreadCount(res.unreadCount))
        .catch(() => {});
    }
  }, [isStudent, user, location.pathname]);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs select-none w-full">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-2">
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={isAdmin ? '/admin/dashboard' : '/student/dashboard'}
              className="flex items-center gap-2 group"
            >
              <div className="hidden sm:flex w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 items-center justify-center text-white shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span className="text-lg sm:text-xl">🍱</span>
              </div>
              
              {isStudent && user ? (
                <div className="flex flex-col justify-center">
                  <div className="flex items-center gap-1 text-slate-500">
                    <span className="text-[10px] font-bold uppercase tracking-wider">Delivery Location</span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-900">
                    <span className="text-sm font-black truncate max-w-[150px]">{user.hostelName || 'Hostel'}</span>
                    <span className="text-[10px] bg-brand-100 text-brand-800 px-1.5 py-0.5 rounded font-black">STUDENT</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
                    HADKAR <span className="text-brand-600">MEALS</span>
                  </span>
                  <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${
                    isAdmin
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-brand-100 text-brand-800'
                  }`}>
                    {isAdmin ? 'ADMIN' : 'STUDENT'}
                  </span>
                </div>
              )}
            </Link>
          </div>

          {/* Desktop Navigation Links (Only on xl: 1280px+ to prevent side-by-side split screen collision) */}
          <div className="hidden xl:flex items-center gap-1 shrink-0">
            {isAdmin && (
              <>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Dashboard
                </Link>
                <Link
                  to="/admin/menu"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/menu') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Tonight's Menu
                </Link>
                <Link
                  to="/admin/kitchen"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/kitchen') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  Kitchen Sheet
                </Link>
                <Link
                  to="/admin/billing"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/billing') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Billing
                </Link>
                <Link
                  to="/admin/students"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/students') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  Students
                </Link>
                <Link
                  to="/admin/system"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/system') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  System & Catalog
                </Link>
              </>
            )}

            {isStudent && (
              <>
                <Link
                  to="/student/dashboard"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/student/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5" />
                  Tonight's Dinner
                </Link>
                <Link
                  to="/student/orders"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/student/orders') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <ChefHat className="w-3.5 h-3.5" />
                  My Orders
                </Link>
                <Link
                  to="/student/bills"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/student/bills') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Receipt className="w-3.5 h-3.5" />
                  Monthly Bills
                </Link>
              </>
            )}
          </div>

          {/* Right Action Icons: Profile, Notifications, Logout, Mobile Drawer Trigger */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {isStudent && (
              <Link
                to="/student/notifications"
                className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-600 text-white text-[9px] font-black flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </Link>
            )}

            {user && (
              <div className="hidden sm:flex items-center gap-2.5 pl-3 border-l border-slate-200">
                <div className="text-right max-w-[140px] truncate">
                  <p className="font-bold text-xs text-slate-800 truncate">
                    {user.fullName ? user.fullName.split(' ')[0] : user.phoneNumber}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate">
                    {user.hostelName || (isAdmin ? 'Admin / Developer' : 'Student')}
                  </p>
                </div>
                <button
                  onClick={logout}
                  className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </nav>
  );
};

export default Navbar;
