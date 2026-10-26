import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { QrCode, CalendarClock, BarChart3, ShieldCheck, ArrowRight, Award } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function LecturerDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs text-teal-400 font-medium mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Phase 2 Authenticated Session: LECTURER</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.fullName || 'Lecturer'}
            </h1>
            <div className="mt-1 flex items-center gap-3 text-xs text-slate-400">
              {user?.staffId && <span>Staff ID: <code className="text-teal-300">{user.staffId}</code></span>}
              {user?.department && <span>Department: <span className="text-slate-300">{user.department}</span></span>}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">My Lab Sessions</span>
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <CalendarClock className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">View scheduled lab sessions, active attendance windows, and rosters.</p>
          <Link to="/lecturer/sessions" className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1">
            <span>Manage Sessions</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Live QR Scanner</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">Launch webcam / camera scanner via html5-qrcode for badge check-in.</p>
          <Link to="/lecturer/scanner" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1">
            <span>Launch Scanner</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reports & Analytics</span>
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <BarChart3 className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">Session attendance breakdowns, late check-in analytics, and final logs.</p>
          <Link to="/lecturer/reports" className="text-xs text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1">
            <span>View Reports</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
