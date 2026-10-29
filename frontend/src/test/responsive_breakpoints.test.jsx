import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import DataTable from '../components/common/DataTable';
import Modal from '../components/common/Modal';
import Pagination from '../components/common/Pagination';
import SearchBar from '../components/common/SearchBar';
import LecturerLayout from '../layouts/LecturerLayout';
import AdminLayout from '../layouts/AdminLayout';

// Mock useAuth
vi.mock('../context/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { fullName: 'Dr. Test Lecturer', email: 'lecturer@nsbm.lk', staffId: 'STF-01', department: 'Software Engineering' },
    role: 'LECTURER',
    isAuthenticated: true,
    logout: vi.fn(),
  })),
  AuthProvider: ({ children }) => <div>{children}</div>,
}));

// Mock PWA Context
vi.mock('../context/PwaContext', () => ({
  usePwa: vi.fn(() => ({
    isOnline: true,
    isStandalone: false,
    isIosSafari: false,
    isInstallable: false,
  })),
}));

describe('Step 18 Responsive Breakpoint & Mobile UI Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders DataTable with mobile stacked cards and desktop table', () => {
    const columns = [
      { header: 'Student ID', key: 'studentId' },
      { header: 'Name', key: 'name' },
      { header: 'Group', key: 'group' },
      {
        header: 'Actions',
        key: 'actions',
        render: (row) => <button>View {row.studentId}</button>,
      },
    ];

    const data = [
      { id: 1, studentId: 'NSBM001', name: 'Kasun Perera', group: 'Group A' },
      { id: 2, studentId: 'NSBM002', name: 'Dilani Silva', group: 'Group B' },
    ];

    const { container } = render(<DataTable columns={columns} data={data} />);

    // Mobile stacked cards container (< 768px)
    const mobileCardsContainer = container.querySelector('.md\\:hidden');
    expect(mobileCardsContainer).toBeInTheDocument();
    expect(mobileCardsContainer).toHaveTextContent('Kasun Perera');
    expect(mobileCardsContainer).toHaveTextContent('Dilani Silva');

    // Desktop table container (>= 768px)
    const desktopTableContainer = container.querySelector('.hidden.md\\:block');
    expect(desktopTableContainer).toBeInTheDocument();
    expect(desktopTableContainer.querySelector('table')).toBeInTheDocument();
  });

  it('renders Modal with mobile bottom-sheet styling and minimum touch targets', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Responsive Modal">
        <p>Modal content</p>
      </Modal>
    );

    expect(screen.getByText('Responsive Modal')).toBeInTheDocument();
    const closeBtn = screen.getByLabelText('Close dialog');
    expect(closeBtn).toBeInTheDocument();
    expect(closeBtn.className).toContain('min-h-[44px]');
    expect(closeBtn.className).toContain('min-w-[44px]');

    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders SearchBar with inputmode search and touch-compliant clear button', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();
    render(
      <SearchBar
        value="NSBM"
        onChange={handleChange}
        onClear={handleClear}
        placeholder="Search students..."
      />
    );

    const input = screen.getByPlaceholderText('Search students...');
    expect(input).toHaveAttribute('type', 'search');
    expect(input).toHaveAttribute('inputMode', 'search');
    expect(input.className).toContain('min-h-[44px]');

    const clearBtn = screen.getByLabelText('Clear search query');
    expect(clearBtn).toBeInTheDocument();
    expect(clearBtn.className).toContain('min-h-[44px]');
    expect(clearBtn.className).toContain('min-w-[44px]');
  });

  it('renders Pagination with touch-friendly navigation buttons', () => {
    const handlePageChange = vi.fn();
    render(
      <Pagination
        currentPage={0}
        totalPages={5}
        totalElements={50}
        pageSize={10}
        onPageChange={handlePageChange}
      />
    );

    const prevBtn = screen.getByRole('button', { name: /Prev/i });
    const nextBtn = screen.getByRole('button', { name: /Next/i });

    expect(prevBtn.className).toContain('min-h-[44px]');
    expect(prevBtn.className).toContain('min-w-[44px]');
    expect(nextBtn.className).toContain('min-h-[44px]');
    expect(nextBtn.className).toContain('min-w-[44px]');

    expect(prevBtn).toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    fireEvent.click(nextBtn);
    expect(handlePageChange).toHaveBeenCalledWith(1);
  });

  it('renders LecturerLayout with mobile bottom navigation bar', () => {
    render(
      <BrowserRouter>
        <LecturerLayout />
      </BrowserRouter>
    );

    const bottomNav = screen.getByLabelText('Lecturer Mobile Bottom Navigation');
    expect(bottomNav).toBeInTheDocument();
    expect(bottomNav.className).toContain('md:hidden');

    // Prominent QR Scanner action button
    expect(screen.getByText('Scan QR')).toBeInTheDocument();
    // 4 other actions
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sessions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reports').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('More').length).toBeGreaterThanOrEqual(1);
  });

  it('renders AdminLayout with mobile drawer and bottom navigation bar', () => {
    render(
      <BrowserRouter>
        <AdminLayout />
      </BrowserRouter>
    );

    const bottomNav = screen.getByLabelText('Mobile Bottom Navigation');
    expect(bottomNav).toBeInTheDocument();
    expect(bottomNav.className).toContain('md:hidden');

    expect(screen.getAllByText('Dashboard').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Rosters').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Sessions').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('Reports').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('More').length).toBeGreaterThanOrEqual(1);
  });
});

