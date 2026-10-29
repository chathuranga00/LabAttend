import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  FileSpreadsheet, 
  FileCode, 
  Filter, 
  Calendar, 
  Building2, 
  GraduationCap, 
  BookOpen, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  Search, 
  Loader2,
  RefreshCw,
  RotateCcw,
  Clock,
  Layers,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { reportService } from '../../services/reportService';
import { academicService, studentService } from '../../services/academicService';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';

const REPORT_TYPES = [
  { id: 'SESSION', label: 'Individual Session', desc: 'Detailed student turnout for a single finalized lab session' },
  { id: 'DAILY', label: 'Daily Attendance', desc: 'All finalized sessions and student turnout for a specific calendar date' },
  { id: 'STUDENT_HISTORY', label: 'Student History', desc: 'Complete chronological lab attendance record for an individual student' },
  { id: 'MODULE', label: 'Module-wise', desc: 'Aggregated attendance metrics and session breakdown for a specific module' },
  { id: 'BATCH', label: 'Batch-wise', desc: 'Attendance participation breakdown for an entire academic cohort batch' },
  { id: 'SEMESTER', label: 'Semester Summary', desc: 'Institution-wide audit across all modules taught in a specific semester' },
  { id: 'LOW_ATTENDANCE', label: 'Low Attendance Alert', desc: 'Identifies students falling below the statutory attendance threshold' },
  { id: 'HALL', label: 'Laboratory Hall', desc: 'Facility utilization, seating capacity vs actual turnout per hall' },
  { id: 'CROSS_GROUP', label: 'Cross-Group Audit', desc: 'Audit of students attending sessions outside their assigned home lab group' },
];

