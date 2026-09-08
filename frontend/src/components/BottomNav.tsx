import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { UtensilsCrossed, ClipboardList, Receipt, User, Bell } from 'lucide-react';
import { api } from '../api/client';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    api.getUnreadNotificationsCount().then(r => setUnreadCount(r.unreadCount)).catch(() => {});
    const interval = setInterval(() => {
      api.getUnreadNotificationsCount().then(r => setUnreadCount(r.unreadCount)).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [location.pathname]);

  const tabs = [
    { to: '/student/dashboard', icon: UtensilsCrossed, label: 'Meals' },
    { to: '/student/orders',    icon: ClipboardList,   label: 'Orders' },
    { to: '/student/bills',     icon: Receipt,         label: 'Bills' },
    { to: '/student/notifications', icon: Bell,        label: 'Alerts', badge: unreadCount > 0 ? unreadCount : null },
    { to: '/student/profile',   icon: User,            label: 'Profile' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-lg shadow-slate-900/10">
      <div className="flex items-stretch">
        {tabs.map(({ to, icon: Icon, label, badge }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 relative transition-colors"
            >
              {active && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-brand-600" />
              )}
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-all ${active ? 'text-brand-600' : 'text-slate-400'}`}
                  strokeWidth={active ? 2.5 : 1.75}
                />
                {badge && (
                  <span className="absolute -top-1.5 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-black flex items-center justify-center leading-none">
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold leading-none ${active ? 'text-brand-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
      {/* Safe area bottom */}
      <div className="h-safe-area-inset-bottom" style={{ height: 'env(safe-area-inset-bottom)' }} />
    </nav>
  );
};
