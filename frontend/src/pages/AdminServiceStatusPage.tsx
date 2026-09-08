import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Holiday } from '../types';
import { Calendar, Moon } from 'lucide-react';
import { formatDateDDMMYYYY } from '../utils/dateUtils';

export const AdminServiceStatusPage: React.FC = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // New holiday form
  const [holidayDate, setHolidayDate] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [msg, setMsg] = useState<string | null>(null);

  const loadHolidays = async () => {
    try {
      const data = await api.getHolidays();
      setHolidays(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadHolidays();
  }, []);

  const handleScheduleHoliday = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!holidayDate || !title.trim()) return;

    setLoading(true);
    setMsg(null);

    try {
      await api.scheduleHoliday({
        holidayDate,
        title: title.trim(),
        description: description.trim() || undefined,
        affectsMeal: 'DINNER',
      });
      setMsg('Scheduled holiday saved successfully! Dinner orders on that date will be blocked.');
      setTitle('');
      setDescription('');
      setHolidayDate('');
      loadHolidays();
    } catch (err: any) {
      alert(err.message || 'Failed to schedule holiday');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-brand-600" />
            <span>Service Schedule & Holidays</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Advance holiday calendar and scheduled dinner service days-off
          </p>
        </div>
      </div>

      {msg && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Schedule Holiday Form */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <Calendar className="w-5 h-5 text-brand-600" />
            <span>Schedule Advance Closed Day / Holiday</span>
          </h3>

          <form onSubmit={handleScheduleHoliday} className="space-y-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Holiday Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Title / Occasion <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sunday Off, Diwali, Kitchen Maintenance..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                Description / Notice for Students (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="e.g. Regular dinner tiffin service resumes next evening."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs font-semibold"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-xs"
            >
              {loading ? 'Saving...' : 'Save Scheduled Holiday'}
            </button>
          </form>
        </div>

        {/* Scheduled Holidays List */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-extrabold text-slate-900 text-base">Upcoming Scheduled Holidays</h3>

          {holidays.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No scheduled holidays.</p>
          ) : (
            <div className="space-y-3">
              {holidays.map((h) => (
                <div key={h.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between items-start">
                    <h4 className="font-black text-slate-900 text-sm">{h.title}</h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 flex items-center gap-1">
                      <Moon className="w-3 h-3" />
                      Dinner Closed
                    </span>
                  </div>
                  <p className="text-brand-600 font-bold flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{formatDateDDMMYYYY(h.holidayDate)}</span>
                  </p>
                  {h.description && <p className="text-slate-500 text-[11px]">{h.description}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

