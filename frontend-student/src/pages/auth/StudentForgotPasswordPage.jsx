import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertCircle, KeyRound } from 'lucide-react';
import { studentAuthService } from '../../services/studentService';

export const StudentForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!email.trim()) {
      setErrorMessage('Please enter your university email address.');
      return;
    }

    setIsLoading(true);
    try {
      await studentAuthService.forgotPassword(email.trim());
      setSubmitted(true);
    } catch {
      // Generic defense: always show submitted state even on network error
      setSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex flex-col items-center text-center">
          <div className="h-16 w-44 sm:h-20 sm:w-52 rounded-2xl bg-white p-2 flex items-center justify-center shadow-lg shadow-emerald-500/10 mb-4 ring-1 ring-emerald-500/20">
            <img src="/logo.png" alt="NSBM Green University Town" className="h-full w-full object-contain" />
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight">Reset Password</h2>
          <div className="mt-1.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-400">
            <span>NSBM Green University</span>
            <span className="text-slate-600">•</span>
            <span className="text-emerald-400 font-medium">STUDENT PORTAL</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Enter your registered university email to receive password reset instructions.
          </p>
        </div>

        <div className="mt-8 bg-slate-900/90 backdrop-blur-xl py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-800">
          {submitted ? (
            <div className="text-center space-y-4">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-white">Instructions Sent</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                If an active student account exists for{' '}
                <span className="font-semibold text-emerald-400">{email}</span>, password reset
                instructions with a secure one-time link have been sent.
              </p>
              <div className="pt-4 border-t border-slate-800">
                <Link
                  to="/reset-password"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium block mb-3"
                >
                  Already have a reset token? Enter it here →
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  University Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-500" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@students.nsbm.ac.lk"
                    required
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-lg shadow-emerald-950/30"
              >
                {isLoading ? 'Sending instructions...' : 'Send Reset Instructions'}
              </button>

              <div className="text-center pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Login</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

