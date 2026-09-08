import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Phone, ArrowRight, ShieldCheck, Lock,
  KeyRound, MessageCircle, CheckCircle2, ArrowLeft, Eye, EyeOff, UserPlus
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  // Mode: 'PASSWORD' (default direct password login) or 'OTP' (fallback WhatsApp OTP)
  const [mode, setMode] = useState<'PASSWORD' | 'OTP'>('PASSWORD');
  const [otpStep, setOtpStep] = useState<'PHONE' | 'VERIFY'>('PHONE');

  // Form Fields
  const [identifier, setIdentifier] = useState<string>(''); // Mobile or Email
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // OTP Fields
  const [otpPhone, setOtpPhone] = useState<string>('');
  const [whatsappUrl, setWhatsappUrl] = useState<string>('');
  const [otp, setOtp] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // ── 1. PASSWORD SIGN IN (Universal: Student, Admin, Super Admin) ─────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim();
    if (!cleanId) {
      setError('Please enter your 10-digit mobile number or email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const auth = await api.login(cleanId, password);
      login(auth);

      if (auth.role === 'ROLE_SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (auth.role === 'ROLE_ADMIN') {
        navigate('/admin/dashboard');
      } else if (!auth.profileComplete) {
        navigate('/register-profile');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid mobile number/email or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── 2. REQUEST OTP (Alternative Flow) ───────────────────────────────────
  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPhone = otpPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10) {
      setError('Please enter a valid 10-digit mobile number.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.sendOtp(cleanPhone);
      if (!res.registered) {
        setError('__NOT_FOUND__');
        return;
      }

      setWhatsappUrl(res.whatsappUrl);
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
      setOtp('');
      setError(null);
      setOtpStep('VERIFY');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // ── 3. VERIFY OTP ───────────────────────────────────────────────────────
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const cleanPhone = otpPhone.replace(/[^0-9]/g, '');
      const authRes = await api.verifyOtp(cleanPhone, otp);
      login(authRes);

      if (authRes.role === 'ROLE_ADMIN') {
        navigate('/admin/dashboard');
      } else if (authRes.role === 'ROLE_SUPER_ADMIN') {
        navigate('/super-admin');
      } else if (!authRes.profileComplete) {
        navigate('/register-profile');
      } else {
        navigate('/student/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white shadow-xl shadow-brand-600/30 mb-3 text-2xl">
            🍱
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Hadkar Meals</h1>
          <p className="text-xs text-slate-500 mt-1">Fresh Homestyle Dinner. Every Day.</p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200">
          {mode === 'PASSWORD' ? (
            /* ── PASSWORD LOGIN ── */
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-1">Sign In to Your Account</h2>
                <p className="text-xs text-slate-500">
                  Enter your registered mobile number (or email) and password.
                </p>
              </div>

              <form onSubmit={handlePasswordLogin} className="space-y-4">
                {/* Identifier */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Mobile Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type="text"
                      required
                      autoFocus
                      value={identifier}
                      onChange={(e) => {
                        setIdentifier(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="e.g. 9820000001 or student@example.com"
                      className="w-full pl-10 pr-4 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-3 text-sm font-semibold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !identifier.trim() || !password}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand-600 to-amber-600 hover:from-brand-700 hover:to-amber-700 text-white font-bold text-sm shadow-md shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <span>Signing in...</span>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4" />
                      <span>Sign In</span>
                    </>
                  )}
                </button>
              </form>

              {/* OR Divider */}
              <div className="relative flex py-1 items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink mx-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              {/* OTP Alternative toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => {
                    setMode('OTP');
                    setOtpStep('PHONE');
                    if (identifier.replace(/[^0-9]/g, '').length === 10) {
                      setOtpPhone(identifier.replace(/[^0-9]/g, ''));
                    }
                    setError(null);
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 py-2.5 px-4 rounded-xl transition-colors border border-emerald-200"
                >
                  <MessageCircle className="w-4 h-4 text-[#25D366]" />
                  <span>Sign in with WhatsApp OTP instead</span>
                </button>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  Don&apos;t have an account yet?{' '}
                  <Link to="/register" className="font-bold text-brand-600 hover:underline">
                    Register here
                  </Link>
                </p>
              </div>
            </div>
          ) : (
            /* ── OTP LOGIN ── */
            <div className="space-y-4">
              {otpStep === 'PHONE' ? (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 mb-1">WhatsApp OTP Login</h2>
                      <p className="text-xs text-slate-500">
                        Enter your 10-digit mobile number to receive verification code.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleRequestOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Mobile Number
                      </label>
                      <div className="relative">
                        <div className="absolute left-3.5 top-3 flex items-center gap-1.5 pointer-events-none text-slate-500 text-xs font-bold">
                          <span>🇮🇳</span>
                          <span>+91</span>
                          <span className="text-slate-300">|</span>
                        </div>
                        <input
                          type="tel"
                          inputMode="numeric"
                          required
                          autoFocus
                          maxLength={10}
                          value={otpPhone}
                          onChange={(e) => {
                            setOtpPhone(e.target.value.replace(/[^0-9]/g, ''));
                            if (error) setError(null);
                          }}
                          placeholder="Enter 10-digit number"
                          className="w-full pl-20 pr-4 py-3 text-sm font-bold text-slate-900 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 tracking-wider"
                        />
                      </div>
                    </div>

                    {error && error !== '__NOT_FOUND__' && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                        {error}
                      </div>
                    )}

                    {error === '__NOT_FOUND__' && (
                      <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 space-y-3">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0 text-amber-600 mt-0.5">
                            <UserPlus className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-amber-900">
                              No account found with this number
                            </p>
                            <p className="text-[11px] text-amber-700 mt-0.5">
                              The mobile number +91 {otpPhone} is not registered yet.
                            </p>
                          </div>
                        </div>
                        <Link
                          to="/register"
                          className="w-full py-2.5 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Create a New Account</span>
                        </Link>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otpPhone.replace(/[^0-9]/g, '').length < 10}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Checking...</span>
                      ) : (
                        <>
                          <span>Send WhatsApp OTP</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('PASSWORD');
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Password Login</span>
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <button
                      type="button"
                      onClick={() => setOtpStep('PHONE')}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-900 mb-2"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Change Number (+91 {otpPhone})</span>
                    </button>
                    <h2 className="text-xl font-bold text-slate-900 mb-1">Enter 6-Digit OTP</h2>
                    <p className="text-xs text-slate-500">
                      Enter the 6-digit code from the WhatsApp message you just sent.
                    </p>
                  </div>

                  <form onSubmit={handleVerifyOtp} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 text-center">
                        Verification Code (OTP)
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        autoFocus
                        value={otp}
                        onChange={(e) => {
                          setOtp(e.target.value.replace(/[^0-9]/g, ''));
                          if (error) setError(null);
                        }}
                        placeholder="123456"
                        className="w-full py-3 px-4 text-center font-mono font-black text-2xl tracking-[0.3em] rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 text-slate-900 placeholder:text-slate-300"
                      />
                    </div>

                    {error && (
                      <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                        {error}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || otp.length < 6}
                      className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                    >
                      {loading ? (
                        <span>Verifying...</span>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify &amp; Sign In</span>
                        </>
                      )}
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={handleOpenWhatsApp}
                      className="text-xs text-[#25D366] hover:underline font-bold inline-flex items-center gap-1"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Didn&apos;t send yet? Re-open WhatsApp</span>
                    </button>
                  </div>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('PASSWORD');
                        setError(null);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Back to Password Login</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-6">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secure authentication • Encrypted session tokens</span>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
