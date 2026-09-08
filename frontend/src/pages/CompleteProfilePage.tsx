import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Hostel } from '../types';
import { User, Phone, MapPin, CheckCircle2, ShieldCheck } from 'lucide-react';

/**
 * CompleteProfilePage
 * Shown after any Firebase sign-in (Google / Email / Phone) for NEW users.
 * Collects: Full Name, Phone Number (if not phone-auth), Delivery Location.
 */
export const CompleteProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { user, login } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-fill name from Google profile if available
  useEffect(() => {
    if (user?.fullName && !user.fullName.startsWith('G_')) {
      setFullName(user.fullName);
    }
    // Pre-fill phone if user signed in via phone (Firebase phone auth stores it)
    if (user?.phoneNumber && !user.phoneNumber.startsWith('G_')) {
      setPhoneNumber(user.phoneNumber);
    }
  }, [user]);

  useEffect(() => {
    api.getHostels()
      .then((data) => {
        const active = data.filter((h) => h.active);
        setHostels(active);
        if (active.length === 1) setHostelId(active[0].id);
      })
      .catch(console.error);
  }, []);

  // If user is already complete, redirect away
  useEffect(() => {
    if (user?.profileComplete) {
      navigate('/student/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const validatePhone = (phone: string): string | null => {
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.length !== 10) return 'Enter a valid 10-digit mobile number.';
    if (!/^[6-9]\d{9}$/.test(digits)) return 'Must start with 6, 7, 8, or 9 (Indian number).';
    if (/^(\d)\1{9}$/.test(digits)) return 'Please enter a real mobile number.';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) { setError('Please enter your full name.'); return; }
    const phoneErr = validatePhone(phoneNumber);
    if (phoneErr) { setError(phoneErr); return; }
    if (!hostelId) { setError('Please select your delivery location.'); return; }

    setLoading(true);
    setError(null);

    try {
      const authRes = await api.completeProfile({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
        hostelId: Number(hostelId),
      });
      login(authRes);
      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Could not save profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[88vh] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 items-center justify-center text-3xl shadow-xl shadow-brand-500/30 mb-4">
            🍱
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Almost There!</h1>
          <p className="text-sm text-slate-500 mt-1">Tell us where to deliver your meals</p>
        </div>

        {/* Steps indicator */}
        <div className="flex items-center gap-2 mb-6 px-2">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs font-bold text-emerald-700">Signed In</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 rounded" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center">
              <span className="text-[10px] font-black text-white">2</span>
            </div>
            <span className="text-xs font-bold text-brand-700">Your Details</span>
          </div>
          <div className="flex-1 h-0.5 bg-slate-200 rounded" />
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center">
              <span className="text-[10px] font-black text-slate-400">3</span>
            </div>
            <span className="text-xs font-bold text-slate-400">Dashboard</span>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200 space-y-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Complete Your Profile</h2>
            <p className="text-xs text-slate-500 mt-0.5">This helps us deliver your tiffin to the right place.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  type="text"
                  required
                  autoFocus
                  value={fullName}
                  onChange={(e) => { setFullName(e.target.value); setError(null); }}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mobile Number <span className="text-red-500">*</span>
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-bold text-slate-500 border-r border-slate-300 pr-2 leading-none">+91</span>
                <Phone className="w-4 h-4 text-slate-400 absolute left-14" />
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={phoneNumber}
                  onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '')); setError(null); }}
                  placeholder="9876543210"
                  className="w-full pl-20 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1 ml-1">This is your account's unique identifier.</p>
            </div>

            {/* Delivery Location */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Delivery Location <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                {hostels.length === 0 ? (
                  <div className="w-full pl-10 pr-4 py-3 text-sm text-slate-400 rounded-xl border border-slate-200 bg-slate-50">
                    Loading locations…
                  </div>
                ) : (
                  <select
                    required
                    value={hostelId}
                    onChange={(e) => { setHostelId(Number(e.target.value)); setError(null); }}
                    className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-white appearance-none"
                  >
                    <option value="">Select your hostel / location</option>
                    {hostels.map((h) => (
                      <option key={h.id} value={h.id}>{h.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !fullName.trim() || phoneNumber.length < 10 || !hostelId}
              className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <span>Saving Profile…</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save &amp; Go to Dashboard</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Your data is private and secure</span>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfilePage;
