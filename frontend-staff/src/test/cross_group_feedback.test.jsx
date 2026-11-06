import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckCircle2, AlertTriangle, Users } from 'lucide-react';

/**
 * Scanner Check-In Feedback Component testing cross-group visitor indicators
 * and visual confirmation requirements of Section 3 & Section 25.
 */
function CrossGroupScannerFeedbackCard({ result }) {
  if (!result) return null;

  const isCrossGroup = Boolean(result.isCrossGroup);

  return (
    <div
      data-testid="scanner-feedback-card"
      className={`p-4 rounded-xl border ${
        isCrossGroup
          ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
          : 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-sm">
          {result.type === 'SUCCESS' ? (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
          )}
          <span>{result.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {isCrossGroup && (
            <span
              data-testid="cross-group-badge"
              className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center gap-1"
            >
              <Users className="h-3 w-3" />
              Cross-Group Visitor
            </span>
          )}
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-slate-300">
            {result.method || 'QR_SCAN'}
          </span>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-lg font-bold text-white">{result.studentName}</div>
        <div className="flex items-center gap-3 text-xs mt-1">
          <span className="font-mono bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700 text-slate-200">
            {result.studentId}
          </span>
          {isCrossGroup && result.homeGroupName && (
            <span data-testid="home-group-tag" className="text-amber-300 font-medium">
              Home Group: {result.homeGroupName}
            </span>
          )}
          {!isCrossGroup && result.groupName && (
            <span className="text-emerald-300 font-medium">Group: {result.groupName}</span>
          )}
        </div>
      </div>

      {result.message && (
        <div className="mt-2 text-xs opacity-90">{result.message}</div>
      )}
    </div>
  );
}

describe('Cross-Group Scanner Feedback Visual Confirmation Tests', () => {
  it('renders regular session attendee without cross-group badge', () => {
    const regularResult = {
      type: 'SUCCESS',
      title: 'Attendance Recorded Successfully',
      studentName: 'Kamal Silva',
      studentId: 'STU001',
      groupName: 'Group A',
      isCrossGroup: false,
      method: 'QR_SCAN',
    };

    render(<CrossGroupScannerFeedbackCard result={regularResult} />);

    expect(screen.getByText('Attendance Recorded Successfully')).toBeInTheDocument();
    expect(screen.getByText('Kamal Silva')).toBeInTheDocument();
    expect(screen.getByText('STU001')).toBeInTheDocument();
    expect(screen.getByText('Group: Group A')).toBeInTheDocument();
    expect(screen.queryByTestId('cross-group-badge')).not.toBeInTheDocument();
  });

  it('renders cross-group attendee with prominent Cross-Group Visitor badge and Home Group indicator', () => {
    const crossGroupResult = {
      type: 'SUCCESS',
      title: 'Attendance Recorded Successfully',
      studentName: 'Nimal Perera',
      studentId: 'STU035',
      homeGroupName: 'Group A',
      isCrossGroup: true,
      method: 'QR_SCAN',
      message: 'Visitor from Group A recorded for this session',
    };

    render(<CrossGroupScannerFeedbackCard result={crossGroupResult} />);

    expect(screen.getByText('Attendance Recorded Successfully')).toBeInTheDocument();
    expect(screen.getByText('Nimal Perera')).toBeInTheDocument();
    expect(screen.getByText('STU035')).toBeInTheDocument();

    const badge = screen.getByTestId('cross-group-badge');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent(/Cross-Group Visitor/i);

    const homeGroupTag = screen.getByTestId('home-group-tag');
    expect(homeGroupTag).toBeInTheDocument();
    expect(homeGroupTag).toHaveTextContent('Home Group: Group A');
  });

  it('renders duplicate scan warning for cross-group attendee', () => {
    const duplicateCrossGroup = {
      type: 'ALREADY_MARKED',
      title: 'Already Marked Present',
      studentName: 'Nimal Perera',
      studentId: 'STU035',
      homeGroupName: 'Group A',
      isCrossGroup: true,
      method: 'QR_SCAN',
      message: 'Student was already marked present as a cross-group visitor earlier.',
    };

    render(<CrossGroupScannerFeedbackCard result={duplicateCrossGroup} />);

    expect(screen.getByText('Already Marked Present')).toBeInTheDocument();
    expect(screen.getByTestId('cross-group-badge')).toBeInTheDocument();
    expect(screen.getByText(/already marked present as a cross-group visitor/i)).toBeInTheDocument();
  });
});
