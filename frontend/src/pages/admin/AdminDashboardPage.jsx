import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, Users, BookOpen, Building2, ShieldCheck, ArrowRight, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      {/* Welcome Card */}
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Phase 2 Authenticated Session: ADMIN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.fullName || 'Administrator'}
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Department & Institutional Administration Control Center
            </p>
          </div>
        </div>
      </div>

      {/* Feature Navigation Cards (Placeholders for upcoming phases) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Degree Programmes</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">Manage academic degrees, faculties, and enrolled batches.</p>
          <Link to="/admin/programmes" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1">
            <span>Manage Programmes</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Lecturers & Modules</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">Assign lecturers to course modules for the current academic semester.</p>
          <Link to="/admin/lecturers" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium inline-flex items-center gap-1">
            <span>Manage Assignments</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Student Rosters</span>
            <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <p className="text-xs text-slate-400 mb-4">Maintain student cohort records and batch enrollments (records only).</p>
          <Link to="/admin/students" className="text-xs text-teal-400 hover:text-teal-300 font-medium inline-flex items-center gap-1">
            <span>View Rosters</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}
