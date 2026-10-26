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
  FileText
} from 'lucide-react';
import { studentService } from '../../services/academicService';
import { useToast } from '../../context/ToastContext';
import { StatusBadge } from '../../components/common';

export default function StudentDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [student, setStudent] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStudentData = useCallback(async () => {
    try {
      setLoading(true);
      const [studentRes, historyRes] = await Promise.all([
        studentService.getStudentById(id),
        studentService.getAttendanceHistory(id),
      ]);

      if (studentRes.success && studentRes.data) {
        setStudent(studentRes.data);
      }
      if (historyRes.success && historyRes.data) {
        setHistoryData(historyRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load student attendance details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

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
                <h1 className="text-2xl font-bold text-white tracking-tight">{student.fullName}</h1>
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
              <p className="text-sm text-slate-400 mt-1">{student.email}</p>
              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <GraduationCap className="h-3.5 w-3.5 text-cyan-400" />
                  {student.degreeProgrammeCode} — {student.degreeProgrammeName}
                </span>
                <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                  <Calendar className="h-3.5 w-3.5 text-teal-400" />
                  Cohort: {student.batchCode} ({student.batchAcademicYear || 'Current'})
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

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
            <span className="text-xs font-semibold uppercase tracking-wider">Cumulative Attendance</span>
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
          <div className="overflow-x-auto rounded-xl border border-slate-800">
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
        )}
      </div>
    </div>
  );
}
