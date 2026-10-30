import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
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
  Calendar,
  Edit,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { 
  laboratoryHallService, 
  lecturerAssignmentService, 
  labGroupService 
} from '../../services/academicService';
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

  // Edit modal state
  const [editModalSession, setEditModalSession] = useState(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editForm, setEditForm] = useState({
    hallId: '',
    sessionDate: '',
    startTime: '',
    endTime: '',
    lecturerId: '',
    labGroupId: '',
  });

  // Delete modal state
  const [deleteModalSession, setDeleteModalSession] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Options for editing
  const [halls, setHalls] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [batchGroups, setBatchGroups] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Fetch session data
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

  // Load global halls and lecturers for editing
  useEffect(() => {
    laboratoryHallService.getHalls({ size: 100 })
      .then(res => {
        if (res.data) {
          setHalls(res.data.content || res.data || []);
        }
      })
      .catch(() => {});

    lecturerAssignmentService.getAvailableLecturers()
      .then(res => {
        if (res.data) {
          setLecturers(res.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Open Edit Modal and load groups for this session's batch
  const handleOpenEditModal = async (sessionItem) => {
    setEditModalSession(sessionItem);
    setEditForm({
      hallId: sessionItem.hallId || '',
      sessionDate: sessionItem.sessionDate || '',
      startTime: sessionItem.startTime ? sessionItem.startTime.substring(0, 5) : '',
      endTime: sessionItem.endTime ? sessionItem.endTime.substring(0, 5) : '',
      lecturerId: sessionItem.lecturerId || '',
      labGroupId: sessionItem.labGroupId || '',
    });

    if (sessionItem.batchId) {
      try {
        setLoadingOptions(true);
        const res = await labGroupService.getGroupsByBatch(sessionItem.batchId);
        setBatchGroups(res.data || []);
      } catch (err) {
        setBatchGroups([]);
      } finally {
        setLoadingOptions(false);
      }
    } else {
      setBatchGroups([]);
    }
  };

  // Submit Edit
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalSession) return;

    if (!editForm.hallId) {
      showToast('Please select a laboratory hall', 'error');
      return;
    }
    if (!editForm.sessionDate) {
      showToast('Please enter a session date', 'error');
      return;
    }
    if (!editForm.startTime || !editForm.endTime) {
      showToast('Please enter valid start and end times', 'error');
      return;
    }
    if (editForm.endTime <= editForm.startTime) {
      showToast('End time must be after start time', 'error');
      return;
    }

    try {
      setEditLoading(true);
      const payload = {
        hallId: editForm.hallId,
        sessionDate: editForm.sessionDate,
        startTime: editForm.startTime.length === 5 ? `${editForm.startTime}:00` : editForm.startTime,
        endTime: editForm.endTime.length === 5 ? `${editForm.endTime}:00` : editForm.endTime,
        lecturerId: editForm.lecturerId || undefined,
        labGroupId: editForm.labGroupId || undefined,
        clearLabGroup: !editForm.labGroupId && !!editModalSession.labGroupId,
      };

      const res = await sessionService.adminUpdateSession(editModalSession.id, payload);
      if (res.success) {
        showToast('Laboratory session updated successfully', 'success');
        setEditModalSession(null);
        fetchSessions();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to update session';
      showToast(msg, 'error');
    } finally {
      setEditLoading(false);
    }
  };

  // Submit Delete
  const handleConfirmDelete = async () => {
    if (!deleteModalSession) return;

    try {
      setDeleteLoading(true);
      const res = await sessionService.adminDeleteSession(deleteModalSession.id);
      if (res.success) {
        showToast(`Session ${deleteModalSession.sessionCode} deleted successfully`, 'success');
        setDeleteModalSession(null);
        fetchSessions();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete session';
      showToast(msg, 'error');
    } finally {
      setDeleteLoading(false);
    }
  };

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
            {item.labGroupName && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded bg-slate-800 text-teal-300 border border-teal-800/40 text-[10px]">
                {item.labGroupName}
              </span>
            )}
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
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSelectedSession(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="View Session Details"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOpenEditModal(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-400 transition"
            title="Edit Session"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteModalSession(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition"
            title="Delete Session"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
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
          Institutional administrative oversight: inspect, update, or purge laboratory session records.
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
            <option value="SCHEDULED">SCHEDULED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="FINALIZED">FINALIZED</option>
            <option value="CLOSED">CLOSED</option>
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
          pageNumber={page}
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          pageSize={10}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* 1. View Session Details Modal */}
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
                <span className="text-slate-500 block text-[11px]">
                  {selectedSession.labGroupName ? `Group: ${selectedSession.labGroupName}` : (selectedSession.batchAcademicYear || 'Whole Batch')}
                </span>
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

      {/* 2. Edit Session Modal */}
      <Modal
        isOpen={!!editModalSession}
        onClose={() => !editLoading && setEditModalSession(null)}
        title="Edit Laboratory Session"
        subtitle={editModalSession ? `Update schedule, hall, instructor, or group for ${editModalSession.sessionCode}` : ''}
      >
        {editModalSession && (
          <form onSubmit={handleSaveEdit} className="space-y-4 text-xs text-slate-300">
            {/* Header info badge */}
            <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {editModalSession.sessionCode}
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 text-[10px]">
                  {editModalSession.status}
                </span>
              </div>
              <div className="text-xs font-semibold text-white">
                {editModalSession.moduleCode} — {editModalSession.moduleName}
              </div>
              <div className="text-[11px] text-slate-400">
                Batch: <span className="text-slate-200 font-medium">{editModalSession.batchCode}</span>
              </div>
            </div>

            {/* Laboratory Hall Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Laboratory Hall <span className="text-rose-400">*</span>
              </label>
              <select
                value={editForm.hallId}
                onChange={(e) => setEditForm({ ...editForm, hallId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">Select Laboratory Hall</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.hallCode} — {h.name} (Cap: {h.capacity})
                  </option>
                ))}
              </select>
            </div>

            {/* Instructor / Lecturer Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Assigned Instructor <span className="text-rose-400">*</span>
              </label>
              <select
                value={editForm.lecturerId}
                onChange={(e) => setEditForm({ ...editForm, lecturerId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                required
              >
                <option value="">Select Lecturer</option>
                {lecturers.map((lec) => (
                  <option key={lec.id} value={lec.id}>
                    {lec.fullName} ({lec.staffId})
                  </option>
                ))}
              </select>
            </div>

            {/* Lab Group Field (Optional) */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Lab Group <span className="text-slate-500">(Optional - Whole Batch if Unassigned)</span>
              </label>
              <select
                value={editForm.labGroupId}
                onChange={(e) => setEditForm({ ...editForm, labGroupId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                disabled={loadingOptions}
              >
                <option value="">Whole Batch (No Specific Lab Group)</option>
                {batchGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Field */}
            <div>
              <label className="block text-slate-300 font-medium mb-1">
                Session Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                value={editForm.sessionDate}
                onChange={(e) => setEditForm({ ...editForm, sessionDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            {/* Start & End Time Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  Start Time <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  value={editForm.startTime}
                  onChange={(e) => setEditForm({ ...editForm, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">
                  End Time <span className="text-rose-400">*</span>
                </label>
                <input
                  type="time"
                  value={editForm.endTime}
                  onChange={(e) => setEditForm({ ...editForm, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800/90 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
                  required
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditModalSession(null)}
                disabled={editLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-950/40 transition disabled:opacity-50"
              >
                {editLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Save Changes</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* 3. Delete Session Confirmation Modal */}
      <Modal
        isOpen={!!deleteModalSession}
        onClose={() => !deleteLoading && setDeleteModalSession(null)}
        title="Delete Laboratory Session"
      >
        {deleteModalSession && (
          <div className="space-y-4 text-xs text-slate-300">
            {/* Warning banner */}
            <div className="p-3.5 bg-rose-950/30 border border-rose-900/50 rounded-xl flex items-start gap-3 text-rose-300">
              <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-white block">
                  Are you sure you want to delete this session?
                </span>
                <p className="text-rose-200/90 leading-relaxed">
                  This action is permanent and will cascade-delete all student attendance records, roster links, and session logs associated with this session.
                </p>
                {deleteModalSession.attendedCount > 0 && (
                  <p className="font-semibold text-rose-400 pt-1">
                    Attention: {deleteModalSession.attendedCount} student check-in record(s) will be permanently purged.
                  </p>
                )}
              </div>
            </div>

            {/* Session Summary Card */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-mono font-bold text-white text-sm">
                  {deleteModalSession.sessionCode}
                </span>
                <span className="px-2.5 py-0.5 rounded-full font-bold bg-slate-800 text-slate-300 text-[10px]">
                  {deleteModalSession.status}
                </span>
              </div>
              <div className="text-xs font-semibold text-slate-200">
                {deleteModalSession.moduleCode} — {deleteModalSession.moduleName}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400">
                <div>
                  <span className="block text-slate-500">Cohort Batch:</span>
                  <span className="text-slate-300 font-medium">{deleteModalSession.batchCode}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Instructor:</span>
                  <span className="text-slate-300 font-medium">{deleteModalSession.lecturerName}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Hall:</span>
                  <span className="text-slate-300 font-medium">{deleteModalSession.hallCode}</span>
                </div>
                <div>
                  <span className="block text-slate-500">Schedule:</span>
                  <span className="text-slate-300 font-medium font-mono">
                    {deleteModalSession.sessionDate} ({deleteModalSession.startTime} - {deleteModalSession.endTime})
                  </span>
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalSession(null)}
                disabled={deleteLoading}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteLoading}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-950/40 transition disabled:opacity-50"
              >
                {deleteLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                <span>Delete Session Permanently</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
