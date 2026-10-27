import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  CalendarClock, 
  QrCode, 
  BookOpen, 
  Users, 
  CheckCircle2, 
  Plus, 
  ArrowRight, 
  Clock, 
  Building, 
  Play, 
  AlertCircle,
  TrendingUp,
  ShieldCheck
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';

export default function LecturerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sessionService.getDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load dashboard data', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleStartSession = async (sessionId) => {
    try {
      const res = await sessionService.startSession(sessionId);
      showToast(res.message || 'Session started successfully! Attendance scanning is active.', 'success');
      navigate(`/lecturer/sessions/${sessionId}`);
    } catch (err) {
      showToast(err.message || 'Failed to start session', 'error');
    }
  };

  const {
    todaySessions = [],
    upcomingSessions = [],
    totalAssignedModules = 0,
    totalAssignedBatches = 0,
    totalCompletedSessions = 0,
    averageAttendancePercentage = null,
  } = dashboardData || {};

  return (
    <div className="p-8 space-y-6">
      {/* Welcome Banner */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs text-teal-400 font-semibold mb-2">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Instructor Faculty Desk</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Welcome, {user?.fullName || 'Lecturer'}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
              {user?.staffId && (
                <span>
                  Staff ID: <code className="text-teal-300 font-mono font-bold">{user.staffId}</code>
                </span>
              )}
              {user?.department && (
                <span>
                  Department: <span className="text-slate-300">{user.department}</span>
                </span>
              )}
              <span className="text-slate-500">Time Zone: Asia/Colombo</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/lecturer/sessions/new"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition"
            >
              <Plus className="h-4 w-4 stroke-[2.5]" />
              <span>Schedule Lab Session</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Today's Sessions</span>
            <CalendarClock className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{todaySessions.length}</div>
          <span className="text-xs text-slate-500 mt-1 block">Scheduled for today</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Assigned Courses</span>
            <BookOpen className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-cyan-400 tracking-tight">{totalAssignedModules}</div>
          <span className="text-xs text-slate-500 mt-1 block">
            Across {totalAssignedBatches} cohort batches
          </span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Completed Labs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">{totalCompletedSessions}</div>
          <span className="text-xs text-slate-500 mt-1 block">Finalized attendance rosters</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Attendance</span>
            <TrendingUp className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {averageAttendancePercentage !== null ? (
              <span className={averageAttendancePercentage >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                {averageAttendancePercentage}%
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-2xl">N/A</span>
            )}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Across completed lab sessions</span>
        </div>
      </div>

      {/* Today's Lab Sessions */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Today's Laboratory Schedule</h2>
            <p className="text-xs text-slate-400 mt-0.5">Sessions scheduled for today in Asia/Colombo</p>
          </div>
          <Link
            to="/lecturer/sessions"
            className="text-xs text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1"
          >
            <span>View All Sessions</span>
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>

        {todaySessions.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm">
            No lab sessions scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {todaySessions.map((session) => {
              const isDraft = session.status === 'DRAFT' || session.status === 'SCHEDULED';
              const isActive = session.status === 'ACTIVE';

              return (
                <div
                  key={session.id}
                  className={`p-5 rounded-2xl border transition ${
                    isActive
                      ? 'bg-emerald-950/20 border-emerald-800/60 shadow-lg shadow-emerald-950/30'
                      : 'bg-slate-850/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="font-mono text-xs font-bold text-teal-400 bg-teal-950/50 border border-teal-800/40 px-2 py-0.5 rounded">
                        {session.sessionCode}
                      </span>
                      <h3 className="font-bold text-white text-base mt-2">
                        {session.moduleCode} — {session.moduleName}
                      </h3>
                      <span className="text-xs text-slate-400 block mt-0.5">
                        Batch: <span className="text-slate-200 font-semibold">{session.batchCode}</span>
                      </span>
                    </div>

                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        isActive
                          ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-700 animate-pulse'
                          : isDraft
                          ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {session.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 py-3 border-y border-slate-800/80 my-3">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-cyan-400" />
                      {session.startTime} - {session.endTime}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Building className="h-3.5 w-3.5 text-teal-400" />
                      {session.hallCode} ({session.hallName})
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5 text-amber-400" />
                      Expected: {session.expectedStudentCount} students
                    </span>
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                      Attended: {session.attendedCount} marked
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    {isDraft && (
                      <button
                        onClick={() => handleStartSession(session.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs transition"
                      >
                        <Play className="h-3.5 w-3.5 fill-current" />
                        <span>Start Session</span>
                      </button>
                    )}

                    {isActive && (
                      <Link
                        to={`/lecturer/scanner?sessionId=${session.id}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs transition"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Open QR Scanner</span>
                      </Link>
                    )}

                    <Link
                      to={`/lecturer/sessions/${session.id}`}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition"
                    >
                      Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upcoming Sessions */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Upcoming Lab Sessions</h2>
          <p className="text-xs text-slate-400 mt-0.5">Future laboratory sessions in chronological order</p>
        </div>

        {upcomingSessions.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm">
            No upcoming sessions scheduled yet. Click "Schedule Lab Session" to plan one.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Time</th>
                  <th className="px-4 py-3 font-semibold">Session Code</th>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Batch</th>
                  <th className="px-4 py-3 font-semibold">Hall</th>
                  <th className="px-4 py-3 font-semibold">Expected</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200 text-xs">
                {upcomingSessions.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-850/40 transition">
                    <td className="px-4 py-3 font-semibold text-slate-100">{s.sessionDate}</td>
                    <td className="px-4 py-3 font-mono text-slate-400">
                      {s.startTime} - {s.endTime}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-teal-400">{s.sessionCode}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-white block">{s.moduleCode}</span>
                      <span className="text-[11px] text-slate-400">{s.moduleName}</span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-300">{s.batchCode}</td>
                    <td className="px-4 py-3 text-slate-300">{s.hallCode}</td>
                    <td className="px-4 py-3 font-semibold text-amber-400">{s.expectedStudentCount}</td>
                    <td className="px-4 py-3">
                      <Link
                        to={`/lecturer/sessions/${s.id}`}
                        className="text-teal-400 hover:text-teal-300 font-semibold inline-flex items-center gap-1"
                      >
                        <span>View</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
