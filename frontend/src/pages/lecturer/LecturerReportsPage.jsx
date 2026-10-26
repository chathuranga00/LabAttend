import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  RotateCcw, 
  Search, 
  ExternalLink,
  BookOpen,
  Building2,
  Calendar
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  AreaChart,
  Area 
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';

export default function LecturerReportsPage() {
  const { showToast } = useToast();

  // Filter States
  const [moduleId, setModuleId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [semester, setSemester] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [threshold, setThreshold] = useState(75);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Dropdown Options
  const [moduleOptions, setModuleOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);

  // Data States
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [modules, setModules] = useState([]);
  const [batches, setBatches] = useState([]);
  const [students, setStudents] = useState([]);

  // Load Lecturer form options (assigned modules & batches)
  useEffect(() => {
    async function loadFormOptions() {
      try {
        const res = await sessionService.getFormOptions();
        if (res.success && res.data) {
          setModuleOptions(res.data.modules || []);
          setBatchOptions(res.data.batches || []);
        }
      } catch (err) {
        console.error('Failed to load lecturer options', err);
      }
    }
    loadFormOptions();
  }, []);

  // Fetch Analytics Data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (moduleId) params.moduleId = moduleId;
      if (batchId) params.batchId = batchId;
      if (semester) params.semester = semester;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const studentParams = {
        ...params,
        threshold: threshold,
        search: studentSearch,
      };

      const [overviewRes, trendsRes, sessionsRes, modRes, batchRes, studentsRes] = await Promise.all([
        analyticsService.getLecturerOverview(params),
        analyticsService.getLecturerAttendanceTrends(params),
        analyticsService.getLecturerSessions(params),
        analyticsService.getLecturerModules(params),
        analyticsService.getLecturerBatches(params),
        analyticsService.getLecturerStudents(studentParams),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (trendsRes.success) setTrends(trendsRes.data || []);
      if (sessionsRes.success) setSessions(sessionsRes.data || []);
      if (modRes.success) setModules(modRes.data || []);
      if (batchRes.success) setBatches(batchRes.data || []);
      if (studentsRes.success) setStudents(studentsRes.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch analytics', 'error');
    } finally {
      setLoading(false);
    }
  }, [moduleId, batchId, semester, startDate, endDate, threshold, studentSearch, showToast]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const handleResetFilters = () => {
    setModuleId('');
    setBatchId('');
    setSemester('');
    setStartDate('');
    setEndDate('');
    setThreshold(75);
    setShowLowOnly(false);
    setStudentSearch('');
  };

  // Filter students based on toggle
  const displayedStudents = showLowOnly
    ? students.filter((s) => s.isLowAttendance)
    : students;

  const lowAttendanceCount = students.filter((s) => s.isLowAttendance).length;

  // Chart data for Present vs Absent
  const slotData = overview ? [
    {
      name: 'Authorized Slots',
      Present: overview.totalPresentSlots || 0,
      Absent: overview.totalAbsentSlots || 0,
    }
  ] : [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs text-teal-400 font-semibold mb-3">
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Instructor Analytics & Official Reports</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Classroom Attendance Analytics
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Only finalized sessions reflect official attendance stats. Active sessions are marked provisional.
            </p>
          </div>
          <Link
            to="/lecturer/students"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-400 text-xs font-semibold border border-slate-700 transition"
          >
            <Users className="h-4 w-4" />
            <span>Search Student History</span>
          </Link>
        </div>
      </div>

      {/* Filter Bar with Low Attendance Threshold */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Filter className="h-3.5 w-3.5 text-teal-400" />
            <span>Authorized Scope Filters</span>
          </div>
          <button
            onClick={handleResetFilters}
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Reset All</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Module */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Module</label>
            <select
              value={moduleId}
              onChange={(e) => setModuleId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Assigned Modules</option>
              {moduleOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.moduleCode} - {m.name}
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
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            >
              <option value="">All Assigned Batches</option>
              {batchOptions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchCode}
                </option>
              ))}
            </select>
          </div>

          {/* From Date */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* To Date */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Threshold Input */}
          <div>
            <label className="block text-[11px] text-slate-400 mb-1">
              Low Attendance Threshold (%)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="0"
                max="100"
                step="5"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
              />
              <span className="text-xs text-slate-400 font-bold">%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {loading && !overview ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-900/60 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Official Percentage */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Official Attendance
              </span>
              <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight">
              {overview?.overallAttendancePercentage || 'N/A'}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Across <span className="text-teal-400 font-semibold">{overview?.finalizedSessions || 0}</span> finalized sessions
            </div>
          </div>

          {/* Card 2: Finalized Sessions */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Finalized Sessions
              </span>
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {overview?.finalizedSessions || 0}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold">
                Provisional Active: {overview?.activeSessions || 0}
              </span>
            </div>
          </div>

          {/* Card 3: Total Slots */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Attended / Expected
              </span>
              <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-white">
              {overview?.totalPresentSlots || 0}
              <span className="text-sm font-normal text-slate-500 ml-1">
                / {overview?.totalExpectedSlots || 0}
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Absent Slots: <span className="text-rose-400 font-semibold">{overview?.totalAbsentSlots || 0}</span>
            </div>
          </div>

          {/* Card 4: Flagged Students */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Low Attendance Alert
              </span>
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4" />
              </div>
            </div>
            <div className="text-3xl font-extrabold text-amber-400">
              {lowAttendanceCount}
            </div>
            <div className="mt-2 text-xs text-slate-400">
              Students under <span className="text-amber-400 font-semibold">{threshold}%</span> threshold
            </div>
          </div>
        </div>
      )}

      {/* Visual Charts: Trend Line & Present vs Absent Bars */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Line (Span 2) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Attendance Progression Trend
              </h2>
              <p className="text-xs text-slate-400">
                Official attendance percentages recorded for your conducted sessions
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
              Finalized Timeline
            </span>
          </div>

          {trends.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
              <Calendar className="h-8 w-8 mb-2 opacity-50" />
              <span>No finalized sessions recorded in this scope yet</span>
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="lecturerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#14b8a6" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                  <XAxis dataKey="sessionDate" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                    formatter={(val) => [`${val}%`, 'Attendance Rate']}
                    labelFormatter={(label, payload) => {
                      if (payload && payload[0]?.payload) {
                        const item = payload[0].payload;
                        return `${item.sessionCode} (${item.moduleCode}) — ${item.sessionDate}`;
                      }
                      return label;
                    }}
                  />
                  <Area type="monotone" dataKey="percentageNumeric" stroke="#14b8a6" strokeWidth={2.5} fillOpacity={1} fill="url(#lecturerGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Present vs Absent Ratio (Span 1) */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Present vs Absent Slots
                </h2>
                <p className="text-xs text-slate-400">
                  Aggregate student attendance counts
                </p>
              </div>
            </div>

            {overview?.totalExpectedSlots === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center text-slate-500 text-xs">
                <Users className="h-8 w-8 mb-2 opacity-50" />
                <span>No attendance slots recorded</span>
              </div>
            ) : (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={slotData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                    <Bar dataKey="Present" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Absent" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-400">
            <span>Only finalized sessions commit official absentee records</span>
          </div>
        </div>
      </div>

      {/* Session Comparison Chart */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Session Attendance Comparison
            </h2>
            <p className="text-xs text-slate-400">
              Comparative attendance rate across individual sessions
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs">
            <span>No session records available</span>
          </div>
        ) : (
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessions.filter(s => s.percentageNumeric != null)} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="sessionCode" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#64748b" fontSize={11} tickFormatter={(v) => `${v}%`} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.5rem', fontSize: '12px' }}
                  formatter={(val) => [`${val}%`, 'Attendance Rate']}
                  labelFormatter={(label, payload) => {
                    if (payload && payload[0]?.payload) {
                      const item = payload[0].payload;
                      return `${item.sessionCode} (${item.moduleCode}) — ${item.presentCount}/${item.expectedStudentCount} attended`;
                    }
                    return label;
                  }}
                />
                <Bar dataKey="percentageNumeric" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Module and Batch Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module-wise Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-white tracking-tight mb-3">
            Module Performance Breakdown
          </h2>
          {modules.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No module data found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="pb-2">Module</th>
                    <th className="pb-2 text-center">Sessions</th>
                    <th className="pb-2 text-center">Slots</th>
                    <th className="pb-2 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {modules.map((m) => (
                    <tr key={m.moduleId} className="hover:bg-slate-800/30">
                      <td className="py-2.5">
                        <div className="font-semibold text-white">{m.moduleCode}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-[160px]">{m.moduleName}</div>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="text-emerald-400 font-semibold">{m.finalizedSessions}</span>
                        {m.activeSessions > 0 && (
                          <span className="text-amber-400 text-[10px] ml-1 font-mono">
                            (+{m.activeSessions} act)
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center text-slate-400">
                        {m.totalPresent}/{m.totalExpected}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        <span className={m.percentageNumeric >= 75 ? 'text-teal-400' : 'text-amber-400'}>
                          {m.attendancePercentage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Batch-wise Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
          <h2 className="text-base font-bold text-white tracking-tight mb-3">
            Batch Participation Breakdown
          </h2>
          {batches.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">No batch data found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase">
                    <th className="pb-2">Batch</th>
                    <th className="pb-2 text-center">Finalized</th>
                    <th className="pb-2 text-center">Slots</th>
                    <th className="pb-2 text-right">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-300">
                  {batches.map((b) => (
                    <tr key={b.batchId} className="hover:bg-slate-800/30">
                      <td className="py-2.5">
                        <div className="font-semibold text-white">{b.batchCode}</div>
                        <div className="text-[11px] text-slate-400">{b.programmeCode || 'Cohort'}</div>
                      </td>
                      <td className="py-2.5 text-center text-slate-300">{b.finalizedSessions}</td>
                      <td className="py-2.5 text-center text-slate-400">
                        {b.totalPresent}/{b.totalExpected}
                      </td>
                      <td className="py-2.5 text-right font-bold">
                        <span className={b.percentageNumeric >= 75 ? 'text-teal-400' : 'text-amber-400'}>
                          {b.attendancePercentage}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Student Ranking and Low Attendance Filter Table */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              Student Attendance Ranking & Compliance
            </h2>
            <p className="text-xs text-slate-400">
              Computed strictly from each session&apos;s snapshot expected list
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search student ID or name..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 w-52"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowLowOnly(!showLowOnly)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                showLowOnly
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-sm'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              }`}
            >
              {showLowOnly ? `Showing Low (<${threshold}%)` : 'Filter Low Attendance'}
            </button>
          </div>
        </div>

        {displayedStudents.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            {showLowOnly ? (
              <div className="flex flex-col items-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mb-2" />
                <span>All students meet the {threshold}% attendance threshold in this scope!</span>
              </div>
            ) : (
              <span>No enrolled student records found matching search filters.</span>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  <th className="pb-3 px-3">Student ID</th>
                  <th className="pb-3 px-3">Student Name</th>
                  <th className="pb-3 px-3">Batch</th>
                  <th className="pb-3 px-3 text-center">Eligible Finalized</th>
                  <th className="pb-3 px-3 text-center">Attended</th>
                  <th className="pb-3 px-3 text-center">Missed</th>
                  <th className="pb-3 px-3 text-right">Attendance Rate</th>
                  <th className="pb-3 px-3 text-center">Status</th>
                  <th className="pb-3 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {displayedStudents.map((s) => (
                  <tr key={s.studentId} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3 font-mono font-medium text-teal-400">
                      {s.officialStudentId}
                    </td>
                    <td className="py-3 px-3 font-semibold text-white">{s.fullName}</td>
                    <td className="py-3 px-3 text-slate-400">{s.batchCode}</td>
                    <td className="py-3 px-3 text-center font-mono">{s.eligibleFinalizedSessions}</td>
                    <td className="py-3 px-3 text-center font-mono text-emerald-400">{s.attendedSessions}</td>
                    <td className="py-3 px-3 text-center font-mono text-rose-400">{s.missedSessions}</td>
                    <td className="py-3 px-3 text-right font-bold text-sm">
                      <span className={
                        s.percentageNumeric === null 
                          ? 'text-slate-500' 
                          : s.isLowAttendance 
                          ? 'text-amber-400' 
                          : 'text-teal-400'
                      }>
                        {s.attendancePercentage}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      {s.isLowAttendance ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <AlertTriangle className="h-3 w-3" />
                          <span>LOW ATTENDANCE</span>
                        </span>
                      ) : s.percentageNumeric !== null ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>COMPLIANT</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">NO FINALIZED SESSIONS</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <Link
                        to={`/lecturer/students?id=${s.studentId}`}
                        className="inline-flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 font-semibold transition"
                      >
                        <span>History</span>
                        <ExternalLink className="h-3 w-3" />
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
