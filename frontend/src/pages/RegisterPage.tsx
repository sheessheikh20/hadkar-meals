import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  auth, googleProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithPhoneNumber,
  RecaptchaVerifier,
} from '../utils/firebase';
import { Hostel } from '../types';
import { Phone, Mail, Lock, Eye, EyeOff, ShieldCheck, ArrowLeft } from 'lucide-react';

type AuthMethod = 'google' | 'email' | 'phone';
type PhoneStage = 'INPUT' | 'OTP';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [method, setMethod] = useState<AuthMethod>('google');

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Phone fields
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneStage, setPhoneStage] = useState<PhoneStage>('INPUT');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const recaptchaVerifierRef = useRef<any>(null);

  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.getHostels()
      .then((data) => setHostels(data.filter((h) => h.active)))
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const handleFirebaseToken = async (user: any) => {
    const idToken = await user.getIdToken();
    const authRes = await api.firebaseLogin(idToken);
    login(authRes);
    if (!authRes.profileComplete) navigate('/complete-profile');
    else navigate('/student/dashboard');
  };

  // ── Google ───────────────────────────────────────────────────────────────
  const handleGoogle = async () => {
    setLoading(true); setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleFirebaseToken(result.user);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') setError(err.message || 'Google sign-in failed.');
    } finally { setLoading(false); }
  };

  // ── Email / Password ─────────────────────────────────────────────────────
  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true); setError(null);
    try {
      const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await handleFirebaseToken(result.user);
    } catch (err: any) {
      const code = err.code;
      if (code === 'auth/email-already-in-use') setError('This email is already registered. Please sign in instead.');
      else if (code === 'auth/invalid-email') setError('Enter a valid email address.');
      else if (code === 'auth/weak-password') setError('Password is too weak. Use at least 6 characters.');
      else setError(err.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  // ── Phone OTP ────────────────────────────────────────────────────────────
  const setupRecaptcha = () => {
    if (!recaptchaVerifierRef.current) {
      recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-reg', {
        size: 'invisible',
        callback: () => {},
      });
    }
    return recaptchaVerifierRef.current;
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phoneNumber.replace(/[^0-9]/g, '');
    if (digits.length !== 10 || !/^[6-9]/.test(digits)) {
      setError('Enter a valid 10-digit Indian mobile number starting with 6–9.');
      return;
    }
    setLoading(true); setError(null);
    try {
      const verifier = setupRecaptcha();
      const result = await signInWithPhoneNumber(auth, `+91${digits}`, verifier);
      setConfirmationResult(result);
      setPhoneStage('OTP');
      setResendCooldown(30);
    } catch (err: any) {
      if (err.code === 'auth/too-many-requests') setError('Too many attempts. Please try again later.');
      else setError(err.message || 'Failed to send OTP.');
      recaptchaVerifierRef.current = null;
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 6) { setError('Enter the complete 6-digit OTP.'); return; }
    setLoading(true); setError(null);
    try {
      const result = await confirmationResult.confirm(otp);
      await handleFirebaseToken(result.user);
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') setError('Incorrect OTP. Please check and retry.');
      else if (err.code === 'auth/code-expired') setError('OTP has expired. Please request a new one.');
      else setError(err.message || 'Verification failed.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center px-4 py-10">
      <div id="recaptcha-container-reg" />

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-6">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 items-center justify-center text-2xl shadow-xl shadow-brand-500/25 mb-3">
            🍱
          </div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Hadkar Meals</h1>
          <p className="text-xs font-semibold text-slate-500 mt-1">Fresh Dinner Every Day</p>
        </div>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200">
          <h2 className="text-xl font-bold text-slate-900 mb-5">Create Account</h2>

          {/* Method Tabs */}
          <div className="flex gap-1 p-1 bg-slate-100 rounded-xl mb-5">
            {([
              { id: 'google', label: 'Google', icon: '🔍' },
              { id: 'email', label: 'Email', icon: '✉️' },
              { id: 'phone', label: 'Phone', icon: '📱' },
            ] as { id: AuthMethod; label: string; icon: string }[]).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => { setMethod(tab.id); setError(null); setPhoneStage('INPUT'); setOtp(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  method === tab.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ── GOOGLE ── */}
          {method === 'google' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">
                Sign up instantly with your Google account. After sign-up you'll complete your delivery details.
              </p>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-800 font-bold text-sm transition-all disabled:opacity-50 shadow-sm"
              >
                {loading ? 'Connecting...' : (
                  <>
                    <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* ── EMAIL ── */}
          {method === 'email' && (
            <form onSubmit={handleEmailRegister} className="space-y-4">
              <p className="text-xs text-slate-500">You'll add your name, phone &amp; delivery location on the next step.</p>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type="email" required autoFocus
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError(null); }}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'} required minLength={6}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(null); }}
                    placeholder="Minimum 6 characters"
                    className="w-full pl-10 pr-10 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    type={showPassword ? 'text' : 'password'} required
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                    placeholder="Re-enter password"
                    className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </div>
              {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
              <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all">
                {loading ? 'Creating Account...' : 'Create Account with Email →'}
              </button>
            </form>
          )}

          {/* ── PHONE ── */}
          {method === 'phone' && (
            <div className="space-y-4">
              {phoneStage === 'INPUT' ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <p className="text-xs text-slate-500">We'll send an OTP via SMS to verify your number.</p>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Mobile Number</label>
                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-slate-500 border-r border-slate-300 pr-2">+91</span>
                      <Phone className="w-4 h-4 text-slate-400 absolute left-14" />
                      <input
                        type="tel" required autoFocus maxLength={10}
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value.replace(/[^0-9]/g, '')); setError(null); }}
                        placeholder="9876543210"
                        className="w-full pl-20 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                      />
                    </div>
                  </div>
                  {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
                  <button type="submit" disabled={loading} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all">
                    {loading ? 'Sending OTP...' : 'Send OTP via SMS →'}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <button type="button" onClick={() => { setPhoneStage('INPUT'); setOtp(''); setError(null); }} className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Change Number
                  </button>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
                    📲 OTP sent to <strong>+91 {phoneNumber}</strong>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">Enter 6-Digit OTP</label>
                    <input
                      type="text" inputMode="numeric" maxLength={6} autoFocus
                      value={otp}
                      onChange={(e) => { setOtp(e.target.value.replace(/[^0-9]/g, '')); setError(null); }}
                      placeholder="• • • • • •"
                      className="w-full text-center tracking-[0.5em] text-2xl font-black py-3 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  {error && <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">{error}</div>}
                  <button type="submit" disabled={loading || otp.length < 6} className="w-full py-3 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-brand-600/25 disabled:opacity-50 transition-all">
                    {loading ? 'Verifying...' : 'Verify & Continue →'}
                  </button>
                  <div className="text-center">
                    <button type="button" onClick={() => { setPhoneStage('INPUT'); setOtp(''); setError(null); recaptchaVerifierRef.current = null; }} disabled={resendCooldown > 0} className="text-xs font-bold text-brand-600 hover:text-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}

          <div className="pt-5 mt-5 border-t border-slate-100 text-center">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 hover:underline">Sign In</Link>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-5">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secured by Firebase Authentication</span>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
