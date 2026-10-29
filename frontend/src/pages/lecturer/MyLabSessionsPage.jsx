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
  AlertCircle,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal } from '../../components/common';

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

  // Form options (for editing halls)
  const [halls, setHalls] = useState([]);
  const [hallsLoading, setHallsLoading] = useState(false);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [editForm, setEditForm] = useState({
    hallId: '',
    sessionDate: '',
    startTime: '',
    endTime: '',
  });
  const [editLoading, setEditLoading] = useState(false);

  // Delete Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletingSession, setDeletingSession] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

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

  const loadHalls = async () => {
    if (halls.length > 0) return;
    try {
      setHallsLoading(true);
      const res = await sessionService.getFormOptions();
      if (res.success && res.data && res.data.halls) {
        setHalls(res.data.halls);
      }
    } catch (err) {
      console.error('Failed to load halls', err);
    } finally {
      setHallsLoading(false);
    }
  };

  const handleStartSession = async (sessionId) => {
    try {
      const res = await sessionService.startSession(sessionId);
      showToast(res.message || 'Session is now ACTIVE!', 'success');
      fetchSessions();
    } catch (err) {
      showToast(err.message || 'Failed to start session', 'error');
    }
  };

  // Open Edit Dialog
  const openEditModal = async (session) => {
    setEditingSession(session);
    setEditForm({
      hallId: session.hallId || '',
      sessionDate: session.sessionDate || '',
      startTime: session.startTime ? session.startTime.substring(0, 5) : '',
      endTime: session.endTime ? session.endTime.substring(0, 5) : '',
    });
    setEditModalOpen(true);
    await loadHalls();
  };

  // Save Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editForm.hallId) {
      showToast('Please select a laboratory hall', 'error');
      return;
    }
    if (!editForm.sessionDate) {
      showToast('Session date is required', 'error');
      return;
    }
    if (!editForm.startTime || !editForm.endTime) {
      showToast('Start and end times are required', 'error');
      return;
    }
    if (editForm.endTime <= editForm.startTime) {
      showToast('End time must be strictly after start time', 'error');
      return;
    }

    try {
      setEditLoading(true);
      const payload = {
        hallId: editForm.hallId,
        sessionDate: editForm.sessionDate,
        startTime: editForm.startTime.length === 5 ? `${editForm.startTime}:00` : editForm.startTime,
        endTime: editForm.endTime.length === 5 ? `${editForm.endTime}:00` : editForm.endTime,
      };

      const res = await sessionService.updateSession(editingSession.id, payload);
      showToast(res.message || 'Session updated successfully', 'success');
      setEditModalOpen(false);
      setEditingSession(null);
      fetchSessions();
    } catch (err) {
      showToast(err.message || 'Failed to update session', 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Delete Dialog
  const openDeleteModal = (session) => {
    setDeletingSession(session);
    setDeleteModalOpen(true);
  };

  // Confirm Delete
  const handleConfirmDelete = async () => {
    if (!deletingSession) return;
    try {
      setDeleteLoading(true);
      const res = await sessionService.deleteSession(deletingSession.id);
      showToast(res.message || 'Session deleted successfully', 'success');
      setDeleteModalOpen(false);
      setDeletingSession(null);
      fetchSessions();
    } catch (err) {
      showToast(err.message || 'Failed to delete session', 'error');
    } finally {
      setDeleteLoading(false);
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
        const isFinalized = item.status === 'FINALIZED' || item.status === 'CLOSED';

        return (
          <div className="flex items-center gap-1.5 flex-wrap">
            {isDraft && (
              <button
                onClick={() => handleStartSession(item.id)}
                className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-emerald-950/50 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-800/60 transition flex items-center justify-center"
                title="Start Session (DRAFT -> ACTIVE)"
              >
                <Play className="h-4 w-4 fill-current" />
              </button>
            )}

            {isActive && (
              <Link
                to={`/lecturer/scanner?sessionId=${item.id}`}
                className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-cyan-950/50 hover:bg-cyan-900/60 text-cyan-400 border border-cyan-800/60 transition flex items-center justify-center"
                title="Launch Live QR Scanner"
              >
                <QrCode className="h-4 w-4" />
              </Link>
            )}

            {!isFinalized && (
              <button
                onClick={() => openEditModal(item)}
                className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-amber-950/50 hover:bg-amber-900/60 text-amber-400 border border-amber-800/60 transition flex items-center justify-center"
                title="Edit Session (Hall, Schedule)"
              >
                <Pencil className="h-4 w-4" />
              </button>
            )}

            {!isFinalized && (
              <button
                onClick={() => openDeleteModal(item)}
                className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-rose-950/50 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 transition flex items-center justify-center"
                title="Delete Session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}

            <button
              onClick={() => navigate(`/lecturer/sessions/${item.id}`)}
              className="min-w-[36px] min-h-[36px] p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center justify-center"
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
    <div className="p-4 sm:p-6 md:p-8 space-y-6">
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
          pageNumber={page}
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={10}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* EDIT SESSION MODAL */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          if (!editLoading) {
            setEditModalOpen(false);
            setEditingSession(null);
          }
        }}
        title="Edit Lab Session"
        subtitle={editingSession ? `${editingSession.sessionCode} • ${editingSession.moduleCode} (${editingSession.moduleName})` : ''}
      >
        {editingSession && (
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Status note */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
              <span className="text-slate-400">Current Session State:</span>
              <span className="font-bold text-teal-400 px-2 py-0.5 rounded bg-teal-950/60 border border-teal-800/40">
                {editingSession.status}
              </span>
            </div>

            {/* Hall Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Laboratory Hall *
              </label>
              <select
                value={editForm.hallId}
                onChange={(e) => setEditForm({ ...editForm, hallId: e.target.value })}
                required
                disabled={hallsLoading}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              >
                <option value="">Select Laboratory Hall</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.hallCode} — {h.name} (Capacity: {h.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Session Date *
              </label>
              <input
                type="date"
                value={editForm.sessionDate}
                onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })}
                required
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
              />
            </div>

            {/* Timing Slots */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Start Time *
                </label>
                <input
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  End Time *
                </label>
                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  required
                  className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setEditModalOpen(false);
                  setEditingSession(null);
                }}
                disabled={editLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 text-xs font-bold shadow-lg shadow-teal-500/20 transition disabled:opacity-50"
              >
                {editLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editLoading ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* DELETE SESSION MODAL */}
      <Modal
        isOpen={deleteModalOpen}
        onClose={() => {
          if (!deleteLoading) {
            setDeleteModalOpen(false);
            setDeletingSession(null);
          }
        }}
        title="Delete Lab Session"
        subtitle="Permanent ledger removal"
      >
        {deletingSession && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-rose-400" />
              <div className="text-xs leading-relaxed">
                <p className="font-bold text-rose-200 mb-1">Are you sure you want to delete this session?</p>
                <p>
                  You are about to permanently remove session{' '}
                  <strong className="text-white font-mono">{deletingSession.sessionCode}</strong>. 
                  All roster setup and pending attendance allocations for this session will be deleted. This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Module:</span>
                <span className="text-slate-200">{deletingSession.moduleCode} — {deletingSession.moduleName}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Batch / Group:</span>
                <span className="text-slate-200">
                  {deletingSession.batchCode} {deletingSession.labGroupName ? `(Group ${deletingSession.labGroupName})` : '(Whole Batch)'}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Date & Time:</span>
                <span className="text-slate-200">{deletingSession.sessionDate} • {deletingSession.startTime} - {deletingSession.endTime}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Status:</span>
                <span className="text-amber-400 font-bold">{deletingSession.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setDeleteModalOpen(false);
                  setDeletingSession(null);
                }}
                disabled={deleteLoading}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{deleteLoading ? 'Deleting...' : 'Delete Session'}</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
