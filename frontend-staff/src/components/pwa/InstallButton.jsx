import React from 'react';
import { Download, Smartphone } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

/**
 * Clean, context-aware "Install LabAttend" button.
 * Automatically hidden when already running in standalone PWA mode.
 * Supports 'menu' (user profile area) and 'header' variants.
 */
export default function InstallButton({ variant = 'menu', className = '' }) {
  const { isStandalone, isInstallable, promptInstall, isIosSafari } = usePwa();

  // Hide completely when running in standalone mode
  if (isStandalone) return null;

  // On standard browsers, show if beforeinstallprompt is ready
  // On iOS Safari, can trigger an instruction dialog or modal
  if (!isInstallable && !isIosSafari) return null;

  const handleInstallClick = async (e) => {
    e.stopPropagation();
    if (isInstallable) {
      await promptInstall();
    } else if (isIosSafari) {
      alert("To install LabAttend on iOS:\n1. Tap the Share button at the bottom of Safari.\n2. Scroll down and select 'Add to Home Screen'.");
    }
  };

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleInstallClick}
        title="Install LabAttend app on this device"
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold transition-all ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Install App</span>
      </button>
    );
  }

  // Default 'menu' variant (for user menu / sidebar / profile dropdown)
  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded-xl transition-colors text-left ${className}`}
    >
      <Smartphone className="w-4 h-4 shrink-0" />
      <span>Install LabAttend App</span>
    </button>
  );
}

