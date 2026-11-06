import React from 'react';
import { Smartphone, Download, Share, X, PlusSquare } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

/**
 * Dismissible, device-aware PWA install prompt card shown on the Login page.
 * Respects standalone mode and persists dismissal preference per device with try/catch.
 */
export default function InstallPromptCard({ className = '' }) {
  const {
    isStandalone,
    isInstallable,
    isIosSafari,
    isDismissed,
    promptInstall,
    dismissInstall,
  } = usePwa();

  // Hide if already installed in standalone mode, or dismissed on this device
  if (isStandalone || isDismissed) return null;

  // Only show if browser supports direct install or if iOS Safari needs instructions
  if (!isInstallable && !isIosSafari) return null;

  return (
    <div
      role="region"
      aria-label="Install LabAttend Application"
      className={`relative w-full rounded-2xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-emerald-500/30 p-4 shadow-xl shadow-emerald-500/5 text-slate-200 ${className}`}
    >
      <button
        type="button"
        onClick={dismissInstall}
        aria-label="Dismiss install prompt"
        className="absolute top-3 right-3 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800/80 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3.5 pr-6">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
          <Smartphone className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-white tracking-tight">Install LabAttend App</h4>

          {isInstallable ? (
            <>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Install on your device for fast, dedicated access to lab session management and high-performance camera scanning.
              </p>
              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={promptInstall}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold rounded-xl text-xs shadow-md transition-all active:scale-95"
                >
                  <Download className="w-3.5 h-3.5" />
                  Install Now
                </button>
                <button
                  type="button"
                  onClick={dismissInstall}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
                >
                  Not now
                </button>
              </div>
            </>
          ) : isIosSafari ? (
            <div className="mt-1.5 space-y-1.5 text-xs text-slate-300">
              <p className="leading-relaxed">To install on iOS Safari:</p>
              <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-[11px] text-slate-300">
                <span className="flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
                  <Share className="w-3.5 h-3.5" /> 1. Tap Share
                </span>
                <span>&rarr;</span>
                <span className="flex items-center gap-1 font-semibold text-emerald-400 shrink-0">
                  <PlusSquare className="w-3.5 h-3.5" /> 2. Add to Home Screen
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

