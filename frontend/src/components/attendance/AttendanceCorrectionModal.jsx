import React, { useState } from 'react';
import { 
  ShieldAlert, 
  X, 
  Check, 
  Loader2, 
  AlertCircle, 
  User, 
  FileEdit,
  Clock
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'PRESENT', label: 'Present', color: 'emerald' },
  { value: 'ABSENT', label: 'Absent', color: 'rose' },
  { value: 'LATE', label: 'Late', color: 'amber' },
];

export default function AttendanceCorrectionModal({
  isOpen,
  onClose,
  record,
  onSave,
  loading = false,
}) {
  const [newStatus, setNewStatus] = useState(record?.status || 'PRESENT');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  if (!isOpen || !record) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason || reason.trim().length < 5) {
      setError('A mandatory justification reason (at least 5 characters) is required for audit compliance.');
      return;
    }
    setError('');
    onSave(record.id, {
      status: newStatus,
      reason: reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Correct Attendance Record</h3>
              <p className="text-xs text-slate-400">Post-Finalization Audit Adjustment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            aria-label="Close dialog"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition -mr-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-5">
          {/* Student Info Card */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-9 w-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <User className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-white truncate">{record.studentName}</h4>
                <p className="text-xs font-mono text-slate-400 truncate">{record.studentId}</p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                Current
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                  record.status === 'PRESENT'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : record.status === 'LATE'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {record.status}
              </span>
            </div>
          </div>

          {/* New Status Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Updated Status
            </label>
            <div className="grid grid-cols-3 gap-2 sm:gap-2.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewStatus(opt.value)}
                  className={`p-3 min-h-[44px] rounded-xl border text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                    newStatus === opt.value
                      ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-lg shadow-indigo-600/20'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Justification Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2">
              Mandatory Justification Reason <span className="text-rose-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. Official medical certificate #MED-9402 verified by faculty office. Student was present in lab session."
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none min-h-[44px]"
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Audit Logging Notice */}
          <div className="p-3 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-300/90 text-[11px] leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
            <span>
              This correction will be permanently logged in the <strong>Audit Trail</strong> with your user credentials, timestamp, previous status (<code className="text-white">{record.status}</code>), and justification reason.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="min-h-[44px] flex-1 sm:flex-initial px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Audit...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>Save Correction</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
