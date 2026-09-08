import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Hostel } from '../types';
import { UserCheck, MapPin, ArrowRight } from 'lucide-react';

const DEFAULT_LOCATIONS: Hostel[] = [
  { id: 1, name: 'Mahadev Hostel', active: true },
];

export const RegisterProfilePage: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState<string>('');
  const [hostels, setHostels] = useState<Hostel[]>(DEFAULT_LOCATIONS);
  const [selectedHostelId, setSelectedHostelId] = useState<number | ''>(1);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getHostels()
      .then((data) => {
        if (data && data.length > 0) {
          // Keep clean location names
          setHostels(data);
          setSelectedHostelId((prev) => prev || data[0].id);
        }
      })
      .catch((err) => {
        console.warn('Using default locations:', err);
      });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !selectedHostelId) {
      setError('Please enter your name.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.registerProfile(fullName.trim(), Number(selectedHostelId));
      await refreshUser();
      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to complete profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
            <UserCheck className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-black text-slate-900">Complete Student Profile</h1>
          <p className="text-xs text-slate-500 mt-1">
            Link your phone <strong className="text-slate-800 font-semibold">+91 {user?.phoneNumber}</strong> to your delivery location.
          </p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Mohammad Shees"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-brand-500" />
                Service Location / Hostel <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedHostelId}
                onChange={(e) => setSelectedHostelId(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm font-semibold bg-white"
              >
                {hostels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                Select where your dinner tiffin should be delivered.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !fullName.trim() || !selectedHostelId}
              className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 mt-4"
            >
              {loading ? 'Saving Profile...' : 'Save & Enter Hadkar Meals'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
