import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Building2, RefreshCw, MapPin } from 'lucide-react';
import { laboratoryHallService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal, StatusBadge } from '../../components/common';

export default function LaboratoryHallsPage() {
  const { showToast } = useToast();

  const [halls, setHalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    hallCode: '',
    name: '',
    capacity: 40,
    location: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const fetchHalls = useCallback(async () => {
    try {
      setLoading(true);
      const res = await laboratoryHallService.getHalls({
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'hallCode',
        sortDir: 'asc',
      });
      if (res.success && res.data) {
        setHalls(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load laboratory halls', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, page, showToast]);

  useEffect(() => {
    fetchHalls();
  }, [fetchHalls]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      hallCode: '',
      name: '',
      capacity: 40,
      location: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      hallCode: item.hallCode || '',
      name: item.name || '',
      capacity: item.capacity || 40,
      location: item.location || '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await laboratoryHallService.toggleStatus(item.id);
      showToast(res.message || 'Hall status updated', 'success');
      fetchHalls();
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errors = {};
    if (!formData.hallCode.trim()) errors.hallCode = 'Hall code is required';
    if (!formData.name.trim()) errors.name = 'Hall name is required';
    if (!formData.capacity || formData.capacity < 1) errors.capacity = 'Capacity must be at least 1';

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        ...formData,
        capacity: parseInt(formData.capacity, 10),
      };

      if (editingItem) {
        await laboratoryHallService.updateHall(editingItem.id, payload);
        showToast('Laboratory hall updated successfully', 'success');
      } else {
        await laboratoryHallService.createHall(payload);
        showToast('Laboratory hall created successfully', 'success');
      }
      setIsModalOpen(false);
      fetchHalls();
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      key: 'hallCode',
      header: 'Hall Code',
      render: (row) => (
        <span className="font-mono font-semibold text-indigo-400 bg-indigo-950/40 px-2.5 py-1 rounded-md border border-indigo-900/40">
          {row.hallCode}
        </span>
      ),
    },
    {
      key: 'name',
      header: 'Hall Name',
      render: (row) => <span className="font-medium text-slate-100">{row.name}</span>,
    },
    {
      key: 'capacity',
      header: 'Seat Capacity',
      render: (row) => (
        <span className="inline-flex items-center gap-1 font-semibold text-slate-200 bg-slate-800/60 px-2 py-0.5 rounded text-xs border border-slate-700/50">
          {row.capacity} Workstations
        </span>
      ),
    },
    {
      key: 'location',
      header: 'Location / Floor',
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
          <MapPin className="w-3.5 h-3.5 text-slate-500" />
          {row.location || '—'}
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
            title="Edit Hall"
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
            <Building2 className="w-7 h-7 text-indigo-400" />
            Laboratory Halls
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage physical computer labs, workstation seating capacities, and room locations
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Hall
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
          placeholder="Search by code, name, or location..."
        />

        <button
          type="button"
          onClick={fetchHalls}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors self-end sm:self-auto"
          title="Refresh table"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
        </button>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={halls}
        loading={loading}
        emptyMessage="No laboratory halls found"
        emptySubtext={
          search
            ? 'No facilities match your search query.'
            : 'Add your first laboratory hall to enable scheduling.'
        }
        actionButton={
          !search && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-lg shadow transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Hall
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
        title={editingItem ? 'Edit Laboratory Hall' : 'Add Laboratory Hall'}
        subtitle={editingItem ? `Updating ${editingItem.hallCode}` : 'Configure facility code, workstation capacity, and room location'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Hall Code <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                value={formData.hallCode}
                onChange={(e) => setFormData({ ...formData, hallCode: e.target.value.toUpperCase() })}
                placeholder="e.g. LAB-01"
                disabled={submitting}
                className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
                  formErrors.hallCode
                    ? 'border-rose-500/50 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {formErrors.hallCode && (
                <p className="text-xs text-rose-400 mt-1">{formErrors.hallCode}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Capacity <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                disabled={submitting}
                className={`w-full px-3.5 py-2.5 bg-slate-950/70 border rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 transition-all ${
                  formErrors.capacity
                    ? 'border-rose-500/50 focus:ring-rose-500/20'
                    : 'border-slate-800 focus:ring-indigo-500/20 focus:border-indigo-500'
                }`}
              />
              {formErrors.capacity && (
                <p className="text-xs text-rose-400 mt-1">{formErrors.capacity}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Hall Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Advanced Networking Laboratory"
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
              Building & Room Location
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="e.g. Computing Complex, 3rd Floor, Room 304"
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
              {editingItem ? 'Save Changes' : 'Create Hall'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
