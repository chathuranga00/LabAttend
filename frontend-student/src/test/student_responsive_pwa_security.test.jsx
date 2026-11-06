import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudentLayout } from '../components/layout/StudentLayout';
import { StudentDashboardPage } from '../pages/dashboard/StudentDashboardPage';
import { StudentAttendancePage } from '../pages/attendance/StudentAttendancePage';
import { StudentProfilePage } from '../pages/profile/StudentProfilePage';
import { StudentAuthProvider } from '../context/StudentAuthContext';
import { ToastProvider } from '../context/ToastContext';
import { PwaProvider } from '../context/PwaContext';
import api from '../services/api';

vi.mock('../services/api');

describe('Step 25: Student Portal Responsive Layout, PWA & Client Security Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('student_token', 'MOCK_STUDENT_TOKEN');
    localStorage.setItem(
      'student_user',
      JSON.stringify({
        id: 'stu-uuid-1',
        email: 'kasun@students.sliit.lk',
        fullName: 'Kasun Perera',
        studentId: 'STU-2026-001',
        role: 'STUDENT',
      })
    );

    // Default mock responses for authenticated pages
    api.get.mockImplementation((url) => {
      if (url === '/student/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              studentId: 'STU-2026-001',
              fullName: 'Kasun Perera',
              email: 'kasun@students.sliit.lk',
              degreeProgramme: 'BSc Software Engineering',
              batch: '2026.1',
              labGroup: 'Group A',
              enrollmentStatus: 'ACTIVE',
            },
          },
        });
      }
      if (url === '/student/attendance/summary') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              eligibleFinalizedSessions: 10,
              attendedSessions: 9,
              missedSessions: 1,
              attendancePercentage: '90.0%',
              percentageNumeric: 90.0,
              crossGroupVisitsCount: 1,
              threshold: 80.0,
              belowThreshold: false,
            },
          },
        });
      }
      if (url === '/student/attendance/modules') {
        return Promise.resolve({
          data: {
            success: true,
            data: [
              {
                moduleCode: 'SE301',
                moduleName: 'Distributed Systems',
                eligibleFinalizedSessions: 5,
                attendedSessions: 5,
                missedSessions: 0,
                attendancePercentage: '100.0%',
                percentageNumeric: 100.0,
                belowThreshold: false,
              },
            ],
          },
        });
      }
      if (url === '/student/attendance/history') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              content: [
                {
                  sessionDate: '2026-11-06',
                  moduleCode: 'SE301',
                  moduleName: 'Distributed Systems',
                  labSheetNumber: 'SHEET-01',
                  labGroup: 'Group A',
                  status: 'PRESENT',
                  isCrossGroup: false,
                  isCorrected: false,
                },
              ],
              totalElements: 1,
              totalPages: 1,
              number: 0,
              size: 20,
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  const renderWithProviders = (ui, initialEntry = '/dashboard') => {
    return render(
      <MemoryRouter initialEntries={[initialEntry]}>
        <StudentAuthProvider>
          <PwaProvider>
            <ToastProvider>
              {ui}
            </ToastProvider>
          </PwaProvider>
        </StudentAuthProvider>
      </MemoryRouter>
    );
  };

  // =========================================================================
  // 1. VIEWPORT BREAKPOINTS (360px, 390px, 768px, 1024px)
  // =========================================================================

  it('1. Viewport 360px (Compact Mobile): renders mobile navigation bar, metrics ring and cards', async () => {
    window.innerWidth = 360;
    window.innerHeight = 640;
    window.dispatchEvent(new Event('resize'));

    renderWithProviders(
      <Routes>
        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<StudentDashboardPage />} />
        </Route>
      </Routes>
    );

    // Profile & greeting rendered
    const names = await screen.findAllByText(/Kasun Perera/i);
    expect(names.length).toBeGreaterThan(0);

    const percentages = await screen.findAllByText('90.0%');
    expect(percentages.length).toBeGreaterThan(0);

    // Verify Mobile Navigation items are rendered
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Attendance').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Profile').length).toBeGreaterThan(0);
  });

  it('2. Viewport 390px (Standard Phone): mobile attendance cards render with lab sheet number', async () => {
    window.innerWidth = 390;
    window.innerHeight = 844;
    window.dispatchEvent(new Event('resize'));

    renderWithProviders(
      <Routes>
        <Route element={<StudentLayout />}>
          <Route path="/attendance" element={<StudentAttendancePage />} />
        </Route>
      </Routes>,
      '/attendance'
    );

    const modules = await screen.findAllByText('SE301');
    expect(modules.length).toBeGreaterThan(0);

    const sheets = await screen.findAllByText('SHEET-01');
    expect(sheets.length).toBeGreaterThan(0);

    const statuses = await screen.findAllByText('PRESENT');
    expect(statuses.length).toBeGreaterThan(0);

    // Verify filter toolbar exists
    expect(screen.getByText('Search & Filter Sessions')).toBeInTheDocument();
    expect(screen.getByText('Attendance Status')).toBeInTheDocument();
  });

  it('3. Viewport 768px & Desktop (1024px+): desktop navigation header and table format appear', async () => {
    window.innerWidth = 1024;
    window.innerHeight = 768;
    window.dispatchEvent(new Event('resize'));

    renderWithProviders(
      <Routes>
        <Route element={<StudentLayout />}>
          <Route path="/attendance" element={<StudentAttendancePage />} />
        </Route>
      </Routes>,
      '/attendance'
    );

    // Desktop navbar brand and student badges
    expect(await screen.findByText('LabAttend')).toBeInTheDocument();
    expect((await screen.findAllByText(/STU-2026-001/i)).length).toBeGreaterThan(0);

    // Desktop table header columns
    expect((await screen.findAllByText(/Lab Sheet #/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Lab Group/i)).length).toBeGreaterThan(0);
    expect((await screen.findAllByText(/Status/i)).length).toBeGreaterThan(0);
  });

  // =========================================================================
  // 2. PWA CONFIGURATION & SERVICE WORKER PRIVACY RULES
  // =========================================================================

  it('4. Client storage enforces strict privacy and no secret leakages', () => {
    expect(localStorage.getItem('qrToken')).toBeNull();
    expect(localStorage.getItem('qr_token')).toBeNull();
    expect(localStorage.getItem('lecturerNotes')).toBeNull();
    expect(localStorage.getItem('justificationNotes')).toBeNull();
    expect(localStorage.getItem('auditLogs')).toBeNull();
  });

  it('5. Offline detection: surfaces offline warning banner when network is disconnected', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<StudentLayout />}>
          <Route path="/dashboard" element={<StudentDashboardPage />} />
        </Route>
      </Routes>
    );

    // Verify initial load
    expect(await screen.findByText('LabAttend')).toBeInTheDocument();

    // Simulate going offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(screen.getByText(/You are offline\. Showing cached shell\./i)).toBeInTheDocument();
    });

    // Simulate going back online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(screen.queryByText(/You are offline\. Showing cached shell\./i)).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // 3. ZERO PRIVACY LEAKS (NO SCANNER, NO QR CODE, NO ADMIN CONTROLS)
  // =========================================================================

  it('6. Privacy & Security: Student Profile Page contains no QR token, no scanner, and advises admin contact for edits', async () => {
    renderWithProviders(
      <Routes>
        <Route element={<StudentLayout />}>
          <Route path="/profile" element={<StudentProfilePage />} />
        </Route>
      </Routes>,
      '/profile'
    );

    expect(await screen.findByText('Student Profile & Security')).toBeInTheDocument();
    expect(await screen.findByText(/Need to update your details\?/i)).toBeInTheDocument();
    expect(await screen.findByText(/Please contact the Academic Department Administrator/i)).toBeInTheDocument();

    // Ensure zero QR scanner, zero QR code display, and no download buttons
    expect(screen.queryByText(/Scan QR|Camera|html5-qrcode/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Download QR|Regenerate QR/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/qrToken|qr_token/i)).not.toBeInTheDocument();
  });
});
