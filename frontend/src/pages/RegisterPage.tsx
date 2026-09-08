import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Hostel } from '../types';
import {
  Phone, User, MapPin, Mail, ArrowRight, ShieldCheck,
  CheckCircle2, MessageCircle, ArrowLeft, Lock, Eye, EyeOff
} from 'lucide-react';

// ─── Registration Steps ───────────────────────────────────────────────────────
// DETAILS  → User fills name, phone, hostel, password, optional email
// VERIFY   → Direct OTP entry; user submits; account created
// ─────────────────────────────────────────────────────────────────────────────

type Step = 'DETAILS' | 'VERIFY';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [step, setStep] = useState<Step>('DETAILS');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [hostelId, setHostelId] = useState<number | ''>('');
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getHostels()
      .then((data) => {
        const activeHostels = data.filter((h) => h.active);
        setHostels(activeHostels);
        if (activeHostels.length > 0) {
          const mahadev = activeHostels.find((h) => h.name.toLowerCase().includes('mahadev'));
          setHostelId(mahadev ? mahadev.id : activeHostels[0].id);
        }
      })
      .catch((err) => {
        console.error('Failed to load hostels', err);
      });
  }, []);

function validateIndianMobileNumber(phone: string): { valid: boolean; reason?: string } {
  const digits = phone.replace(/[^0-9]/g, '');
  if (digits.length !== 10) {
    return { valid: false, reason: 'Mobile number must be exactly 10 digits.' };
  }
  // Indian mobile numbers must begin with 6, 7, 8, or 9
  if (!/^[6-9]\d{9}$/.test(digits)) {
    return {
      valid: false,
      reason: 'Invalid mobile number. Authentic Indian mobile numbers must start with 6, 7, 8, or 9.'
    };
  }
  // Check for repeated digits like 0000000000, 9999999999, 8888888888
  if (/^(\d)\1{9}$/.test(digits)) {
    return {
      valid: false,
      reason: `Fake number detected. Repeated digit numbers (${digits}) are not permitted.`
    };
  }
  // Common fake sequences
  const fakeSequences = ['1234567890', '9876543210', '9876543211', '9123456789', '9000000000'];
  if (fakeSequences.includes(digits)) {
    return {
      valid: false,
      reason: 'Fake/dummy number detected. Please enter your genuine personal mobile number.'
    };
  }
  return { valid: true };
}

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    const validation = validateIndianMobileNumber(cleanPhone);
    if (!validation.valid) {
      setError(validation.reason || 'Invalid mobile number.');
      return;
    }
    if (!hostelId) {
      setError('Please select your delivery location.');
      return;
    }
    if (!password || password.length < 6) {
      setError('Please enter a password with at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-check.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.sendOtp(cleanPhone);

      // Prevent duplicate accounts: If number is already registered, block registration
      if (res.registered) {
        setError('__ALREADY_REGISTERED__');
        return;
      }

      setWhatsappUrl(res.whatsappUrl);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      setOtp('');
      setError(null);
      setStep('VERIFY');
    } catch (err: any) {
      setError(err.message || 'Failed to generate OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) {
      setError('Please enter the 6-digit OTP from your WhatsApp message.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = await api.registerWithOtp({
        phoneNumber: phoneNumber.replace(/[^0-9]/g, ''),
        otp,
        fullName: fullName.trim(),
        hostelId: Number(hostelId),
        password: password.trim(),
        email: email.trim() || undefined,
      });

      login(auth);
      navigate('/student/dashboard');
    } catch (err: any) {
      setError(err.message || 'Verification failed. Please check the OTP.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center px-4 py-10">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 items-center justify-center text-2xl shadow-xl shadow-brand-500/25 mb-3">
            🍱
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            HADKAR <span className="text-brand-600">MEALS</span>
          </h1>
          <p className="text-xs font-semibold text-slate-600 mt-1">
            New Customer Registration • Fresh Dinner Every Day
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3 px-1">
          {(['DETAILS', 'VERIFY'] as Step[]).map((s, idx) => {
            const steps: Step[] = ['DETAILS', 'VERIFY'];
            const currentIdx = steps.indexOf(step);
            const done = idx < currentIdx;
            const active = s === step;
            return (
              <React.Fragment key={s}>
                <div
                  className={`w-6 h-6 rounded-full text-[11px] font-black flex items-center justify-center transition-colors ${
                    active ? 'bg-brand-600 text-white' : done ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'
                  }`}
                >
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                {idx < 1 && (
                  <div className={`flex-1 h-0.5 rounded-full transition-colors ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200">
          {/* ── STEP 1: Details ─────────────────────────────────────────────────── */}
          {step === 'DETAILS' && (
            <>
              <h2 className="text-xl font-bold text-slate-900 mb-1">Create an Account</h2>
              <p className="text-xs text-slate-500 mb-6">
                Register to order fresh homestyle dinner tiffins directly to your location.
              </p>

              <form onSubmit={handleRequestOtp} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Full Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Rahul Sharma"
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Phone Number */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number (for WhatsApp OTP) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <span className="text-xs font-bold text-slate-500 mr-1.5 border-r border-slate-300 pr-1.5">+91</span>
                      <Phone className="w-4 h-4 text-slate-400" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="9876543210"
                      maxLength={10}
                      className="w-full pl-16 pr-4 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Hostel Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Delivery Location / Hostel <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                    <select
                      required
                      value={hostelId}
                      onChange={(e) => setHostelId(Number(e.target.value))}
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
                    >
                      <option value="">Select your hostel / delivery point</option>
                      {hostels.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} {h.address ? `(${h.address})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Create Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="w-full pl-10 pr-10 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Confirm Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {/* Email (Optional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@example.com"
                      className="w-full pl-10 pr-4 py-2.5 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                </div>

                {error === '__ALREADY_REGISTERED__' ? (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-700 mt-0.5 font-black text-sm">
                        ⚠️
                      </div>
                      <div>
                        <p className="text-xs font-black text-amber-950">
                          Mobile Number Already Registered!
                        </p>
                        <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                          The mobile number <span className="font-mono font-bold">+91 {phoneNumber.replace(/[^0-9]/g, '')}</span> is already linked to an existing account. You cannot create a second account with this number.
                        </p>
                      </div>
                    </div>
                    <Link
                      to="/login"
                      className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-sm shadow-orange-500/20"
                    >
                      <ArrowRight className="w-3.5 h-3.5" />
                      <span>Sign In to Your Existing Account</span>
                    </Link>
                  </div>
                ) : error ? (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {loading ? 'Opening WhatsApp...' : (
                    <>
                      <span>Continue to Verification</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          {/* ── STEP 2: Verify OTP (Direct Input) ─────────────────────────────────── */}
          {step === 'VERIFY' && (
            <>
              <button
                type="button"
                onClick={() => setStep('DETAILS')}
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 mb-4 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </button>

              <h2 className="text-xl font-bold text-slate-900 mb-1">Enter Your OTP</h2>
              <p className="text-xs text-slate-500 mb-4">
                We've opened WhatsApp with your pre-filled OTP for{' '}
                <strong className="text-slate-800">+91 {phoneNumber.replace(/[^0-9]/g, '')}</strong>.
                Send the message to yourself and enter the 6-digit code below.
              </p>

              {/* Re-open WhatsApp helper */}
              <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
                  <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>WhatsApp didn't open?</span>
                </div>
                <button
                  type="button"
                  onClick={handleOpenWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors"
                >
                  Open WhatsApp
                </button>
              </div>

              <form onSubmit={handleVerifyAndRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    6-Digit OTP Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.5em] py-3 text-2xl font-black text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Enter the code sent to your WhatsApp
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 6}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {loading ? 'Creating Account...' : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify &amp; Complete Registration</span>
                    </>
                  )}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 pt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 hover:underline">
                Sign In here
              </Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-6">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Account created only after WhatsApp OTP is verified</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
