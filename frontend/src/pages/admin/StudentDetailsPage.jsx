import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  User, 
  GraduationCap, 
  Calendar, 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ShieldCheck, 
  AlertCircle,
  FileText,
  Download,
  RefreshCw,
  Printer,
  ShieldAlert,
  Building2,
  Mail
} from 'lucide-react';
import { studentService, triggerBlobDownload } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { StatusBadge, Modal } from '../../components/common';

export default function StudentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [student, setStudent] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // QR Preview & Action states
  const [qrPreviewUrl, setQrPreviewUrl] = useState(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
  const [regenerateReason, setRegenerateReason] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [downloadingFormat, setDownloadingFormat] = useState(null);

  const fetchQrPreview = useCallback(async (studentId) => {
    try {
      setQrLoading(true);
      const res = await studentService.getQrCode(studentId, 'standard');
      const blob = res.data || res;
      const objectUrl = URL.createObjectURL(blob);
      setQrPreviewUrl(objectUrl);
    } catch (err) {
      console.error('Failed to load QR preview', err);
    } finally {
      setQrLoading(false);
    }
  }, []);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentRes, historyRes] = await Promise.all([
        studentService.getStudentById(id),
        studentService.getAttendanceHistory(id),
      ]);

      if (studentRes.success && studentRes.data) {
        setStudent(studentRes.data);
        fetchQrPreview(studentRes.data.id);
      }
      if (historyRes.success && historyRes.data) {
        setHistoryData(historyRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load student attendance details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, fetchQrPreview, showToast]);

  const handleDownloadPng = async () => {
    if (!student) return;
    try {
      setDownloadingFormat('png');
      const res = await studentService.getQrCode(student.id, 'standard');
      const blob = res.data || res;
      triggerBlobDownload(blob, `${student.studentId}_QR.png`);
      showToast('Student QR code PNG downloaded', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download QR code', 'error');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleDownloadSticker = async () => {
    if (!student) return;
    try {
      setDownloadingFormat('sticker');
      const res = await studentService.getQrCode(student.id, 'sticker');
      const blob = res.data || res;
      triggerBlobDownload(blob, `${student.studentId}_Sticker.png`);
      showToast('Print-ready sticker badge downloaded', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to download sticker layout', 'error');
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleRegenerateSubmit = async (e) => {
    e.preventDefault();
    if (!regenerateReason.trim()) {
      showToast('Please provide an official justification reason', 'error');
      return;
    }
    try {
      setRegenerating(true);
      const res = await studentService.regenerateQrCode(student.id, regenerateReason.trim());
      if (res.success && res.data) {
        setStudent(res.data);
      }
      showToast('QR token successfully regenerated. Old physical prints invalidated.', 'success');
      setIsRegenerateModalOpen(false);
      setRegenerateReason('');
      fetchQrPreview(student.id);
    } catch (err) {
      showToast(err.message || 'Failed to regenerate QR token', 'error');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading student attendance ledger...</span>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate('/admin/students')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Students</span>
        </button>
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          Student record not found.
        </div>
      </div>
    );
  }

  const {
    totalEligibleSessions = 0,
    attendedSessions = 0,
    missedSessions = 0,
    attendancePercentage = null,
    attendanceRecords = [],
  } = historyData || {};

  return (
    <div className="p-8 space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/admin/students')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Student Roster</span>
        </button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <User className="h-7 w-7 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white tracking-tight">
                  {student.title ? <span className="text-emerald-400 font-semibold mr-2">{student.title}</span> : null}
                  {student.fullName}
                </h1>
                <span className="font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded text-xs">
                  {student.studentId}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                    student.isActive
                      ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50'
                      : 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                  }`}
                >
                  {student.isActive ? 'Active Student' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-400 mt-1">
                {student.email && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                    <span><strong className="text-slate-300 font-medium">Inst:</strong> {student.email}</span>
                  </span>
                )}
                {student.personalEmail && (
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                    <span><strong className="text-slate-300 font-medium">Personal:</strong> {student.personalEmail}</span>
                  </span>
                )}
                {!student.email && !student.personalEmail && (
                  <span className="text-slate-500 italic">No email registered</span>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <GraduationCap className="h-3.5 w-3.5 text-cyan-400" />
                  {student.degreeProgrammeCode ? `${student.degreeProgrammeCode} — ` : ''}{student.degreeProgrammeName}
                </span>
                {student.offeredBy && (
                  <span className="flex items-center gap-1.5 bg-teal-950/60 border border-teal-800/50 text-teal-300 px-2.5 py-1 rounded-lg font-medium">
                    <Building2 className="h-3.5 w-3.5 text-teal-400" />
                    Offered By: {student.offeredBy}
                  </span>
                )}
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-teal-400" />
                  Cohort: {student.batchCode} ({student.batchAcademicYear || 'Current'})
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Users className="h-3.5 w-3.5 text-emerald-400" />
                  Home Group: {student.labGroupName || (student.labGroup ? student.labGroup.groupName : 'Whole Batch')}
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg font-mono">
                  <QrCode className="h-3.5 w-3.5 text-amber-400" />
                  Badge QR: {student.hasQrToken ? 'Mapped & Verified (SHA-256)' : 'Unmapped'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Institutional QR Badge & Credential Panel */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* QR Preview Card */}
            <div className="relative p-3 bg-white rounded-2xl shadow-md shrink-0 flex flex-col items-center justify-center w-44 h-44 border border-slate-200">
              {qrLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-[10px] text-slate-500 font-medium">Generating QR...</span>
                </div>
              ) : qrPreviewUrl ? (
                <img
                  src={qrPreviewUrl}
                  alt={`QR Badge for ${student.studentId}`}
                  className="w-36 h-36 object-contain"
                />
              ) : (
                <QrCode className="h-20 w-20 text-slate-400" />
              )}
            </div>

            {/* QR Metadata & Details */}
            <div className="space-y-3 text-center sm:text-left">
              <div>
                <div className="flex items-center justify-center sm:justify-start gap-2.5">
                  <h2 className="text-lg font-bold text-white tracking-tight">Institutional QR Badge</h2>
                  <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    Version v{student.qrVersion || 1}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1 max-w-lg leading-relaxed">
                  Cryptographically signed HMAC-SHA256 opaque token. Encodes zero personal data (no plain name, no student ID, no email). Lab scanners resolve and verify this token via indexed hash lookup.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 block text-[11px]">Security Verification:</span>
                  <span className="text-emerald-400 font-mono font-medium">HMAC-SHA256 (Base64URL)</span>
                </div>
                <div className="bg-slate-800/60 px-3 py-2 rounded-xl border border-slate-700/50">
                  <span className="text-slate-400 block text-[11px]">Token Generated:</span>
                  <span className="text-slate-200 font-medium">
                    {student.qrGeneratedAt
                      ? new Date(student.qrGeneratedAt).toLocaleString()
                      : 'Initial Provisioning'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 justify-center">
            <button
              type="button"
              onClick={handleDownloadPng}
              disabled={downloadingFormat === 'png'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition"
              title="Download standalone high-resolution QR PNG"
            >
              {downloadingFormat === 'png' ? (
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              <span>Download PNG</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadSticker}
              disabled={downloadingFormat === 'sticker'}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-slate-200 text-xs font-medium transition"
              title="Download print-ready sticker layout with name, ID, and batch"
            >
              {downloadingFormat === 'sticker' ? (
                <div className="w-3.5 h-3.5 border-2 border-slate-300 border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="h-3.5 w-3.5 text-cyan-400" />
              )}
              <span>Download Sticker</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setRegenerateReason('');
                setIsRegenerateModalOpen(true);
              }}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/50 border border-rose-800/60 text-rose-300 text-xs font-medium transition"
              title="Invalidate current badge and generate a new token version"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Regenerate QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* Total Eligible Sessions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Eligible Sessions</span>
            <FileText className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">{totalEligibleSessions}</div>
          <span className="text-xs text-slate-500 mt-1 block">Closed / finalized lab sessions</span>
        </div>

        {/* Attended Sessions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attended Labs</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">{attendedSessions}</div>
          <span className="text-xs text-slate-500 mt-1 block">Present or late arrivals</span>
        </div>

        {/* Missed Sessions */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Missed Labs</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="text-3xl font-bold text-rose-400 tracking-tight">{missedSessions}</div>
          <span className="text-xs text-slate-500 mt-1 block">Finalized as absent</span>
        </div>

        {/* Attendance Percentage */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Cumulative Rate</span>
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {attendancePercentage !== null ? (
              <span className={attendancePercentage >= 80 ? 'text-emerald-400' : 'text-amber-400'}>
                {attendancePercentage.toFixed(1)}%
              </span>
            ) : (
              <span className="text-slate-500 font-mono text-2xl">N/A</span>
            )}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            {attendancePercentage !== null ? 'Target benchmark: 80.0%' : 'No finalized sessions recorded yet'}
          </span>
        </div>

        {/* Cross-Group Visits */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Other Group Visits</span>
            <Users className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-bold text-amber-400 tracking-tight">
            {historyData?.crossGroupVisitsCount ?? attendanceRecords.filter((r) => r.isCrossGroup).length}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Attended as visitor (isolated)</span>
        </div>
      </div>

      {/* Attendance History Ledger */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <div>
          <h2 className="text-lg font-bold text-white tracking-tight">Immutable Session History Ledger</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Historical attendance records are preserved permanently across batch reassignments.
          </p>
        </div>

        {attendanceRecords.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl text-slate-400 text-sm">
            No lab session enrollments found for this student.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-800 overflow-hidden">
            {/* Mobile Stacked Card View (< 768px) */}
            <div className="md:hidden divide-y divide-slate-800/80">
              {attendanceRecords.map((item, idx) => {
                let statusBadgeClass = 'bg-slate-800 text-slate-400';
                if (item.attendanceStatus === 'PRESENT') {
                  statusBadgeClass = 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50';
                } else if (item.attendanceStatus === 'LATE') {
                  statusBadgeClass = 'bg-amber-950/60 text-amber-400 border border-amber-800/50';
                } else if (item.attendanceStatus === 'ABSENT') {
                  statusBadgeClass = 'bg-rose-950/60 text-rose-400 border border-rose-800/50';
                } else if (item.attendanceStatus === 'UNRECORDED') {
                  statusBadgeClass = 'bg-slate-800 text-slate-400 border border-slate-700';
                }

                return (
                  <div key={idx} className="p-4 space-y-2.5 bg-slate-900/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono font-bold text-emerald-400 text-xs">{item.sessionCode}</span>
                        <p className="text-xs font-bold text-white mt-0.5">{item.moduleCode} - {item.moduleName}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${statusBadgeClass}`}>
                        {item.attendanceStatus}
                      </span>
                    </div>

                    {item.isCrossGroup && (
                      <div className="p-2 rounded-lg bg-amber-950/20 border border-amber-900/30 text-[11px] text-amber-300">
                        Cross-Group Session (Host Group: {item.sessionGroupName || '—'})
                        {item.lecturerName && <span className="block text-slate-400 text-[10px]">Lecturer: {item.lecturerName}</span>}
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/40 text-slate-400">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Date & Hall</span>
                        <span className="text-slate-200">{item.sessionDate}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">{item.hallCode} ({item.startTime} - {item.endTime})</span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Method & Time</span>
                        <span className="text-slate-200 font-mono text-[11px]">{item.attendanceMethod}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          {item.markedAt ? new Date(item.markedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table (>= 768px) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/70 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-700/60">
                <tr>
                  <th className="px-4 py-3 font-semibold">Session Code</th>
                  <th className="px-4 py-3 font-semibold">Module</th>
                  <th className="px-4 py-3 font-semibold">Hall</th>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Session Status</th>
                  <th className="px-4 py-3 font-semibold">Attendance</th>
                  <th className="px-4 py-3 font-semibold">Verification Method</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-200">
                {attendanceRecords.map((item, idx) => {
                  let statusBadgeClass = 'bg-slate-800 text-slate-400';
                  if (item.attendanceStatus === 'PRESENT') {
                    statusBadgeClass = 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/50';
                  } else if (item.attendanceStatus === 'LATE') {
                    statusBadgeClass = 'bg-amber-950/60 text-amber-400 border border-amber-800/50';
                  } else if (item.attendanceStatus === 'ABSENT') {
                    statusBadgeClass = 'bg-rose-950/60 text-rose-400 border border-rose-800/50';
                  } else if (item.attendanceStatus === 'UNRECORDED') {
                    statusBadgeClass = 'bg-slate-800 text-slate-400 border border-slate-700';
                  }

                  return (
                    <tr key={idx} className="hover:bg-slate-850/40 transition">
                      <td className="px-4 py-3 font-mono font-medium text-emerald-400 text-xs">
                        {item.sessionCode}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-slate-100 block text-xs">
                          {item.moduleCode}
                        </span>
                        <span className="text-[11px] text-slate-400 truncate max-w-xs block">
                          {item.moduleName}
                        </span>
                        {item.isCrossGroup && (
                          <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              Cross-Group (Session: Group {item.sessionGroupName || '—'})
                            </span>
                            {item.lecturerName && (
                              <span className="text-[10px] text-slate-400">
                                Lect: {item.lecturerName}
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-slate-300">
                        {item.hallCode}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span className="block text-slate-200">{item.sessionDate}</span>
                        <span className="text-[11px] text-slate-500 font-mono">
                          {item.startTime} - {item.endTime}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[11px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {item.sessionStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${statusBadgeClass}`}>
                          {item.attendanceStatus}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        <span className="font-mono text-slate-300 block">{item.attendanceMethod}</span>
                        {item.markedAt && (
                          <span className="text-[11px] text-slate-500">
                            {new Date(item.markedAt).toLocaleString()}
                          </span>
                        )}
                        {item.justification && (
                          <span className="text-[11px] text-amber-300 italic block mt-0.5">
                            Note: {item.justification}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>
        )}
      </div>

      {/* QR Regeneration Confirmation Modal */}
      <Modal
        isOpen={isRegenerateModalOpen}
        onClose={() => setIsRegenerateModalOpen(false)}
        title="Regenerate Student QR Token"
        subtitle={`Student: ${student.fullName} (${student.studentId})`}
      >
        <form onSubmit={handleRegenerateSubmit} className="space-y-4">
          <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-xl flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-200 space-y-1">
              <span className="font-semibold block text-amber-300">
                Warning: Token Invalidation
              </span>
              <p>
                Regenerating this QR code will increment the token version (v{student.qrVersion || 1} &rarr; v{(student.qrVersion || 1) + 1}).
              </p>
              <p className="font-semibold text-rose-300">
                All previously printed stickers and badges for this student will IMMEDIATELY stop working and will be rejected at lab scanners.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              Reason for QR Regeneration <span className="text-rose-400">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={regenerateReason}
              onChange={(e) => setRegenerateReason(e.target.value)}
              placeholder="e.g., Physical sticker damaged, lost ID card, or security leak reported..."
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-amber-500 placeholder:text-slate-500"
            />
            <span className="text-[11px] text-slate-500 block mt-1">
              This justification is permanently recorded in the immutable administrative audit logs.
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsRegenerateModalOpen(false)}
              disabled={regenerating}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={regenerating || !regenerateReason.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {regenerating && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              <span>Confirm & Invalidate Old QR</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
