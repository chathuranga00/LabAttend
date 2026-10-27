import React from 'react';
import { Database, Inbox } from 'lucide-react';

export default function DataTable({
  columns,
  data = [],
  loading = false,
  emptyMessage = 'No records found',
  emptySubtext = 'Get started by creating a new record using the button above.',
  actionButton = null,
}) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur-sm shadow-xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-slate-950/70 border-b border-slate-800 text-xs uppercase font-semibold text-slate-400 tracking-wider">
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={col.key || idx}
                  className={`px-6 py-4 ${col.className || ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {loading ? (
              // Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, rIdx) => (
                <tr key={`skeleton-${rIdx}`} className="animate-pulse">
                  {columns.map((col, cIdx) => (
                    <td key={`skeleton-${rIdx}-${cIdx}`} className="px-6 py-4">
                      <div className="h-4 bg-slate-800/80 rounded w-3/4" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length} className="px-6 py-16 text-center">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-3.5 shadow-inner">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <h4 className="text-base font-medium text-slate-200">{emptyMessage}</h4>
                    <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">{emptySubtext}</p>
                    {actionButton}
                  </div>
                </td>
              </tr>
            ) : (
              // Data Rows
              data.map((row, rowIdx) => (
                <tr
                  key={row.id || rowIdx}
                  className="hover:bg-slate-850/50 transition-colors"
                >
                  {columns.map((col, colIdx) => (
                    <td
                      key={col.key || colIdx}
                      className={`px-6 py-4 align-middle ${col.className || ''}`}
                    >
                      {col.render ? col.render(row) : row[col.key] ?? '—'}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
