import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, BookOpen, RefreshCw } from 'lucide-react';
import { moduleService, degreeProgrammeService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal, StatusBadge } from '../../components/common';

export default function ModulesPage() {
  const { showToast } = useToast();

  const [modules, setModules] = useState([]);
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
    moduleCode: '',
    name: '',
    degreeProgrammeId: '',
    academicYear: '',
    semester: '1',
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

  const fetchModules = useCallback(async () => {
    try {
      setLoading(true);
      const res = await moduleService.getModules({
        programmeId: selectedProgrammeId || undefined,
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'moduleCode',
        sortDir: 'asc',
      });
      if (res.success && res.data) {
        setModules(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load modules', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedProgrammeId, search, page, showToast]);

  useEffect(() => {
    loadProgrammes();
  }, [loadProgrammes]);

  useEffect(() => {
    fetchModules();
  }, [fetchModules]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      moduleCode: '',
      name: '',
      degreeProgrammeId: programmes[0]?.id || '',
      academicYear: new Date().getFullYear().toString(),
      semester: '1',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      moduleCode: item.moduleCode || '',
      name: item.name || '',
      degreeProgrammeId: item.degreeProgrammeId || '',
      academicYear: item.academicYear || '',
      semester: item.semester || '1',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await moduleService.toggleStatus(item.id);
      showToast(res.message || 'Module status updated', 'success');
      fetchModules();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.moduleCode.trim()) errors.moduleCode = 'Module code is required';
    if (!formData.name.trim()) errors.name = 'Module name is required';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        moduleCode: formData.moduleCode.trim(),
        name: formData.name.trim(),
        degreeProgrammeId: formData.degreeProgrammeId || null,
        academicYear: formData.academicYear ? formData.academicYear.trim() : null,
        semester: formData.semester ? formData.semester.trim() : null,
      };

      if (editingItem) {
        await moduleService.updateModule(editingItem.id, payload);
        showToast('Module updated successfully', 'success');
      } else {
        await moduleService.createModule(payload);
        showToast('Module created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchModules();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'moduleCode',
      header: 'Module Code',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-900/40">
          {row.moduleCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Module Name',
      render: (row) => (
        <span className="font-medium text-slate-100">{row.name}</span>
      ),
    },
    {
      key: 'degreeProgramme',
      header: 'Degree Programme',
      render: (row) => row.degreeProgrammeCode ? (
        <div>
          <span className="text-slate-200">{row.degreeProgrammeCode}</span>
          <p className="text-xs text-slate-400">{row.degreeProgrammeName}</p>
        </div>
      ) : (
        <span className="text-slate-500">—</span>
      ),
    },
    {
      key: 'schedule',
      header: 'Curriculum Period',
      render: (row) => (
        <span className="text-xs font-medium text-slate-300">
          {row.academicYear ? `Year ${row.academicYear}` : ''}
          {row.semester ? ` • Sem ${row.semester}` : ''}
          {!row.academicYear && !row.semester ? '—' : ''}
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
            onClick={() => handleOpenEdit(row)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Edit Module"
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
            <BookOpen className="w-7 h-7 text-indigo-400" />
            Modules & Courses
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage academic course units and semester configurations
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Module
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
            placeholder="Search by code or name..."
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
          onClick={fetchModules}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors self-end sm:self-auto"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={modules}
        loading={loading}
        emptyMessage="No academic modules found"
        emptySubtext={
          search || selectedProgrammeId
            ? 'Try adjusting your search criteria.'
            : 'Add course modules to begin scheduling lab sessions.'
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
              Create Module
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
        title={editingItem ? 'Edit Module' : 'Add Module'}
        subtitle={editingItem ? `Updating ${editingItem.moduleCode}` : 'Configure course unit details and curriculum placement'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Module Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.moduleCode}
              onChange={(e) => setFormData({ ...formData, moduleCode: e.target.value.toUpperCase() })}
              placeholder="e.g. CS202"
              disabled={submitting}
              className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                formErrors.moduleCode
                  ? 'border-rose-500/50 focus:ring-rose-500/20'
                  : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
            {formErrors.moduleCode && (
              <p className="text-xs text-rose-400 mt-1">{formErrors.moduleCode}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Module Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Object-Oriented Software Engineering"
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
              Degree Programme (Optional)
            </label>
            <select
              value={formData.degreeProgrammeId}
              onChange={(e) => setFormData({ ...formData, degreeProgrammeId: e.target.value })}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">No specific programme</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Academic Year
              </label>
              <input
                type="text"
                value={formData.academicYear}
                onChange={(e) => setFormData({ ...formData, academicYear: e.target.value })}
                placeholder="e.g. 2"
                disabled={submitting}
                className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Semester
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
              {editingItem ? 'Save Changes' : 'Create Module'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
