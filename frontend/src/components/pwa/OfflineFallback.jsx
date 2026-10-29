import React, { useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

/**
 * Branded offline fallback screen shown when the app shell loads without a network connection.
 */
export default function OfflineFallback() {
  const [retrying, setRetrying] = useState(false);

  const handleRetry = () => {
    setRetrying(true);
    setTimeout(() => {
      window.location.reload();
    }, 300);
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6 pt-safe pb-safe selection:bg-emerald-500 selection:text-white">
      {/* Top Brand Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-24 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-slate-200/40 shrink-0">
          <img src="/logo.png" alt="NSBM Green University" className="h-full w-full object-contain" />
        </div>
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">LabAttend PWA</span>
          <p className="text-[11px] text-slate-400">NSBM Green University Town</p>
        </div>
      </div>

      {/* Center Content */}
      <div className="max-w-md w-full mx-auto text-center space-y-6 my-auto py-8">
        <div className="relative inline-flex items-center justify-center">
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center shadow-2xl shadow-rose-500/10">
            <WifiOff className="w-10 h-10 sm:w-12 sm:h-12 text-rose-400" />
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-500"></span>
          </span>
        </div>

        <div className="space-y-2 px-2">
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">You are offline</h1>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            LabAttend needs a connection to record attendance.
          </p>
          <p className="text-[11px] sm:text-xs text-slate-400">
            Attendance verification and QR scanning require an active network connection to authenticate student tokens with the institutional database.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleRetry}
            disabled={retrying}
            className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${retrying ? 'animate-spin' : ''}`} />
            {retrying ? 'Checking Connection...' : 'Retry Connection'}
          </button>
        </div>
      </div>

      {/* Footer Notice */}
      <div className="text-center text-xs text-slate-400">
        <p>No offline attendance queue is stored for security and anti-proxy compliance.</p>
      </div>
    </div>
  );
}
