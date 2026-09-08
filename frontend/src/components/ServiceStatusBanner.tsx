import React from 'react';
import { AlertCircle, Clock, CheckCircle2, ShieldAlert } from 'lucide-react';

interface Props {
  status?: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'HOLIDAY' | string;
  serviceStatus?: 'OPEN' | 'CLOSING_SOON' | 'CLOSED' | 'HOLIDAY' | string;
  message?: string;
  serviceBannerText?: string;
  alerts?: string[];
}

export const ServiceStatusBanner: React.FC<Props> = ({
  status,
  serviceStatus,
  message,
  serviceBannerText,
  alerts = []
}) => {
  const currentStatus = serviceStatus || status || 'OPEN';
  const currentMsg = serviceBannerText || message;

  const getStyle = () => {
    switch (currentStatus) {
      case 'CLOSING_SOON':
        return {
          bg: 'bg-amber-50 border-amber-300 text-amber-900',
          badge: 'bg-amber-200 text-amber-900',
          icon: Clock,
          label: '🟡 CLOSING SOON',
        };
      case 'CLOSED':
      case 'HOLIDAY':
        return {
          bg: 'bg-red-50 border-red-300 text-red-900',
          badge: 'bg-red-200 text-red-900',
          icon: ShieldAlert,
          label: currentStatus === 'HOLIDAY' ? '🏖️ HOLIDAY' : '🔴 SERVICE CLOSED',
        };
      case 'OPEN':
      default:
        return {
          bg: 'bg-emerald-50 border-emerald-300 text-emerald-900',
          badge: 'bg-emerald-200 text-emerald-900',
          icon: CheckCircle2,
          label: '🟢 SERVICE OPEN',
        };
    }
  };

  const style = getStyle();
  const Icon = style.icon;

  return (
    <div className="space-y-2 mb-6">
      <div className={`p-4 rounded-xl border ${style.bg} flex items-center justify-between shadow-sm transition-all`}>
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-white/70 shadow-xs">
            <Icon className="w-5 h-5 shrink-0" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${style.badge}`}>
                {style.label}
              </span>
            </div>
            <p className="font-semibold text-sm sm:text-base mt-0.5">
              {currentMsg || (currentStatus === 'OPEN' ? 'Today\'s meals are open for orders' : 'Service is currently unavailable')}
            </p>
          </div>
        </div>
      </div>

      {alerts && alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((alert, i) => (
            <div key={i} className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50/80 px-3 py-2 rounded-lg border border-amber-200">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>{alert}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
