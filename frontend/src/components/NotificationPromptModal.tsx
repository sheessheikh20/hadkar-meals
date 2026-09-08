import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, ShieldCheck, X, Sparkles } from 'lucide-react';
import { requestNotificationPermission } from '../utils/firebase';

interface NotificationPromptModalProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export const NotificationPromptModal: React.FC<NotificationPromptModalProps> = ({ isOpen: propIsOpen, onClose: propOnClose }) => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'denied'>('idle');

  useEffect(() => {
    if (propIsOpen !== undefined) {
      setIsVisible(propIsOpen);
      return;
    }

    // Check if browser supports notifications
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return;
    }

    // If already granted, do not show
    if (Notification.permission === 'granted') {
      return;
    }

    // Check if user already dismissed in this session
    const dismissed = sessionStorage.getItem('notification_prompt_dismissed');
    if (dismissed) {
      return;
    }

    // Slight delay so the page loads smoothly before popup appears
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 600);

    return () => clearTimeout(timer);
  }, [propIsOpen]);

  const handleDismiss = () => {
    sessionStorage.setItem('notification_prompt_dismissed', 'true');
    setIsVisible(false);
    if (propOnClose) propOnClose();
  };

  const handleEnableNotifications = async () => {
    setLoading(true);
    try {
      const token = await requestNotificationPermission();
      if (token || (typeof Notification !== 'undefined' && Notification.permission === 'granted')) {
        setStatus('success');
        setTimeout(() => {
          setIsVisible(false);
          if (propOnClose) propOnClose();
        }, 1500);
      } else {
        setStatus('denied');
        setTimeout(() => {
          setIsVisible(false);
          if (propOnClose) propOnClose();
        }, 2200);
      }
    } catch (err) {
      console.error('Failed to enable notifications:', err);
      setStatus('denied');
      setTimeout(() => {
        setIsVisible(false);
        if (propOnClose) propOnClose();
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-slate-100 relative overflow-hidden transform transition-all animate-scaleUp">
        {/* Decorative background glow */}
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-amber-200/50 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-brand-200/40 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          title="Dismiss"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'success' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-3xl shadow-lg shadow-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-slate-900">Notifications Enabled!</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You will now receive instant alerts for dinner menus, order cutoffs, and delivery arrival updates.
            </p>
          </div>
        ) : status === 'denied' ? (
          <div className="text-center py-6 space-y-3">
            <div className="w-16 h-16 rounded-3xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto text-3xl">
              🔔
            </div>
            <h3 className="text-lg font-black text-slate-900">Permission Not Allowed</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              You can turn on notifications anytime by clicking the bell icon at the top of your dashboard or in your browser address bar.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Header with animated bell */}
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-brand-600 text-white flex items-center justify-center shadow-lg shadow-brand-500/25">
                  <Bell className="w-7 h-7 animate-bounce" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white animate-pulse" />
              </div>
              <div>
                <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider mb-1">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Stay Updated</span>
                </div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">
                  Turn On Dinner Alerts?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Get notified the moment dinner menu is published!
                </p>
              </div>
            </div>

            {/* Benefit Points */}
            <div className="space-y-2 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                <span className="text-base shrink-0">🥘</span>
                <span>Daily Dinner Menu announcement at 4:00 PM</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                <span className="text-base shrink-0">⏰</span>
                <span>15-Minute warning before dinner order cutoff</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs font-bold text-slate-700">
                <span className="text-base shrink-0">🛵</span>
                <span>Instant delivery alert when your tiffin arrives at hostel</span>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleEnableNotifications}
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 active:scale-98 text-white font-black text-xs sm:text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                <Bell className="w-4 h-4" />
                <span>{loading ? 'Requesting...' : 'Yes, Turn On Dinner Alerts'}</span>
              </button>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors text-center"
              >
                Maybe Later
              </button>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>No spam • Only essential dinner & delivery alerts</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationPromptModal;
