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
      {/* Mobile Stacked Card View (< 768px) */}
      <div className="md:hidden divide-y divide-slate-800/80">
        {loading ? (
          Array.from({ length: 4 }).map((_, rIdx) => (
            <div key={`mob-skeleton-${rIdx}`} className="p-4 space-y-3 animate-pulse bg-slate-900/20">
              <div className="flex justify-between items-center">
                <div className="h-4 bg-slate-800 rounded w-1/3" />
                <div className="h-4 bg-slate-800/70 rounded w-1/4" />
              </div>
              <div className="h-3 bg-slate-800/60 rounded w-3/4" />
              <div className="h-3 bg-slate-800/50 rounded w-1/2" />
              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800/40">
                <div className="h-8 bg-slate-800/60 rounded w-20" />
              </div>
            </div>
          ))
        ) : data.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700/50 flex items-center justify-center text-slate-400 mb-3 shadow-inner">
                <Inbox className="w-6 h-6" />
              </div>
              <h4 className="text-base font-medium text-slate-200">{emptyMessage}</h4>
              <p className="text-xs text-slate-400 mt-1 mb-4 leading-relaxed">{emptySubtext}</p>
              {actionButton}
            </div>
          </div>
        ) : (
          data.map((row, rowIdx) => {
            // Partition columns into content columns and action columns
            const actionCols = columns.filter(
              (c) => c.header === 'Actions' || c.key === 'actions' || c.className?.includes('text-right')
            );
            const contentCols = columns.filter(
              (c) => c.header !== 'Actions' && c.key !== 'actions' && !c.className?.includes('text-right')
            );

            return (
              <div
                key={row.id || rowIdx}
                className="p-4 space-y-2.5 bg-slate-900/30 hover:bg-slate-850/40 transition-colors"
              >
                {/* Content fields */}
                {contentCols.map((col, colIdx) => {
                  const content = col.render ? col.render(row) : row[col.key] ?? '—';
                  const isPrimary = colIdx === 0;

                  if (isPrimary) {
                    return (
                      <div key={col.key || colIdx} className="pb-1 border-b border-slate-800/40">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-0.5">
                          {col.header}
                        </span>
                        <div className="text-sm font-bold text-white break-words">
                          {content}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={col.key || colIdx}
                      className="flex items-start justify-between gap-3 text-xs"
                    >
                      <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px] shrink-0 pt-0.5">
                        {col.header}
                      </span>
                      <div className="text-right text-slate-200 font-medium break-all">
                        {content}
                      </div>
                    </div>
                  );
                })}

                {/* Actions footer */}
                {actionCols.length > 0 && (
                  <div className="pt-2.5 mt-2 border-t border-slate-800/70 flex flex-wrap items-center justify-end gap-2">
                    {actionCols.map((col, aIdx) => (
                      <React.Fragment key={col.key || aIdx}>
                        {col.render ? col.render(row) : row[col.key] ?? null}
                      </React.Fragment>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop & Tablet Tabular Grid (>= 768px) */}
      <div className="hidden md:block overflow-x-auto">
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
