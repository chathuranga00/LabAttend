import React from 'react';
import { RefreshCw, X, Sparkles } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

/**
 * Interactive update prompt shown when a new version of the app shell is precached.
 * Conforms to registerType: 'prompt' to prevent interrupting active scan sessions.
 */
export default function ReloadPrompt() {
  const { needRefresh, updateServiceWorker, closeRefreshToast } = usePwa();

  if (!needRefresh) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full bg-slate-900 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl shadow-emerald-500/10 text-slate-100 flex items-start gap-3.5 backdrop-blur-md animate-in slide-in-from-bottom duration-300"
    >
      <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0 mt-0.5">
        <Sparkles className="w-5 h-5" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-white tracking-tight">New Version Available</h4>
        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
          An update for LabAttend is ready. Refresh now to apply the latest enhancements.
        </p>

        <div className="flex items-center gap-2 mt-3">
          <button
            type="button"
            onClick={() => updateServiceWorker(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-lg text-xs shadow-md transition-all active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Now
          </button>
          <button
            type="button"
            onClick={closeRefreshToast}
            className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Later
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={closeRefreshToast}
        aria-label="Dismiss update notification"
        className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

