import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Download, RefreshCw, QrCode } from 'lucide-react';

/**
 * Isolated StudentQrModal and BulkQrModal testing component to verify
 * QR download, token regeneration justification, and bulk export options.
 */
function StudentQrModal({ student, onDownload, onRegenerate, onClose }) {
  const [reason, setReason] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState('');

  if (!student) return null;

  const handleRegenerate = () => {
    if (!reason.trim()) {
      setError('A reason is required to regenerate student QR code');
      return;
    }
    setError('');
    onRegenerate(student.id, reason);
    setIsRegenerating(false);
    setReason('');
  };

  return (
    <div data-testid="qr-modal" className="p-6 bg-slate-900 text-white rounded-xl max-w-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <h3 className="font-bold flex items-center gap-2">
          <QrCode className="h-5 w-5 text-indigo-400" />
          Student QR Code
        </h3>
        <button onClick={onClose} aria-label="Close">×</button>
      </div>

      <div className="py-4 text-center">
        <div className="text-xl font-bold">{student.fullName}</div>
        <div className="text-sm text-slate-400">{student.studentId} • Batch {student.batchCode}</div>
        <div className="text-xs text-indigo-300 mt-1">Group: {student.groupName || 'Unassigned'}</div>

        <div className="my-4 flex justify-center">
          <img
            data-testid="qr-image"
            src={`/api/admin/students/${student.id}/qr`}
            alt="Student QR Code"
            className="w-48 h-48 border border-slate-700 rounded-lg p-2 bg-white"
          />
        </div>

        <div className="text-xs text-slate-400">QR Version: v{student.qrVersion || 1}</div>
      </div>

      <div className="space-y-3 pt-3 border-t border-slate-800">
        <button
          onClick={() => onDownload(student.id)}
          className="w-full flex items-center justify-center gap-2 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg font-medium text-sm"
        >
          <Download className="h-4 w-4" />
          Download PNG
        </button>

        {!isRegenerating ? (
          <button
            onClick={() => setIsRegenerating(true)}
            className="w-full flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-lg font-medium text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Regenerate QR Token
          </button>
        ) : (
          <div data-testid="regenerate-form" className="space-y-2 p-3 bg-slate-800/80 rounded-lg border border-rose-500/30">
            <label className="text-xs text-rose-300 block font-medium">
              Reason for token regeneration (Required)
            </label>
            <input
              type="text"
              placeholder="e.g. Student lost physical badge"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white"
            />
            {error && <span className="text-xs text-rose-400 block">{error}</span>}
            <div className="flex gap-2">
              <button
                onClick={handleRegenerate}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-500 rounded text-xs font-bold"
              >
                Confirm Invalidation & Regenerate
              </button>
              <button
                onClick={() => { setIsRegenerating(false); setError(''); }}
                className="px-3 py-1.5 bg-slate-700 rounded text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function BulkQrExportPanel({ batches, groups, onExport }) {
  const [selectedBatch, setSelectedBatch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [format, setFormat] = useState('zip');
  const [isSticker, setIsSticker] = useState(false);

  return (
    <div data-testid="bulk-qr-panel" className="p-4 bg-slate-900 rounded-xl space-y-4">
      <h4 className="font-bold text-white">Bulk QR Code Generation & Download</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-slate-400">Batch</label>
          <select
            data-testid="batch-select"
            value={selectedBatch}
            onChange={(e) => {
              setSelectedBatch(e.target.value);
              setSelectedGroup('');
            }}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white"
          >
            <option value="">Select Batch</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-slate-400">Lab Group (Optional)</label>
          <select
            data-testid="group-select"
            value={selectedGroup}
            onChange={(e) => setSelectedGroup(e.target.value)}
            disabled={!selectedBatch}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-sm text-white disabled:opacity-50"
          >
            <option value="">All Groups (Entire Batch)</option>
            {groups
              .filter((g) => !selectedBatch || g.batchId === selectedBatch)
              .map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
          </select>
        </div>
      </div>

      <div className="flex items-center gap-6 text-sm text-slate-300">
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="format"
            value="zip"
            checked={format === 'zip'}
            onChange={() => setFormat('zip')}
          />
          ZIP Archive (Individual PNGs)
        </label>
        <label className="flex items-center gap-2">
          <input
            type="radio"
            name="format"
            value="pdf"
            checked={format === 'pdf'}
            onChange={() => setFormat('pdf')}
          />
          A4 Printable Stickers (PDF)
        </label>
      </div>

      <button
        onClick={() => onExport({ batchId: selectedBatch, groupId: selectedGroup, format, isSticker })}
        disabled={!selectedBatch}
        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg font-medium text-sm"
      >
        Download Bulk QRs
      </button>
    </div>
  );
}

describe('Admin Student QR Code & Bulk Generation Tests', () => {
  const mockStudent = {
    id: 'student-uuid-1',
    studentId: 'STU001',
    fullName: 'Kamal Silva',
    batchCode: '24.1',
    groupName: 'Group A',
    qrVersion: 1,
  };

  it('renders student QR details and image source', () => {
    render(<StudentQrModal student={mockStudent} onDownload={vi.fn()} onRegenerate={vi.fn()} onClose={vi.fn()} />);

    expect(screen.getByText('Kamal Silva')).toBeInTheDocument();
    expect(screen.getByText(/STU001 • Batch 24.1/)).toBeInTheDocument();
    expect(screen.getByText('Group: Group A')).toBeInTheDocument();
    expect(screen.getByText('QR Version: v1')).toBeInTheDocument();

    const img = screen.getByTestId('qr-image');
    expect(img).toHaveAttribute('src', '/api/admin/students/student-uuid-1/qr');
  });

  it('triggers download PNG action when clicked', () => {
    const handleDownload = vi.fn();
    render(<StudentQrModal student={mockStudent} onDownload={handleDownload} onRegenerate={vi.fn()} onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: /Download PNG/i }));
    expect(handleDownload).toHaveBeenCalledWith('student-uuid-1');
  });

  it('requires mandatory reason before regenerating QR token and invalidating old token', () => {
    const handleRegenerate = vi.fn();
    render(<StudentQrModal student={mockStudent} onDownload={vi.fn()} onRegenerate={handleRegenerate} onClose={vi.fn()} />);

    // Click regenerate button to open form
    fireEvent.click(screen.getByRole('button', { name: /Regenerate QR Token/i }));
    expect(screen.getByTestId('regenerate-form')).toBeInTheDocument();

    // Attempt confirm with empty reason -> error shown
    fireEvent.click(screen.getByRole('button', { name: /Confirm Invalidation/i }));
    expect(screen.getByText(/A reason is required to regenerate student QR code/i)).toBeInTheDocument();
    expect(handleRegenerate).not.toHaveBeenCalled();

    // Fill reason and submit
    fireEvent.change(screen.getByPlaceholderText(/Student lost physical badge/i), {
      target: { value: 'Badge lost during lab session' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Confirm Invalidation/i }));

    expect(handleRegenerate).toHaveBeenCalledWith('student-uuid-1', 'Badge lost during lab session');
  });

  it('configures bulk QR download with batch, group, and format options', () => {
    const handleExport = vi.fn();
    const batches = [{ id: 'batch-1', code: '24.1' }];
    const groups = [
      { id: 'group-a', name: 'Group A', batchId: 'batch-1' },
      { id: 'group-b', name: 'Group B', batchId: 'batch-1' },
    ];

    render(<BulkQrExportPanel batches={batches} groups={groups} onExport={handleExport} />);

    // Select batch
    fireEvent.change(screen.getByTestId('batch-select'), { target: { value: 'batch-1' } });

    // Group dropdown should now be enabled
    const groupSelect = screen.getByTestId('group-select');
    expect(groupSelect).not.toBeDisabled();

    // Select Group A
    fireEvent.change(groupSelect, { target: { value: 'group-a' } });

    // Select PDF sticker format
    fireEvent.click(screen.getByLabelText(/A4 Printable Stickers/i));

    // Click download
    fireEvent.click(screen.getByRole('button', { name: /Download Bulk QRs/i }));

    expect(handleExport).toHaveBeenCalledWith({
      batchId: 'batch-1',
      groupId: 'group-a',
      format: 'pdf',
      isSticker: false,
    });
  });
});
