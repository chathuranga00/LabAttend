import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  FileEdit, 
  ShieldCheck, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { useToast } from '../../context/ToastContext';
import AttendanceCorrectionModal from '../../components/attendance/AttendanceCorrectionModal';

export default function AdminAttendanceRecordsPage() {
  const { showToast } = useToast();

  const [records, setRecords] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL');
  const [isCorrectedFilter, setIsCorrectedFilter] = useState('ALL');

  // Correction Modal
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [savingCorrection, setSavingCorrection] = useState(false);

  const fetchRecords = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        size: pageSize,
        sortBy: 'markedAt',
        sortDir: 'desc',
      };

      if (search.trim()) {
        params.search = search.trim();
      }
      if (statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      if (methodFilter !== 'ALL') {
        params.method = methodFilter;
      }
      if (isCorrectedFilter === 'CORRECTED') {
        params.isCorrected = true;
      }

      const res = await attendanceService.getAdminAttendance(params);
      if (res.success && res.data) {
        setRecords(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch attendance records', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, statusFilter, methodFilter, isCorrectedFilter, showToast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleOpenCorrection = (r) => {
    setSelectedRecord(r);
    setIsModalOpen(true);
  };

  const handleSaveCorrection = async (recordId, data) => {
    if (!selectedRecord?.sessionId) {
      showToast('Cannot determine session for this record', 'error');
      return;
    }
    try {
      setSavingCorrection(true);
      const res = await attendanceService.adminCorrectAttendance(selectedRecord.sessionId, recordId, data);
      if (res.success) {
        showToast('Attendance record corrected and audited successfully by Administrator.', 'success');
        setIsModalOpen(false);
        setSelectedRecord(null);
        fetchRecords();
      }
    } catch (err) {
      showToast(err.message || 'Failed to save correction', 'error');
    } finally {
      setSavingCorrection(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Institutional Attendance Master</h1>
              <p className="text-xs text-slate-400">
                Centralized registry of all student attendance records across laboratory sessions
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchRecords}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student, session code..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Late</option>
            </select>
          </div>

          {/* Method Filter */}
          <div>
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="ALL">All Recording Methods</option>
              <option value="QR_SCAN">QR Camera Scan</option>
              <option value="MANUAL">Manual Entry</option>
            </select>
          </div>

          {/* Correction Filter */}
          <div>
            <select
              value={isCorrectedFilter}
              onChange={(e) => {
                setIsCorrectedFilter(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            >
              <option value="ALL">All Records</option>
              <option value="CORRECTED">Audited Corrections Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">Session & Module</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Audit State</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
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
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white font-mono">{r.studentId}</div>
                      <div className="text-[11px] text-slate-300 font-medium">{r.studentName}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {r.sessionId ? (
                        <Link
                          to={`/admin/sessions/${r.sessionId}/summary`}
                          className="font-mono text-teal-400 hover:text-teal-300 flex items-center gap-1 font-semibold"
                        >
                          <span>{r.sessionCode || 'View Session'}</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      ) : (
                        <span className="font-mono text-slate-400">{r.sessionCode || '—'}</span>
                      )}
                      {r.moduleCode && (
                        <span className="text-[10px] text-slate-400 block">{r.moduleCode}</span>
                      )}
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
                      {r.markedAt ? new Date(r.markedAt).toLocaleString() : '—'}
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
                      {r.sessionId && (
                        <button
                          onClick={() => handleOpenCorrection(r)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition"
                        >
                          <FileEdit className="h-3.5 w-3.5 text-indigo-400" />
                          <span>Correct</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page + 1} of {totalPages} ({totalElements} total attendance entries)
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

      {/* Attendance Correction Modal for Admin */}
      <AttendanceCorrectionModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedRecord(null);
        }}
        record={selectedRecord}
        onSave={handleSaveCorrection}
        loading={savingCorrection}
      />
    </div>
  );
}
