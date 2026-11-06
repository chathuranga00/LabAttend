import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  X, 
  Users, 
  UserCheck, 
  UserX, 
  Percent, 
  Loader2, 
  FileText 
} from 'lucide-react';

export default function EndSessionModal({
  isOpen,
  onClose,
  session,
  counters,
  attendancePercentage,
  onFinalize,
  onReviewRoster,
  loading = false,
}) {
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onFinalize(notes);
  };

  const expected = counters?.expected || 0;
  const present = counters?.present || 0;
  const unmarked = Math.max(0, expected - present);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 max-sm:max-h-[92dvh] max-sm:overflow-y-auto max-sm:pb-[calc(1.5rem+env(safe-area-inset-bottom))]"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Drag Indicator Handle */}
        <div className="sm:hidden w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto mt-3 mb-1" />

        {/* Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">Finalize Laboratory Session</h3>
              <p className="text-xs text-slate-400">
                {session?.moduleCode} - {session?.sessionCode}
              </p>
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

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 sm:space-y-6">
          {/* Provisional Summary Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
            <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                Expected
              </span>
              <span className="text-xl sm:text-2xl font-black text-white">{expected}</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-900/40 text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-emerald-400 block mb-1">
                Present
              </span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{present}</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-rose-400 block mb-1">
                Absent
              </span>
              <span className="text-xl sm:text-2xl font-black text-rose-400">{unmarked}</span>
            </div>

            <div className="p-3 sm:p-3.5 rounded-2xl bg-teal-950/20 border border-teal-900/40 text-center">
              <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-teal-400 block mb-1">
                Turnout %
              </span>
              <span className="text-xl sm:text-2xl font-black text-teal-300">
                {attendancePercentage || (expected === 0 ? 'N/A' : `${((present / expected) * 100).toFixed(1)}%`)}
              </span>
            </div>
          </div>

          {/* Warning Banner */}
          <div className="p-3.5 sm:p-4 rounded-2xl bg-amber-950/30 border border-amber-800/40 text-amber-200 text-xs leading-relaxed space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-300">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>Important: Irreversible Session Closure</span>
            </div>
            <p>
              Finalizing will permanently lock this session and close QR attendance scanning.
              {unmarked > 0 ? (
                <> All <strong className="text-white underline">{unmarked} unmarked students</strong> will be automatically marked <strong className="text-rose-300">ABSENT</strong>.</>
              ) : (
                <> All expected students are currently marked present.</>
              )}
            </p>
            {onReviewRoster && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onReviewRoster();
                  }}
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 underline min-h-[44px] inline-flex items-center"
                >
                  Review student roster before finalizing &rarr;
                </button>
              </div>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-slate-400" />
              Finalization Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Lab exercise 4 concluded at 11:15 AM. 5 absentees verified with class rep."
              disabled={loading}
              className="w-full px-3.5 py-2.5 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-base sm:text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/50 resize-none min-h-[44px]"
            />
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
              className="min-h-[44px] flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-500 hover:to-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Finalizing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Confirm & Finalize</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
