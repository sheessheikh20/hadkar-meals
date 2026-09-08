import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { auth, googleProvider, signInWithPopup, createUserWithEmailAndPassword } from '../utils/firebase';
import { Mail, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type AuthMethod = 'google' | 'email';

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();

  const navigate = useNavigate();
  const { login } = useAuth();

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFirebaseToken = async (user: any) => {
    const idToken = await user.getIdToken();
    const authRes = await api.firebaseLogin(idToken);
    login(authRes);
    if (!authRes.profileComplete) navigate('/complete-profile');
    else navigate('/student/dashboard');
  };

  const handleGoogle = async () => {
    setLoading(true); setError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      await handleFirebaseToken(result.user);
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') setError(err.message || 'Google sign-up failed.');
    } finally { setLoading(false); }
  };

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

  return (
    <div className="min-h-screen relative overflow-hidden bg-slate-50 flex items-center justify-center px-4 py-10">
      {/* Abstract Background Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-brand-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute top-[30%] left-[-10%] w-96 h-96 bg-amber-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
      <div className="absolute bottom-[-10%] right-[20%] w-96 h-96 bg-emerald-300/40 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Brand */}
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-brand-600 to-amber-500 text-white shadow-2xl shadow-brand-600/40 mb-4 text-3xl"
          >
            🍱
          </motion.div>
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl font-black text-slate-900 tracking-tight"
          >
            Create Account
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-sm text-slate-500 mt-2 font-medium"
          >
            Join Hadkar Meals for fresh, daily dinners.
          </motion.p>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5, ease: "easeOut" }}
          className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl shadow-slate-200/50 border border-white/50"
        >
          {/* ── GOOGLE ── */}
          <div className="space-y-5">
            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="group relative w-full flex items-center justify-center gap-3 py-4 px-4 rounded-2xl border-2 border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 hover:shadow-lg text-slate-800 font-bold text-base transition-all disabled:opacity-50 overflow-hidden"
            >
              {loading ? 'Connecting...' : (
                <>
                  <svg className="w-6 h-6 shrink-0 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
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

          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-slate-200"></div>
            <span className="px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">or sign up with email</span>
            <div className="flex-1 border-t border-slate-200"></div>
          </div>

          {/* ── EMAIL ── */}
          <form
            onSubmit={handleEmailRegister} 
            className="space-y-4"
          >
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Email Address</label>
                  <div className="relative group">
                    <Mail className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 transition-colors group-focus-within:text-brand-500" />
                    <input
                      type="email" required autoFocus
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setError(null); }}
                      placeholder="you@example.com"
                      className="w-full pl-12 pr-4 py-3.5 text-base font-semibold text-slate-900 bg-slate-50/50 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 transition-colors group-focus-within:text-brand-500" />
                    <input
                      type={showPassword ? 'text' : 'password'} required minLength={6}
                      value={password}
                      onChange={(e) => { setPassword(e.target.value); setError(null); }}
                      placeholder="Min 6 characters"
                      className="w-full pl-12 pr-12 py-3.5 text-base font-semibold text-slate-900 bg-slate-50/50 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 transition-colors">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="w-5 h-5 text-slate-400 absolute left-4 top-3.5 transition-colors group-focus-within:text-brand-500" />
                    <input
                      type={showPassword ? 'text' : 'password'} required
                      value={confirmPassword}
                      onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                      placeholder="Re-enter password"
                      className="w-full pl-12 pr-4 py-3.5 text-base font-semibold text-slate-900 bg-slate-50/50 rounded-2xl border border-slate-200 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all shadow-sm"
                    />
                  </div>
                </div>
                {error && <motion.div initial={{ opacity:0, y:-10 }} animate={{opacity:1,y:0}} className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-semibold">{error}</motion.div>}
                <button type="submit" disabled={loading} className="w-full py-4 mt-2 rounded-2xl bg-gradient-to-r from-brand-600 to-amber-500 hover:from-brand-700 hover:to-amber-600 text-white font-bold text-base shadow-xl shadow-brand-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0">
                  {loading ? 'Creating...' : 'Create Account'}
                </button>
          </form>

          <div className="pt-6 mt-6 border-t border-slate-100 text-center">
            <p className="text-sm text-slate-500 font-medium">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-brand-600 hover:text-brand-700 hover:underline transition-colors">Sign In</Link>
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex items-center justify-center gap-2 text-sm text-slate-500 mt-6 font-medium"
        >
          <ShieldCheck className="w-5 h-5 text-emerald-500" />
          <span>Secured by Firebase Authentication</span>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
