import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { 
  ShieldCheck, 
  Users, 
  BookOpen, 
  Building2, 
  UserCheck, 
  TrendingUp, 
  CalendarClock, 
  Activity, 
  Filter, 
  RotateCcw, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  BarChart3,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { attendanceService } from '../../services/attendanceService';
import { degreeProgrammeService, batchService, moduleService, lecturerService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Filters State
  const [programmeId, setProgrammeId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [lecturerId, setLecturerId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown Options
  const [programmes, setProgrammes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [modules, setModules] = useState([]);
  const [lecturers, setLecturers] = useState([]);

  // Data State
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [moduleStats, setModuleStats] = useState([]);
  const [batchStats, setBatchStats] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);

  // Load dropdown filter options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [progRes, batchRes, modRes, lecRes] = await Promise.all([
          degreeProgrammeService.getProgrammes({ size: 100 }),
          batchService.getBatches({ size: 100 }),
          moduleService.getModules({ size: 100 }),
          lecturerService.getLecturers({ size: 100 }),
        ]);
        if (progRes.data?.content) setProgrammes(progRes.data.content);
        if (batchRes.data?.content) setBatches(batchRes.data.content);
        if (modRes.data?.content) setModules(modRes.data.content);
        if (lecRes.data?.content) setLecturers(lecRes.data.content);
      } catch (err) {
        console.error('Failed to load filter options', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch Dashboard Analytics
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (programmeId) params.programmeId = programmeId;
      if (batchId) params.batchId = batchId;
      if (moduleId) params.moduleId = moduleId;
      if (lecturerId) params.lecturerId = lecturerId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const [overviewRes, trendsRes, modRes, batchRes, sessionsRes, auditsRes] = await Promise.all([
        analyticsService.getAdminOverview(params),
        analyticsService.getAdminAttendanceTrends(params),
        analyticsService.getAdminModules(params),
        analyticsService.getAdminBatches(params),
        analyticsService.getAdminSessions({ ...params, size: 6 }),
        attendanceService.getAdminAuditLogs({ page: 0, size: 6 }),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (trendsRes.success) setTrends(trendsRes.data || []);
      if (modRes.success) setModuleStats(modRes.data || []);
      if (batchRes.success) setBatchStats(batchRes.data || []);
      if (sessionsRes.success) setRecentSessions(sessionsRes.data || []);
      if (auditsRes.success && auditsRes.data?.content) {
        setRecentActivities(auditsRes.data.content);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch analytics data', 'error');
    } finally {
      setLoading(false);
    }
  }, [programmeId, batchId, moduleId, lecturerId, startDate, endDate, showToast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleResetFilters = () => {
    setProgrammeId('');
    setBatchId('');
    setModuleId('');
    setLecturerId('');
    setStartDate('');
    setEndDate('');
  };

  // Prepare Present vs Absent slots bar chart data
  const slotData = overview ? [
    {
      name: 'Finalized Slots',
      Present: overview.totalPresentSlots || 0,
      Absent: overview.totalAbsentSlots || 0,
      Expected: overview.totalExpectedSlots || 0,
    }
  ] : [];

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 font-medium mb-3">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Institutional Control Center — Role: ADMIN</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Institutional Attendance Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Department-wide attendance tracking, session finalization audits, and trend analysis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
              Live Database Computed
            </span>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
          <Filter className="h-3.5 w-3.5 text-emerald-400" />
          <span>Analytics Filter Bar</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
          {/* Degree Programme */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Programme</label>
            <select
              value={programmeId}
              onChange={(e) => setProgrammeId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Batch */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Batch</label>
            <select
              value={batchId}
              onChange={(e) => setBatchId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchCode} ({b.academicYear})
                </option>
              ))}
            </select>
          </div>

          {/* Module */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Module</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.moduleCode} - {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Lecturer */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Lecturer</label>
            <select
              value={lecturerId}
              onChange={(e) => setLecturerId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">All Lecturers</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.user?.fullName || l.staffId}
                </option>
              ))}
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* End Date & Reset */}
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="block text-[11px] text-slate-400 mb-1">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <button
              onClick={handleResetFilters}
              title="Reset Filters"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      {loading && !overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Overall Official Attendance */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Overall Attendance
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {overview?.overallAttendancePercentage || 'N/A'}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-1.5">
              <span>Computed over</span>
              <span className="text-emerald-400 font-semibold">{overview?.finalizedSessions || 0}</span>
              <span>finalized sessions</span>
            </div>
          </div>

          {/* Card 2: Finalized vs Provisional Active */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Session Lifecycle
              </span>
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <CalendarClock className="h-4 w-4" />
              </div>
            </div>
            <div className="flex items-baseline gap-3">
              <div className="text-3xl font-extrabold text-white">
                {overview?.finalizedSessions || 0}
              </div>
              <span className="text-xs text-slate-400">Finalized</span>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-semibold">
                Provisional Active: {overview?.activeSessions || 0}
              </span>
              {overview?.cancelledSessions > 0 && (
                <span className="text-[11px] text-slate-500">
                  ({overview.cancelledSessions} cancelled excluded)
                </span>
              )}
            </div>
          </div>

          {/* Card 3: Student Slots Breakdown */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Student Slots
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {overview?.totalPresentSlots || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">
                / {overview?.totalExpectedSlots || 0}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center justify-between">
              <span className="text-emerald-400">Present: {overview?.totalPresentSlots || 0}</span>
              <span className="text-rose-400">Absent: {overview?.totalAbsentSlots || 0}</span>
            </div>
          </div>

          {/* Card 4: System Entity Directory */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Enrolled Cohort
              </span>
              <div className="h-8 w-8 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {overview?.totalStudents || 0}
            </div>
            <div className="mt-2 text-xs text-slate-400 flex items-center gap-3">
              <span>{overview?.totalLecturers || 0} Lecturers</span>
              <span>•</span>
              <span>{overview?.totalModules || 0} Modules</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend Line Chart (Span 2) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Attendance Trends Over Time
              </h2>
              <p className="text-xs text-slate-400">
                Official percentage recorded per finalized session date
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
              Only Finalized
            </span>
          </div>

          {trends.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Calendar className="h-8 w-8 mb-2 opacity-50" />
              <span>No finalized sessions found for the selected filter range</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis 
                    dataKey="sessionDate" 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickLine={false} 
                  />
                  <YAxis 
                    domain={[0, 100]} 
                    stroke="#64748b" 
                    fontSize={11} 
                    tickFormatter={(v) => `${v}%`} 
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                    formatter={(value) => [`${value}%`, 'Attendance Rate']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload) {
                        const item = payload[0].payload;
                        return `${item.sessionCode} (${item.moduleCode}) — ${item.sessionDate}`;
                      }
                      return label;
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="percentageNumeric" 
                    stroke="#10b981" 
                    strokeWidth={2.5} 
                    fillOpacity={1} 
                    fill="url(#attendanceGradient)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Present vs Absent Stacked Bar Chart (Span 1) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Present vs Absent
                </h2>
                <p className="text-xs text-slate-400">
                  Total student attendance ratio
                </p>
              </div>
            </div>

            {overview?.totalExpectedSlots === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                <span>No student slots recorded in finalized sessions</span>
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slotData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Present" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Absentee records generated at closure</span>
            <span className="font-semibold text-slate-300">Phase 6 Ground Truth</span>
          </div>
        </div>
      </div>

      {/* Module and Batch Breakdown Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance by Module */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Attendance by Course Module
              </h2>
              <p className="text-xs text-slate-400">
                Performance across assigned modules
              </p>
            </div>
          </div>

          {moduleStats.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
              <BookOpen className="h-8 w-8 mb-2 opacity-50" />
              <span>No module data available</span>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={moduleStats} layout="vertical" margin={{ top: 5, right: 30, left: 30, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="moduleCode" stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                    formatter={(val) => [`${val}%`, 'Attendance Rate']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload) {
                        return `${payload[0].payload.moduleCode} - ${payload[0].payload.moduleName}`;
                      }
                      return label;
                    }}
                  />
                  <Bar dataKey="percentageNumeric" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Attendance by Batch */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Attendance by Student Batch
              </h2>
              <p className="text-xs text-slate-400">
                Participation by academic cohort
              </p>
            </div>
          </div>

          {batchStats.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Building2 className="h-8 w-8 mb-2 opacity-50" />
              <span>No batch data available</span>
            </div>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={batchStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="batchCode" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                    formatter={(val) => [`${val}%`, 'Attendance Rate']}
                  />
                  <Bar dataKey="percentageNumeric" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row: Recent Sessions and Recent Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Lab Sessions (Span 2) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white tracking-tight">
              Recent Lab Sessions
            </h2>
            <Link
              to="/admin/sessions"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              View All Sessions &rarr;
            </Link>
          </div>

          {recentSessions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No recent sessions found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="pb-3 px-2">Session Code</th>
                    <th className="pb-3 px-2">Module / Batch</th>
                    <th className="pb-3 px-2">Lecturer</th>
                    <th className="pb-3 px-2">Date</th>
                    <th className="pb-3 px-2">Status</th>
                    <th className="pb-3 px-2 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-xs text-slate-300">
                  {recentSessions.map((s) => (
                    <tr key={s.sessionId} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2.5 px-2 font-mono font-medium text-emerald-400">
                        {s.sessionCode}
                      </td>
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-white">{s.moduleCode}</div>
                        <div className="text-[11px] text-slate-400">{s.batchCode || '—'}</div>
                      </td>
                      <td className="py-2.5 px-2 text-slate-300">{s.lecturerName || '—'}</td>
                      <td className="py-2.5 px-2 text-slate-400">{s.sessionDate}</td>
                      <td className="py-2.5 px-2">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === 'FINALIZED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : s.status === 'ACTIVE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : s.status === 'CANCELLED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-slate-700/30 text-slate-400 border border-slate-700/40'
                        }`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-right font-semibold">
                        {s.status === 'FINALIZED' ? (
                          <span className={s.percentageNumeric >= 75 ? 'text-emerald-400' : 'text-amber-400'}>
                            {s.attendancePercentage} ({s.presentCount}/{s.expectedStudentCount})
                          </span>
                        ) : s.status === 'ACTIVE' ? (
                          <span className="text-amber-400 font-normal italic">
                            Provisional ({s.presentCount}/{s.expectedStudentCount})
                          </span>
                        ) : (
                          <span className="text-slate-500">Excluded</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Recent Activity Feed from Audit Logs (Span 1) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white tracking-tight">
              Audit Activity
            </h2>
            <Link
              to="/admin/audits"
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium transition"
            >
              All Logs &rarr;
            </Link>
          </div>

          {recentActivities.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No recent audit records found.
            </div>
          ) : (
            <div className="space-y-3">
              {recentActivities.map((act) => (
                <div key={act.id} className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-emerald-400 font-mono">
                      {act.action}
                    </span>
                    <span className="text-slate-500 text-[10px]">
                      {act.createdAt ? new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 truncate">
                    {act.entityType}: {act.entityId || 'Global Action'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                    Actor: {act.actorEmail || 'System'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
