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
  const { user, isAdmin, isSuperAdmin, isStudent, logout } = useAuth();
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

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
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={isSuperAdmin ? '/super-admin' : isAdmin ? '/admin/dashboard' : '/student/dashboard'}
              className="flex items-center gap-2 group"
            >
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-amber-500 flex items-center justify-center text-white shadow-sm shadow-brand-500/20 group-hover:scale-105 transition-transform shrink-0">
                <span className="text-lg sm:text-xl">🍱</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-base sm:text-lg tracking-tight text-slate-900 whitespace-nowrap">
                  HADKAR <span className="text-brand-600">MEALS</span>
                </span>
                <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shrink-0 ${
                  isSuperAdmin
                    ? 'bg-indigo-100 text-indigo-800'
                    : isAdmin
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-brand-100 text-brand-800'
                }`}>
                  {isSuperAdmin ? 'SUPER ADMIN' : isAdmin ? 'ADMIN' : 'STUDENT'}
                </span>
              </div>
            </Link>
          </div>

          {/* Desktop Navigation Links (Only on xl: 1280px+ to prevent side-by-side split screen collision) */}
          <div className="hidden xl:flex items-center gap-1 shrink-0">
            {isSuperAdmin && (
              <>
                <Link
                  to="/super-admin"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/super-admin') ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <UtensilsCrossed className="w-3.5 h-3.5 text-indigo-600" />
                  Master Catalog & Dishes
                </Link>
                <Link
                  to="/admin/dashboard"
                  className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  Client Operations View
                </Link>
              </>
            )}

            {isAdmin && !isSuperAdmin && (
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
                  <p className="text-[10px] font-medium text-slate-400 truncate">
                    {user.hostelName || (isSuperAdmin ? 'Developer' : isAdmin ? 'Kitchen Staff' : 'Student')}
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

            {/* Mobile / Tablet Menu Trigger (Visible under xl: 1280px so side-by-side never breaks) */}
            <div className="xl:hidden flex items-center ml-1">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile / Tablet Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md px-4 pt-3 pb-5 space-y-1.5 shadow-xl animate-fadeIn">
          {isSuperAdmin ? (
            <>
              <Link
                to="/super-admin"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100"
              >
                <UtensilsCrossed className="w-4 h-4 text-indigo-600" />
                <span>Master Dishes & Catalog</span>
              </Link>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Client Operations View</span>
              </Link>
            </>
          ) : isAdmin ? (
            <>
              <Link
                to="/admin/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/admin/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-brand-600" />
                <span>Dashboard & Live Orders</span>
              </Link>
              <Link
                to="/admin/menu"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/admin/menu') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-amber-600" />
                <span>Tonight's Menu</span>
              </Link>
              <Link
                to="/admin/kitchen"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/admin/kitchen') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChefHat className="w-4 h-4 text-slate-700" />
                <span>Kitchen Sheet</span>
              </Link>
              <Link
                to="/admin/billing"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/admin/billing') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span>Monthly Billing</span>
              </Link>
              <Link
                to="/admin/students"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/admin/students') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 text-blue-600" />
                <span>Students & Locations</span>
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/student/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/student/dashboard') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UtensilsCrossed className="w-4 h-4 text-brand-600" />
                <span>Today's Dinner</span>
              </Link>
              <Link
                to="/student/orders"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/student/orders') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ChefHat className="w-4 h-4 text-slate-700" />
                <span>My Orders</span>
              </Link>
              <Link
                to="/student/bills"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/student/bills') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Receipt className="w-4 h-4 text-emerald-600" />
                <span>Monthly Bills</span>
              </Link>
              <Link
                to="/student/profile"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-bold ${
                  isActive('/student/profile') ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <UserIcon className="w-4 h-4 text-slate-700" />
                <span>My Profile</span>
              </Link>
            </>
          )}

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between px-1">
            <div className="text-xs">
              <p className="font-bold text-slate-800">{user?.fullName || user?.phoneNumber}</p>
              <p className="text-[10px] text-slate-400">{user?.hostelName || ''}</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
