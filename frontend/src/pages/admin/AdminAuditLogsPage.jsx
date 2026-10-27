import React, { useState, useEffect, useCallback } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  AlertCircle,
  ShieldAlert,
  Clock,
  User,
  Activity,
  Code
} from 'lucide-react';
import { attendanceService } from '../../services/attendanceService';
import { useToast } from '../../context/ToastContext';

const ACTION_OPTIONS = [
  'ALL',
  'SESSION_FINALIZED',
  'ATTENDANCE_CORRECTION',
  'MANUAL_ATTENDANCE',
  'START_SESSION',
  'CANCEL_SESSION',
  'CREATE',
  'UPDATE',
  'DEACTIVATE',
];

const ENTITY_OPTIONS = [
  'ALL',
  'LabSession',
  'AttendanceRecord',
  'Student',
  'DegreeProgramme',
  'Batch',
  'Module',
  'LaboratoryHall',
  'LecturerModuleAssignment',
];

export default function AdminAuditLogsPage() {
  const { showToast } = useToast();

  const [logs, setLogs] = useState([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedAction, setSelectedAction] = useState('ALL');
  const [selectedEntity, setSelectedEntity] = useState('ALL');

  // Expanded details row state (set of log IDs)
  const [expandedRows, setExpandedRows] = useState(new Set());

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const params = {
        page,
        size: pageSize,
        sortBy: 'timestamp',
        sortDir: 'desc',
      };

      if (search.trim()) {
        params.search = search.trim();
      }
      if (selectedAction !== 'ALL') {
        params.action = selectedAction;
      }
      if (selectedEntity !== 'ALL') {
        params.entityName = selectedEntity;
      }

      const res = await attendanceService.getAdminAuditLogs(params);
      if (res.success && res.data) {
        setLogs(res.data.content || []);
        setTotalElements(res.data.totalElements || 0);
        setTotalPages(res.data.totalPages || 0);
      }
    } catch (err) {
      showToast(err.message || 'Failed to fetch audit logs', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, selectedAction, selectedEntity, showToast]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const toggleRow = (id) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getActionBadgeClass = (action) => {
    if (action.includes('FINALIZED')) {
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
    }
    if (action.includes('CORRECTION')) {
      return 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30';
    }
    if (action.includes('CANCEL') || action.includes('DEACTIVATE')) {
      return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
    if (action.includes('START') || action.includes('CREATE')) {
      return 'bg-teal-500/10 text-teal-400 border-teal-500/30';
    }
    return 'bg-slate-800 text-slate-300 border-slate-700';
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">System Audit Ledger</h1>
              <p className="text-xs text-slate-400">
                Immutable, append-only security trail of all administrative and session write operations
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold transition"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Keyword Search */}
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search user, action, entity..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="w-full pl-10 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Action Filter */}
          <div>
            <select
              value={selectedAction}
              onChange={(e) => {
                setSelectedAction(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">All Actions</option>
              {ACTION_OPTIONS.filter((a) => a !== 'ALL').map((act) => (
                <option key={act} value={act}>
                  Action: {act}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <select
              value={selectedEntity}
              onChange={(e) => {
                setSelectedEntity(e.target.value);
                setPage(0);
              }}
              className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              <option value="ALL">All Entities</option>
              {ENTITY_OPTIONS.filter((e) => e !== 'ALL').map((ent) => (
                <option key={ent} value={ent}>
                  Entity: {ent}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 text-[11px] font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">Actor</th>
                <th className="py-3.5 px-4">Role</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Target Entity</th>
                <th className="py-3.5 px-4">Client IP</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto text-indigo-400 mb-2" />
                    <span>Querying immutable audit logs...</span>
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <AlertCircle className="h-6 w-6 mx-auto mb-2 text-slate-600" />
                    <span>No audit records match the current filter criteria.</span>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const isExpanded = expandedRows.has(log.id);
                  let detailsParsed = null;
                  try {
                    detailsParsed = log.details ? JSON.parse(log.details) : null;
                  } catch (e) {
                    detailsParsed = log.details;
                  }

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-850/40 transition">
                        <td className="py-3.5 px-4 text-slate-300 font-mono text-[11px] whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{log.performedByName}</div>
                          <div className="text-[11px] text-slate-400">{log.performedByEmail || 'system'}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                            {log.performedByRole || 'SYSTEM'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${getActionBadgeClass(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-300">
                          <span className="font-semibold text-white">{log.entityName}</span>
                          {log.entityId && (
                            <span className="block text-[10px] font-mono text-slate-500 truncate max-w-[140px]" title={log.entityId}>
                              {log.entityId}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-slate-400 text-[11px]">
                          {log.ipAddress || '127.0.0.1'}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {log.details && (
                            <button
                              onClick={() => toggleRow(log.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition"
                            >
                              <span>Diff</span>
                              {isExpanded ? (
                                <ChevronUp className="h-3 w-3" />
                              ) : (
                                <ChevronDown className="h-3 w-3" />
                              )}
                            </button>
                          )}
                        </td>
                      </tr>

                      {/* Expandable JSON details row */}
                      {isExpanded && (
                        <tr className="bg-slate-950/90">
                          <td colSpan={7} className="p-4 px-6">
                            <div className="space-y-2">
                              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                                <Code className="h-3.5 w-3.5 text-indigo-400" />
                                Audit State Transition Diff:
                              </span>
                              <pre className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-emerald-400 font-mono text-xs overflow-x-auto max-h-60 leading-relaxed">
                                {typeof detailsParsed === 'object'
                                  ? JSON.stringify(detailsParsed, null, 2)
                                  : detailsParsed}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Toolbar */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>
              Page {page + 1} of {totalPages} ({totalElements} total audit records)
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-50 transition"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
