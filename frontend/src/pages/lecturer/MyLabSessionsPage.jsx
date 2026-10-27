import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  CalendarClock, 
  Plus, 
  Search, 
  RefreshCw, 
  Play, 
  QrCode, 
  Eye, 
  Clock, 
  Building, 
  Users,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar } from '../../components/common';

export default function MyLabSessionsPage() {
  const navigate = useNavigate();
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
      const res = await sessionService.getLecturerSessions(params);
      if (res.success && res.data) {
        setSessions(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load sessions', 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, startDate, endDate, search, page, showToast]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleStartSession = async (sessionId) => {
    try {
      const res = await sessionService.startSession(sessionId);
      showToast(res.message || 'Session is now ACTIVE!', 'success');
      fetchSessions();
    } catch (err) {
      showToast(err.message || 'Failed to start session', 'error');
    }
  };

  const columns = [
    {
      header: 'Session Code',
      accessor: 'sessionCode',
      render: (item) => (
        <span className="font-mono font-bold text-teal-400 bg-teal-950/50 border border-teal-800/40 px-2 py-0.5 rounded text-xs">
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
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="text-[11px] text-slate-400">
              Batch: <strong className="text-slate-300">{item.batchCode}</strong>
            </span>
            {item.labGroupName ? (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-950/70 border border-indigo-800 text-indigo-300">
                Group {item.labGroupName}
              </span>
            ) : (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400">
                Whole Batch
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      header: 'Hall',
      accessor: 'hallCode',
      render: (item) => (
        <span className="font-mono text-xs text-slate-300">
          {item.hallCode} ({item.hallName})
        </span>
      ),
    },
    {
      header: 'Schedule',
      accessor: 'sessionDate',
      render: (item) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-200 block">{item.sessionDate}</span>
          <span className="text-[11px] font-mono text-slate-500">
            {item.startTime} - {item.endTime}
          </span>
        </div>
      ),
    },
    {
      header: 'Roster / Attended',
      accessor: 'expectedStudentCount',
      render: (item) => (
        <div className="text-xs">
          <span className="font-semibold text-slate-200">
            {item.attendedCount} / {item.expectedStudentCount}
          </span>
          <span className="text-[10px] text-slate-400 block">
            {item.labGroupName ? `Group ${item.labGroupName} roster` : 'Cohort roster'}
          </span>
        </div>
      ),
    },
    {
      header: 'Status',
      accessor: 'status',
      render: (item) => {
        let badgeStyle = 'bg-slate-800 text-slate-400';
        if (item.status === 'ACTIVE') {
          badgeStyle = 'bg-emerald-950/70 text-emerald-400 border border-emerald-700 font-bold animate-pulse';
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
      render: (item) => {
        const isDraft = item.status === 'DRAFT' || item.status === 'SCHEDULED';
        const isActive = item.status === 'ACTIVE';

        return (
          <div className="flex items-center gap-1.5">
            {isDraft && (
              <button
                onClick={() => handleStartSession(item.id)}
                className="p-1.5 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 transition"
                title="Start Session (DRAFT -> ACTIVE)"
              >
                <Play className="h-4 w-4 fill-current" />
              </button>
            )}

            {isActive && (
              <Link
                to={`/lecturer/scanner?sessionId=${item.id}`}
                className="p-1.5 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition"
                title="Launch Live QR Scanner"
              >
                <QrCode className="h-4 w-4" />
              </Link>
            )}

            <button
              onClick={() => navigate(`/lecturer/sessions/${item.id}`)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
              title="View Session Details & Roster"
            >
              <Eye className="h-4 w-4" />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-teal-400 font-semibold tracking-wider uppercase mb-1">
            <CalendarClock className="h-4 w-4" />
            <span>Faculty Laboratory Ledger</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">My Lab Sessions</h1>
          <p className="text-sm text-slate-400 mt-1">
            Conduct, supervise, and finalize laboratory sessions for your authorized academic cohorts.
          </p>
        </div>

        <Link
          to="/lecturer/sessions/new"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-sm font-bold shadow-lg shadow-teal-500/20 transition self-start md:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Schedule Lab Session</span>
        </Link>
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
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-teal-500"
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
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500 font-mono"
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
            className="px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500 font-mono"
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
          emptyMessage="No laboratory sessions found matching your criteria."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={(p) => setPage(p)}
        />
      </div>
    </div>
  );
}
