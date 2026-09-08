import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Notification } from '../types';
import { Bell, CheckCheck, Clock, ShieldAlert, Sparkles } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';

export const StudentNotificationsPage: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const loadNotifs = async () => {
    try {
      const data = await api.getMyNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifs();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      loadNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkOne = async (id: number) => {
    try {
      await api.markNotificationRead(id);
      loadNotifs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-6 pb-20 md:pb-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-brand-600" />
            <span>Notifications</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Alerts for menu publishing, cutoff reminders, closures & receipts</p>
        </div>
        {notifications.some((n) => !n.readStatus) && (
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl transition-colors"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark All as Read</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-slate-100 animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white rounded-3xl p-10 text-center border border-slate-200">
          <Bell className="w-12 h-12 text-slate-300 mx-auto mb-2" />
          <p className="text-slate-500 text-sm">No notifications yet.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.readStatus && handleMarkOne(n.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                n.readStatus
                  ? 'bg-white border-slate-200 opacity-80'
                  : 'bg-brand-50/50 border-brand-200 shadow-xs'
              }`}
            >
              <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  {!n.readStatus && <span className="w-2 h-2 rounded-full bg-brand-600 inline-block" />}
                  <span>{n.title}</span>
                </h4>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono font-medium">
                  {formatDateTimeDDMMYYYY(n.createdAt)}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">{n.message}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

