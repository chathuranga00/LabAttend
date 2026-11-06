import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Users,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  BookOpen,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell
} from 'recharts';
import { studentPortalService } from '../../services/studentService';
import { useStudentAuth } from '../../context/StudentAuthContext';

export const StudentDashboardPage = () => {
  const { studentProfile } = useStudentAuth();
  const [summary, setSummary] = useState(null);
  const [modules, setModules] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const [sumRes, modRes] = await Promise.all([
          studentPortalService.getAttendanceSummary(),
          studentPortalService.getModuleAttendance(),
        ]);

        if (sumRes.success) {
          setSummary(sumRes.data);
        }
        if (modRes.success) {
          setModules(modRes.data || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Unable to load attendance records. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-28 bg-slate-900/60 rounded-2xl border border-slate-800" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800" />
          <div className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800" />
          <div className="h-44 bg-slate-900/60 rounded-2xl border border-slate-800" />
        </div>
        <div className="h-72 bg-slate-900/60 rounded-2xl border border-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
        <span>{error}</span>
        <button
          onClick={() => window.location.reload()}
          className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-medium text-xs text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  const percentage = summary?.percentageNumeric ?? 0;
  const isBelow = summary?.belowThreshold;
  const threshold = summary?.threshold ?? 80.0;

  // Recharts module data formatting
  const chartData = modules.map((m) => ({
    name: m.moduleCode,
    fullName: m.moduleName,
    rate: m.percentageNumeric ?? 0,
    attended: m.attendedSessions,
    eligible: m.eligibleFinalizedSessions,
    belowThreshold: m.belowThreshold,
  }));

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900/90 to-slate-900/90 border border-emerald-500/20 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Welcome, {studentProfile?.fullName || 'Student'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              {studentProfile?.degreeProgramme || 'Degree Programme'} ·{' '}
              <span className="text-slate-300 font-medium">{studentProfile?.batch || 'Batch'}</span> ·{' '}
              <span className="text-emerald-400 font-medium">{studentProfile?.labGroup || 'Group'}</span>
            </p>
          </div>
          <Link
            to="/attendance"
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 transition-all shrink-0"
          >
            <span>View Full History</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Gentle Below Threshold Alert (Informational only, no penalties) */}
      {isBelow && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs sm:text-sm flex items-start gap-3.5 shadow-lg">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="font-semibold text-amber-300">Attendance Advisory: </span>
            Your overall laboratory turnout ({summary?.attendancePercentage}) is currently below the
            recommended university guideline of {threshold.toFixed(0)}%. Consistent attendance in your
            scheduled upcoming lab sessions will ensure your quota remains in good standing.
          </div>
        </div>
      )}

      {/* Primary Attendance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Overall Percentage Ring */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Overall Turnout</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              {summary?.attendancePercentage || 'N/A'}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">
              Target Quota: ≥ {threshold.toFixed(0)}%
            </p>
          </div>
          {/* SVG Percentage Ring */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-800"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className={isBelow ? 'text-amber-400' : 'text-emerald-500'}
                strokeDasharray={`${Math.min(100, Math.max(0, percentage))}, 100`}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="absolute text-[11px] font-bold text-slate-200">
              {summary?.percentageNumeric !== null ? `${Math.round(percentage)}%` : '—'}
            </span>
          </div>
        </div>

        {/* Metric 2: Attended Sessions */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Attended</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {summary?.attendedSessions ?? 0}
            </h3>
            <p className="text-[11px] text-slate-500">
              Out of {summary?.eligibleFinalizedSessions ?? 0} eligible sessions
            </p>
          </div>
        </div>

        {/* Metric 3: Missed Sessions */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shrink-0">
            <XCircle className="w-6 h-6 text-rose-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Missed</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {summary?.missedSessions ?? 0}
            </h3>
            <p className="text-[11px] text-slate-500">
              Recorded session absences
            </p>
          </div>
        </div>

        {/* Metric 4: Cross-Group Visits */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-sky-400" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cross-Group</p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white mt-0.5">
              {summary?.crossGroupVisitsCount ?? 0}
            </h3>
            <p className="text-[11px] text-slate-500">
              Attended as group visitor
            </p>
          </div>
        </div>
      </div>

      {/* Module-by-Module Participation Breakdown */}
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base sm:text-lg font-bold text-white">
              Module Attendance Breakdown
            </h2>
          </div>
          <span className="text-xs text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-500" />
            Only finalized sessions are reflected in statistics
          </span>
        </div>

        {modules.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">
            No finalized laboratory modules found for your cohort yet.
          </div>
        ) : (
          <>
            {/* Recharts Responsive Bar Chart */}
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis
                    dataKey="name"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    domain={[0, 100]}
                    stroke="#64748b"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                    tickFormatter={(val) => `${val}%`}
                  />
                  <Tooltip
                    cursor={{ fill: 'rgba(255, 255, 255, 0.04)' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-slate-950 border border-slate-800 p-3 rounded-xl shadow-xl text-xs space-y-1">
                            <p className="font-semibold text-white">{data.name} — {data.fullName}</p>
                            <p className="text-slate-300">
                              Turnout: <span className="font-bold text-emerald-400">{data.rate}%</span>
                            </p>
                            <p className="text-slate-400">
                              Sessions: {data.attended} / {data.eligible} attended
                            </p>
                            {data.belowThreshold && (
                              <p className="text-amber-400 font-medium">Below {threshold}% threshold</p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.belowThreshold ? '#f59e0b' : '#10b981'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* List View for Mobile & Detailed Inspection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {modules.map((m) => (
                <div
                  key={m.moduleId}
                  className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between"
                >
                  <div className="min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-white">{m.moduleCode}</span>
                      {m.belowThreshold && (
                        <span className="px-2 py-0.5 text-[10px] font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-md">
                          Advisory
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate mt-0.5">{m.moduleName}</p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {m.attendedSessions} of {m.eligibleFinalizedSessions} sessions attended
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span
                      className={`text-lg font-extrabold ${
                        m.belowThreshold ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {m.attendancePercentage}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
