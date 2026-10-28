import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Edit2, Users, RefreshCw, Filter, Layers, Split, Check, Sparkles } from 'lucide-react';
import { batchService, degreeProgrammeService, labGroupService } from '../../services/academicService';
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

  // Lab Groups State
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [selectedBatchForGroups, setSelectedBatchForGroups] = useState(null);
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);
  const [editingGroupName, setEditingGroupName] = useState('');

  // Auto Split State
  const [isAutoSplitOpen, setIsAutoSplitOpen] = useState(false);
  const [autoSplitForm, setAutoSplitForm] = useState({
    numberOfGroups: 2,
    splitMethod: 'ALPHABETICAL',
    customGroupNames: '',
  });
  const [autoSplitPreview, setAutoSplitPreview] = useState(null);
  const [previewingSplit, setPreviewingSplit] = useState(false);
  const [confirmingSplit, setConfirmingSplit] = useState(false);

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
      degreeProgrammeId: '',
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

  const fetchGroupsForBatch = async (batchId) => {
    try {
      setLoadingGroups(true);
      const res = await labGroupService.getGroupsByBatch(batchId);
      if (res.success && res.data) {
        setGroups(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load lab groups', 'error');
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleOpenGroups = (batch) => {
    setSelectedBatchForGroups(batch);
    setNewGroupName('');
    setEditingGroupId(null);
    setIsGroupModalOpen(true);
    fetchGroupsForBatch(batch.id);
  };

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) {
      showToast('Group name is required (e.g. A, B, C)', 'error');
      return;
    }
    try {
      setCreatingGroup(true);
      await labGroupService.createGroup(selectedBatchForGroups.id, {
        groupName: newGroupName.trim().toUpperCase(),
      });
      showToast('Lab group created successfully', 'success');
      setNewGroupName('');
      fetchGroupsForBatch(selectedBatchForGroups.id);
    } catch (err) {
      showToast(err.message || 'Failed to create group', 'error');
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleStartRenameGroup = (group) => {
    setEditingGroupId(group.id);
    setEditingGroupName(group.groupName);
  };

  const handleSaveRenameGroup = async (groupId) => {
    if (!editingGroupName.trim()) {
      showToast('Group name cannot be empty', 'error');
      return;
    }
    try {
      await labGroupService.updateGroup(groupId, {
        groupName: editingGroupName.trim().toUpperCase(),
      });
      showToast('Group renamed successfully', 'success');
      setEditingGroupId(null);
      fetchGroupsForBatch(selectedBatchForGroups.id);
    } catch (err) {
      showToast(err.message || 'Failed to rename group', 'error');
    }
  };

  const handleToggleGroupStatus = async (groupId) => {
    try {
      const res = await labGroupService.toggleStatus(groupId);
      showToast(res.message || 'Group status updated', 'success');
      fetchGroupsForBatch(selectedBatchForGroups.id);
    } catch (err) {
      showToast(err.message || 'Failed to update status', 'error');
    }
  };

  const handleOpenAutoSplit = () => {
    setAutoSplitForm({
      numberOfGroups: 2,
      splitMethod: 'ALPHABETICAL',
      customGroupNames: '',
    });
    setAutoSplitPreview(null);
    setIsAutoSplitOpen(true);
  };

  const handlePreviewSplit = async () => {
    try {
      setPreviewingSplit(true);
      const payload = {
        numberOfGroups: parseInt(autoSplitForm.numberOfGroups, 10),
        splitMethod: autoSplitForm.splitMethod,
        customGroupNames: autoSplitForm.customGroupNames
          ? autoSplitForm.customGroupNames.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
      };
      const res = await labGroupService.previewAutoSplit(selectedBatchForGroups.id, payload);
      if (res.success && res.data) {
        setAutoSplitPreview(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to generate split preview', 'error');
    } finally {
      setPreviewingSplit(false);
    }
  };

  const handleConfirmSplit = async () => {
    try {
      setConfirmingSplit(true);
      const payload = {
        numberOfGroups: parseInt(autoSplitForm.numberOfGroups, 10),
        splitMethod: autoSplitForm.splitMethod,
        customGroupNames: autoSplitForm.customGroupNames
          ? autoSplitForm.customGroupNames.split(',').map((s) => s.trim()).filter(Boolean)
          : null,
      };
      const res = await labGroupService.confirmAutoSplit(selectedBatchForGroups.id, payload);
      showToast(res.message || 'Batch auto-split confirmed and saved!', 'success');
      setIsAutoSplitOpen(false);
      fetchGroupsForBatch(selectedBatchForGroups.id);
    } catch (err) {
      showToast(err.message || 'Failed to confirm auto-split', 'error');
    } finally {
      setConfirmingSplit(false);
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
      header: 'Scope / Programme',
      render: (row) => (
        <div>
          {row.degreeProgrammeName ? (
            <>
              {row.degreeProgrammeCode && (
                <span className="font-medium text-slate-100">{row.degreeProgrammeCode} - </span>
              )}
              <span className="text-xs text-slate-300">{row.degreeProgrammeName}</span>
            </>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
              University-Wide (All Degrees)
            </span>
          )}
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
            onClick={() => handleOpenGroups(row)}
            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded-lg transition-colors"
            title="Manage Lab Groups"
          >
            <Layers className="w-4 h-4" />
          </button>
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
                  {p.code ? `${p.code} - ` : ''}{p.name}
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
          <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl text-xs text-emerald-300 leading-relaxed">
            <span className="font-semibold">💡 University-Wide Cohort: </span>
            <span>Batches without a degree programme are university-wide cohorts. A batch code like <strong className="text-white">2026.3</strong> is already active university-wide and is automatically available to all degree programmes (including Data Science).</span>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Degree Programme <span className="text-slate-500 font-normal lowercase">(optional - leave blank for university-wide batch)</span>
            </label>
            <select
              value={formData.degreeProgrammeId}
              onChange={(e) => setFormData({ ...formData, degreeProgrammeId: e.target.value })}
              disabled={submitting}
              className="w-full px-3.5 py-2.5 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            >
              <option value="">University-Wide (All Degree Programmes)</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} - ` : ''}{p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              Batch Code <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={formData.batchCode}
              onChange={(e) => {
                setFormData({ ...formData, batchCode: e.target.value.toUpperCase() });
                if (formErrors.batchCode) setFormErrors((prev) => ({ ...prev, batchCode: null }));
              }}
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
              onChange={(e) => {
                setFormData({ ...formData, academicYear: e.target.value });
                if (formErrors.academicYear) setFormErrors((prev) => ({ ...prev, academicYear: null }));
              }}
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

      {/* Manage Lab Groups Modal */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title={`Lab Groups — ${selectedBatchForGroups?.batchCode || ''}`}
        subtitle="Organize batch students into laboratory subdivisions"
      >
        <div className="space-y-5">
          {/* Top Banner & Auto Split Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-indigo-950/30 border border-indigo-900/40 rounded-xl">
            <div>
              <p className="text-xs font-semibold text-indigo-300">Need to divide this cohort automatically?</p>
              <p className="text-[11px] text-slate-400">Evenly split active students alphabetically or by student ID</p>
            </div>
            <button
              type="button"
              onClick={handleOpenAutoSplit}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow transition-all shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Auto-Split Cohort
            </button>
          </div>

          {/* Add New Group Form */}
          <form onSubmit={handleCreateGroup} className="flex gap-2">
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value.toUpperCase())}
              placeholder="e.g. Group A, Group B..."
              maxLength={50}
              disabled={creatingGroup}
              className="flex-1 px-3.5 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-medium"
            />
            <button
              type="submit"
              disabled={creatingGroup || !newGroupName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all shadow"
            >
              {creatingGroup ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add Group
            </button>
          </form>

          {/* Groups List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {loadingGroups ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading lab groups...</div>
            ) : groups.length === 0 ? (
              <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                No lab groups created yet for this batch. Add groups above or use Auto-Split.
              </div>
            ) : (
              groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center justify-between p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl hover:border-slate-700/80 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {editingGroupId === group.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={editingGroupName}
                          onChange={(e) => setEditingGroupName(e.target.value.toUpperCase())}
                          className="px-2.5 py-1 bg-slate-900 border border-indigo-500 rounded-lg text-xs font-bold text-white focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleSaveRenameGroup(group.id)}
                          className="p-1 text-emerald-400 hover:bg-emerald-950/50 rounded"
                          title="Save"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingGroupId(null)}
                          className="p-1 text-slate-400 hover:bg-slate-800 rounded"
                          title="Cancel"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-0.5 rounded text-xs">
                          Group {group.groupName}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleStartRenameGroup(group)}
                          className="p-1 text-slate-500 hover:text-slate-300 rounded"
                          title="Rename"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    <span className="text-xs text-slate-400">
                      <strong className="text-slate-200">{group.studentCount || 0}</strong> students
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusBadge
                      isActive={group.isActive}
                      onClick={() => handleToggleGroupStatus(group.id)}
                    />
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex justify-end">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>

      {/* Auto Split Cohort Modal */}
      <Modal
        isOpen={isAutoSplitOpen}
        onClose={() => setIsAutoSplitOpen(false)}
        title="Auto-Split Cohort into Lab Groups"
        subtitle={`Batch: ${selectedBatchForGroups?.batchCode || ''}`}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Number of Groups <span className="text-rose-400">*</span>
              </label>
              <select
                value={autoSplitForm.numberOfGroups}
                onChange={(e) => setAutoSplitForm({ ...autoSplitForm, numberOfGroups: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                {[2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <option key={n} value={n}>
                    {n} Groups
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Split Criteria <span className="text-rose-400">*</span>
              </label>
              <select
                value={autoSplitForm.splitMethod}
                onChange={(e) => setAutoSplitForm({ ...autoSplitForm, splitMethod: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              >
                <option value="ALPHABETICAL">Alphabetical (by Full Name)</option>
                <option value="STUDENT_ID">Student ID Range</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Custom Group Names <span className="text-slate-500 font-normal">(Optional, comma-separated)</span>
            </label>
            <input
              type="text"
              value={autoSplitForm.customGroupNames}
              onChange={(e) => setAutoSplitForm({ ...autoSplitForm, customGroupNames: e.target.value })}
              placeholder="e.g. A, B, C or G1, G2, G3"
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          <div className="flex justify-start">
            <button
              type="button"
              onClick={handlePreviewSplit}
              disabled={previewingSplit}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow transition disabled:opacity-50"
            >
              {previewingSplit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Generate Preview
            </button>
          </div>

          {/* Preview Details */}
          {autoSplitPreview && (
            <div className="p-4 bg-slate-950/70 border border-indigo-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">
                  Total Eligible Active Students: <strong className="text-white">{autoSplitPreview.totalEligibleStudents}</strong>
                </span>
                <span className="text-indigo-400 font-medium">
                  {autoSplitPreview.numberOfGroups} Groups ({autoSplitPreview.splitMethod})
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {autoSplitPreview.groups.map((grp) => (
                  <div key={grp.groupName} className="p-2.5 bg-slate-900/90 border border-slate-800 rounded-lg">
                    <div className="flex items-center justify-between text-xs font-bold text-white mb-1">
                      <span className="text-indigo-300">Group {grp.groupName}</span>
                      <span className="text-slate-400 font-normal">{grp.studentCount} students</span>
                    </div>
                    {grp.studentNames && grp.studentNames.length > 0 && (
                      <p className="text-[11px] text-slate-400 truncate">
                        {grp.studentNames.slice(0, 3).join(', ')}
                        {grp.studentNames.length > 3 ? ` +${grp.studentNames.length - 3} more` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsAutoSplitOpen(false)}
              disabled={confirmingSplit}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmSplit}
              disabled={confirmingSplit || !autoSplitPreview}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-40 transition"
            >
              {confirmingSplit && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Confirm & Save Split
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
