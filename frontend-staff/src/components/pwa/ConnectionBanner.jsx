import React from 'react';
import { WifiOff } from 'lucide-react';
import { usePwa } from '../../context/PwaContext';

/**
 * Global "No connection" banner rendered at the top of layouts when network is lost.
 */
export default function ConnectionBanner() {
  const { isOnline } = usePwa();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      className="sticky top-0 z-50 w-full bg-rose-600/95 text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-center gap-2.5 shadow-lg backdrop-blur-sm transition-all duration-300"
    >
      <WifiOff className="w-4 h-4 shrink-0 animate-pulse" />
      <span>
        No Internet Connection — LabAttend requires an active network connection to verify and record attendance.
      </span>
    </div>
  );
}

