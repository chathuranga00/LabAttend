import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Upload, 
  Edit2, 
  Eye, 
  QrCode, 
  Users, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw, 
  X,
  ShieldAlert,
  Layers,
  Download,
  Printer,
  FileArchive,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { 
  studentService, 
  degreeProgrammeService, 
  batchService, 
  labGroupService,
  triggerBlobDownload
} from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { DataTable, Pagination, SearchBar, Modal, StatusBadge } from '../../components/common';

export const STANDARD_GROUPS = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E', 'Group F'];

export const formatGroupName = (name) => {
  if (!name) return '';
  return name.toLowerCase().startsWith('group ') ? name : `Group ${name}`;
};

export default function StudentsPage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [students, setStudents] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [batches, setBatches] = useState([]);
  const [filteredBatches, setFilteredBatches] = useState([]);

  // Filter states
  const [selectedProgrammeId, setSelectedProgrammeId] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [filterGroups, setFilterGroups] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedOfferedBy, setSelectedOfferedBy] = useState('');
  const [search, setSearch] = useState('');

  // Bulk Selection states
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [isBulkAssignModalOpen, setIsBulkAssignModalOpen] = useState(false);
  const [bulkBatchId, setBulkBatchId] = useState('');
  const [bulkGroupId, setBulkGroupId] = useState('');
  const [bulkGroupName, setBulkGroupName] = useState('');
  const [bulkBatchGroups, setBulkBatchGroups] = useState([]);
  const [bulkAssigning, setBulkAssigning] = useState(false);

  // Bulk QR Modal states
  const [isBulkQrModalOpen, setIsBulkQrModalOpen] = useState(false);
  const [bulkQrScope, setBulkQrScope] = useState('batch'); // 'batch' | 'selected'
  const [bulkQrBatchId, setBulkQrBatchId] = useState('');
  const [bulkQrGroupId, setBulkQrGroupId] = useState('');
  const [bulkQrBatchGroups, setBulkQrBatchGroups] = useState([]);
  const [bulkQrFormat, setBulkQrFormat] = useState('zip'); // 'zip' | 'pdf'
  const [bulkQrDownloading, setBulkQrDownloading] = useState(false);

  // Single QR Download Modal states
  const [singleQrModalStudent, setSingleQrModalStudent] = useState(null);
  const [downloadingSingleQrFormat, setDownloadingSingleQrFormat] = useState(null);

  // Delete states
  const [deletingStudent, setDeletingStudent] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // New Student Created Success State (QR Generated)
  const [newlyCreatedStudent, setNewlyCreatedStudent] = useState(null);
  const [createdQrPreviewUrl, setCreatedQrPreviewUrl] = useState(null);
  const [isCreatedSuccessModalOpen, setIsCreatedSuccessModalOpen] = useState(false);

  // Pagination states
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formGroups, setFormGroups] = useState([]);
  const [formData, setFormData] = useState({
    studentId: '',
    fullName: '',
    email: '',
    degreeProgrammeId: '',
    batchId: '',
    labGroupId: '',
    qrToken: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // CSV Import Modal state
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  // Load degree programmes
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

  // Load all batches
  const loadBatches = useCallback(async () => {
    try {
      const res = await batchService.getBatches({ size: 200 });
      if (res.success && res.data) {
        setBatches(res.data.content || []);
      }
    } catch (err) {
      console.error('Failed to load batches', err);
    }
  }, []);

  // Load groups when filter batch changes
  useEffect(() => {
    if (selectedBatchId) {
      labGroupService.getGroupsByBatch(selectedBatchId)
        .then((res) => {
          if (res.success && res.data) {
            setFilterGroups(res.data);
          }
        })
        .catch(() => setFilterGroups([]));
    } else {
      setFilterGroups([]);
      setSelectedGroupId('');
    }
  }, [selectedBatchId]);

  // Load groups for Add/Edit form when formData.batchId changes
  useEffect(() => {
    if (formData.batchId) {
      labGroupService.getGroupsByBatch(formData.batchId)
        .then((res) => {
          if (res.success && res.data) {
            setFormGroups(res.data);
          }
        })
        .catch(() => setFormGroups([]));
    } else {
      setFormGroups([]);
    }
  }, [formData.batchId]);

  // Fetch students
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        programmeId: selectedProgrammeId || undefined,
        batchId: selectedBatchId || undefined,
        labGroupId: selectedGroupId || undefined,
        isActive: selectedStatus === 'active' ? true : selectedStatus === 'inactive' ? false : undefined,
        offeredBy: selectedOfferedBy || undefined,
        search: search.trim() || undefined,
        page,
        size: 10,
        sortBy: 'studentId',
        sortDir: 'asc',
      };
      const res = await studentService.getStudents(params);
      if (res.success && res.data) {
        setStudents(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load students', 'error');
    } finally {
      setLoading(false);
    }
  }, [selectedProgrammeId, selectedBatchId, selectedGroupId, selectedStatus, selectedOfferedBy, search, page, showToast]);

  useEffect(() => {
    loadProgrammes();
    loadBatches();
  }, [loadProgrammes, loadBatches]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Update batch options when form degree programme changes
  useEffect(() => {
    if (formData.degreeProgrammeId) {
      const matching = batches.filter(b => !b.degreeProgrammeId || b.degreeProgrammeId === formData.degreeProgrammeId);
      setFilteredBatches(matching);
      if (matching.length > 0 && !matching.some(b => b.id === formData.batchId)) {
        setFormData(prev => ({ ...prev, batchId: matching[0].id }));
      }
    } else {
      setFilteredBatches(batches);
    }
  }, [formData.degreeProgrammeId, batches, formData.batchId]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    const firstProg = programmes[0]?.id || '';
    const matchingBatches = batches.filter(b => !b.degreeProgrammeId || b.degreeProgrammeId === firstProg);
    setFormData({
      studentId: '',
      title: 'Mr.',
      fullName: '',
      email: '',
      offeredBy: 'NSBM',
      degreeProgrammeId: firstProg,
      batchId: matchingBatches[0]?.id || (batches[0]?.id || ''),
      labGroupId: '',
      groupName: '',
      qrToken: '',
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      studentId: item.studentId || '',
      title: item.title || '',
      fullName: item.fullName || '',
      email: item.email || '',
      offeredBy: item.offeredBy || '',
      degreeProgrammeId: item.degreeProgrammeId || '',
      batchId: item.batchId || '',
      labGroupId: item.labGroupId || '',
      groupName: item.labGroupName ? formatGroupName(item.labGroupName) : '',
      qrToken: '', // Leave blank unless admin wants to overwrite the QR identifier
    });
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errs = {};
    if (!formData.studentId.trim()) errs.studentId = 'Student ID is required';
    if (!formData.fullName.trim()) errs.fullName = 'Full Name is required';
    if (formData.email.trim() && !/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Invalid email address format';
    }
    if (!formData.degreeProgrammeId) errs.degreeProgrammeId = 'Degree Programme is required';
    if (!formData.batchId) errs.batchId = 'Batch cohort is required';
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleDownloadSingleQr = async (studentItem, layout = 'standard') => {
    try {
      setDownloadingSingleQrFormat(layout);
      const res = await studentService.getQrCode(studentItem.id, layout);
      const blob = res.data || res;
      const filename = layout === 'sticker' 
        ? `${studentItem.studentId}_Sticker.png`
        : `${studentItem.studentId}_QR.png`;
      triggerBlobDownload(blob, filename);
      showToast(`${layout === 'sticker' ? 'Print-ready sticker' : 'QR code PNG'} downloaded`, 'success');
      setSingleQrModalStudent(null);
    } catch (err) {
      showToast(err.message || 'Failed to download QR code', 'error');
    } finally {
      setDownloadingSingleQrFormat(null);
    }
  };

  const handleOpenBulkQrModal = (scope = 'batch') => {
    setBulkQrScope(scope);
    const defaultBatch = selectedBatchId || batches[0]?.id || '';
    setBulkQrBatchId(defaultBatch);
    setBulkQrGroupId(selectedGroupId || '');
    setBulkQrFormat('zip');
    if (defaultBatch) {
      labGroupService.getGroupsByBatch(defaultBatch)
        .then(res => {
          if (res.success && res.data) setBulkQrBatchGroups(res.data);
        })
        .catch(() => setBulkQrBatchGroups([]));
    } else {
      setBulkQrBatchGroups([]);
    }
    setIsBulkQrModalOpen(true);
  };

  const handleBulkQrBatchChange = (batchId) => {
    setBulkQrBatchId(batchId);
    setBulkQrGroupId('');
    if (batchId) {
      labGroupService.getGroupsByBatch(batchId)
        .then(res => {
          if (res.success && res.data) setBulkQrBatchGroups(res.data);
        })
        .catch(() => setBulkQrBatchGroups([]));
    } else {
      setBulkQrBatchGroups([]);
    }
  };

  const handleDownloadBulkQr = async (e) => {
    e.preventDefault();
    if (bulkQrScope === 'batch' && !bulkQrBatchId) {
      showToast('Please select an academic batch cohort', 'error');
      return;
    }
    if (bulkQrScope === 'selected' && selectedStudentIds.length === 0) {
      showToast('No students selected', 'error');
      return;
    }

    try {
      setBulkQrDownloading(true);
      const params = {
        format: bulkQrFormat,
      };
      if (bulkQrScope === 'selected') {
        params.studentIds = selectedStudentIds.join(',');
      } else {
        params.batchId = bulkQrBatchId;
        if (bulkQrGroupId) {
          params.groupId = bulkQrGroupId;
        }
      }

      const res = await studentService.downloadBulkQr(params);
      const blob = res.data || res;
      const extension = bulkQrFormat === 'pdf' ? 'pdf' : 'zip';
      const scopeLabel = bulkQrScope === 'selected' 
        ? `Selected_${selectedStudentIds.length}` 
        : `Batch`;
      const filename = `LabAttend_QRCodes_${scopeLabel}.${extension}`;
      triggerBlobDownload(blob, filename);
      showToast(`Bulk QR ${bulkQrFormat.toUpperCase()} package generated and downloaded`, 'success');
      setIsBulkQrModalOpen(false);
    } catch (err) {
      showToast(err.message || 'Failed to download bulk QR package', 'error');
    } finally {
      setBulkQrDownloading(false);
    }
  };

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      setSubmitting(true);
      const payload = {
        studentId: formData.studentId.trim(),
        title: formData.title ? formData.title.trim() : null,
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        offeredBy: formData.offeredBy ? formData.offeredBy.trim() : null,
        degreeProgrammeId: formData.degreeProgrammeId,
        batchId: formData.batchId,
        labGroupId: formData.labGroupId || null,
        groupName: formData.groupName || null,
        qrToken: formData.qrToken.trim() || null,
      };

      if (editingItem) {
        await studentService.updateStudent(editingItem.id, payload);
        showToast('Student record updated successfully', 'success');
        setIsModalOpen(false);
        fetchStudents();
      } else {
        const createRes = await studentService.createStudent(payload);
        showToast('Student registered & QR generated successfully', 'success');
        setIsModalOpen(false);
        fetchStudents();
        if (createRes.success && createRes.data) {
          const newStu = createRes.data;
          setNewlyCreatedStudent(newStu);
          setIsCreatedSuccessModalOpen(true);
          // fetch preview image
          studentService.getQrCode(newStu.id, 'standard')
            .then(res => {
              const blob = res.data || res;
              setCreatedQrPreviewUrl(URL.createObjectURL(blob));
            })
            .catch(console.error);
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
      const res = await studentService.toggleStatus(item.id);
      showToast(res.message || 'Student status updated', 'success');
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Failed to update student status', 'error');
    }
  };

  const handleOpenDelete = (item) => {
    setDeletingStudent(item);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    try {
      setIsDeleting(true);
      await studentService.deleteStudent(deletingStudent.id);
      showToast('Student record deleted successfully', 'success');
      setIsDeleteModalOpen(false);
      setDeletingStudent(null);
      setSelectedStudentIds((prev) => prev.filter((id) => id !== deletingStudent.id));
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Failed to delete student', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenBulkDelete = () => {
    if (selectedStudentIds.length === 0) {
      showToast('No students selected', 'error');
      return;
    }
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedStudentIds.length === 0) return;
    try {
      setIsDeleting(true);
      await studentService.deleteStudentsBulk(selectedStudentIds);
      showToast(`${selectedStudentIds.length} student records deleted successfully`, 'success');
      setIsBulkDeleteModalOpen(false);
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Failed to delete selected students', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCsvFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCsvFile(e.target.files[0]);
    }
  };

  const handleUploadCsv = async (e) => {
    e.preventDefault();
    if (!csvFile) {
      showToast('Please select a valid CSV file', 'error');
      return;
    }

    try {
      setCsvImporting(true);
      setCsvResult(null);
      const uploadData = new FormData();
      uploadData.append('file', csvFile);

      const res = await studentService.importCsv(uploadData);
      if (res.success && res.data) {
        setCsvResult(res.data);
        showToast(res.message || 'CSV processing complete', 'success');
        fetchStudents();
      }
    } catch (err) {
      showToast(err.message || 'Failed to process CSV file', 'error');
    } finally {
      setCsvImporting(false);
    }
  };

  const handleOpenBulkAssign = () => {
    const defaultBatch = selectedBatchId || batches[0]?.id || '';
    setBulkBatchId(defaultBatch);
    setBulkGroupId('');
    setBulkGroupName('');
    if (defaultBatch) {
      labGroupService.getGroupsByBatch(defaultBatch)
        .then(res => {
          if (res.success && res.data) setBulkBatchGroups(res.data);
        })
        .catch(() => setBulkBatchGroups([]));
    }
    setIsBulkAssignModalOpen(true);
  };

  const handleBulkBatchChange = (batchId) => {
    setBulkBatchId(batchId);
    setBulkGroupId('');
    setBulkGroupName('');
    if (batchId) {
      labGroupService.getGroupsByBatch(batchId)
        .then(res => {
          if (res.success && res.data) setBulkBatchGroups(res.data);
        })
        .catch(() => setBulkBatchGroups([]));
    } else {
      setBulkBatchGroups([]);
    }
  };

  const handleConfirmBulkAssign = async (e) => {
    e.preventDefault();
    if (!bulkBatchId) {
      showToast('Please select a batch cohort', 'error');
      return;
    }
    try {
      setBulkAssigning(true);
      const res = await labGroupService.bulkAssign(bulkBatchId, {
        targetGroupId: bulkGroupId || null,
        targetGroupName: bulkGroupName || null,
        studentIds: selectedStudentIds,
      });
      showToast(res.message || 'Students successfully assigned to lab group', 'success');
      setIsBulkAssignModalOpen(false);
      setSelectedStudentIds([]);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Failed to bulk assign students', 'error');
    } finally {
      setBulkAssigning(false);
    }
  };

  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedStudentIds(students.map(s => s.id));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleSelectStudent = (studentId) => {
    setSelectedStudentIds(prev => 
      prev.includes(studentId) ? prev.filter(id => id !== studentId) : [...prev, studentId]
    );
  };

  const columns = [
    {
      header: (
        <input
          type="checkbox"
          checked={students.length > 0 && selectedStudentIds.length === students.length}
          onChange={handleToggleSelectAll}
          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20"
        />
      ),
      accessor: 'select',
      render: (item) => (
        <input
          type="checkbox"
          checked={selectedStudentIds.includes(item.id)}
          onChange={() => handleToggleSelectStudent(item.id)}
          className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500/20"
        />
      ),
    },
    {
      header: 'Student ID',
      accessor: 'studentId',
      render: (item) => (
        <span className="font-mono font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded text-xs">
          {item.studentId}
        </span>
      ),
    },
    {
      header: 'Full Name',
      accessor: 'fullName',
      render: (item) => (
        <div>
          <span className="font-medium text-slate-100 block">
            {item.title ? <span className="text-emerald-400 font-semibold mr-1.5">{item.title}</span> : null}
            {item.fullName}
          </span>
          {item.email ? (
            <span className="text-xs text-slate-400">{item.email}</span>
          ) : (
            <span className="text-xs text-slate-600 italic">No email</span>
          )}
        </div>
      ),
    },
    {
      header: 'Degree & Batch',
      accessor: 'batchCode',
      render: (item) => (
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-sm text-slate-200 block font-medium">
              {item.degreeProgrammeCode ? `${item.degreeProgrammeCode} ` : ''}({item.batchCode})
            </span>
            {item.offeredBy && (
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-teal-950/60 border border-teal-800/50 text-teal-300">
                {item.offeredBy}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-500 block mt-0.5">{item.degreeProgrammeName}</span>
        </div>
      ),
    },
    {
      header: 'Lab Group',
      accessor: 'labGroupName',
      render: (item) => (
        item.labGroupName ? (
          <span className="font-mono font-bold text-xs text-indigo-300 bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-0.5 rounded-full">
            {formatGroupName(item.labGroupName)}
          </span>
        ) : (
          <span className="text-xs text-slate-500 font-normal">
            Unassigned
          </span>
        )
      ),
    },
    {
      header: 'Badge Identifier',
      accessor: 'hasQrToken',
      render: (item) => (
        item.hasQrToken ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
            <QrCode className="h-3 w-3" />
            Token Mapped
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            Unmapped
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
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/admin/students/${item.id}`)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition"
            title="View Attendance History & Profile"
          >
            <Eye className="h-4 w-4" />
          </button>
          <button
            onClick={() => setSingleQrModalStudent(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 transition"
            title="Download Student QR Code (PNG / Sticker)"
          >
            <QrCode className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOpenEdit(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Edit Student"
          >
            <Edit2 className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleOpenDelete(item)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-transparent hover:border-rose-800/40 transition"
            title="Delete Student Record"
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 text-xs text-emerald-400 font-semibold tracking-wider uppercase mb-1">
            <Users className="h-4 w-4" />
            <span>Cohort Roster Directory</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Student Records</h1>
          <p className="text-sm text-slate-400 mt-1">
            Zero-Trust Registry: Students are records only (no login accounts). Roster modifications strictly preserve session history.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleOpenBulkQrModal('batch')}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition"
            title="Bulk download student QR codes as ZIP or printable PDF"
          >
            <Download className="h-4 w-4 text-emerald-400" />
            <span>Download QR Codes</span>
          </button>

          <button
            onClick={() => {
              setCsvFile(null);
              setCsvResult(null);
              setIsCsvModalOpen(true);
            }}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-sm font-medium transition"
          >
            <Upload className="h-4 w-4 text-emerald-400" />
            <span>Bulk CSV Import</span>
          </button>

          <button
            onClick={handleOpenCreate}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 text-sm font-semibold shadow-lg shadow-emerald-500/20 transition"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3">
        <div className="w-full md:w-72">
          <SearchBar
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(0);
            }}
            placeholder="Search by ID, name, or email..."
          />
        </div>

        <div className="w-full md:w-56">
          <select
            value={selectedProgrammeId}
            onChange={(e) => {
              setSelectedProgrammeId(e.target.value);
              setSelectedBatchId('');
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code ? `${p.code} - ` : ''}{p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full md:w-48">
          <select
            value={selectedBatchId}
            onChange={(e) => {
              setSelectedBatchId(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Batches</option>
            {batches
              .filter((b) => !selectedProgrammeId || !b.degreeProgrammeId || b.degreeProgrammeId === selectedProgrammeId)
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchCode}
                </option>
              ))}
          </select>
        </div>

        {selectedBatchId && (
          <div className="w-full md:w-44">
            <select
              value={selectedGroupId}
              onChange={(e) => {
                setSelectedGroupId(e.target.value);
                setPage(0);
              }}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
            >
              <option value="">All Lab Groups</option>
              {filterGroups.map((g) => (
                <option key={g.id} value={g.id}>
                  {formatGroupName(g.groupName)}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="w-full md:w-44">
          <select
            value={selectedOfferedBy}
            onChange={(e) => {
              setSelectedOfferedBy(e.target.value);
              setPage(0);
            }}
            className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Offered By</option>
            <option value="NSBM">NSBM</option>
            <option value="Plymouth University">Plymouth University</option>
            <option value="Victoria University">Victoria University</option>
          </select>
        </div>

        <div className="w-full md:w-36">
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

        {(selectedProgrammeId || selectedBatchId || selectedGroupId || selectedOfferedBy || selectedStatus || search) && (
          <button
            onClick={() => {
              setSelectedProgrammeId('');
              setSelectedBatchId('');
              setSelectedGroupId('');
              setSelectedOfferedBy('');
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

      {/* Bulk Action Banner */}
      {selectedStudentIds.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-indigo-950/40 border border-indigo-800/60 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white">
              {selectedStudentIds.length}
            </span>
            <span className="text-sm font-medium text-slate-200">
              Students selected for batch operations
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedStudentIds([])}
              className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Clear Selection
            </button>
            <button
              type="button"
              onClick={() => handleOpenBulkQrModal('selected')}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              title="Download QR package for currently selected students"
            >
              <Download className="w-3.5 h-3.5" />
              Download QR ({selectedStudentIds.length})
            </button>
            <button
              type="button"
              onClick={handleOpenBulkAssign}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
            >
              <Layers className="w-3.5 h-3.5" />
              Assign to Lab Group
            </button>
            <button
              type="button"
              onClick={handleOpenBulkDelete}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold shadow-lg shadow-rose-600/20 transition"
              title="Delete selected students"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete ({selectedStudentIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Students Data Table */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl overflow-hidden shadow-xl">
        <DataTable
          columns={columns}
          data={students}
          loading={loading}
          emptyMessage="No students found matching current filter criteria."
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

      {/* Add / Edit Student Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Student Record' : 'Register New Student'}
      >
        <form onSubmit={handleSubmitForm} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Student ID / Registration Number *
            </label>
            <input
              type="text"
              value={formData.studentId}
              onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
              placeholder="e.g. SE2026001"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 uppercase font-mono"
            />
            {formErrors.studentId && (
              <span className="text-xs text-rose-400 mt-1 block">{formErrors.studentId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Title
              </label>
              <select
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="">None</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Rev.">Rev.</option>
              </select>
              <div className="flex items-center gap-1.5 mt-1.5">
                {['Mr.', 'Ms.'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, title: prev.title === t ? '' : t }))}
                    className={`flex-1 py-1 rounded text-xs font-semibold text-center transition ${
                      formData.title === t
                        ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-3">
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                placeholder="e.g. Kasun Chamara"
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              />
              {formErrors.fullName && (
                <span className="text-xs text-rose-400 mt-1 block">{formErrors.fullName}</span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Institutional Email <span className="text-slate-500 font-normal lowercase">(optional)</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="e.g. kasun@uni.ac.lk (optional)"
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            />
            {formErrors.email && (
              <span className="text-xs text-rose-400 mt-1 block">{formErrors.email}</span>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Offered By / Awarding University <span className="text-slate-500 font-normal lowercase">(optional)</span>
              </label>
              {formData.offeredBy && (
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, offeredBy: '' }))}
                  className="text-[11px] text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>

            {/* Quick Click Chips */}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              {['NSBM', 'Plymouth University', 'Victoria University'].map((univ) => (
                <button
                  key={univ}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, offeredBy: prev.offeredBy === univ ? '' : univ }))}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                    formData.offeredBy === univ
                      ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400'
                      : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
                  }`}
                >
                  {univ}
                </button>
              ))}
            </div>

            {/* Dropdown Selector */}
            <select
              value={formData.offeredBy}
              onChange={(e) => setFormData({ ...formData, offeredBy: e.target.value })}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select Offered By (Optional)</option>
              <option value="NSBM">NSBM</option>
              <option value="Plymouth University">Plymouth University</option>
              <option value="Victoria University">Victoria University</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Degree Programme *
              </label>
              <select
                value={formData.degreeProgrammeId}
                onChange={(e) => setFormData({ ...formData, degreeProgrammeId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Programme</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.code ? `${p.code} - ` : ''}{p.name}
                  </option>
                ))}
              </select>
              {formErrors.degreeProgrammeId && (
                <span className="text-xs text-rose-400 mt-1 block">{formErrors.degreeProgrammeId}</span>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Batch Cohort *
              </label>
              <select
                value={formData.batchId}
                onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Batch</option>
                {filteredBatches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} ({b.academicYear})
                  </option>
                ))}
              </select>
              {formErrors.batchId && (
                <span className="text-xs text-rose-400 mt-1 block">{formErrors.batchId}</span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Lab Group <span className="text-slate-500 font-normal">(Group A, B, C, D, E, F or Unassigned)</span>
              </label>
              <span className="text-[11px] text-indigo-400 font-medium">
                {formData.groupName ? formData.groupName : (formData.labGroupId ? formatGroupName(formGroups.find(g => g.id === formData.labGroupId)?.groupName) : 'No Group')}
              </span>
            </div>

            {/* Quick-select pills for standard groups (Group A, B, C, D, E, F) */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, labGroupId: '', groupName: '' }))}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  !formData.labGroupId && !formData.groupName
                    ? 'bg-slate-700 text-white font-semibold ring-1 ring-slate-400'
                    : 'bg-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                No Group
              </button>
              {STANDARD_GROUPS.map((grp) => {
                const isSelected = (formData.groupName && formatGroupName(formData.groupName) === grp) ||
                  (formData.labGroupId && formGroups.some(g => g.id === formData.labGroupId && formatGroupName(g.groupName) === grp));
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      const matched = formGroups.find(g => formatGroupName(g.groupName) === grp);
                      setFormData(prev => ({
                        ...prev,
                        labGroupId: matched ? matched.id : '',
                        groupName: grp,
                      }));
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                        : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700/80'
                    }`}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>

            {/* Select Dropdown */}
            <select
              value={formData.groupName ? formatGroupName(formData.groupName) : (formData.labGroupId ? formatGroupName(formGroups.find(g => g.id === formData.labGroupId)?.groupName) : '')}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setFormData(prev => ({ ...prev, labGroupId: '', groupName: '' }));
                } else {
                  const matched = formGroups.find(g => formatGroupName(g.groupName) === val);
                  setFormData(prev => ({
                    ...prev,
                    labGroupId: matched ? matched.id : '',
                    groupName: val,
                  }));
                }
              }}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            >
              <option value="">No Group (Unassigned)</option>
              {STANDARD_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
              {formGroups
                .filter(g => !STANDARD_GROUPS.includes(formatGroupName(g.groupName)))
                .map(g => (
                  <option key={g.id} value={formatGroupName(g.groupName)}>
                    {formatGroupName(g.groupName)}
                  </option>
                ))}
            </select>
          </div>

          {editingItem && (
            <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-xs text-amber-300">
              <span className="font-semibold block mb-0.5">Historical Integrity Notice:</span>
              Changing a student's batch updates future session targeting only. Past sessions and attendance history remain strictly immutable.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-medium text-slate-300">
                Pre-printed Badge / Card Identifier Token (Optional)
              </label>
              {editingItem?.hasQrToken && (
                <span className="text-[11px] text-cyan-400 font-medium">Currently Mapped</span>
              )}
            </div>
            <input
              type="text"
              value={formData.qrToken}
              onChange={(e) => setFormData({ ...formData, qrToken: e.target.value })}
              placeholder={editingItem?.hasQrToken ? 'Enter new token to overwrite, or leave blank to keep' : 'Physical card barcode / QR text'}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Stored as SHA-256 hash. Zero QR code generation or printing occurs in LabAttend.
            </p>
          </div>

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
              {submitting ? 'Saving...' : editingItem ? 'Update Student' : 'Create Student'}
            </button>
          </div>
        </form>
      </Modal>

      {/* CSV Bulk Import Modal */}
      <Modal
        isOpen={isCsvModalOpen}
        onClose={() => {
          setIsCsvModalOpen(false);
          setCsvResult(null);
        }}
        title="Bulk Import Student Roster (CSV)"
      >
        <div className="space-y-5">
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-xl text-xs text-slate-300 space-y-2.5">
            <div className="flex items-center gap-2 font-semibold text-emerald-400">
              <FileSpreadsheet className="h-4 w-4" />
              <span>Supported Spreadsheet / CSV Formats:</span>
            </div>
            <p className="text-slate-300 text-xs leading-relaxed">
              You can directly export your university Excel roster as <strong>.csv</strong>. Email and programme codes are completely optional.
            </p>
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">Standard University Excel Export (Recommended):</span>
              <div className="bg-slate-950 p-2.5 rounded-lg font-mono text-[11px] text-emerald-300 overflow-x-auto border border-slate-800">
                Serial No,Student ID,Batch,Faculty,Degree,Offered By,Title,Name in Full,Name with Initials
              </div>
              <div className="text-[11px] text-slate-400">
                Example: <code className="text-slate-300">1,43453,2026.3,Faculty Of Computing,BSc in Management Information Systems,NSBM,Mr.,Liyanage Tharu Nethma Liyanage,Liyanage L T N</code>
              </div>
            </div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60 flex items-center justify-between">
              <span>* Batches and Degree Programmes will be automatically resolved and registered if not yet in the system.</span>
            </div>
          </div>

          {!csvResult ? (
            <form onSubmit={handleUploadCsv} className="space-y-4">
              <div className="border-2 border-dashed border-slate-700 hover:border-emerald-500/60 rounded-2xl p-6 text-center transition cursor-pointer bg-slate-950/40">
                <input
                  type="file"
                  id="csv-file-input"
                  accept=".csv,text/csv"
                  onChange={handleCsvFileChange}
                  className="hidden"
                />
                <label htmlFor="csv-file-input" className="cursor-pointer block">
                  <Upload className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                  <span className="text-sm font-medium text-slate-200 block">
                    {csvFile ? csvFile.name : 'Click to select CSV file (40+ students supported)'}
                  </span>
                  <span className="text-xs text-slate-500 mt-1 block">
                    {csvFile ? `${(csvFile.size / 1024).toFixed(1)} KB` : 'UTF-8 encoded .csv files only'}
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!csvFile || csvImporting}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 rounded-xl text-sm font-semibold transition"
                >
                  {csvImporting ? 'Validating & Importing...' : 'Upload & Import Roster'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Import Results Banner */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                  <span className="text-xs text-slate-400 block">Total Rows</span>
                  <span className="text-lg font-bold text-white">{csvResult.totalRows}</span>
                </div>
                <div className="p-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl">
                  <span className="text-xs text-emerald-400 block">Imported</span>
                  <span className="text-lg font-bold text-emerald-400">{csvResult.successCount}</span>
                </div>
                <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl">
                  <span className="text-xs text-rose-400 block">Failed</span>
                  <span className="text-lg font-bold text-rose-400">{csvResult.failureCount}</span>
                </div>
              </div>

              {/* Per-row Errors List */}
              {csvResult.errors && csvResult.errors.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-semibold text-rose-400 block">
                    Detailed Row Validation Errors ({csvResult.errors.length}):
                  </span>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                    {csvResult.errors.map((err, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-rose-950/30 border border-rose-900/40 text-xs text-rose-300 flex items-start gap-2"
                      >
                        <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                        <div>
                          <span className="font-semibold text-rose-200">
                            Row {err.rowNumber} [{err.studentId}]:
                          </span>{' '}
                          {err.error}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setCsvFile(null);
                    setCsvResult(null);
                  }}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
                >
                  Import Another File
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsCsvModalOpen(false);
                    setCsvResult(null);
                  }}
                  className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-xl text-sm font-semibold transition"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Bulk Assign to Lab Group Modal */}
      <Modal
        isOpen={isBulkAssignModalOpen}
        onClose={() => setIsBulkAssignModalOpen(false)}
        title="Bulk Assign Students to Lab Group"
        subtitle={`Assigning ${selectedStudentIds.length} selected student(s)`}
      >
        <form onSubmit={handleConfirmBulkAssign} className="space-y-4">
          <div className="p-3 bg-indigo-950/30 border border-indigo-900/40 rounded-xl text-xs text-indigo-300">
            Select the destination cohort and lab group. Moving students between groups preserves all existing historical attendance session records.
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Target Batch Cohort <span className="text-rose-400">*</span>
            </label>
            <select
              value={bulkBatchId}
              onChange={(e) => handleBulkBatchChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Select Cohort</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.batchCode} ({b.academicYear})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Target Lab Group
              </label>
              <span className="text-xs font-semibold text-indigo-400">
                {bulkGroupName ? bulkGroupName : (bulkGroupId ? formatGroupName(bulkBatchGroups.find(g => g.id === bulkGroupId)?.groupName) : 'Unassigned')}
              </span>
            </div>

            {/* Quick group pills */}
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <button
                type="button"
                onClick={() => { setBulkGroupId(''); setBulkGroupName(''); }}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  !bulkGroupId && !bulkGroupName
                    ? 'bg-slate-700 text-white font-semibold ring-1 ring-slate-400'
                    : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                No Group (Unassigned)
              </button>
              {STANDARD_GROUPS.map((grp) => {
                const isSelected = bulkGroupName === grp ||
                  (bulkGroupId && bulkBatchGroups.some(g => g.id === bulkGroupId && formatGroupName(g.groupName) === grp));
                return (
                  <button
                    key={grp}
                    type="button"
                    onClick={() => {
                      const matched = bulkBatchGroups.find(g => formatGroupName(g.groupName) === grp);
                      setBulkGroupId(matched ? matched.id : '');
                      setBulkGroupName(grp);
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      isSelected
                        ? 'bg-indigo-600 text-white font-semibold shadow-md shadow-indigo-600/30 ring-2 ring-indigo-400'
                        : 'bg-slate-900 border border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    {grp}
                  </button>
                );
              })}
            </div>

            <select
              value={bulkGroupName ? bulkGroupName : (bulkGroupId ? formatGroupName(bulkBatchGroups.find(g => g.id === bulkGroupId)?.groupName) : '')}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) {
                  setBulkGroupId('');
                  setBulkGroupName('');
                } else {
                  const matched = bulkBatchGroups.find(g => formatGroupName(g.groupName) === val);
                  setBulkGroupId(matched ? matched.id : '');
                  setBulkGroupName(val);
                }
              }}
              className="w-full px-3 py-2 bg-slate-950/70 border border-slate-800 rounded-xl text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            >
              <option value="">Unassign / No Group</option>
              {STANDARD_GROUPS.map((grp) => (
                <option key={grp} value={grp}>
                  {grp}
                </option>
              ))}
              {bulkBatchGroups
                .filter(g => !STANDARD_GROUPS.includes(formatGroupName(g.groupName)))
                .map((g) => (
                  <option key={g.id} value={formatGroupName(g.groupName)}>
                    {formatGroupName(g.groupName)}
                  </option>
                ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
            <button
              type="button"
              onClick={() => setIsBulkAssignModalOpen(false)}
              disabled={bulkAssigning}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkAssigning || !bulkBatchId}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-semibold shadow disabled:opacity-50 transition"
            >
              {bulkAssigning && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              Assign {selectedStudentIds.length} Student(s)
            </button>
          </div>
        </form>
      </Modal>

      {/* Individual Student QR Download Modal */}
      {singleQrModalStudent && (
        <Modal
          isOpen={!!singleQrModalStudent}
          onClose={() => setSingleQrModalStudent(null)}
          title="Download Student QR Code"
          subtitle={`${singleQrModalStudent.fullName} (${singleQrModalStudent.studentId})`}
        >
          <div className="space-y-5">
            <div className="p-4 bg-slate-800/60 border border-slate-700/60 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Security Verification:</span>
                <span className="text-xs font-mono font-medium text-emerald-400">HMAC-SHA256 Opaque Token</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">Badge Version:</span>
                <span className="text-xs font-mono font-bold text-slate-200">v{singleQrModalStudent.qrVersion || 1}</span>
              </div>
              <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-700/60">
                Encodes zero personal identifiable data (no plain name, no student ID, no email). Safe against shoulder-surfing and optical scraping.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDownloadSingleQr(singleQrModalStudent, 'standard')}
                disabled={downloadingSingleQrFormat === 'standard'}
                className="p-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-400">
                    <Download className="h-5 w-5" />
                  </div>
                  {downloadingSingleQrFormat === 'standard' && (
                    <RefreshCw className="h-4 w-4 text-emerald-400 animate-spin" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white group-hover:text-emerald-400 transition block">
                    Standard QR (PNG)
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    Pure high-resolution QR matrix image (no text under QR).
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadSingleQr(singleQrModalStudent, 'sticker')}
                disabled={downloadingSingleQrFormat === 'sticker'}
                className="p-4 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-left transition space-y-2 group"
              >
                <div className="flex items-center justify-between">
                  <div className="p-2 rounded-lg bg-cyan-950/60 border border-cyan-800/50 text-cyan-400">
                    <Printer className="h-5 w-5" />
                  </div>
                  {downloadingSingleQrFormat === 'sticker' && (
                    <RefreshCw className="h-4 w-4 text-cyan-400 animate-spin" />
                  )}
                </div>
                <div>
                  <span className="text-sm font-semibold text-white group-hover:text-cyan-400 transition block">
                    Print-Ready Sticker
                  </span>
                  <span className="text-xs text-slate-400 mt-0.5 block">
                    Sticker card with QR, student name, ID, cohort and lab group.
                  </span>
                </div>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setSingleQrModalStudent(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Student Created & QR Generated Success Modal */}
      {isCreatedSuccessModalOpen && newlyCreatedStudent && (
        <Modal
          isOpen={isCreatedSuccessModalOpen}
          onClose={() => {
            setIsCreatedSuccessModalOpen(false);
            setNewlyCreatedStudent(null);
            setCreatedQrPreviewUrl(null);
          }}
          title="Student Registered & QR Generated"
          subtitle="Cryptographic badge token provisioned successfully"
        >
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-emerald-400 shrink-0" />
              <div className="text-xs text-slate-300">
                <span className="font-semibold text-white block text-sm">
                  {newlyCreatedStudent.fullName}
                </span>
                <span className="font-mono text-emerald-400 font-semibold">
                  {newlyCreatedStudent.studentId}
                </span>
                <span className="text-slate-400 ml-2">
                  ({newlyCreatedStudent.batchCode}{newlyCreatedStudent.labGroupName ? ` • Group ${newlyCreatedStudent.labGroupName}` : ''})
                </span>
              </div>
            </div>

            {/* QR Preview Card */}
            <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col items-center justify-center">
              <div className="p-3 bg-white rounded-xl shadow-md border border-slate-200">
                {createdQrPreviewUrl ? (
                  <img
                    src={createdQrPreviewUrl}
                    alt="Created QR"
                    className="w-32 h-32 object-contain"
                  />
                ) : (
                  <div className="w-32 h-32 flex items-center justify-center">
                    <RefreshCw className="h-6 w-6 text-slate-400 animate-spin" />
                  </div>
                )}
              </div>
              <span className="text-[11px] text-slate-400 mt-2 font-mono">
                Token Version: v{newlyCreatedStudent.qrVersion || 1} • Zero PII Encoded
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDownloadSingleQr(newlyCreatedStudent, 'standard')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
              >
                <Download className="h-4 w-4" />
                <span>Download QR PNG</span>
              </button>
              <button
                type="button"
                onClick={() => handleDownloadSingleQr(newlyCreatedStudent, 'sticker')}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium transition"
              >
                <Printer className="h-4 w-4 text-cyan-400" />
                <span>Download Sticker</span>
              </button>
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreatedSuccessModalOpen(false);
                  setNewlyCreatedStudent(null);
                  setCreatedQrPreviewUrl(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
              >
                Done
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk QR Code Download Modal */}
      <Modal
        isOpen={isBulkQrModalOpen}
        onClose={() => setIsBulkQrModalOpen(false)}
        title="Bulk Download Student QR Codes"
        subtitle="Export archives for physical badge distribution and printing"
      >
        <form onSubmit={handleDownloadBulkQr} className="space-y-4">
          {/* Scope Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Download Scope
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setBulkQrScope('batch')}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition ${
                  bulkQrScope === 'batch'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                By Batch / Lab Group
              </button>
              <button
                type="button"
                onClick={() => setBulkQrScope('selected')}
                disabled={selectedStudentIds.length === 0}
                className={`px-3 py-2 rounded-xl text-xs font-medium border text-center transition ${
                  bulkQrScope === 'selected'
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-400'
                    : selectedStudentIds.length === 0
                    ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:text-white'
                }`}
              >
                Selected Students ({selectedStudentIds.length})
              </button>
            </div>
          </div>

          {bulkQrScope === 'batch' && (
            <div className="space-y-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Batch Cohort <span className="text-rose-400">*</span>
                </label>
                <select
                  value={bulkQrBatchId}
                  onChange={(e) => handleBulkQrBatchChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="">Select Cohort</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batchCode} ({b.academicYear})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Lab Group <span className="text-slate-500 font-normal">(Optional — defaults to whole cohort)</span>
                </label>
                <select
                  value={bulkQrGroupId}
                  onChange={(e) => setBulkQrGroupId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">All Groups (Entire Batch)</option>
                  {bulkQrBatchGroups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {formatGroupName(g.groupName)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Export Format Selector */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Package Format
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  bulkQrFormat === 'zip'
                    ? 'bg-emerald-950/40 border-emerald-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="bulkQrFormat"
                  value="zip"
                  checked={bulkQrFormat === 'zip'}
                  onChange={() => setBulkQrFormat('zip')}
                  className="hidden"
                />
                <FileArchive className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block text-slate-200">ZIP of PNGs</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Individual files named <code className="text-emerald-300 text-[10px]">StudentID_Name.png</code>
                  </span>
                </div>
              </label>

              <label
                className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                  bulkQrFormat === 'pdf'
                    ? 'bg-cyan-950/40 border-cyan-500 text-white'
                    : 'bg-slate-800/40 border-slate-700 text-slate-400 hover:text-slate-200'
                }`}
              >
                <input
                  type="radio"
                  name="bulkQrFormat"
                  value="pdf"
                  checked={bulkQrFormat === 'pdf'}
                  onChange={() => setBulkQrFormat('pdf')}
                  className="hidden"
                />
                <Printer className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-bold block text-slate-200">Printable PDF Sheet</span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    3x8 stickers per standard A4 page (24 per sheet)
                  </span>
                </div>
              </label>
            </div>
          </div>

          <div className="p-3 bg-slate-800/40 border border-slate-700/50 rounded-xl text-[11px] text-slate-400">
            Rate limited: capped at 500 students per export request to ensure fast processing.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsBulkQrModalOpen(false)}
              disabled={bulkQrDownloading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={bulkQrDownloading || (bulkQrScope === 'batch' && !bulkQrBatchId)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow transition"
            >
              {bulkQrDownloading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Generating Package...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Download {bulkQrFormat.toUpperCase()}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Student Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeletingStudent(null);
          }
        }}
        title="Delete Student Record"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl">
            <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-200">
                Are you sure you want to permanently delete this student?
              </p>
              <p className="text-xs text-rose-300/80 mt-1">
                Student: <strong className="text-white font-mono">{deletingStudent?.studentId}</strong> — {deletingStudent?.fullName}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                This will remove the student record and invalidate their mapped QR tokens. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setIsDeleteModalOpen(false);
                setDeletingStudent(null);
              }}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/20 transition"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Confirm Delete</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Students Confirmation Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) setIsBulkDeleteModalOpen(false);
        }}
        title="Delete Selected Students"
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-rose-950/30 border border-rose-800/40 rounded-xl">
            <ShieldAlert className="h-6 w-6 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-rose-200">
                Are you sure you want to permanently delete {selectedStudentIds.length} students?
              </p>
              <p className="text-xs text-slate-400 mt-2">
                All selected student records will be permanently removed from the system. This action cannot be undone.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => setIsBulkDeleteModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmBulkDelete}
              className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold shadow-lg shadow-rose-600/20 transition"
            >
              {isDeleting ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" />
                  <span>Delete {selectedStudentIds.length} Students</span>
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
