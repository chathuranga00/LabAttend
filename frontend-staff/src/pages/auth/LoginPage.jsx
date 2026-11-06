import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Mail, Lock, Eye, EyeOff, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import ThemeToggle from '../../components/common/ThemeToggle';
import InstallPromptCard from '../../components/pwa/InstallPromptCard';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, role, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // If already authenticated, redirect to appropriate role dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && role) {
      const destination = role === 'ADMIN' ? '/admin/dashboard' : '/lecturer/dashboard';
      navigate(destination, { replace: true });
    }
  }, [authLoading, isAuthenticated, role, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    // Client-side validations
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your university email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Please enter your account password.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await login(trimmedEmail, password);
      // Navigate strictly based on backend-verified role
      if (result.role === 'ADMIN') {
        navigate('/admin/dashboard', { replace: true });
      } else if (result.role === 'LECTURER') {
        navigate('/lecturer/dashboard', { replace: true });
      } else {
        navigate('/health', { replace: true });
      }
    } catch (err) {
      // Generic invalid login message as per specification
      const msg = err.message || 'Email or password is incorrect.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8 relative selection:bg-emerald-500 selection:text-white overflow-x-hidden pt-safe pb-safe">
      {/* Top right Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20">
        <ThemeToggle />
      </div>

      {/* Background ambient lighting */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl"></div>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* University / App Brand */}
        <div className="flex flex-col items-center text-center">
          <div className="h-20 w-52 sm:h-28 sm:w-64 rounded-2xl bg-white p-2 sm:p-3 flex items-center justify-center shadow-xl shadow-emerald-500/15 mb-4 sm:mb-5 ring-1 ring-emerald-500/20">
            <img src="/logo.png" alt="NSBM Green University Town" className="h-full w-full object-contain" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            LabAttend
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Laboratory & Lecture Attendance Management System
          </p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] sm:text-xs text-slate-400">
            <span>NSBM Green University</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-medium">ADMIN & LECTURER</span>
          </div>
        </div>

        {/* PWA Install Prompt Card (dismissible, shown when installable or iOS Safari) */}
        <div className="mt-4 sm:mt-6">
          <InstallPromptCard />
        </div>

        {/* Login Card */}
        <div className="mt-4 sm:mt-6 glass-panel rounded-2xl shadow-2xl p-5 sm:p-8 relative">
          <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3.5 sm:p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-3 animate-fade-in">
                <AlertCircle className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
                <span className="leading-relaxed font-medium">{errorMessage}</span>
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                University Email Address
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@labattend.local or lecturer@nsbm.lk"
                  disabled={isSubmitting}
                  className="block w-full pl-10 pr-3.5 py-2.5 min-h-[44px] bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 sm:mb-2">
                Account Password
              </label>
              <div className="relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your secure password"
                  disabled={isSubmitting}
                  className="block w-full pl-10 pr-12 py-2.5 min-h-[44px] bg-slate-900/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full min-h-[44px] flex justify-center items-center gap-2 py-2.5 px-4 rounded-xl text-sm font-bold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 active:from-emerald-500 active:to-teal-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to LabAttend</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Quick Info Box */}
          <div className="mt-5 pt-4 border-t border-slate-800/60 text-xs text-slate-400 space-y-1.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-400 gap-1">
              <span>Default Initial Admin:</span>
              <code className="text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded text-[11px] font-mono">admin@labattend.local</code>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Students do not possess login accounts. Only assigned lecturers and administrators have access.
            </p>
          </div>
        </div>

        {/* Footer Link to System Health Probe */}
        <div className="mt-5 text-center">
          <a
            href="/health"
            className="text-xs text-slate-400 hover:text-emerald-400 transition-colors inline-flex items-center gap-1 min-h-[44px] py-2"
          >
            <span>View System Diagnostics & Connectivity Probe</span>
          </a>
        </div>
      </div>
    </div>
  );
}
