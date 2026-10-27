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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
              <FileEdit className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Correct Attendance Record</h3>
              <p className="text-xs text-slate-400">Post-Finalization Audit Adjustment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Student Info Card */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                <User className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">{record.studentName}</h4>
                <p className="text-xs font-mono text-slate-400">{record.studentId}</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block mb-1">
                Current Status
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
            <div className="grid grid-cols-3 gap-2.5">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setNewStatus(opt.value)}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1.5 ${
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
              className="w-full px-4 py-3 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
            />
            {error && (
              <p className="mt-1.5 text-xs text-rose-400 flex items-center gap-1.5">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          {/* Audit Logging Notice */}
          <div className="p-3.5 rounded-2xl bg-indigo-950/20 border border-indigo-900/30 text-indigo-300/90 text-[11px] leading-relaxed flex items-start gap-2.5">
            <ShieldAlert className="h-4 w-4 shrink-0 text-indigo-400 mt-0.5" />
            <span>
              This correction will be permanently logged in the <strong>Audit Trail</strong> with your user credentials, timestamp, previous status (<code className="text-white">{record.status}</code>), and justification reason.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving Audit Record...</span>
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