export default function AdminReportsPage() {
  const { showToast } = useToast();

  // Selected Report Type
  const [reportType, setReportType] = useState('SESSION');

  // Filter States
  const [sessionId, setSessionId] = useState('');
  const [sessionDate, setSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [studentId, setStudentId] = useState('');
  const [moduleId, setModuleId] = useState('');
  const [batchId, setBatchId] = useState('');
  const [labGroupId, setLabGroupId] = useState('');
  const [programmeId, setProgrammeId] = useState('');
  const [semester, setSemester] = useState('Year 2 Semester 1');
  const [threshold, setThreshold] = useState(80.0);
  const [hallId, setHallId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Dropdown Reference Data
  const [modules, setModules] = useState([]);
  const [batches, setBatches] = useState([]);
  const [allLabGroups, setAllLabGroups] = useState([]);
  const [labGroups, setLabGroups] = useState([]);
  const [programmes, setProgrammes] = useState([]);
  const [halls, setHalls] = useState([]);
  const [finalizedSessions, setFinalizedSessions] = useState([]);
  const [students, setStudents] = useState([]);

  // Preview State
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [exportLoading, setExportLoading] = useState({ PDF: false, EXCEL: false, CSV: false });

  // Load Reference Options
  useEffect(() => {
    async function loadOptions() {
      try {
        const [modRes, batchRes, progRes, hallRes, sessRes, grpRes, stuRes] = await Promise.allSettled([
          academicService.getModules({ size: 100 }),
          academicService.getBatches({ size: 100 }),
          academicService.getDegreeProgrammes({ size: 100 }),
          academicService.getLaboratoryHalls({ size: 100 }),
          sessionService.getAllSessions ? sessionService.getAllSessions({ status: 'FINALIZED', size: 100 }) : Promise.resolve({ data: [] }),
          academicService.labGroup.getAllGroups().catch(() => ({ data: [] })),
          studentService.getStudents({ size: 300 }).catch(() => ({ data: { content: [] } })),
        ]);

        if (modRes.status === 'fulfilled' && modRes.value?.data?.content) {
          setModules(modRes.value.data.content);
        }
        if (batchRes.status === 'fulfilled' && batchRes.value?.data?.content) {
          setBatches(batchRes.value.data.content);
        }
        if (progRes.status === 'fulfilled' && progRes.value?.data?.content) {
          setProgrammes(progRes.value.data.content);
        }
        if (hallRes.status === 'fulfilled' && hallRes.value?.data?.content) {
          setHalls(hallRes.value.data.content);
        }
        if (sessRes.status === 'fulfilled' && sessRes.value?.data?.content) {
          setFinalizedSessions(sessRes.value.data.content);
          if (sessRes.value.data.content.length > 0 && !sessionId) {
            setSessionId(sessRes.value.data.content[0].id);
          }
        }
        if (grpRes.status === 'fulfilled' && grpRes.value?.data) {
          const list = Array.isArray(grpRes.value.data)
            ? grpRes.value.data
            : (grpRes.value.data.content || grpRes.value.data.data || []);
          setAllLabGroups(list);
          setLabGroups(list);
        }
        if (stuRes.status === 'fulfilled' && stuRes.value?.data) {
          const list = stuRes.value.data.content || (Array.isArray(stuRes.value.data) ? stuRes.value.data : []);
          setStudents(list);
        }
      } catch (err) {
        console.error('Failed to load filter reference data', err);
      }
    }
    loadOptions();
  }, []);

  // Fetch Lab Groups when batchId changes
  useEffect(() => {
    setLabGroupId('');
    if (!batchId) {
      setLabGroups(allLabGroups);
      return;
    }
    academicService.labGroup.getGroupsByBatch(batchId)
      .then((res) => {
        const list = Array.isArray(res.data)
          ? res.data
          : (res.data?.content || res.data?.data || []);
        setLabGroups(list);
      })
      .catch((err) => {
        console.error('Failed to load lab groups for batch', err);
        setLabGroups([]);
      });
  }, [batchId, allLabGroups]);

  // Reset Filters to initial default states
  const handleResetFilters = () => {
    setSessionId(finalizedSessions[0]?.id || '');
    setSessionDate(new Date().toISOString().split('T')[0]);
    setStudentId('');
    setModuleId('');
    setBatchId('');
    setLabGroupId('');
    setProgrammeId('');
    setSemester('Year 2 Semester 1');
    setThreshold(80.0);
    setHallId('');
    setStartDate('');
    setEndDate('');
    setPreviewData(null);
    setTableFilter('');
  };

  // Build filter query params
  const getQueryParams = () => {
    const params = {};
    if (labGroupId) params.labGroupId = labGroupId;
    if (reportType === 'SESSION' && sessionId) params.sessionId = sessionId;
    if (reportType === 'DAILY' && sessionDate) params.sessionDate = sessionDate;
    if (reportType === 'STUDENT_HISTORY') {
      if (studentId) params.studentId = studentId;
      if (moduleId) params.moduleId = moduleId;
    }
    if (reportType === 'MODULE') {
      if (moduleId) params.moduleId = moduleId;
      if (batchId) params.batchId = batchId;
    }
    if (reportType === 'BATCH') {
      if (batchId) params.batchId = batchId;
      if (moduleId) params.moduleId = moduleId;
    }
    if (reportType === 'SEMESTER') {
      if (semester) params.semester = semester;
      if (programmeId) params.programmeId = programmeId;
      if (batchId) params.batchId = batchId;
      if (moduleId) params.moduleId = moduleId;
    }
    if (reportType === 'LOW_ATTENDANCE') {
      if (threshold) params.threshold = threshold;
      if (programmeId) params.programmeId = programmeId;
      if (moduleId) params.moduleId = moduleId;
      if (batchId) params.batchId = batchId;
    }
    if (reportType === 'HALL') {
      if (hallId) params.hallId = hallId;
    }
    if (reportType === 'CROSS_GROUP') {
      if (batchId) params.batchId = batchId;
      if (labGroupId) params.labGroupId = labGroupId;
      if (moduleId) params.moduleId = moduleId;
    }
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return params;
  };

  // Generate Preview
  const handleGeneratePreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const params = getQueryParams();

      // Client-side quick check
      if (reportType === 'SESSION' && !params.sessionId) {
        showToast('Please select or specify a Finalized Lab Session', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'DAILY' && !params.sessionDate) {
        showToast('Please select a session date', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'STUDENT_HISTORY' && !params.studentId) {
        showToast('Please specify a Student UUID or matriculation ID', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'MODULE' && !params.moduleId) {
        showToast('Please select a module', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'BATCH' && !params.batchId) {
        showToast('Please select a batch', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'HALL' && !params.hallId) {
        showToast('Please select a laboratory hall', 'warning');
        setLoadingPreview(false);
        return;
      }

      const res = await reportService.getAdminReportPreview(reportType, params);
      if (res.success && res.data) {
        setPreviewData(res.data);
        showToast(`${res.data.title} preview generated successfully`, 'success');
      } else {
        showToast(res.message || 'Failed to generate preview', 'error');
      }
    } catch (err) {
      console.error('Report preview error', err);
      showToast(err.message || 'Failed to generate report preview', 'error');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Trigger File Download (PDF, Excel, CSV)
  const handleExport = async (format) => {
    setExportLoading((prev) => ({ ...prev, [format]: true }));
    try {
      const params = getQueryParams();
      await reportService.downloadAdminReport(reportType, format, params);
      showToast(`${format} report downloaded successfully`, 'success');
    } catch (err) {
      console.error(`Export ${format} error`, err);
      showToast(err.message || `Failed to export ${format} report`, 'error');
    } finally {
      setExportLoading((prev) => ({ ...prev, [format]: false }));
    }
  };

  // Filter preview rows
  const filteredRows = previewData?.rows
    ? previewData.rows.filter((row) =>
        row.some((cell) => cell?.toLowerCase().includes(tableFilter.toLowerCase()))
      )
    : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-7 w-7 text-emerald-400" />
            Official Attendance Reports & Exports
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate and stream finalized audit-grade attendance reports in PDF, Excel, and CSV formats.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            Zero-Trust Audit Verified
          </span>
        </div>
      </div>

      {/* 1. Report Type Selector Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {REPORT_TYPES.map((t) => {
          const isSelected = reportType === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setReportType(t.id);
                setPreviewData(null);
                setTableFilter('');
              }}
              className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                isSelected
                  ? 'bg-emerald-500/10 border-emerald-500/50 text-white shadow-lg shadow-emerald-500/10'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {t.label}
                </span>
                {isSelected && <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                {t.desc}
              </p>
            </button>
          );
        })}
      </div>

      {/* 2. Contextual Filters Card */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
            <Filter className="h-4 w-4 text-emerald-400" />
            Report Parameters & Audit Filters
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] text-slate-400">
              Active Scope: <strong className="text-emerald-400 font-mono">{reportType}</strong>
            </span>
            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700 rounded-lg transition-colors cursor-pointer"
              title="Reset all filter parameters to default"
            >
              <RotateCcw className="h-3 w-3 text-emerald-400" />
              Reset Filters
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* SESSION: Session Selector */}
          {reportType === 'SESSION' && (
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Target Finalized Session *
              </label>
              <select
                value={sessionId}
                onChange={(e) => setSessionId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Finalized Lab Session --</option>
                {finalizedSessions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.sessionCode} — {s.moduleCode || s.module?.moduleCode || 'Module'} ({s.sessionDate})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* DAILY: Session Date */}
          {reportType === 'DAILY' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Audit Date *
              </label>
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* STUDENT_HISTORY: Student ID Input */}
          {reportType === 'STUDENT_HISTORY' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Student ID or Matriculation Number *
              </label>
              <input
                type="text"
                list="studentsList"
                placeholder="e.g. IT21001234 or Student UUID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 font-mono"
              />
              <datalist id="studentsList">
                {students.map((s) => (
                  <option key={s.id} value={s.studentId}>
                    {s.studentId} — {s.fullName} ({s.labGroup?.groupName || 'No Group'})
                  </option>
                ))}
              </datalist>
              <span className="text-[10px] text-slate-500 mt-1 block">
                Type or select matriculation ID or UUID
              </span>
            </div>
          )}

          {/* MODULE: Module Dropdown */}
          {(reportType === 'MODULE' || reportType === 'STUDENT_HISTORY' || reportType === 'BATCH' || reportType === 'SEMESTER' || reportType === 'LOW_ATTENDANCE' || reportType === 'CROSS_GROUP') && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Module / Course {reportType === 'MODULE' && '*'}
              </label>
              <select
                value={moduleId}
                onChange={(e) => setModuleId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">{reportType === 'MODULE' ? '-- Select Module --' : 'All Modules'}</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.moduleCode} - {m.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* BATCH: Batch Dropdown */}
          {(reportType === 'BATCH' || reportType === 'MODULE' || reportType === 'SEMESTER' || reportType === 'LOW_ATTENDANCE' || reportType === 'CROSS_GROUP') && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Student Batch Cohort {reportType === 'BATCH' && '*'}
              </label>
              <select
                value={batchId}
                onChange={(e) => setBatchId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">{reportType === 'BATCH' ? '-- Select Batch --' : 'All Batches'}</option>
                {batches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} ({b.academicYear})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* LAB GROUP: Lab Group Dropdown (Available for all cohort, module, daily, and cross-group reports) */}
          {(reportType === 'DAILY' || reportType === 'CROSS_GROUP' || reportType === 'BATCH' || reportType === 'MODULE' || reportType === 'SEMESTER' || reportType === 'LOW_ATTENDANCE') && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Lab Group (Optional)
              </label>
              <select
                value={labGroupId}
                onChange={(e) => setLabGroupId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">{batchId ? 'All Groups in Selected Batch' : 'All Lab Groups / Whole Cohort'}</option>
                {labGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.groupName} {g.batchCode ? `(${g.batchCode})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* HALL: Laboratory Hall Dropdown */}
          {reportType === 'HALL' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Laboratory Hall *
              </label>
              <select
                value={hallId}
                onChange={(e) => setHallId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- Select Laboratory Hall --</option>
                {halls.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} (Cap: {h.capacity})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SEMESTER: Semester Text / Select */}
          {reportType === 'SEMESTER' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Semester Code *
              </label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="Year 1 Semester 1">Year 1 Semester 1</option>
                <option value="Year 1 Semester 2">Year 1 Semester 2</option>
                <option value="Year 2 Semester 1">Year 2 Semester 1</option>
                <option value="Year 2 Semester 2">Year 2 Semester 2</option>
                <option value="Year 3 Semester 1">Year 3 Semester 1</option>
                <option value="Year 3 Semester 2">Year 3 Semester 2</option>
                <option value="Year 4 Semester 1">Year 4 Semester 1</option>
                <option value="Year 4 Semester 2">Year 4 Semester 2</option>
              </select>
            </div>
          )}

          {/* LOW_ATTENDANCE: Threshold Input */}
          {reportType === 'LOW_ATTENDANCE' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Attendance Cutoff Threshold (%) *
              </label>
              <input
                type="number"
                min="1"
                max="100"
                step="0.5"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Degree Programme (For Semester and Low Attendance) */}
          {(reportType === 'SEMESTER' || reportType === 'LOW_ATTENDANCE') && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Degree Programme
              </label>
              <select
                value={programmeId}
                onChange={(e) => setProgrammeId(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Programmes</option>
                {programmes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Date Range: Start Date */}
          {reportType !== 'DAILY' && reportType !== 'SESSION' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Date Range (From)
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}

          {/* Date Range: End Date */}
          {reportType !== 'DAILY' && reportType !== 'SESSION' && (
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                Date Range (To)
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
          )}
        </div>

        {/* Generate Preview Action Bar */}
        <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            Live data computed directly from finalized Supabase PostgreSQL records
          </div>
          <button
            onClick={handleGeneratePreview}
            disabled={loadingPreview}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 disabled:opacity-50 transition-all cursor-pointer"
          >
            {loadingPreview ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Aggregating Official Data...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Generate Audit Preview
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Preview Section & Export Actions */}
      {previewData && (
        <div className="space-y-6">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Total Expected Students
              </span>
              <span className="text-2xl font-black text-white">
                {previewData.expectedCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                Present Attendances
              </span>
              <span className="text-2xl font-black text-emerald-400">
                {previewData.presentCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                Absent Students
              </span>
              <span className="text-2xl font-black text-rose-400">
                {previewData.absentCount}
              </span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block mb-1">
                Audit Attendance Rate
              </span>
              <span className="text-2xl font-black text-cyan-400">
                {previewData.attendancePercentage}
              </span>
            </div>
            {previewData.metadata && (previewData.metadata['Cross-Group Visitors'] || previewData.metadata['Total Cross-Group Visitors'] || previewData.metadata['Total Cross-Group Visits']) && (
              <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-800/50 shadow-md col-span-2 lg:col-span-4">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                  Cross-Group Visitors Audited
                </span>
                <span className="text-2xl font-black text-amber-300">
                  {previewData.metadata['Cross-Group Visitors'] || previewData.metadata['Total Cross-Group Visitors'] || previewData.metadata['Total Cross-Group Visits']}
                </span>
                <span className="text-xs text-slate-400 block mt-0.5">
                  Visitors are isolated and accounted for separately from standard cohort percentage calculations.
                </span>
              </div>
            )}
          </div>

          {/* Metadata Key-Value Header */}
          {previewData.metadata && Object.keys(previewData.metadata).length > 0 && (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
              <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-emerald-400" />
                Report Metadata & Audit Context
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 text-slate-400">
                {Object.entries(previewData.metadata).map(([key, val]) => (
                  <div key={key}>
                    <span className="font-semibold text-slate-300">{key}: </span>
                    <span className="text-slate-100">{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Interactive Preview Table & Export Action Buttons */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            {/* Table Control Header */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filter preview rows..."
                    value={tableFilter}
                    onChange={(e) => setTableFilter(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 min-h-[44px] text-base sm:text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <span className="text-xs text-slate-400 whitespace-nowrap">
                  Showing <strong>{filteredRows.length}</strong> of {previewData.rows.length} rows
                </span>
              </div>

              {/* 3 Export Download Buttons */}
              <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
                {/* PDF Export */}
                <button
                  onClick={() => handleExport('PDF')}
                  disabled={exportLoading.PDF}
                  className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {exportLoading.PDF ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileText className="h-3.5 w-3.5" />
                  )}
                  Export PDF
                </button>

                {/* Excel Export */}
                <button
                  onClick={() => handleExport('EXCEL')}
                  disabled={exportLoading.EXCEL}
                  className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {exportLoading.EXCEL ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-3.5 w-3.5" />
                  )}
                  Export Excel (.xlsx)
                </button>

                {/* CSV Export */}
                <button
                  onClick={() => handleExport('CSV')}
                  disabled={exportLoading.CSV}
                  className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                >
                  {exportLoading.CSV ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileCode className="h-3.5 w-3.5" />
                  )}
                  Export CSV
                </button>
              </div>
            </div>

            {/* Table Container */}
            <div className="overflow-x-auto">
              <div className="sm:hidden px-3 py-1.5 bg-slate-950/80 text-[10px] text-slate-400 border-b border-slate-800 text-center font-medium">
                &larr; Scroll horizontally to inspect full matrix &rarr;
              </div>
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-300 font-semibold uppercase text-[10px] tracking-wider border-b border-slate-700/60">
                  <tr>
                    {previewData.headers.map((h, i) => (
                      <th key={i} className="py-3 px-4">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {filteredRows.length > 0 ? (
                    filteredRows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40 transition-colors">
                        {row.map((cell, cIdx) => {
                          const isStatus = cell === 'PRESENT' || cell === 'ABSENT' || cell === 'LATE';
                          return (
                            <td key={cIdx} className="py-2.5 px-4 text-slate-300">
                              {isStatus ? (
                                <span
                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                    cell === 'PRESENT'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                      : cell === 'LATE'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                  }`}
                                >
                                  {cell}
                                </span>
                              ) : (
                                cell
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={previewData.headers.length} className="py-8 text-center text-slate-400 text-xs">
                        No matching audit records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Additional Summary Footer Note */}
            {previewData.additionalSummary && (
              <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>{previewData.additionalSummary}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
