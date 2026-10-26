import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit2, 
  KeyRound, 
  BookOpen, 
  Users, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldAlert, 
  UserCheck, 
  UserX,
  Building
} from 'lucide-react';
import { lecturerService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal, StatusBadge } from '../../components/common';

export default function LecturersPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter states
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [search, setSearch] = useState('');

  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  // Create / Edit Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    staffId: '',
    fullName: '',
    email: '',
    department: '',
    initialPassword: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Temporary password display modal (after creation or reset)
  const [tempPassModal, setTempPassModal] = useState({
    isOpen: false,
    title: '',
    email: '',
    tempPassword: '',
    message: '',
  });
  const [copied, setCopied] = useState(false);

  const fetchLecturers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        department: departmentFilter.trim() || undefined,
        isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'staffId',
        sortDir: 'asc',
      };
      const res = await lecturerService.getLecturers(params);
      if (res.success && res.data) {
        setLecturers(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load lecturers', 'error');
    } finally {
      setLoading(false);
    }
  }, [departmentFilter, selectedStatus, search, page, showToast]);

  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({
      staffId: '',
      fullName: '',
      email: '',
      department: '',
      initialPassword: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      staffId: item.staffId || '',
      fullName: item.fullName || '',
      email: item.email || '',
      department: item.department || '',
      initialPassword: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.staffId.trim()) errs.staffId = 'Staff ID is required';
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (!editingItem) {
      if (!formData.email.trim()) {
        errs.email = 'Email address is required';
      } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        errs.email = 'Invalid email address';
      }
    }
    if (!formData.department.trim()) errs.department = 'Department is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      if (editingItem) {
        const payload = {
          staffId: formData.staffId.trim(),
          fullName: formData.fullName.trim(),
          department: formData.department.trim(),
        };
        await lecturerService.updateLecturer(editingItem.id, payload);
        showToast('Lecturer details updated successfully', 'success');
        setIsModalOpen(false);
        fetchLecturers();
      } else {
        const payload = {
          staffId: formData.staffId.trim(),
          fullName: formData.fullName.trim(),
          email: formData.email.trim(),
          department: formData.department.trim(),
          initialPassword: formData.initialPassword.trim() || null,
        };
        const res = await lecturerService.createLecturer(payload);
        showToast('Lecturer account provisioned successfully', 'success');
        setIsModalOpen(false);
        fetchLecturers();

        // Show Temporary Password modal
        if (res.data?.temporaryPassword) {
          setTempPassModal({
            isOpen: true,
            title: 'Lecturer Provisioned — Temporary Access Credentials',
            email: res.data.email,
            tempPassword: res.data.temporaryPassword,
            message: 'Provide this one-time temporary password to the lecturer. They will be forced to change it upon first login.',
          });
        }
      }
    } catch (err) {
      showToast(err.message || 'Operation failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (item) => {
    try {
      const res = await lecturerService.toggleStatus(item.id);
      showToast(res.message || 'Lecturer status updated', 'success');
      fetchLecturers();
    } catch (err) {
      showToast(err.message || 'Failed to update lecturer status', 'error');
    }
  };

  const handleResetAccess = async (item) => {
    if (!window.confirm(`Reset access for ${item.fullName} (${item.email})? A new temporary password will be generated, and password change will be enforced.`)) {
      return;
    }

    try {
      const res = await lecturerService.resetAccess(item.id);
      showToast(res.message || 'Access reset successfully', 'success');
      fetchLecturers();

      if (res.data?.temporaryPassword) {
        setTempPassModal({
          isOpen: true,
          title: 'Access Credentials Reset',
          email: res.data.email,
          tempPassword: res.data.temporaryPassword,
          message: 'The password has been reset. Forced password change has been enabled for this lecturer.',
        });
      }
    } catch (err) {
      showToast(err.message || 'Failed to reset access credentials', 'error');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const columns = [
    {
      header: 'Staff ID',
      accessor: 'staffId',
      render: (item) => (
        <span className="font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-xs">
          {item.staffId}
        </span>
      ),
    },
    {
      header: 'Lecturer Details',
      accessor: 'fullName',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-100 block">{item.fullName}</span>
          <span className="text-xs text-slate-400">{item.email}</span>
        </div>
      ),
    },
    {
      header: 'Department',
      accessor: 'department',
      render: (item) => (
        <span className="inline-flex items-center gap-1.5 text-xs text-slate-300">
          <Building className="h-3.5 w-3.5 text-slate-400" />
          {item.department}
        </span>
      ),
    },
    {
      header: 'Security / Login State',
      accessor: 'mustChangePassword',
      render: (item) => (
        item.mustChangePassword ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-950/60 border border-amber-800/50 text-amber-400">
            Forced Password Reset
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
            Password Verified
          </span>
        )
      ),
    },
    {
      header: 'Status',
      accessor: 'isActive',
      render: (item) => (
        <StatusBadge 
          isActive={item.isActive} 
          onClick={() => handleToggleStatus(item)} 
        />
      ),
    },
    {
      header: 'Actions',
      accessor: 'actions',
      render: (item) => (
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => navigate(`/admin/assignments?lecturerId=${item.id}`)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-teal-400 transition"
            title="Assign / View Modules & Batches"
          >
            <BookOpen className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleResetAccess(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 transition"
            title="Reset Access Credentials (Issue Temporary Password)"
          >
            <KeyRound className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Edit Lecturer Details"
          >
            <Edit2 className="h-4 w-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-semibold tracking-wider uppercase mb-1">
            <Users className="h-4 w-4" />
            <span>Faculty Management</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Lecturers</h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage academic staff profiles, conduct secure one-time invitations, and enforce credential resets.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition self-start md:self-auto"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Lecturer</span>
        </button>
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
            placeholder="Search by staff ID, name, or email..."
          />
        </div>

        <div className="w-full md:w-60">
          <input
            type="text"
            value={departmentFilter}
            onChange={(e) => {
              setDepartmentFilter(e.target.value);
              setPage(0);
            }}
            placeholder="Filter by department..."
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="w-full md:w-40">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="inactive">Inactive Only</option>
          </select>
        </div>

        {(departmentFilter || selectedStatus || search) && (
          <button
            onClick={() => {
              setDepartmentFilter('');
              setSelectedStatus('');
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

      {/* Lecturers Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <DataTable
          columns={columns}
          data={lecturers}
          loading={loading}
          emptyMessage="No lecturers found matching current filter criteria."
        />

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalElements={totalElements}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Create / Edit Lecturer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Lecturer Details' : 'Provision Lecturer Account'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Staff ID *
            </label>
            <input
              type="text"
              value={formData.staffId}
              onChange={(e) => setFormData({ ...formData, staffId: e.target.value })}
              placeholder="e.g. LEC-104"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono uppercase"
            />
            {formErrors.staffId && (
              <span className="text-xs text-rose-400 mt-1 block">{formErrors.staffId}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Full Legal Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              placeholder="e.g. Dr. Kusal Mendis"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            {formErrors.fullName && (
              <span className="text-xs text-rose-400 mt-1 block">{formErrors.fullName}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Institutional Email Address *
            </label>
            <input
              type="email"
              disabled={!!editingItem}
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. kmendis@uni.ac.lk"
              className={`w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 ${
                editingItem ? 'opacity-60 cursor-not-allowed' : ''
              }`}
            />
            {editingItem && (
              <span className="text-[11px] text-slate-500 mt-1 block">
                Email address is tied to authentication credentials and cannot be edited directly.
              </span>
            )}
            {formErrors.email && (
              <span className="text-xs text-rose-400 mt-1 block">{formErrors.email}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Department / Faculty *
            </label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              placeholder="e.g. Department of Software Engineering"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            {formErrors.department && (
              <span className="text-xs text-rose-400 mt-1 block">{formErrors.department}</span>
            )}
          </div>

          {!editingItem && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Custom Temporary Password (Optional)
              </label>
              <input
                type="text"
                value={formData.initialPassword}
                onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                placeholder="Leave blank to auto-generate a secure 12-char random token"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono text-xs"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                The lecturer will be forced to change this temporary password immediately upon their first login.
              </span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-semibold transition"
            >
              {submitting ? 'Saving...' : editingItem ? 'Update Lecturer' : 'Provision Lecturer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Temporary Password Display Modal */}
      <Modal
        isOpen={tempPassModal.isOpen}
        onClose={() => setTempPassModal({ ...tempPassModal, isOpen: false })}
        title={tempPassModal.title}
      >
        <div className="space-y-4">
          <div className="p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl">
            <span className="text-xs font-semibold text-emerald-400 block mb-1">
              Account provisioned for: {tempPassModal.email}
            </span>
            <p className="text-xs text-slate-300">
              {tempPassModal.message}
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              One-Time Temporary Password
            </label>
            <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-xl p-2.5">
              <span className="font-mono text-base font-bold text-emerald-400 flex-1 select-all px-1">
                {tempPassModal.tempPassword}
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(tempPassModal.tempPassword)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold transition"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 stroke-[2.5]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-amber-400 mt-2 flex items-center gap-1.5">
              <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
              <span>Copy and securely transmit this credential now. It will not be shown again.</span>
            </p>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setTempPassModal({ ...tempPassModal, isOpen: false })}
              className="px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-sm font-semibold transition"
            >
              Done
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
