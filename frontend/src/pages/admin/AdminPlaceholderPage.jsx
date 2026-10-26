import React from 'react';
import { Layers } from 'lucide-react';

export default function AdminPlaceholderPage({ title, description, phase = 'Phase 3' }) {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-slate-800">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
            <p className="text-xs text-slate-400">{description}</p>
          </div>
        </div>

        <div className="mt-8 p-6 rounded-xl bg-slate-900/50 border border-slate-800 text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-3">
            Scheduled for {phase}
          </span>
          <p className="text-sm text-slate-300 font-medium">Module Interface Placeholder</p>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            This module route is fully protected by role-based routing (ADMIN only). Full CRUD operations and live PostgreSQL queries will be active in subsequent phases.
          </p>
        </div>
      </div>
    </div>
  );
}
