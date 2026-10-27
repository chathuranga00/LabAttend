import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { 
  UserCheck, 
  Search, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Filter, 
  RotateCcw,
  BookOpen,
  Building2,
  Mail,
  ShieldCheck,
  Award
} from 'lucide-react';
import { analyticsService } from '../../services/analyticsService';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';

export default function LecturerStudentAttendancePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { showToast } = useToast();

  const urlStudentId = searchParams.get('id');

  // Search & Filter State
  const [selectedStudentId, setSelectedStudentId] = useState(urlStudentId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown lists
  const [studentsList, setStudentsList] = useState([]);
  const [moduleOptions, setModuleOptions] = useState([]);

  // Data State
  const [loadingList, setLoadingList] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [studentDetails, setStudentDetails] = useState(null);

  // Load modules options
  useEffect(() => {
    async function loadOptions() {
      try {
        const res = await sessionService.getFormOptions();
        if (res.success && res.data) {
          setModuleOptions(res.data.modules || []);
        }
      } catch (err) {
        console.error('Failed to load module options', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch student suggestions within authorized modules
  const searchStudents = useCallback(async (query) => {
    try {
      setLoadingList(true);
      const res = await analyticsService.getLecturerStudents({ search: query, size: 50 });
      if (res.success && res.data) {
        setStudentsList(res.data);
      }
    } catch (err) {
      console.error('Failed to search students', err);
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    searchStudents(searchTerm);
  }, [searchTerm, searchStudents]);

  // Fetch detailed attendance history for selected student
  const fetchStudentHistory = useCallback(async (studentId) => {
    if (!studentId) {
      setStudentDetails(null);
      return;
    }
    try {
      setLoadingHistory(true);
      const params = {};
      if (moduleId) params.moduleId = moduleId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await analyticsService.getLecturerStudentDetails(studentId, params);
      if (res.success && res.data) {
        setStudentDetails(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch student attendance history', 'error');
      setStudentDetails(null);
    } finally {
      setLoadingHistory(false);
    }
  }, [moduleId, startDate, endDate, showToast]);

  useEffect(() => {
    if (selectedStudentId) {
      fetchStudentHistory(selectedStudentId);
    }
  }, [selectedStudentId, fetchStudentHistory]);

  const handleSelectStudent = (s) => {
    setSelectedStudentId(s.studentId);
    setSearchParams({ id: s.studentId });
  };

  const handleResetFilters = () => {
    setModuleId('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-xs text-teal-400 font-semibold mb-3">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Authorized Student Roster Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Student Attendance Record & History
            </h1>
            <p className="mt-1 text-sm text-slate-400">
              Inspect session-by-session attendance history and official participation rates.
            </p>
          </div>
        </div>
      </div>

      {/* Student Search & Scope Selector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Student Search Bar & List */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Search Authorized Students
            </span>
            <span className="text-[11px] text-teal-400 font-mono">
              {studentsList.length} Found
            </span>
          </div>

          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by ID or name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Student Selection List */}
          <div className="max-h-80 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-800/40">
            {loadingList ? (
              <div className="py-8 text-center text-slate-500 text-xs">Loading students...</div>
            ) : studentsList.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                No students found in your assigned sessions.
              </div>
            ) : (
              studentsList.map((s) => (
                <button
                  key={s.studentId}
                  onClick={() => handleSelectStudent(s)}
                  className={`w-full text-left p-2.5 rounded-lg transition text-xs flex items-center justify-between ${
                    selectedStudentId === s.studentId
                      ? 'bg-teal-500/15 border border-teal-500/30 text-teal-300'
                      : 'hover:bg-slate-800/60 text-slate-300'
                  }`}
                >
                  <div>
                    <div className="font-mono font-bold text-white">{s.officialStudentId}</div>
                    <div className="text-[11px] text-slate-400 truncate">{s.fullName}</div>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-teal-400">{s.attendancePercentage}</span>
                    <div className="text-[10px] text-slate-500 font-mono">
                      {s.attendedSessions}/{s.eligibleFinalizedSessions}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Selected Student Profile & Attendance Card */}
        <div className="lg:col-span-2 space-y-6">
          {!selectedStudentId ? (
            <div className="h-full bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-12 flex flex-col items-center justify-center text-slate-500 text-center">
              <UserCheck className="h-12 w-12 mb-3 opacity-40 text-teal-400" />
              <h3 className="text-base font-semibold text-slate-300 mb-1">No Student Selected</h3>
              <p className="text-xs text-slate-500 max-w-sm">
                Select a student from the left panel or search by registration index to view their immutable session attendance logs.
              </p>
            </div>
          ) : loadingHistory && !studentDetails ? (
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-8 animate-pulse space-y-4">
              <div className="h-6 w-48 bg-slate-800 rounded" />
              <div className="h-4 w-72 bg-slate-800 rounded" />
              <div className="grid grid-cols-4 gap-4 pt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-20 bg-slate-800 rounded" />
                ))}
              </div>
            </div>
          ) : studentDetails ? (
            <>
              {/* Profile Card & Key Metrics */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-[11px] text-teal-400 font-mono font-semibold mb-2">
                      <Award className="h-3 w-3" />
                      <span>{studentDetails.officialStudentId}</span>
                    </div>
                    <h2 className="text-xl font-extrabold text-white">
                      {studentDetails.fullName}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-4 text-xs text-slate-400">
                      {studentDetails.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" />
                          <span>{studentDetails.email}</span>
                        </span>
                      )}
                      {studentDetails.batchCode && (
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          <span>Batch: {studentDetails.batchCode}</span>
                        </span>
                      )}
                      {studentDetails.programmeName && (
                        <span>• {studentDetails.programmeName}</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-right">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold block">
                      Official Rate
                    </span>
                    <span className="text-2xl font-extrabold text-teal-400">
                      {studentDetails.attendancePercentage}
                    </span>
                  </div>
                </div>

                {/* Metric Counter Badges */}
                <div className="grid grid-cols-3 gap-4 pt-5">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                    <span className="text-[11px] text-slate-400 block mb-0.5 font-medium">Eligible Finalized</span>
                    <span className="text-xl font-extrabold text-white font-mono">
                      {studentDetails.eligibleFinalizedSessions}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                    <span className="text-[11px] text-emerald-400 block mb-0.5 font-medium">Attended</span>
                    <span className="text-xl font-extrabold text-emerald-400 font-mono">
                      {studentDetails.attendedSessions}
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800/80 text-center">
                    <span className="text-[11px] text-rose-400 block mb-0.5 font-medium">Missed (Absent)</span>
                    <span className="text-xl font-extrabold text-rose-400 font-mono">
                      {studentDetails.missedSessions}
                    </span>
                  </div>
                </div>
              </div>

              {/* Module & Date Filters for Session History */}
              <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase text-slate-400">
                    <Filter className="h-3.5 w-3.5 text-teal-400" />
                    <span>Filter Session History</span>
                  </div>
                  <button
                    onClick={handleResetFilters}
                    className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span>Reset</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Module</label>
                    <select
                      value={moduleId}
                      onChange={(e) => setModuleId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    >
                      <option value="">All Modules</option>
                      {moduleOptions.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.moduleCode} - {m.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">From Date</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">To Date</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Detailed Session History Table */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6">
                <h3 className="text-base font-bold text-white tracking-tight mb-4">
                  Session Attendance History ({studentDetails.history?.length || 0})
                </h3>

                {studentDetails.history?.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    No session attendance records found in this range.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                          <th className="pb-3 px-3">Session Code</th>
                          <th className="pb-3 px-3">Module</th>
                          <th className="pb-3 px-3">Date & Time</th>
                          <th className="pb-3 px-3">Session Status</th>
                          <th className="pb-3 px-3">Attendance</th>
                          <th className="pb-3 px-3">Method</th>
                          <th className="pb-3 px-3">Marked / Corrected</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 text-slate-300">
                        {studentDetails.history.map((item) => (
                          <tr key={item.sessionId} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 px-3 font-mono font-medium text-teal-400">
                              {item.sessionCode}
                            </td>
                            <td className="py-3 px-3">
                              <div className="font-semibold text-white">{item.moduleCode}</div>
                              <div className="text-[11px] text-slate-400">{item.batchCode || 'Cohort'}</div>
                              {item.isCrossGroup && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                                    Cross-Group ({item.sessionGroupName ? `Group ${item.sessionGroupName}` : 'Session'})
                                  </span>
                                  {item.lecturerName && (
                                    <span className="text-[10px] text-slate-400">
                                      Lect: {item.lecturerName}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-3 text-slate-400">
                              <div>{item.sessionDate}</div>
                              <div className="text-[10px] text-slate-500">
                                {item.startTime} - {item.endTime}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                item.sessionStatus === 'FINALIZED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : item.sessionStatus === 'ACTIVE'
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-slate-700/30 text-slate-400'
                              }`}>
                                {item.sessionStatus}
                              </span>
                            </td>
                            <td className="py-3 px-3">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                item.attendanceStatus === 'PRESENT' || item.attendanceStatus === 'LATE'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  : item.attendanceStatus === 'ABSENT'
                                  ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  : 'bg-slate-700/30 text-slate-400'
                              }`}>
                                {item.attendanceStatus === 'PRESENT' ? (
                                  <CheckCircle2 className="h-3 w-3" />
                                ) : item.attendanceStatus === 'ABSENT' ? (
                                  <XCircle className="h-3 w-3" />
                                ) : (
                                  <AlertCircle className="h-3 w-3" />
                                )}
                                <span>{item.attendanceStatus}</span>
                              </span>
                            </td>
                            <td className="py-3 px-3 font-mono text-[11px] text-slate-400">
                              {item.method}
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-400">
                              {item.markedAt ? new Date(item.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                              {item.isCorrected && (
                                <div className="mt-0.5">
                                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-indigo-500/20 text-indigo-300 font-semibold">
                                    CORRECTED
                                  </span>
                                  {item.justificationNotes && (
                                    <p className="text-[10px] text-slate-400 italic mt-0.5">
                                      &quot;{item.justificationNotes}&quot;
                                    </p>
                                  )}
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
