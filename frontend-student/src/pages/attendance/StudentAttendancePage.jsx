import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Filter,
  RotateCcw,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Users,
  AlertCircle,
  Clock,
  Sparkles
} from 'lucide-react';
import { studentPortalService } from '../../services/studentService';

export const StudentAttendancePage = () => {
  const [history, setHistory] = useState([]);
  const [modules, setModules] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize] = useState(15);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters state
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Fetch modules for the filter dropdown
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const res = await studentPortalService.getModuleAttendance();
        if (res.success && res.data) {
          setModules(res.data);
        }
      } catch {
        // silent
      }
    };
    fetchModules();
  }, []);

  // Fetch paginated attendance history
  const fetchHistory = async (page = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = {
        page,
        size: pageSize,
      };
      if (selectedModule) params.moduleId = selectedModule;
      if (selectedStatus && selectedStatus !== 'ALL') params.status = selectedStatus;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const res = await studentPortalService.getAttendanceHistory(params);
      if (res.success && res.data) {
        setHistory(res.data.content || []);
        setTotalPages(res.data.totalPages || 0);
        setTotalElements(res.data.totalElements || 0);
        setCurrentPage(res.data.number || 0);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance history.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(0);
  }, [selectedModule, selectedStatus, startDate, endDate]);

  const handleClearFilters = () => {
    setSelectedModule('');
    setSelectedStatus('ALL');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Attendance History & Records
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Complete chronological audit of your finalized laboratory sessions ({totalElements} recorded).
          </p>
        </div>
      </div>

      {/* Filter Toolbar Card */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
            <Filter className="w-4 h-4 text-emerald-400" />
            <span>Search & Filter Sessions</span>
          </div>
          {(selectedModule || selectedStatus !== 'ALL' || startDate || endDate) && (
            <button
              onClick={handleClearFilters}
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Module Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Module</label>
            <select
              value={selectedModule}
              onChange={(e) => setSelectedModule(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">All Modules</option>
              {modules.map((m) => (
                <option key={m.moduleCode || m.moduleId} value={m.moduleCode || m.moduleId}>
                  {m.moduleCode} — {m.moduleName}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">Attendance Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PRESENT">Present Only</option>
              <option value="ABSENT">Absent Only</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">From Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">To Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-slate-200 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((n) => (
            <div key={n} className="h-20 bg-slate-900/60 rounded-xl border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => fetchHistory(currentPage)}
            className="px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 font-medium text-xs text-white"
          >
            Retry
          </button>
        </div>
      ) : history.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800/80 p-6 space-y-3">
          <Clock className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-semibold text-slate-300">No session records found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            No finalized lab session records match your selected filter criteria. Try clearing or expanding your filters.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (hidden on tablet/desktop) */}
          <div className="md:hidden space-y-3">
            {history.map((item, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-md space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-bold text-sm text-white">{item.moduleCode}</span>
                    <p className="text-xs text-slate-400 mt-0.5">{item.moduleName}</p>
                  </div>
                  {/* Status Badge */}
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                      item.status === 'PRESENT'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {item.status === 'PRESENT' ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5" />
                    )}
                    {item.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-slate-500">Date:</span>{' '}
                    <span className="font-medium text-slate-300">{item.sessionDate}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lab Sheet:</span>{' '}
                    <span className="font-medium text-slate-300">{item.labSheetNumber || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500">Lab Group:</span>{' '}
                    <span className="font-medium text-slate-300">{item.labGroup}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {item.isCrossGroup && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                        <Users className="w-3 h-3" />
                        Visitor
                      </span>
                    )}
                    {item.isCorrected && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        Adjusted
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (hidden on mobile) */}
          <div className="hidden md:block rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-slate-400 uppercase font-semibold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Module</th>
                    <th className="py-3.5 px-4">Lab Sheet #</th>
                    <th className="py-3.5 px-4">Lab Group</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4">Cross-Group</th>
                    <th className="py-3.5 px-4">Flags</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80 text-slate-300">
                  {history.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono whitespace-nowrap text-white font-medium">
                        {item.sessionDate}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white">{item.moduleCode}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{item.moduleName}</div>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-300">
                        {item.labSheetNumber || '—'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">
                        {item.labGroup}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            item.status === 'PRESENT'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {item.status === 'PRESENT' ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {item.isCrossGroup ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-sky-500/15 text-sky-400 border border-sky-500/30">
                            <Users className="w-3 h-3" />
                            Cross-Group
                          </span>
                        ) : (
                          <span className="text-slate-500">Regular</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        {item.isCorrected && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
                            <Sparkles className="w-3 h-3" />
                            Corrected
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-slate-400">
                Page <span className="font-semibold text-white">{currentPage + 1}</span> of{' '}
                <span className="font-semibold text-white">{totalPages}</span> ({totalElements} total records)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchHistory(currentPage - 1)}
                  disabled={currentPage <= 0}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => fetchHistory(currentPage + 1)}
                  disabled={currentPage >= totalPages - 1}
                  className="p-2 rounded-xl border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

