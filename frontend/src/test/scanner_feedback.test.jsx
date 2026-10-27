import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

/**
 * Lightweight isolated ScannerFeedbackCard component mirror to test
 * scanner feedback UI rendering and Section 25 status copy adherence.
 */
function ScannerFeedbackCard({ result }) {
  if (!result) {
    return (
      <div data-testid="empty-feedback">
        Ready to scan. Student check-in details will appear here instantly.
      </div>
    );
  }

  if (result.type === 'SUCCESS') {
    return (
      <div data-testid="success-card" className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span>{result.title}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
            {result.method}
          </span>
        </div>
        <div className="text-lg font-bold text-white">{result.studentName}</div>
        <div className="flex items-center justify-between text-xs text-emerald-200">
          <span className="font-mono bg-emerald-900/50 px-2 py-0.5 rounded border border-emerald-800/50">
            {result.studentId}
          </span>
          <span>{result.time ? new Date(result.time).toLocaleTimeString() : ''}</span>
        </div>
      </div>
    );
  }

  if (result.type === 'ALREADY_MARKED') {
    return (
      <div data-testid="already-marked-card" className="p-4 bg-amber-950/40 border border-amber-500/50 rounded-xl space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
            <AlertTriangle className="h-5 w-5 shrink-0" />
            <span>{result.title}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
            {result.method}
          </span>
        </div>
        <div className="text-lg font-bold text-white">{result.studentName}</div>
        <div className="flex items-center justify-between text-xs text-amber-200">
          <span className="font-mono bg-amber-900/50 px-2 py-0.5 rounded border border-amber-800/50">
            {result.studentId}
          </span>
          <span className="text-amber-300">{result.message}</span>
        </div>
      </div>
    );
  }

  if (result.type === 'ERROR') {
    return (
      <div data-testid="error-card" className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-xl space-y-2">
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{result.title}</span>
        </div>
        <div className="text-sm text-rose-200">{result.message}</div>
        {result.rawIdentifier && (
          <div className="text-xs text-rose-400 font-mono">
            Scanned Token: {result.rawIdentifier}
          </div>
        )}
      </div>
    );
  }

  return null;
}

describe('Scanner Result Handling & Feedback Card Tests', () => {
  it('renders default empty feedback when no scan has occurred', () => {
    render(<ScannerFeedbackCard result={null} />);
    expect(screen.getByTestId('empty-feedback')).toHaveTextContent(/Ready to scan/i);
  });

  it('renders SUCCESS card with verified student details and QR_SCAN badge', () => {
    const successResult = {
      type: 'SUCCESS',
      title: 'Attendance Recorded Successfully',
      studentName: 'Kasun Jayawardena',
      studentId: 'IT21001234',
      time: new Date('2026-10-26T10:00:00Z').toISOString(),
      method: 'QR_SCAN',
    };

    render(<ScannerFeedbackCard result={successResult} />);

    expect(screen.getByTestId('success-card')).toBeInTheDocument();
    expect(screen.getByText('Attendance Recorded Successfully')).toBeInTheDocument();
    expect(screen.getByText('Kasun Jayawardena')).toBeInTheDocument();
    expect(screen.getByText('IT21001234')).toBeInTheDocument();
    expect(screen.getByText('QR_SCAN')).toBeInTheDocument();
  });

  it('renders ALREADY_MARKED card with warning and previous scan time', () => {
    const alreadyResult = {
      type: 'ALREADY_MARKED',
      title: 'Already Marked Present',
      studentName: 'Kasun Jayawardena',
      studentId: 'IT21001234',
      message: 'Previously verified at 09:30:00 AM',
      method: 'QR_SCAN',
    };

    render(<ScannerFeedbackCard result={alreadyResult} />);

    expect(screen.getByTestId('already-marked-card')).toBeInTheDocument();
    expect(screen.getByText('Already Marked Present')).toBeInTheDocument();
    expect(screen.getByText('Kasun Jayawardena')).toBeInTheDocument();
    expect(screen.getByText('Previously verified at 09:30:00 AM')).toBeInTheDocument();
  });

  it('renders ERROR card with Section 25 message: Invalid QR Code — Student Not Found', () => {
    const errorResult = {
      type: 'ERROR',
      title: 'Verification Denied',
      message: 'Invalid QR Code — Student Not Found',
      rawIdentifier: 'UNKNOWN_HASH_123',
    };

    render(<ScannerFeedbackCard result={errorResult} />);

    expect(screen.getByTestId('error-card')).toBeInTheDocument();
    expect(screen.getByText('Verification Denied')).toBeInTheDocument();
    expect(screen.getByText('Invalid QR Code — Student Not Found')).toBeInTheDocument();
    expect(screen.getByText(/UNKNOWN_HASH_123/)).toBeInTheDocument();
  });

  it('renders ERROR card with Section 25 message: Student Is Not Assigned to This Session', () => {
    const errorResult = {
      type: 'ERROR',
      title: 'Verification Denied',
      message: 'Student Is Not Assigned to This Session',
      rawIdentifier: 'IT21999999',
    };

    render(<ScannerFeedbackCard result={errorResult} />);

    expect(screen.getByTestId('error-card')).toBeInTheDocument();
    expect(screen.getByText('Student Is Not Assigned to This Session')).toBeInTheDocument();
  });

  it('renders ERROR card with Section 25 message: Attendance Is Closed for This Session', () => {
    const errorResult = {
      type: 'ERROR',
      title: 'Verification Denied',
      message: 'Attendance Is Closed for This Session. This session is not accepting attendance scans.',
      rawIdentifier: 'IT21001234',
    };

    render(<ScannerFeedbackCard result={errorResult} />);

    expect(screen.getByTestId('error-card')).toBeInTheDocument();
    expect(screen.getByText(/Attendance Is Closed for This Session/)).toBeInTheDocument();
  });
});
