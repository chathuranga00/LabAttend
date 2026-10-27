import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, UserCheck, RefreshCw } from 'lucide-react';
import {
  lecturerAssignmentService,
  moduleService,
  batchService,
  labGroupService,
} from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, Modal, StatusBadge } from '../../components/common';

export default function AssignmentsPage() {
  const { showToast } = useToast();

  const [assignments, setAssignments] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [modules, setModules] = useState([]);
  const [batches, setBatches] = useState([]);
  const [batchGroups, setBatchGroups] = useState([]);

  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Filters
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [selectedModuleId, setSelectedModuleId] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    lecturerId: '',
    moduleId: '',
    batchId: '',
    labGroupId: '',
    academicYear: new Date().getFullYear().toString(),
    semester: '1',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load auxiliary data for dropdowns
  const loadAuxData = useCallback(async () => {
    try {
      const [lecRes, modRes, batRes] = await Promise.all([
        lecturerAssignmentService.getAvailableLecturers(),
        moduleService.getModules({ size: 100 }),
        batchService.getBatches({ size: 100 }),
      ]);

      if (lecRes.success && lecRes.data) setLecturers(lecRes.data);
      if (modRes.success && modRes.data) setModules(modRes.data.content || []);
      if (batRes.success && batRes.data) setBatches(batRes.data.content || []);
    } catch (err) {
      console.error('Failed to load auxiliary data', err);
    }
  }, []);

  const fetchAssignments = useCallback(async () => {
    try {
      setLoading(true);
      const res = await lecturerAssignmentService.getAssignments({
        lecturerId: selectedLecturerId || undefined,
        moduleId: selectedModuleId || undefined,
        page,
        size: 10,
      });
      if (res.success && res.data) {
        setAssignments(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load assignments', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedLecturerId, selectedModuleId, page, showToast]);

  useEffect(() => {
    loadAuxData();
  }, [loadAuxData]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  useEffect(() => {
    if (formData.batchId) {
      labGroupService.getGroupsByBatch(formData.batchId)
        .then((res) => {
          if (res.success && res.data) setBatchGroups(res.data);
        })
        .catch(() => setBatchGroups([]));
    } else {
      setBatchGroups([]);
      setFormData((prev) => ({ ...prev, labGroupId: '' }));
    }
  }, [formData.batchId]);

  const handleOpenCreate = () => {
    setFormData({
      lecturerId: lecturers[0]?.id || '',
      moduleId: modules[0]?.id || '',
      batchId: batches[0]?.id || '',
      labGroupId: '',
      academicYear: new Date().getFullYear().toString(),
      semester: '1',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await lecturerAssignmentService.toggleStatus(item.id);
      showToast(res.message || 'Assignment status updated', 'success');
      fetchAssignments();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm('Are you sure you want to remove this lecturer assignment?')) {
      return;
    }
    try {
      await lecturerAssignmentService.deleteAssignment(item.id);
      showToast('Assignment deleted successfully', 'success');
      fetchAssignments();
    } catch (err) {
      showToast(err.message || 'Failed to delete assignment', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.lecturerId) errors.lecturerId = 'Please select a lecturer';
    if (!formData.moduleId) errors.moduleId = 'Please select a module';
    if (!formData.academicYear.trim()) errors.academicYear = 'Academic year is required';
    if (!formData.semester.trim()) errors.semester = 'Semester is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        batchId: formData.batchId || null,
        labGroupId: formData.labGroupId || null,
      };

      await lecturerAssignmentService.createAssignment(payload);
      showToast('Lecturer assigned successfully', 'success');
      setIsModalOpen(false);
      fetchAssignments();
    } catch (err) {
      showToast(err.message || 'Failed to create assignment', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'lecturer',
      header: 'Lecturer',
      render: (row) => (
        <div>
          <span className="font-semibold text-slate-100">{row.lecturerName || '—'}</span>
          <p className="text-xs font-mono text-indigo-400">{row.lecturerStaffId || ''}</p>
        </div>
      ),
    },
    {
      key: 'module',
      header: 'Assigned Module',
      render: (row) => (
        <div>
          <span className="font-mono text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded text-xs border border-indigo-900/40">
            {row.moduleCode}
          </span>
          <span className="text-xs text-slate-300 ml-2">{row.moduleName}</span>
        </div>
      ),
    },
    {
      key: 'batch',
      header: 'Assigned Batch & Group',
      render: (row) => (
        <div className="flex flex-col gap-1 items-start">
          {row.batchCode ? (
            <span className="text-xs font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700/60">
              {row.batchCode}
            </span>
          ) : (
            <span className="text-xs text-slate-500">All Batches</span>
          )}
          {row.labGroupName ? (
            <span className="font-mono font-bold text-[10px] text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2 py-0.5 rounded-full">
              Group {row.labGroupName}
            </span>
          ) : row.batchCode ? (
            <span className="text-[10px] text-slate-400">Whole Batch</span>
          ) : null}
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Curriculum Period',
      render: (row) => (
        <span className="text-xs text-slate-300 font-medium">
          Year {row.academicYear} • Sem {row.semester}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (row) => (
        <StatusBadge
          isActive={row.isActive}
          onClick={() => handleToggleStatus(row)}
        />
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => handleDelete(row)}
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Delete Assignment"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <UserCheck className="w-7 h-7 text-indigo-400" />
            Lecturer Assignments
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Assign qualified faculty lecturers to specific academic course modules and student cohorts
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Assign Lecturer
        </button>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedLecturerId}
            onChange={(e) => {
              setSelectedLecturerId(e.target.value);
              setPage(0);
            }}
            className="w-full sm:w-56 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Lecturers</option>
            {lecturers.map((l) => (
              <option key={l.id} value={l.id}>
                {l.fullName} ({l.staffId})
              </option>
            ))}
          </select>

          <select
            value={selectedModuleId}
            onChange={(e) => {
              setSelectedModuleId(e.target.value);
              setPage(0);
            }}
            className="w-full sm:w-56 px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
          >
            <option value="">All Modules</option>
            {modules.map((m) => (
              <option key={m.id} value={m.id}>
                {m.moduleCode} - {m.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={fetchAssignments}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors self-end sm:self-auto"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={assignments}
        loading={loading}
        emptyMessage="No lecturer assignments found"
        emptySubtext={
          selectedLecturerId || selectedModuleId
            ? 'No records match the current filter criteria.'
            : 'Assign a lecturer to a module to authorize them for conducting lab sessions.'
        }
        actionButton={
          !selectedLecturerId &&
          !selectedModuleId && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Assign Lecturer
            </button>
          )
        }
      />

      {/* Pagination */}
      <Pagination
        pageNumber={page}
        totalPages={totalPages}
        totalElements={totalElements}
        pageSize={10}
        onPageChange={(newPage) => setPage(newPage)}
      />

      {/* Add Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Assign Lecturer to Module"
        subtitle="Authorize an instructor to manage laboratory sessions for this course"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Lecturer <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.lecturerId}
              onChange={(e) => setFormData({ ...formData, lecturerId: e.target.value })}
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                formErrors.lecturerId
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            >
              <option value="">Select an instructor</option>
              {lecturers.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.fullName} ({l.staffId}) - {l.department}
                </option>
              ))}
            </select>
            {formErrors.lecturerId && (
              <p className="text-xs text-rose-400 mt-1">{formErrors.lecturerId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Course Module <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.moduleId}
              onChange={(e) => setFormData({ ...formData, moduleId: e.target.value })}
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                formErrors.moduleId
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            >
              <option value="">Select a module</option>
              {modules.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.moduleCode} - {m.name}
                </option>
              ))}
            </select>
            {formErrors.moduleId && (
              <p className="text-xs text-rose-400 mt-1">{formErrors.moduleId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Target Student Batch (Optional)
            </label>
            <select
              value={formData.batchId}
              onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Batches</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchCode} ({b.degreeProgrammeCode})
                </option>
              ))}
            </select>
          </div>

          {formData.batchId && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Target Lab Group (Optional)
              </label>
              <select
                value={formData.labGroupId || ''}
                onChange={(e) => setFormData({ ...formData, labGroupId: e.target.value })}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="">Whole Batch (All Groups)</option>
                {batchGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    Group {g.groupName} ({g.studentCount || 0} students)
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                A null group assigns the lecturer to the whole batch, allowing session creation for all groups or the entire cohort.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Academic Year <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="e.g. 2024"
                disabled={submitting}
                className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  formErrors.academicYear
                    ? 'border-rose-500/50 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {formErrors.academicYear && (
                <p className="text-xs text-rose-400 mt-1">{formErrors.academicYear}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Semester <span className="text-rose-400">*</span>
              </label>
              <select
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
                <option value="3">Special / Summer Term</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              {submitting && <RefreshCw className="w-4 h-4 animate-spin" />}
              Assign Lecturer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
