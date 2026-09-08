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
    { to: '/student/dashboard', icon: UtensilsCrossed, label: 'Menu' },
    { to: '/student/orders',    icon: ClipboardList,   label: 'Orders' },
    { to: '/student/profile',   icon: User,            label: 'Profile' },
  ];

  if (!tabs.some(t => location.pathname.startsWith(t.to))) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-100 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around px-2">
        {tabs.map(({ to, icon: Icon, label }) => {
          const active = location.pathname.startsWith(to);
          return (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center justify-center py-3 w-16 gap-1 relative transition-colors"
            >
              <div className="relative">
                <Icon
                  className={`w-6 h-6 transition-all ${active ? 'text-brand-600 scale-110' : 'text-slate-400'}`}
                  strokeWidth={active ? 2.5 : 1.75}
                />
              </div>
              <span className={`text-[10px] font-bold tracking-wide ${active ? 'text-brand-600' : 'text-slate-400'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
