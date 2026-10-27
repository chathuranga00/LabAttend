import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, GraduationCap, RefreshCw } from 'lucide-react';
import { degreeProgrammeService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal, StatusBadge } from '../../components/common';

export default function DegreeProgrammesPage() {
  const { showToast } = useToast();

  const [programmes, setProgrammes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({ code: '', name: '', department: '' });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchProgrammes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await degreeProgrammeService.getProgrammes({
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'code',
        sortDir: 'asc',
      });
      if (res.success && res.data) {
        setProgrammes(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load degree programmes', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, showToast]);

  useEffect(() => {
    fetchProgrammes();
  }, [fetchProgrammes]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ code: '', name: '', department: '' });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      code: item.code || '',
      name: item.name || '',
      department: item.department || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await degreeProgrammeService.toggleStatus(item.id);
      showToast(res.message || 'Status updated successfully', 'success');
      fetchProgrammes();
    } catch (err) {
      showToast(err.message || 'Failed to change status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.code.trim()) errors.code = 'Programme code is required';
    if (!formData.name.trim()) errors.name = 'Programme name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      if (editingItem) {
        await degreeProgrammeService.updateProgramme(editingItem.id, formData);
        showToast('Degree programme updated successfully', 'success');
      } else {
        await degreeProgrammeService.createProgramme(formData);
        showToast('Degree programme created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchProgrammes();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'code',
      header: 'Programme Code',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-900/40">
          {row.code}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Programme Name',
      render: (row) => <span className="font-medium text-slate-100">{row.name}</span>,
    },
    {
      key: 'department',
      header: 'Department / Faculty',
      render: (row) => row.department || <span className="text-slate-500">—</span>,
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
            title="Edit Programme"
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
            <GraduationCap className="w-7 h-7 text-indigo-400" />
            Degree Programmes
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Configure academic degree paths, faculties, and departments
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Programme
        </button>
      </div>

      {/* Filter and Action Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/60 p-4 rounded-2xl border border-slate-800/80">
        <SearchBar
          value={search}
          onChange={(val) => {
            setSearch(val);
            setPage(0);
          }}
          placeholder="Search by code or name..."
        />

        <button
          type="button"
          onClick={fetchProgrammes}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors self-end sm:self-auto"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={programmes}
        loading={loading}
        emptyMessage="No degree programmes found"
        emptySubtext={search ? 'Try adjusting your search query.' : 'Add your first university degree programme to get started.'}
        actionButton={
          !search && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Programme
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
        title={editingItem ? 'Edit Degree Programme' : 'Add Degree Programme'}
        subtitle={editingItem ? `Updating ${editingItem.code}` : 'Register a new institutional degree programme'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Programme Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="e.g. BSC-CS"
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                formErrors.code
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {formErrors.code && <p className="text-xs text-rose-400 mt-1">{formErrors.code}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Programme Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Bachelor of Science in Computer Science"
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                formErrors.name
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {formErrors.name && <p className="text-xs text-rose-400 mt-1">{formErrors.name}</p>}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Department / Faculty
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. Faculty of Computing"
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
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
              {editingItem ? 'Save Changes' : 'Create Programme'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
