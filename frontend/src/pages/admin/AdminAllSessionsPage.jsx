import React, { useState, useEffect, useCallback } from 'react';
import { 
  CalendarClock, 
  Search, 
  RefreshCw, 
  Building, 
  Users, 
  UserCheck, 
  Clock, 
  Eye,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal } from '../../components/common';

export default function AdminAllSessionsPage() {
  const { showToast } = useToast();

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Pagination
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // View modal state
  const [selectedSession, setSelectedSession] = useState(null);

  const fetchSessions = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        status: statusFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'sessionDate',
        sortDir: 'desc',
      };
      const res = await sessionService.getAllSessions(params);
      if (res.success && res.data) {
        setSessions(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load institutional sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, search, page, showToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const columns = [
    {
      header: 'Session Code',
      accessor: 'sessionCode',
      render: (item) => (
        <span className="font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-xs">
          {item.sessionCode}
        </span>
      ),
    },
    {
      header: 'Course & Cohort',
      accessor: 'moduleCode',
      render: (item) => (
        <div>
          <span className="font-bold text-white block text-xs">
            {item.moduleCode} — {item.moduleName}
          </span>
          <span className="text-[11px] text-slate-400">
            Batch: <strong className="text-slate-300">{item.batchCode}</strong>
          </span>
        </div>
      ),
    },
    {
      header: 'Instructor',
      accessor: 'lecturerName',
      render: (item) => (
        <div className="text-xs">
          <span className="font-medium text-slate-200 block">{item.lecturerName}</span>
          <span className="text-[11px] font-mono text-slate-400">{item.lecturerStaffId}</span>
        </div>
      ),
    },
    {
      header: 'Hall & Schedule',
      accessor: 'sessionDate',
      render: (item) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-200 block">
            {item.sessionDate} ({item.startTime} - {item.endTime})
          </span>
          <span className="text-[11px] text-slate-400 font-mono">
            {item.hallCode} ({item.hallName})
          </span>
        </div>
      ),
    },
    {
      header: 'Attendance',
      accessor: 'expectedStudentCount',
      render: (item) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-200">
            {item.attendedCount} / {item.expectedStudentCount}
          </span>
          <span className="text-[10px] text-slate-500 block">checked in</span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (item) => {
        let badgeStyle = 'bg-slate-800 text-slate-400';
        if (item.status === 'ACTIVE') {
          badgeStyle = 'bg-emerald-950/70 text-emerald-400 border border-emerald-700 font-bold';
        } else if (item.status === 'DRAFT' || item.status === 'SCHEDULED') {
          badgeStyle = 'bg-amber-950/60 text-amber-400 border border-amber-800/50';
        } else if (item.status === 'FINALIZED' || item.status === 'CLOSED') {
          badgeStyle = 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50';
        } else if (item.status === 'CANCELLED') {
          badgeStyle = 'bg-rose-950/60 text-rose-400 border border-rose-800/50 line-through';
        }

        return (
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${badgeStyle}`}>
            {item.status}
          </span>
        );
      },
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (item) => (
        <button
          onClick={() => setSelectedSession(item)}
          className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
          title="View Session Audit Overview"
        >
          <Eye className="h-4 w-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold tracking-wider uppercase mb-1">
          <CalendarClock className="h-4 w-4" />
          <span>Institutional Laboratory Oversight</span>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">All Laboratory Sessions</h1>
        <p className="text-sm text-slate-400 mt-1">
          Global read-only oversight across all faculties, degree cohorts, and laboratory spaces.
        </p>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:w-80">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(0);
            }}
            placeholder="Search by session code, module..."
          />
        </div>

        <div className="w-full md:w-44">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="FINALIZED">FINALIZED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(0);
            }}
            title="Start Date"
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
          />
          <span className="text-slate-500 text-xs">to</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(0);
            }}
            title="End Date"
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-emerald-500 font-mono"
          />
        </div>

        {(statusFilter || startDate || endDate || search) && (
          <button
            onClick={() => {
              setStatusFilter('');
              setStartDate('');
              setEndDate('');
              setSearch('');
              setPage(0);
            }}
            className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1 px-2 py-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* Sessions Data Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <DataTable
          columns={columns}
          data={sessions}
          loading={loading}
          emptyMessage="No laboratory sessions found across the institution."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Session Details Modal */}
      <Modal
        isOpen={!!selectedSession}
        onClose={() => setSelectedSession(null)}
        title="Laboratory Session Overview"
      >
        {selectedSession && (
          <div className="space-y-4 text-xs text-slate-300">
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {selectedSession.sessionCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300">
                  {selectedSession.status}
                </span>
              </div>
              <div className="text-sm font-semibold text-white">
                {selectedSession.moduleCode} — {selectedSession.moduleName}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-800/40 rounded-xl">
                <span className="text-slate-400 block mb-0.5 font-medium">Instructor:</span>
                <span className="text-white font-semibold">{selectedSession.lecturerName}</span>
                <span className="text-slate-500 block font-mono text-[11px]">{selectedSession.lecturerStaffId}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl">
                <span className="text-slate-400 block mb-0.5 font-medium">Cohort Batch:</span>
                <span className="text-white font-semibold">{selectedSession.batchCode}</span>
                <span className="text-slate-500 block text-[11px]">{selectedSession.batchAcademicYear || 'Current Year'}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl">
                <span className="text-slate-400 block mb-0.5 font-medium">Hall:</span>
                <span className="text-white font-semibold">{selectedSession.hallCode}</span>
                <span className="text-slate-500 block text-[11px]">{selectedSession.hallName}</span>
              </div>
              <div className="p-3 bg-slate-800/40 rounded-xl">
                <span className="text-slate-400 block mb-0.5 font-medium">Schedule (Colombo):</span>
                <span className="text-white font-semibold">{selectedSession.sessionDate}</span>
                <span className="text-slate-500 block font-mono text-[11px]">
                  {selectedSession.startTime} - {selectedSession.endTime}
                </span>
              </div>
            </div>

            <div className="p-3 bg-slate-800/40 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-slate-400 block font-medium">Cohort Check-in Count:</span>
                <span className="text-xs text-slate-300">
                  {selectedSession.attendedCount} / {selectedSession.expectedStudentCount} students present
                </span>
              </div>
              <span className="text-lg font-bold text-emerald-400 font-mono">
                {selectedSession.expectedStudentCount > 0
                  ? ((selectedSession.attendedCount / selectedSession.expectedStudentCount) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>

            {selectedSession.cancellationReason && (
              <div className="p-3 bg-rose-950/30 border border-rose-900/40 rounded-xl text-rose-300">
                <span className="font-bold block mb-0.5">Cancellation Reason:</span>
                {selectedSession.cancellationReason}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Link
                to={`/admin/sessions/${selectedSession.id}/summary`}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition"
              >
                View Attendance Summary & Records
              </Link>
              <button
                type="button"
                onClick={() => setSelectedSession(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
