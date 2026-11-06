import React, { useState } from 'react';
import {
  User,
  Mail,
  GraduationCap,
  Users,
  ShieldCheck,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  KeyRound
} from 'lucide-react';
import { useStudentAuth } from '../../context/StudentAuthContext';
import { studentPortalService } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';

export const StudentProfilePage = () => {
  const { studentProfile } = useStudentAuth();
  const { showToast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Password rules validation
  const rules = [
    { label: 'At least 8 characters long', valid: newPassword.length >= 8 },
    { label: 'Contains uppercase letter (A-Z)', valid: /[A-Z]/.test(newPassword) },
    { label: 'Contains lowercase letter (a-z)', valid: /[a-z]/.test(newPassword) },
    { label: 'Contains digit (0-9)', valid: /[0-9]/.test(newPassword) },
    { label: 'Contains special character (!@#$%^&*)', valid: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(newPassword) },
  ];
  const allRulesPassed = rules.every((r) => r.valid);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    if (!currentPassword) {
      setFormError('Please enter your current password.');
      return;
    }

    if (!allRulesPassed) {
      setFormError('Your new password does not meet all password strength requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError('New password and confirmation password do not match.');
      return;
    }

    setIsLoading(true);
    try {
      await studentPortalService.changePassword(currentPassword, newPassword, confirmPassword);
      setFormSuccess('Password changed successfully!');
      showToast('Password changed successfully!', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to change password.';
      setFormError(msg);
      showToast(msg, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Page Title */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Student Profile & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">
          View your academic enrollment record and manage portal access security.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Read-Only Academic Record (2 spans) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-800">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <User className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  {studentProfile?.fullName || 'Student Name'}
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  {studentProfile?.studentId || 'ID'}
                </p>
              </div>
            </div>

            {/* Profile Field Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Official Student ID
                </span>
                <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                  {studentProfile?.studentId || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Enrolled Status
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-md mt-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  {studentProfile?.enrollmentStatus || 'ACTIVE'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Registered University Email
                </span>
                <span className="text-sm font-medium text-slate-200 mt-0.5 block flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  {studentProfile?.email || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 sm:col-span-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Degree Programme
                </span>
                <span className="text-sm font-medium text-slate-200 mt-0.5 block flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-emerald-400 shrink-0" />
                  {studentProfile?.degreeProgramme || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Academic Batch Cohort
                </span>
                <span className="text-sm font-bold text-white mt-0.5 block">
                  {studentProfile?.batch || 'N/A'}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                  Assigned Lab Group
                </span>
                <span className="text-sm font-bold text-emerald-400 mt-0.5 block flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {studentProfile?.labGroup || 'Whole Batch'}
                </span>
              </div>
            </div>

            {/* Administrator Correction Advisory */}
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-400 flex items-start gap-3">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-semibold text-slate-300">Need to update your details? </span>
                To maintain regulatory and academic audit integrity, student personal and cohort
                assignments cannot be edited online. Please contact the Academic Department
                Administrator if your details need revision.
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Change Password Form */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-5">
            <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
              <KeyRound className="w-5 h-5 text-emerald-400" />
              <h2 className="text-base font-bold text-white">Change Password</h2>
            </div>

            {formSuccess && (
              <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{formSuccess}</span>
              </div>
            )}

            {formError && (
              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  >
                    {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Password Rules Checklist */}
              <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                {rules.map((rule, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 text-[11px]">
                    <span className={rule.valid ? 'text-emerald-400 font-bold' : 'text-slate-600'}>
                      {rule.valid ? '✓' : '•'}
                    </span>
                    <span className={rule.valid ? 'text-emerald-300' : 'text-slate-500'}>
                      {rule.label}
                    </span>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Confirm New Password
                </label>
                <input
                  type={showNew ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="block w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || !allRulesPassed}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-all shadow-md shadow-emerald-950/30"
              >
                {isLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
