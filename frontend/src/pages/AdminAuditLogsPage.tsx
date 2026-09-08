import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { ShieldCheck, Calendar, UserCheck } from 'lucide-react';
import { formatDateTimeDDMMYYYY } from '../utils/dateUtils';

export const AdminAuditLogsPage: React.FC = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    api.getAuditLogs()
      .then(setLogs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-brand-600" />
          <span>Audit & Operations Log</span>
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Immutable audit record of all administrative cancellations, payments, and service changes
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 font-bold uppercase text-slate-500">
              <th className="py-3 px-4">Timestamp (DD/MM/YYYY)</th>
              <th className="py-3 px-4">Action</th>
              <th className="py-3 px-4">Admin / Operator</th>
              <th className="py-3 px-4">Entity</th>
              <th className="py-3 px-4">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50">
                <td className="py-3 px-4 text-slate-700 font-mono font-medium">
                  {formatDateTimeDDMMYYYY(log.createdAt)}
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                    {log.action}
                  </span>
                </td>
                <td className="py-3 px-4 font-bold text-slate-900">{log.performedBy}</td>
                <td className="py-3 px-4">{log.targetEntity} #{log.targetId}</td>
                <td className="py-3 px-4 text-slate-600">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

