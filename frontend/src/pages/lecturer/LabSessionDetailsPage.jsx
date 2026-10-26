import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  CalendarClock, 
  Play, 
  XCircle, 
  QrCode, 
  Clock, 
  Building, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert,
  FileText
} from 'lucide-react';
import { sessionService } from '../../services/sessionService';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../../components/common';

export default function LabSessionDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cancel Modal state
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const fetchSession = useCallback(async () => {
    try {
      setLoading(true);
      const res = await sessionService.getLecturerSessionById(id);
      if (res.success && res.data) {
        setSession(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Failed to load session details', 'error');
    } finally {
      setLoading(false);
    }
  }, [id, showToast]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleStartSession = async () => {
    try {
      const res = await sessionService.startSession(id);
      showToast(res.message || 'Session is now ACTIVE! Attendance scanning has been opened.', 'success');
      fetchSession();
    } catch (err) {
      showToast(err.message || 'Failed to start session', 'error');
    }
  };

  const handleCancelSession = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      showToast('Cancellation reason is required', 'error');
      return;
    }

    try {
      setCancelling(true);
      const res = await sessionService.cancelSession(id, { cancellationReason: cancelReason.trim() });
      showToast(res.message || 'Session has been CANCELLED', 'success');
      setIsCancelModalOpen(false);
      fetchSession();
    } catch (err) {
      showToast(err.message || 'Failed to cancel session', 'error');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-400">Loading laboratory session...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="p-8">
        <button
          onClick={() => navigate('/lecturer/sessions')}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Sessions</span>
        </button>
        <div className="p-8 text-center bg-slate-900 border border-slate-800 rounded-2xl text-slate-400">
          Laboratory session not found.
        </div>
      </div>
    );
  }

  const isDraft = session.status === 'DRAFT' || session.status === 'SCHEDULED';
  const isActive = session.status === 'ACTIVE';
  const isFinalized = session.status === 'FINALIZED' || session.status === 'CLOSED';
  const isCancelled = session.status === 'CANCELLED';

  let statusBadgeStyle = 'bg-slate-800 text-slate-400';
  if (isActive) {
    statusBadgeStyle = 'bg-emerald-950/70 text-emerald-400 border border-emerald-700 animate-pulse';
  } else if (isDraft) {
    statusBadgeStyle = 'bg-amber-950/60 text-amber-400 border border-amber-800/50';
  } else if (isFinalized) {
    statusBadgeStyle = 'bg-cyan-950/60 text-cyan-400 border border-cyan-800/50';
  } else if (isCancelled) {
    statusBadgeStyle = 'bg-rose-950/60 text-rose-400 border border-rose-800/50 line-through';
  }

  const attendanceRate = session.expectedStudentCount > 0
    ? ((session.attendedCount / session.expectedStudentCount) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="p-8 space-y-6">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate('/lecturer/sessions')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition mb-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to My Sessions</span>
        </button>
      </div>

      {/* Header Profile Card */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3">
              <span className="font-mono font-bold text-teal-400 bg-teal-950/60 border border-teal-800/60 px-3 py-1 rounded text-sm">
                {session.sessionCode}
              </span>
              <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadgeStyle}`}>
                {session.status}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight mt-2">
              {session.moduleCode} — {session.moduleName}
            </h1>
            <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-300">
              <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                <Users className="h-3.5 w-3.5 text-teal-400" />
                Cohort: <strong className="text-white">{session.batchCode}</strong> ({session.batchAcademicYear || 'Current'})
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                <Building className="h-3.5 w-3.5 text-cyan-400" />
                {session.hallCode} — {session.hallName}
              </span>
              <span className="flex items-center gap-1.5 bg-slate-800/70 px-2.5 py-1 rounded-lg">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
                {session.sessionDate} ({session.startTime} - {session.endTime})
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {isDraft && (
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition"
              >
                <Play className="h-4 w-4 fill-current" />
                <span>Start Session</span>
              </button>
            )}

            {isActive && (
              <Link
                to={`/lecturer/scanner?sessionId=${session.id}`}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition"
              >
                <QrCode className="h-4 w-4" />
                <span>Open Scanner</span>
              </Link>
            )}

            {(isDraft || isActive) && (
              <button
                onClick={() => {
                  setCancelReason('');
                  setIsCancelModalOpen(true);
                }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-400 border border-rose-800/60 text-sm font-semibold transition"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancel Session</span>
              </button>
            )}
          </div>
        </div>

        {/* Active Scanning Status Banner */}
        {isActive && (
          <div className="mt-5 p-3.5 bg-emerald-950/30 border border-emerald-800/50 rounded-xl flex items-center gap-3 text-xs text-emerald-300">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
            <div>
              <strong>Session is ACTIVE:</strong> Real-time attendance check-in window is open. Launch the QR Scanner or verify student badges.
            </div>
          </div>
        )}

        {/* Cancellation Notice */}
        {isCancelled && (
          <div className="mt-5 p-3.5 bg-rose-950/30 border border-rose-800/50 rounded-xl text-xs text-rose-300 space-y-1">
            <span className="font-bold block">Session Cancelled:</span>
            <p>Reason: {session.cancellationReason || 'No reason specified'}</p>
            {session.cancelledAt && (
              <span className="text-[11px] text-rose-400 block">
                Cancelled on: {new Date(session.cancelledAt).toLocaleString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expected Roster</span>
            <Users className="h-4 w-4 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {session.expectedStudentCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Active students in {session.batchCode}</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Attended / Checked-in</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400 tracking-tight">
            {session.attendedCount}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Marked present or late</span>
        </div>

        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-lg">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Check-in Rate</span>
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-bold text-white tracking-tight">
            {attendanceRate}%
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Of expected cohort</span>
        </div>
      </div>

      {/* Lifecycle Timeline Details */}
      <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-lg font-bold text-white tracking-tight">Session Lifecycle Ledger</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-300">
          <div className="p-3.5 bg-slate-800/50 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium block">Created At:</span>
            <span className="font-mono text-white">
              {session.createdAt ? new Date(session.createdAt).toLocaleString() : '—'}
            </span>
          </div>

          <div className="p-3.5 bg-slate-800/50 rounded-xl space-y-1">
            <span className="text-slate-400 font-medium block">Actual Started At:</span>
            <span className="font-mono text-white">
              {session.actualStartedAt ? new Date(session.actualStartedAt).toLocaleString() : 'Not started yet (DRAFT)'}
            </span>
          </div>
        </div>
      </div>

      {/* Cancel Session Modal */}
      <Modal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        title="Cancel Laboratory Session"
      >
        <form onSubmit={handleCancelSession} className="space-y-4">
          <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-xl text-xs text-rose-300 flex items-start gap-2">
            <ShieldAlert className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
            <div>
              <strong>Action is Final:</strong> Cancelling this session will transition its state to CANCELLED and permanently stop attendance check-in. This action will be audit-logged.
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cancellation Reason *
            </label>
            <textarea
              rows={3}
              required
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="e.g. Laboratory power disruption / equipment maintenance..."
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={() => setIsCancelModalOpen(false)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-semibold transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={cancelling || !cancelReason.trim()}
              className="px-4 py-2 bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition"
            >
              {cancelling ? 'Cancelling Session...' : 'Confirm Cancellation'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
