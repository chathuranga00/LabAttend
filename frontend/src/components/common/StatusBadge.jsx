import React from 'react';

export default function StatusBadge({ isActive, onClick, disabled = false }) {
  const content = (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold tracking-wide transition-all ${
        isActive
          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          : 'bg-slate-700/30 text-slate-400 border border-slate-700/40'
      } ${onClick && !disabled ? 'cursor-pointer hover:opacity-80 active:scale-95' : ''}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isActive ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
        }`}
      />
      {isActive ? 'Active' : 'Inactive'}
    </span>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="focus:outline-none"
        title={`Click to ${isActive ? 'deactivate' : 'activate'}`}
      >
        {content}
      </button>
    );
  }

  return content;
}
