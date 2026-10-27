import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Users, FileSpreadsheet, ArrowLeftRight } from 'lucide-react';

/**
 * Isolated Component testing Group-Aware Analytics Filters, Breakdown Table,
 * and Cross-Group Report Selection.
 */
function AnalyticsReportFilterGroupPanel({ batches, groups, onFilterChange }) {
  const [batchId, setBatchId] = useState('');
  const [labGroupId, setLabGroupId] = useState('');
  const [reportType, setReportType] = useState('SESSION');

  const handleBatchChange = (e) => {
    const newBatch = e.target.value;
    setBatchId(newBatch);
    setLabGroupId('');
    onFilterChange({ batchId: newBatch, labGroupId: '' });
  };

  const handleGroupChange = (e) => {
    const newGroup = e.target.value;
    setLabGroupId(newGroup);
    onFilterChange({ batchId, labGroupId: newGroup });
  };

  const handleReportChange = (e) => {
    setReportType(e.target.value);
  };

  const availableGroups = groups.filter((g) => !batchId || g.batchId === batchId);

  return (
    <div data-testid="analytics-filter-panel" className="p-4 bg-slate-900 rounded-xl space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="text-xs text-slate-400">Batch</label>
          <select
            data-testid="batch-dropdown"
            value={batchId}
            onChange={handleBatchChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.code}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Lab Group</label>
          <select
            data-testid="group-dropdown"
            value={labGroupId}
            onChange={handleGroupChange}
            disabled={!batchId}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white disabled:opacity-50"
          >
            <option value="">All Groups</option>
            {availableGroups.map((g) => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400">Report Type</label>
          <select
            data-testid="report-type-dropdown"
            value={reportType}
            onChange={handleReportChange}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
          >
            <option value="SESSION">Session Attendance Report</option>
            <option value="BATCH">Batch Attendance Report</option>
            <option value="CROSS_GROUP">Cross-Group Attendance Audit Report</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function GroupBreakdownTable({ groupStats, totalVisitors = 0 }) {
  return (
    <div data-testid="group-breakdown-container" className="space-y-4">
      <div data-testid="visitors-card" className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 text-amber-300 rounded-lg">
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Cross-Group Visitors</div>
            <div className="text-2xl font-bold text-white">{totalVisitors}</div>
          </div>
        </div>
        <span className="text-xs text-slate-500">Audited Cross-Group Attendees</span>
      </div>

      <table data-testid="group-table" className="w-full text-left text-sm text-slate-300 border border-slate-800">
        <thead className="bg-slate-950 text-xs uppercase text-slate-400">
          <tr>
            <th className="p-3">Lab Group</th>
            <th className="p-3">Batch</th>
            <th className="p-3">Sessions</th>
            <th className="p-3">Expected</th>
            <th className="p-3">Present Regular</th>
            <th className="p-3">Absent</th>
            <th className="p-3">Attendance %</th>
            <th className="p-3">Visitors Received</th>
            <th className="p-3">Outgoing Visits</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800 bg-slate-900">
          {groupStats.map((row) => (
            <tr key={row.groupId}>
              <td className="p-3 font-semibold text-white">{row.groupName}</td>
              <td className="p-3 text-slate-400">{row.batchCode}</td>
              <td className="p-3">{row.finalizedSessions} / {row.totalSessions}</td>
              <td className="p-3">{row.totalExpected}</td>
              <td className="p-3 text-emerald-400">{row.totalPresent}</td>
              <td className="p-3 text-rose-400">{row.totalAbsent}</td>
              <td className="p-3 font-bold text-indigo-300">{row.attendancePercentage}</td>
              <td className="p-3 text-amber-300 font-semibold">{row.visitorsReceived}</td>
              <td className="p-3 text-purple-300 font-semibold">{row.outgoingVisits}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

describe('Group-Aware Analytics & Reports Frontend Tests', () => {
  const batches = [
    { id: 'batch-24-1', code: 'Batch 24.1' },
    { id: 'batch-23-2', code: 'Batch 23.2' },
  ];

  const groups = [
    { id: 'group-a', name: 'Group A', batchId: 'batch-24-1' },
    { id: 'group-b', name: 'Group B', batchId: 'batch-24-1' },
    { id: 'group-c', name: 'Group C', batchId: 'batch-24-1' },
    { id: 'group-x', name: 'Group X', batchId: 'batch-23-2' },
  ];

  const mockGroupStats = [
    {
      groupId: 'group-a',
      groupName: 'Group A',
      batchCode: 'Batch 24.1',
      totalSessions: 1,
      finalizedSessions: 1,
      totalExpected: 34,
      totalPresent: 30,
      totalAbsent: 4,
      attendancePercentage: '88.2%',
      visitorsReceived: 0,
      outgoingVisits: 1,
    },
    {
      groupId: 'group-b',
      groupName: 'Group B',
      batchCode: 'Batch 24.1',
      totalSessions: 1,
      finalizedSessions: 1,
      totalExpected: 33,
      totalPresent: 28,
      totalAbsent: 5,
      attendancePercentage: '84.8%',
      visitorsReceived: 1,
      outgoingVisits: 0,
    },
  ];

  it('updates group dropdown options dynamically when batch changes', () => {
    const handleFilterChange = vi.fn();
    render(
      <AnalyticsReportFilterGroupPanel
        batches={batches}
        groups={groups}
        onFilterChange={handleFilterChange}
      />
    );

    const groupDropdown = screen.getByTestId('group-dropdown');
    expect(groupDropdown).toBeDisabled();

    // Select Batch 24.1
    fireEvent.change(screen.getByTestId('batch-dropdown'), { target: { value: 'batch-24-1' } });
    expect(groupDropdown).not.toBeDisabled();

    // Verify groups for Batch 24.1 are present, while Group X (Batch 23.2) is not
    expect(screen.getByRole('option', { name: 'Group A' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Group B' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Group C' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Group X' })).not.toBeInTheDocument();

    // Select Group A
    fireEvent.change(groupDropdown, { target: { value: 'group-a' } });
    expect(handleFilterChange).toHaveBeenCalledWith({ batchId: 'batch-24-1', labGroupId: 'group-a' });
  });

  it('includes Cross-Group Attendance Audit Report in report options', () => {
    render(
      <AnalyticsReportFilterGroupPanel
        batches={batches}
        groups={groups}
        onFilterChange={vi.fn()}
      />
    );

    const reportDropdown = screen.getByTestId('report-type-dropdown');
    expect(screen.getByRole('option', { name: /Cross-Group Attendance Audit Report/i })).toBeInTheDocument();

    fireEvent.change(reportDropdown, { target: { value: 'CROSS_GROUP' } });
    expect(reportDropdown.value).toBe('CROSS_GROUP');
  });

  it('renders group breakdown table with accurate visitors and outgoing visits columns', () => {
    render(<GroupBreakdownTable groupStats={mockGroupStats} totalVisitors={1} />);

    // Visitors overview card
    const visitorsCard = screen.getByTestId('visitors-card');
    expect(visitorsCard).toHaveTextContent('1');
    expect(visitorsCard).toHaveTextContent(/Cross-Group Visitors/i);

    // Group table headers
    expect(screen.getByText('Visitors Received')).toBeInTheDocument();
    expect(screen.getByText('Outgoing Visits')).toBeInTheDocument();

    // Group A row assertions
    expect(screen.getByText('Group A')).toBeInTheDocument();
    expect(screen.getByText('88.2%')).toBeInTheDocument();
    expect(screen.getByText('30')).toBeInTheDocument(); // present
    expect(screen.getByText('4')).toBeInTheDocument(); // absent

    // Group B row assertions
    expect(screen.getByText('Group B')).toBeInTheDocument();
    expect(screen.getByText('84.8%')).toBeInTheDocument();
    expect(screen.getByText('28')).toBeInTheDocument(); // present
    expect(screen.getByText('5')).toBeInTheDocument(); // absent
  });
});
