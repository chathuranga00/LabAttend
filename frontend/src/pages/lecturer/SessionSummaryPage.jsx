import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CheckCircle2, 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  Building, 
  Calendar, 
  Percent, 
  Search, 
  FileEdit, 
  ShieldCheck, 
  RefreshCw, 
  AlertCircle,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
  ArrowUpDown
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { attendanceService } from '../../services/attendanceService';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import AttendanceCorrectionModal from '../../components/attendance/AttendanceCorrectionModal';

export default function SessionSummaryPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const { showToast } = useToast();

  const isAdmin = role === 'ADMIN';

  // Summary and Session state
  const [summary, setSummary] = useState(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  // Attendance Records Table state
  const [records, setRecords] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(15);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState('markedAt');
  const [sortDir, setSortDir] = useState('desc');
  const [loadingRecords, setLoadingRecords] = useState(true);

  // Correction Modal state
  const [selectedRecordForCorrection, setSelectedRecordForCorrection] = useState(null);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);

  // 1. Fetch Session Summary
  const fetchSummary = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingSummary(true);
      const res = isAdmin
        ? await sessionService.getAdminSessionSummary(id)
        : await sessionService.getSessionSummary(id);

      if (res.success && res.data) {
        setSummary(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load session summary', 'error');
    } finally {
      setLoadingSummary(false);
    }
  }, [id, isAdmin, showToast]);

  // 2. Fetch Attendance Records for this Session
  const fetchAttendanceRecords = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingRecords(true);
      const params = {
        sessionId: id,
        page,
        size: pageSize,
        sortBy,
        sortDir,
      };

      if (search.trim()) {
        params.search = search.trim();
      }

      if (statusFilter !== 'ALL') {
        if (statusFilter === 'CORRECTED') {
          params.isCorrected = true;
        } else {
          params.status = statusFilter;
        }
      }

      const res = isAdmin
        ? await attendanceService.getAdminAttendance(params)
        : await attendanceService.getAdminAttendance(params); // both use searchAttendanceRecords

      if (res.success && res.data) {
        setRecords(res.data.content || []);
        setTotalRecords(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 0);
      }
    } catch (err) {
      console.error('Failed to load attendance records:', err);
    } finally {
      setLoadingRecords(false);
    }
  }, [id, page, pageSize, search, statusFilter, sortBy, sortDir, isAdmin]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    fetchAttendanceRecords();
  }, [fetchAttendanceRecords]);

  // Handle Correction Save
  const handleSaveCorrection = async (recordId, data) => {
    try {
      setSavingCorrection(true);
      const res = isAdmin
        ? await attendanceService.adminCorrectAttendance(id, recordId, data)
        : await attendanceService.correctAttendance(id, recordId, data);

      if (res.success) {
        showToast('Attendance record corrected and audited successfully.', 'success');
        setIsCorrectionModalOpen(false);
        setSelectedRecordForCorrection(null);
        // Refresh both summary and table
        fetchSummary();
        fetchAttendanceRecords();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save correction', 'error');
    } finally {
      setSavingCorrection(false);
    }
  };

  const handleOpenCorrection = (record) => {
    setSelectedRecordForCorrection(record);
    setIsCorrectionModalOpen(true);
  };

  const backLink = isAdmin ? '/admin/sessions' : '/lecturer/sessions';

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={backLink}
            className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{isAdmin ? 'All Sessions' : 'My Lab Sessions'}</span>
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-sm font-semibold text-teal-400">Finalized Session Summary</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchSummary();
              fetchAttendanceRecords();
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Session Title & Metadata Card */}
      {summary && (
        <div className="bg-slate-900/90 border border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6 relative z-10">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500/10 text-teal-400 border border-teal-500/20 font-mono">
                  {summary.sessionCode}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${
                    summary.status === 'FINALIZED'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {summary.status}
                </span>
                {summary.finalizedAt && (
                  <span className="px-3 py-1 rounded-full text-[11px] font-medium bg-slate-800/80 text-slate-300 border border-slate-700">
                    Finalized {new Date(summary.finalizedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-3">
                {summary.moduleCode} — {summary.moduleName}
              </h1>

              <div className="flex flex-wrap items-center gap-4 mt-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Users className="h-3.5 w-3.5 text-teal-400" />
                  <span>Batch: <strong className="text-white">{summary.batchName}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Building className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Hall: <strong className="text-white">{summary.hallName} ({summary.hallCode})</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Date: <strong className="text-white">{summary.sessionDate}</strong></span>
                </span>
                <span className="flex items-center gap-1.5 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>
                    Schedule: <strong className="text-white">{summary.startTime?.substring(0, 5)} - {summary.endTime?.substring(0, 5)}</strong>
                  </span>
                </span>
              </div>
            </div>

            {summary.finalizationNotes && (
              <div className="lg:max-w-md w-full p-4 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs">
                <span className="text-slate-400 font-semibold block mb-1 flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5 text-teal-400" />
                  Lecturer Finalization Notes:
                </span>
                <p className="text-slate-200 italic leading-relaxed">
                  "{summary.finalizationNotes}"
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Expected Roster */}
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-slate-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Expected Students</span>
              <Users className="h-4 w-4 text-slate-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {summary.expectedStudentCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Total assigned to session cohort</p>
          </div>

          {/* Marked Present */}
          <div className="bg-slate-900/70 border border-emerald-900/40 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-emerald-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Marked Present</span>
              <UserCheck className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-black text-emerald-400">
              {summary.presentCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Verified present via badge / manual</p>
          </div>

          {/* Absent Count */}
          <div className="bg-slate-900/70 border border-rose-900/40 rounded-2xl p-5 shadow-lg">
            <div className="flex items-center justify-between text-rose-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Recorded Absent</span>
              <UserX className="h-4 w-4 text-rose-400" />
            </div>
            <div className="text-3xl font-black text-rose-400">
              {summary.absentCount}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Unmarked students at finalization</p>
          </div>

          {/* Attendance Percentage */}
          <div className="bg-slate-900/70 border border-teal-900/40 rounded-2xl p-5 shadow-lg relative overflow-hidden">
            <div className="flex items-center justify-between text-teal-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Attendance Percentage</span>
              <Percent className="h-4 w-4 text-teal-400" />
            </div>
            <div className="text-3xl font-black text-teal-300">
              {summary.attendancePercentage}
            </div>
            <div className="mt-2 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-teal-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{
                  width: summary.attendancePercentage === 'N/A'
                    ? '0%'
                    : `${Math.min(100, parseFloat(summary.attendancePercentage))}%`,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Attendance Records Table Section */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
        {/* Table Controls Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Finalized Attendance Records</h2>
            <p className="text-xs text-slate-400">
              Showing {totalRecords} student attendance records for this session
            </p>
          </div>

          {/* Search & Status Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search ID or name..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
              />
            </div>

            {/* Status Filter Dropdown / Tabs */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
              {['ALL', 'PRESENT', 'ABSENT', 'LATE', 'CORRECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    statusFilter === st
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table Component */}
        <div className="overflow-x-auto rounded-2xl border border-slate-800/80">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Student ID</th>
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Marked At</th>
                <th className="py-3.5 px-4">Audit Status</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loadingRecords ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-teal-400 mb-2" />
                    <span>Loading attendance records...</span>
                  </td>
                </tr>
              ) : records.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                    <span>No attendance records found matching filters.</span>
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-850/40 transition">
                    <td className="py-3.5 px-4 font-mono font-bold text-white">
                      {r.studentId}
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {r.studentName}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                          r.status === 'PRESENT'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : r.status === 'LATE'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[11px] font-medium text-slate-300">
                        {r.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                      {r.markedAt
                        ? new Date(r.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4">
                      {r.isCorrected ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold uppercase tracking-wider">
                            <ShieldCheck className="h-3 w-3" />
                            CORRECTED
                          </span>
                          {r.justificationNotes && (
                            <p className="text-[10px] text-slate-400 italic max-w-xs truncate" title={r.justificationNotes}>
                              "{r.justificationNotes}"
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500">Original</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleOpenCorrection(r)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                      >
                        <FileEdit className="h-3.5 w-3.5 text-indigo-400" />
                        <span>Correct</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
            <span>
              Page {page + 1} of {totalPages} ({totalRecords} items)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Attendance Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionModalOpen}
        onClose={() => {
          setIsCorrectionModalOpen(false);
          setSelectedRecordForCorrection(null);
        }}
        record={selectedRecordForCorrection}
        onSave={handleSaveCorrection}
        loading={savingCorrection}
      />
    </div>
  );
}
