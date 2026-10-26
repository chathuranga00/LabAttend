import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Users, RefreshCw, Filter } from 'lucide-react';
import { batchService, degreeProgrammeService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal, StatusBadge } from '../../components/common';

export default function BatchesPage() {
  const { showToast } = useToast();

  const [batches, setBatches] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    batchCode: '',
    academicYear: '',
    degreeProgrammeId: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Load degree programmes for dropdown filters
  const loadProgrammes = useCallback(async () => {
    try {
      const res = await degreeProgrammeService.getProgrammes({ size: 100 });
      if (res.success && res.data) {
        setProgrammes(res.data.content || []);
      }
    } catch (err) {
      console.error('Failed to load programmes', err);
    }
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await batchService.getBatches({
        programmeId: selectedProgrammeId || undefined,
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'batchCode',
        sortDir: 'asc',
      });
      if (res.success && res.data) {
        setBatches(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load batches', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedProgrammeId, search, page, showToast]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      batchCode: '',
      academicYear: new Date().getFullYear().toString(),
      degreeProgrammeId: programmes[0]?.id || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      batchCode: item.batchCode || '',
      academicYear: item.academicYear || '',
      degreeProgrammeId: item.degreeProgrammeId || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await batchService.toggleStatus(item.id);
      showToast(res.message || 'Batch status updated', 'success');
      fetchBatches();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.batchCode.trim()) errors.batchCode = 'Batch code is required';
    if (!formData.academicYear.trim()) errors.academicYear = 'Academic year is required';
    if (!formData.degreeProgrammeId) errors.degreeProgrammeId = 'Degree programme is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await batchService.updateBatch(editingItem.id, formData);
        showToast('Batch updated successfully', 'success');
      } else {
        await batchService.createBatch(formData);
        showToast('Batch created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchBatches();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'batchCode',
      header: 'Batch Code',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-900/40">
          {row.batchCode}
        </span>
      ),
    },
    {
      key: 'degreeProgramme',
      header: 'Degree Programme',
      render: (row) => (
        <div>
          <span className="font-medium text-slate-100">{row.degreeProgrammeCode}</span>
          <p className="text-xs text-slate-400">{row.degreeProgrammeName}</p>
        </div>
      ),
    },
    {
      key: 'academicYear',
      header: 'Academic Year',
      render: (row) => <span className="text-slate-200">{row.academicYear}</span>,
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
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Edit Batch"
          >
            <Edit2 className="w-4 h-4" />
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
            <Users className="w-7 h-7 text-indigo-400" />
            Student Batches
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage student cohorts linked to degree programmes and academic years
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Batch
        </button>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(0);
            }}
            placeholder="Search by batch code or year..."
          />

          <div className="relative w-full sm:w-60">
            <select
              value={selectedProgrammeId}
              onChange={(e) => {
                setSelectedProgrammeId(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">All Degree Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchBatches}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors self-end sm:self-auto"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={batches}
        loading={loading}
        emptyMessage="No student batches found"
        emptySubtext={
          search || selectedProgrammeId
            ? 'Try clearing your filters.'
            : 'Register your first student batch to begin organizing student rosters.'
        }
        actionButton={
          !search &&
          !selectedProgrammeId && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Batch
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Batch' : 'Add Student Batch'}
        subtitle={editingItem ? `Updating ${editingItem.batchCode}` : 'Create a cohort for a specific degree programme'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Degree Programme <span className="text-rose-400">*</span>
            </label>
            <select
              value={formData.degreeProgrammeId}
              onChange={(e) => setFormData({ ...formData, degreeProgrammeId: e.target.value })}
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                formErrors.degreeProgrammeId
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            >
              <option value="">Select a programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
            {formErrors.degreeProgrammeId && (
              <p className="text-xs text-rose-400 mt-1">{formErrors.degreeProgrammeId}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Batch Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.batchCode}
              onChange={(e) => setFormData({ ...formData, batchCode: e.target.value.toUpperCase() })}
              placeholder="e.g. Y3S1-CS-2024"
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                formErrors.batchCode
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {formErrors.batchCode && <p className="text-xs text-rose-400 mt-1">{formErrors.batchCode}</p>}
          </div>

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
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                formErrors.academicYear
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {formErrors.academicYear && (
              <p className="text-xs text-rose-400 mt-1">{formErrors.academicYear}</p>
            )}
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
              {editingItem ? 'Save Changes' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
