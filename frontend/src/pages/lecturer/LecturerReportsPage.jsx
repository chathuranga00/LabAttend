import React, { useState, useEffect, useCallback } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  CalendarClock, 
  AlertTriangle, 
  CheckCircle2, 
  Filter, 
  RotateCcw, 
  Search, 
  ExternalLink,
  BookOpen,
  Building2,
  Calendar,
  FileSpreadsheet,
  FileText,
  FileCode,
  Download,
  Loader2,
  RefreshCw,
  Clock,
  Layers,
  ShieldCheck
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  Legend,
  AreaChart,
  Area 
} from 'recharts';
import { analyticsService } from '../../services/analyticsService';
import { sessionService } from '../../services/sessionService';
import { reportService } from '../../services/reportService';
import { academicService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';

const REPORT_TYPES = [
  { id: 'SESSION', label: 'Individual Session', desc: 'Detailed turnout for your finalized lab session' },
  { id: 'DAILY', label: 'Daily Attendance', desc: 'Sessions and attendance conducted by you on a specific date' },
  { id: 'STUDENT_HISTORY', label: 'Student History', desc: 'Student lab attendance history across your assigned modules' },
  { id: 'MODULE', label: 'Module-wise', desc: 'Detailed breakdown of sessions for your assigned module' },
  { id: 'BATCH', label: 'Batch-wise', desc: 'Cohort attendance for batches you teach' },
  { id: 'SEMESTER', label: 'Semester Summary', desc: 'Semester-wide attendance across your taught modules' },
  { id: 'LOW_ATTENDANCE', label: 'Low Attendance Alert', desc: 'Students in your cohorts falling below statutory threshold' },
  { id: 'HALL', label: 'Laboratory Hall', desc: 'Hall turnout and utilization metrics for your sessions' },
  { id: 'CROSS_GROUP', label: 'Cross-Group Audit', desc: 'Audit of students attending your sessions from outside their assigned home group' },
];

export default function LecturerReportsPage() {
  const { showToast } = useToast();

  // Active Main View Tab: 'EXPORTS' or 'ANALYTICS'
  const [activeTab, setActiveTab] = useState('EXPORTS');

  // =========================================================================
  // REPORTS & EXPORTS STATE
  // =========================================================================
  const [reportType, setReportType] = useState('SESSION');
  const [exportSessionId, setExportSessionId] = useState('');
  const [exportSessionDate, setExportSessionDate] = useState(new Date().toISOString().split('T')[0]);
  const [exportStudentId, setExportStudentId] = useState('');
  const [exportModuleId, setExportModuleId] = useState('');
  const [exportBatchId, setExportBatchId] = useState('');
  const [exportLabGroupId, setExportLabGroupId] = useState('');
  const [exportSemester, setExportSemester] = useState('Year 2 Semester 1');
  const [exportThreshold, setExportThreshold] = useState(80.0);
  const [exportHallId, setExportHallId] = useState('');
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');

  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [tableFilter, setTableFilter] = useState('');
  const [exportLoading, setExportLoading] = useState({ PDF: false, EXCEL: false, CSV: false });

  // Dropdown Reference Data
  const [myFinalizedSessions, setMyFinalizedSessions] = useState([]);
  const [moduleOptions, setModuleOptions] = useState([]);
  const [batchOptions, setBatchOptions] = useState([]);
  const [exportLabGroups, setExportLabGroups] = useState([]);
  const [hallOptions, setHallOptions] = useState([]);

  // =========================================================================
  // ANALYTICS TAB STATE (From Phase 7)
  // =========================================================================
  const [analyticsModuleId, setAnalyticsModuleId] = useState('');
  const [analyticsBatchId, setAnalyticsBatchId] = useState('');
  const [analyticsLabGroupId, setAnalyticsLabGroupId] = useState('');
  const [analyticsLabGroups, setAnalyticsLabGroups] = useState([]);
  const [analyticsSemester, setAnalyticsSemester] = useState('');
  const [analyticsStartDate, setAnalyticsStartDate] = useState('');
  const [analyticsEndDate, setAnalyticsEndDate] = useState('');
  const [analyticsThreshold, setAnalyticsThreshold] = useState(75);
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [overview, setOverview] = useState(null);
  const [trends, setTrends] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [modules, setModules] = useState([]);
  const [batches, setBatches] = useState([]);
  const [groupAnalytics, setGroupAnalytics] = useState([]);
  const [students, setStudents] = useState([]);

  // Load lecturer form options and finalized sessions
  useEffect(() => {
    async function loadFormOptions() {
      try {
        const [optRes, sessRes, hallRes] = await Promise.allSettled([
          sessionService.getFormOptions(),
          sessionService.getMySessions({ status: 'FINALIZED', size: 100 }),
          academicService.getLaboratoryHalls({ size: 100 }),
        ]);

        if (optRes.status === 'fulfilled' && optRes.value?.data) {
          setModuleOptions(optRes.value.data.modules || []);
          setBatchOptions(optRes.value.data.batches || []);
        }
        if (sessRes.status === 'fulfilled' && sessRes.value?.data?.content) {
          setMyFinalizedSessions(sessRes.value.data.content);
          if (sessRes.value.data.content.length > 0 && !exportSessionId) {
            setExportSessionId(sessRes.value.data.content[0].id);
          }
        }
        if (hallRes.status === 'fulfilled' && hallRes.value?.data?.content) {
          setHallOptions(hallRes.value.data.content);
        }
      } catch (err) {
        console.error('Failed to load lecturer options', err);
      }
    }
    loadFormOptions();
  }, []);

  // Load lab groups for export batch
  useEffect(() => {
    if (!exportBatchId) {
      setExportLabGroups([]);
      setExportLabGroupId('');
      return;
    }
    academicService.labGroup.getGroupsByBatch(exportBatchId)
      .then((res) => {
        if (res.data) {
          setExportLabGroups(Array.isArray(res.data) ? res.data : (res.data.content || []));
        } else {
          setExportLabGroups([]);
        }
      })
      .catch(() => setExportLabGroups([]));
  }, [exportBatchId]);

  // Load lab groups for analytics batch
  useEffect(() => {
    if (!analyticsBatchId) {
      setAnalyticsLabGroups([]);
      setAnalyticsLabGroupId('');
      return;
    }
    academicService.labGroup.getGroupsByBatch(analyticsBatchId)
      .then((res) => {
        if (res.data) {
          setAnalyticsLabGroups(Array.isArray(res.data) ? res.data : (res.data.content || []));
        } else {
          setAnalyticsLabGroups([]);
        }
      })
      .catch(() => setAnalyticsLabGroups([]));
  }, [analyticsBatchId]);

  // Fetch Analytics Data (Phase 7 tab)
  const fetchAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const params = {};
      if (analyticsModuleId) params.moduleId = analyticsModuleId;
      if (analyticsBatchId) params.batchId = analyticsBatchId;
      if (analyticsLabGroupId) params.labGroupId = analyticsLabGroupId;
      if (analyticsSemester) params.semester = analyticsSemester;
      if (analyticsStartDate) params.startDate = analyticsStartDate;
      if (analyticsEndDate) params.endDate = analyticsEndDate;

      const studentParams = {
        ...params,
        threshold: analyticsThreshold,
        search: studentSearch,
      };

      const [overviewRes, trendsRes, sessionsRes, modRes, batchRes, studentsRes, groupsRes] = await Promise.all([
        analyticsService.getLecturerOverview(params),
        analyticsService.getLecturerAttendanceTrends(params),
        analyticsService.getLecturerSessions(params),
        analyticsService.getLecturerModules(params),
        analyticsService.getLecturerBatches(params),
        analyticsService.getLecturerStudents(studentParams),
        analyticsService.getLecturerGroupAnalytics(params),
      ]);

      if (overviewRes.success) setOverview(overviewRes.data);
      if (trendsRes.success) setTrends(trendsRes.data || []);
      if (sessionsRes.success) setSessions(sessionsRes.data || []);
      if (modRes.success) setModules(modRes.data || []);
      if (batchRes.success) setBatches(batchRes.data || []);
      if (studentsRes.success) setStudents(studentsRes.data || []);
      if (groupsRes.success) setGroupAnalytics(groupsRes.data || []);
    } catch (err) {
      showToast(err.message || 'Failed to fetch analytics', 'error');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [analyticsModuleId, analyticsBatchId, analyticsLabGroupId, analyticsSemester, analyticsStartDate, analyticsEndDate, analyticsThreshold, studentSearch, showToast]);

  useEffect(() => {
    if (activeTab === 'ANALYTICS') {
      fetchAnalytics();
    }
  }, [activeTab, fetchAnalytics]);

  // Build report query params
  const getReportParams = () => {
    const params = {};
    if (exportLabGroupId) params.labGroupId = exportLabGroupId;
    if (reportType === 'SESSION' && exportSessionId) params.sessionId = exportSessionId;
    if (reportType === 'DAILY' && exportSessionDate) params.sessionDate = exportSessionDate;
    if (reportType === 'STUDENT_HISTORY') {
      if (exportStudentId) params.studentId = exportStudentId;
      if (exportModuleId) params.moduleId = exportModuleId;
    }
    if (reportType === 'MODULE') {
      if (exportModuleId) params.moduleId = exportModuleId;
      if (exportBatchId) params.batchId = exportBatchId;
    }
    if (reportType === 'BATCH') {
      if (exportBatchId) params.batchId = exportBatchId;
      if (exportModuleId) params.moduleId = exportModuleId;
    }
    if (reportType === 'SEMESTER') {
      if (exportSemester) params.semester = exportSemester;
      if (exportBatchId) params.batchId = exportBatchId;
      if (exportModuleId) params.moduleId = exportModuleId;
    }
    if (reportType === 'LOW_ATTENDANCE') {
      if (exportThreshold) params.threshold = exportThreshold;
      if (exportModuleId) params.moduleId = exportModuleId;
      if (exportBatchId) params.batchId = exportBatchId;
    }
    if (reportType === 'HALL') {
      if (exportHallId) params.hallId = exportHallId;
    }
    if (reportType === 'CROSS_GROUP') {
      if (exportBatchId) params.batchId = exportBatchId;
      if (exportLabGroupId) params.labGroupId = exportLabGroupId;
      if (exportModuleId) params.moduleId = exportModuleId;
    }
    if (exportStartDate) params.startDate = exportStartDate;
    if (exportEndDate) params.endDate = exportEndDate;

    return params;
  };

  // Generate Report Preview
  const handleGeneratePreview = async () => {
    setLoadingPreview(true);
    setPreviewData(null);
    try {
      const params = getReportParams();

      if (reportType === 'SESSION' && !params.sessionId) {
        showToast('Please select a finalized lab session', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'DAILY' && !params.sessionDate) {
        showToast('Please select a date', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'STUDENT_HISTORY' && !params.studentId) {
        showToast('Please specify a Student UUID or matriculation ID', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'MODULE' && !params.moduleId) {
        showToast('Please select an assigned module', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'BATCH' && !params.batchId) {
        showToast('Please select a batch cohort', 'warning');
        setLoadingPreview(false);
        return;
      }
      if (reportType === 'HALL' && !params.hallId) {
        showToast('Please select a laboratory hall', 'warning');
        setLoadingPreview(false);
        return;
      }

      const res = await reportService.getLecturerReportPreview(reportType, params);
      if (res.success && res.data) {
        setPreviewData(res.data);
        showToast(`${res.data.title} preview generated`, 'success');
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

  // Download Report
  const handleExport = async (format) => {
    setExportLoading((prev) => ({ ...prev, [format]: true }));
    try {
      const params = getReportParams();
      await reportService.downloadLecturerReport(reportType, format, params);
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

  const displayedStudents = showLowOnly
    ? students.filter((s) => s.isLowAttendance)
    : students;
  const lowAttendanceCount = students.filter((s) => s.isLowAttendance).length;

  return (
    <div className="space-y-6">
      {/* Page Header with Dual-Mode Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <FileSpreadsheet className="h-7 w-7 text-teal-400" />
            Attendance Reports & Analytics
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Access authorized attendance exports (PDF, Excel, CSV) and interactive analytical visualisations.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="inline-flex p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('EXPORTS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'EXPORTS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Download className="h-4 w-4" />
            Official Reports & Exports
          </button>
          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'ANALYTICS'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            Interactive Analytics
          </button>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* TAB 1: OFFICIAL REPORTS & EXPORTS (PHASE 8)                           */}
      {/* ===================================================================== */}
      {activeTab === 'EXPORTS' && (
        <div className="space-y-6">
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
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all relative overflow-hidden group ${
                    isSelected
                      ? 'bg-teal-500/10 border-teal-500/50 text-white shadow-lg shadow-teal-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wider ${isSelected ? 'text-teal-400' : 'text-slate-400'}`}>
                      {t.label}
                    </span>
                    {isSelected && <CheckCircle2 className="h-4 w-4 text-teal-400" />}
                  </div>
                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                    {t.desc}
                  </p>
                </button>
              );
            })}
          </div>

          {/* 2. Parameters & Filter Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Filter className="h-4 w-4 text-teal-400" />
                Authorized Parameters for {reportType}
              </div>
              <span className="text-[11px] text-teal-400 font-mono">
                Only your assigned data is accessible
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* SESSION: Session Selector */}
              {reportType === 'SESSION' && (
                <div className="lg:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                    Your Finalized Session *
                  </label>
                  <select
                    value={exportSessionId}
                    onChange={(e) => setExportSessionId(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Finalized Lab Session --</option>
                    {myFinalizedSessions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.sessionCode} — {s.module?.moduleCode} ({s.sessionDate})
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
                    value={exportSessionDate}
                    onChange={(e) => setExportSessionDate(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}

              {/* STUDENT_HISTORY: Student ID Input */}
              {reportType === 'STUDENT_HISTORY' && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                    Student UUID / Matriculation ID *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. IT21001234 or Student UUID"
                    value={exportStudentId}
                    onChange={(e) => setExportStudentId(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              )}

              {/* MODULE: Module Dropdown */}
              {(reportType === 'MODULE' || reportType === 'STUDENT_HISTORY' || reportType === 'BATCH' || reportType === 'SEMESTER' || reportType === 'LOW_ATTENDANCE' || reportType === 'CROSS_GROUP') && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                    Assigned Module {reportType === 'MODULE' && '*'}
                  </label>
                  <select
                    value={exportModuleId}
                    onChange={(e) => setExportModuleId(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">{reportType === 'MODULE' ? '-- Select Assigned Module --' : 'All My Modules'}</option>
                    {moduleOptions.map((m) => (
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
                    Assigned Batch {reportType === 'BATCH' && '*'}
                  </label>
                  <select
                    value={exportBatchId}
                    onChange={(e) => setExportBatchId(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">{reportType === 'BATCH' ? '-- Select Batch --' : 'All Batches'}</option>
                    {batchOptions.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.batchCode} ({b.academicYear})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* LAB GROUP: Lab Group Dropdown */}
              {(exportBatchId || reportType === 'CROSS_GROUP' || reportType === 'BATCH') && (
                <div>
                  <label className="block text-[11px] font-medium text-slate-400 mb-1.5">
                    Lab Group (Optional)
                  </label>
                  <select
                    value={exportLabGroupId}
                    onChange={(e) => setExportLabGroupId(e.target.value)}
                    disabled={!exportBatchId && exportLabGroups.length === 0}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 disabled:opacity-50"
                  >
                    <option value="">{exportBatchId ? 'All Groups / Whole Batch' : 'Select Batch First'}</option>
                    {exportLabGroups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.groupName}
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
                    value={exportHallId}
                    onChange={(e) => setExportHallId(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  >
                    <option value="">-- Select Laboratory Hall --</option>
                    {hallOptions.map((h) => (
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
                    value={exportSemester}
                    onChange={(e) => setExportSemester(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
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
                    value={exportThreshold}
                    onChange={(e) => setExportThreshold(parseFloat(e.target.value))}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
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
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
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
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            {/* Generate Preview Action Bar */}
            <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-teal-400" />
                Aggregates only your finalized sessions; cancelled sessions are strictly excluded.
              </div>
              <button
                onClick={handleGeneratePreview}
                disabled={loadingPreview}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loadingPreview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating Official Preview...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Generate Report Preview
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 3. Report Preview & Download Actions */}
          {previewData && (
            <div className="space-y-6">
              {/* Summary Metric Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Expected Students
                  </span>
                  <span className="text-2xl font-black text-white">
                    {previewData.expectedCount}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
                  <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                    Present Attendances
                  </span>
                  <span className="text-2xl font-black text-teal-400">
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
                    Attendance Percentage
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
                      Visitors are tracked and reported separately from standard roster percentage calculations.
                    </span>
                  </div>
                )}
              </div>

              {/* Metadata Card */}
              {previewData.metadata && Object.keys(previewData.metadata).length > 0 && (
                <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs">
                  <div className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-teal-400" />
                    Report Parameters & Audit Header
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

              {/* Table with Export Buttons */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                      <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Filter rows..."
                        value={tableFilter}
                        onChange={(e) => setTableFilter(e.target.value)}
                        className="w-full bg-slate-800/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-400 focus:outline-none focus:border-teal-500"
                      />
                    </div>
                    <span className="text-xs text-slate-400 whitespace-nowrap">
                      Showing <strong>{filteredRows.length}</strong> of {previewData.rows.length} rows
                    </span>
                  </div>

                  {/* Export Buttons */}
                  <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
                    <button
                      onClick={() => handleExport('PDF')}
                      disabled={exportLoading.PDF}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {exportLoading.PDF ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileText className="h-3.5 w-3.5" />
                      )}
                      Export PDF
                    </button>

                    <button
                      onClick={() => handleExport('EXCEL')}
                      disabled={exportLoading.EXCEL}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {exportLoading.EXCEL ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-3.5 w-3.5" />
                      )}
                      Export Excel (.xlsx)
                    </button>

                    <button
                      onClick={() => handleExport('CSV')}
                      disabled={exportLoading.CSV}
                      className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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

                {/* Data Table */}
                <div className="overflow-x-auto">
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
                            No matching records found.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

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
      )}

      {/* ===================================================================== */}
      {/* TAB 2: INTERACTIVE ANALYTICS & CHARTS (PHASE 7)                       */}
      {/* ===================================================================== */}
      {activeTab === 'ANALYTICS' && (
        <div className="space-y-6">
          {/* Analytics Filters Card */}
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <Filter className="h-4 w-4 text-teal-400" />
                Analytics Filters
              </div>
              <button
                onClick={() => {
                  setAnalyticsModuleId('');
                  setAnalyticsBatchId('');
                  setAnalyticsSemester('');
                  setAnalyticsStartDate('');
                  setAnalyticsEndDate('');
                  setAnalyticsThreshold(75);
                  setShowLowOnly(false);
                  setStudentSearch('');
                }}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-teal-400 transition cursor-pointer"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Module</label>
                <select
                  value={analyticsModuleId}
                  onChange={(e) => setAnalyticsModuleId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="">All Assigned Modules</option>
                  {moduleOptions.map((m) => (
                    <option key={m.id} value={m.id}>{m.moduleCode} - {m.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Batch</label>
                <select
                  value={analyticsBatchId}
                  onChange={(e) => setAnalyticsBatchId(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                >
                  <option value="">All Batches</option>
                  {batchOptions.map((b) => (
                    <option key={b.id} value={b.id}>{b.batchCode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Lab Group</label>
                <select
                  value={analyticsLabGroupId}
                  onChange={(e) => setAnalyticsLabGroupId(e.target.value)}
                  disabled={!analyticsBatchId && analyticsLabGroups.length === 0}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500 disabled:opacity-50"
                >
                  <option value="">{analyticsBatchId ? 'All Groups in Batch' : 'Select Batch First'}</option>
                  {analyticsLabGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.groupName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">Semester</label>
                <input
                  type="text"
                  placeholder="e.g. Y2S1"
                  value={analyticsSemester}
                  onChange={(e) => setAnalyticsSemester(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
                <input
                  type="date"
                  value={analyticsStartDate}
                  onChange={(e) => setAnalyticsStartDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
                <input
                  type="date"
                  value={analyticsEndDate}
                  onChange={(e) => setAnalyticsEndDate(e.target.value)}
                  className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Finalized Sessions
              </span>
              <span className="text-2xl font-black text-white">
                {overview?.finalizedSessionsCount ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Official statistics count</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider block mb-1">
                Average Turnout
              </span>
              <span className="text-2xl font-black text-teal-400">
                {overview?.attendancePercentage ?? 'N/A'}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Present attendance rate</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-amber-300 uppercase tracking-wider block mb-1">
                Cross-Group Visitors
              </span>
              <span className="text-2xl font-black text-amber-400">
                {overview?.totalCrossGroupVisitors ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Visiting students received</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                Active Provisional
              </span>
              <span className="text-2xl font-black text-amber-400">
                {overview?.activeProvisionalSessionsCount ?? 0}
              </span>
              <span className="text-[10px] text-amber-500/80 block mt-1">Provisional sessions</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 shadow-md col-span-2 lg:col-span-1">
              <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-1">
                Low Attendance
              </span>
              <span className="text-2xl font-black text-rose-400">
                {lowAttendanceCount}
              </span>
              <span className="text-[10px] text-slate-500 block mt-1">Below {analyticsThreshold}%</span>
            </div>
          </div>

          {/* Group Attendance Breakdown (When Available) */}
          {groupAnalytics.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
              <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-400" />
                Lab Group Attendance & Cross-Group Breakdown ({groupAnalytics.length} Groups)
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-2.5 px-3">Lab Group</th>
                      <th className="pb-2.5 px-3">Batch</th>
                      <th className="pb-2.5 px-3">Finalized Sessions</th>
                      <th className="pb-2.5 px-3">Expected Slots</th>
                      <th className="pb-2.5 px-3">Present</th>
                      <th className="pb-2.5 px-3">Absent</th>
                      <th className="pb-2.5 px-3">Turnout Rate</th>
                      <th className="pb-2.5 px-3 text-amber-400">Visitors Received</th>
                      <th className="pb-2.5 px-3 text-cyan-400">Outgoing Visits</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-200">
                    {groupAnalytics.map((g) => (
                      <tr key={g.groupId} className="hover:bg-slate-850/50">
                        <td className="py-2.5 px-3 font-semibold text-white">{g.groupName}</td>
                        <td className="py-2.5 px-3 text-slate-400 font-mono">{g.batchCode}</td>
                        <td className="py-2.5 px-3">{g.finalizedSessions}</td>
                        <td className="py-2.5 px-3 font-mono">{g.totalExpected}</td>
                        <td className="py-2.5 px-3 text-emerald-400 font-mono">{g.totalPresent}</td>
                        <td className="py-2.5 px-3 text-rose-400 font-mono">{g.totalAbsent}</td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-teal-400">{g.attendancePercentage}</span>
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-400">
                          {g.visitorsReceived || 0}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                          {g.outgoingVisits || 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Attendance Trend Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-teal-400" />
              Chronological Attendance Trends (Finalized Sessions)
            </h3>
            {trends.length > 0 ? (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trends}>
                    <defs>
                      <linearGradient id="rateGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="sessionDate" stroke="#64748b" textAnchor="end" height={45} tick={{ fontSize: 10 }} />
                    <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }} />
                    <Area type="monotone" dataKey="attendanceRate" stroke="#14b8a6" strokeWidth={2} fill="url(#rateGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-500 text-xs">
                No finalized session trends available for the selected filters.
              </div>
            )}
          </div>

          {/* Student Turnout Compliance List */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Users className="h-4 w-4 text-teal-400" />
                Student Attendance Audit Records ({displayedStudents.length})
              </h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowLowOnly(!showLowOnly)}
                  className={`text-xs px-3 py-1.5 rounded-lg border font-semibold transition ${
                    showLowOnly
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                  }`}
                >
                  {showLowOnly ? 'Show All Students' : 'Show At-Risk Only'}
                </button>
                <div className="relative w-48">
                  <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search student..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-8 pr-2 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-800/60 text-slate-400 font-semibold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Student ID</th>
                    <th className="py-2.5 px-3">Full Name</th>
                    <th className="py-2.5 px-3">Cohort</th>
                    <th className="py-2.5 px-3 text-center">Eligible</th>
                    <th className="py-2.5 px-3 text-center">Attended</th>
                    <th className="py-2.5 px-3 text-center">Absent</th>
                    <th className="py-2.5 px-3 text-right">Attendance Rate</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {displayedStudents.map((s) => (
                    <tr key={s.studentId} className="hover:bg-slate-800/40">
                      <td className="py-2.5 px-3 font-mono text-teal-400">{s.officialStudentId}</td>
                      <td className="py-2.5 px-3 font-medium text-white">{s.fullName}</td>
                      <td className="py-2.5 px-3 text-slate-400">{s.batchCode}</td>
                      <td className="py-2.5 px-3 text-center font-mono">{s.eligibleFinalizedSessions}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-emerald-400">{s.attendedSessions}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-400">{s.missedSessions}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-teal-400">{s.attendancePercentage}</td>
                      <td className="py-2.5 px-3 text-center">
                        {s.isLowAttendance ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="h-3 w-3" />
                            LOW ATTENDANCE
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="h-3 w-3" />
                            COMPLIANT
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
