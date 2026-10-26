import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ showLabel = true, className = '' }) {
  const { theme, isDark, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all duration-200 select-none ${
        isDark
          ? 'bg-slate-900/80 hover:bg-slate-800 text-amber-300 border-slate-700/80 hover:border-amber-400/40 shadow-sm shadow-black/20'
          : 'bg-white hover:bg-emerald-50/80 text-emerald-800 border-emerald-200/80 hover:border-emerald-400 shadow-sm shadow-emerald-950/5'
      } ${className}`}
      title={`Switch to ${isDark ? 'Light' : 'Dark'} mode`}
      aria-label={`Toggle light and dark mode, current mode: ${theme}`}
    >
      <div className="relative flex items-center justify-center">
        {isDark ? (
          <Sun className="h-4 w-4 text-amber-400 animate-in spin-in-180 duration-300" />
        ) : (
          <Moon className="h-4 w-4 text-emerald-700 animate-in spin-in-180 duration-300" />
        )}
      </div>
      {showLabel && (
        <span className="font-medium tracking-wide">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
