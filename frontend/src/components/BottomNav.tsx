import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, ClipboardList, Receipt, User, Bell, LayoutDashboard, ChefHat, Menu as MenuIcon, Users, Activity, FileText, Settings, Database, LogOut, FileClock } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAdmin, isStudent, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  useEffect(() => {
    api.getUnreadNotificationsCount().then(r => setUnreadCount(r.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadNotificationsCount().then(r => setUnreadCount(r.unreadCount)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  // Close more menu on route change
  useEffect(() => {
    setMoreMenuOpen(false);
  }, [location.pathname]);

  const studentTabs = [
    { to: '/student/dashboard', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/student/orders',    icon: ClipboardList,   label: 'Orders' },
    { to: '/student/profile',   icon: User,            label: 'Profile' },
  ];

  const adminTabs = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dash' },
    { to: '/admin/orders',    icon: ClipboardList,   label: 'Orders' },
    { to: '/admin/kitchen',   icon: ChefHat,         label: 'Kitchen' },
    { to: '/admin/billing',   icon: Receipt,         label: 'Billing' },
    { id: 'more',             icon: MenuIcon,        label: 'More' },
  ];

  const adminMoreLinks = [
    { to: '/admin/menu',           icon: UtensilsCrossed, label: 'Daily Menu' },
    { to: '/admin/students',       icon: Users,           label: 'Students & Locations' },
    { to: '/admin/service-status', icon: Activity,        label: 'Service Status' },
    { to: '/admin/reports',        icon: FileText,        label: 'Reports' },
    { to: '/admin/audit-logs',     icon: FileClock,       label: 'Audit Logs' },
    { to: '/admin/settings',       icon: Settings,        label: 'Settings' },
    { to: '/admin/system',         icon: Database,        label: 'System & Catalog' },
  ];

  const tabs = isAdmin ? adminTabs : isStudent ? studentTabs : [];

  if (!user || tabs.length === 0) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around px-2">
        {tabs.map((tab) => {
          const isMore = tab.id === 'more';
          const active = !isMore && tab.to ? location.pathname.startsWith(tab.to) : moreMenuOpen;
          const Icon = tab.icon;
          
          const content = (
            <>
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-all ${active ? 'text-brand-600 scale-110' : 'text-slate-400'}`}
                  strokeWidth={active ? 2.5 : 1.75}
                />
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-brand-600' : 'text-slate-400'}`}>
                {tab.label}
              </span>
            </>
          );

          if (isMore) {
            return (
              <button
                key="more"
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="flex flex-col items-center justify-center py-3 w-16 gap-1 relative transition-colors"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={tab.to}
              to={tab.to!}
              className="flex flex-col items-center justify-center py-3 w-16 gap-1 relative transition-colors"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {/* Admin More Menu Overlay */}
      <AnimatePresence>
        {moreMenuOpen && isAdmin && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-[4.5rem] left-0 right-0 mx-4 bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl p-4 z-50 mb-safe overflow-hidden"
          >
            <div className="grid grid-cols-4 gap-y-6 gap-x-2">
              {adminMoreLinks.map((link) => {
                const LinkIcon = link.icon;
                const isActive = location.pathname.startsWith(link.to);
                return (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMoreMenuOpen(false)}
                    className="flex flex-col items-center justify-center gap-2"
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                      isActive ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/30' : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                    }`}>
                      <LinkIcon className="w-5 h-5" />
                    </div>
                    <span className="text-[10px] font-bold text-slate-600 text-center leading-tight">
                      {link.label}
                    </span>
                  </Link>
                );
              })}

              <button
                onClick={logout}
                className="flex flex-col items-center justify-center gap-2 group"
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-red-50 text-red-600 transition-all group-hover:bg-red-100">
                  <LogOut className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-bold text-red-600 text-center leading-tight">
                  Logout
                </span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
};
