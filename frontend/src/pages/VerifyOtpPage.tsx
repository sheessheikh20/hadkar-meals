import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { ArrowLeft, ShieldCheck, MessageCircle, CheckCircle2, RefreshCw } from 'lucide-react';

/**
 * VerifyOtpPage — Manual WhatsApp OTP Verification
 *
 * This page is navigated to after /login when the user provides their phone number.
 * It guides the user through the 2-stage WhatsApp OTP process:
 *   Stage A: Open WhatsApp and send the pre-filled message
 *   Stage B: Enter the 6-digit OTP in the input field and verify
 *
 * Security: The OTP code is never displayed on this page.
 * The user must retrieve it from their own WhatsApp message.
 */

type Stage = 'WHATSAPP' | 'VERIFY';

export const VerifyOtpPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { login } = useAuth();

  const phoneNumber: string = location.state?.phoneNumber || '';
  const initialWhatsappUrl: string = location.state?.whatsappUrl || '';

  const [stage, setStage] = useState<Stage>('VERIFY');
  const [whatsappUrl, setWhatsappUrl] = useState<string>(initialWhatsappUrl);
  const [otp, setOtp] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState<number>(0);

  // If accessed without phone number, redirect back
  React.useEffect(() => {
    if (!phoneNumber) {
      navigate('/login');
    }
  }, [phoneNumber, navigate]);

  // Resend cooldown countdown
  React.useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOpenWhatsApp = () => {
    if (whatsappUrl) {
      window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const authRes = await api.verifyOtp(phoneNumber, otp);
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

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.sendOtp(phoneNumber);
      setWhatsappUrl(res.whatsappUrl);
      setResendCooldown(15);
      setOtp('');
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[90vh] flex flex-col justify-center items-center px-4 py-12">
      <div className="w-full max-w-md">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Change Phone Number</span>
        </button>

        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-slate-200/60 border border-slate-200">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900">
              Enter Your OTP
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Verifying <strong className="text-slate-800 font-semibold">+91 {phoneNumber}</strong>
            </p>
          </div>

          {/* WhatsApp Helper */}
          <div className="mb-5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <MessageCircle className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Need to open WhatsApp?</span>
            </div>
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shrink-0 transition-colors"
            >
              Open WhatsApp
            </button>
          </div>

          {/* Stage B: OTP entry */}
          {stage === 'VERIFY' && (
            <>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleVerify();
                }}
                className="space-y-5"
              >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 text-center">
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    autoFocus
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="••••••"
                    className="w-full text-center tracking-[0.6em] text-2xl font-black py-3 px-4 rounded-2xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono"
                  />
                  <p className="text-[11px] text-slate-400 text-center mt-2">
                    Find the OTP in your WhatsApp message · Expires in 5 minutes
                  </p>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-3.5 px-4 rounded-2xl bg-brand-600 hover:bg-brand-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  {loading ? 'Verifying...' : 'Verify OTP & Continue'}
                </button>
              </form>

              <div className="flex items-center justify-between mt-4 text-xs">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change number</span>
                </button>

                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendCooldown > 0 || loading}
                  className="font-bold text-brand-600 hover:text-brand-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1 transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyOtpPage;
