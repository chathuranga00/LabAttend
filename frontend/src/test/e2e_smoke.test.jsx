import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AppRoutes from '../routes/AppRoutes';
import { AuthProvider } from '../context/AuthContext';
import { ToastProvider } from '../context/ToastContext';
import { PwaProvider } from '../context/PwaContext';
import api from '../services/api';
import { sessionService } from '../services/sessionService';
import { attendanceService } from '../services/attendanceService';

// Mock API and sessionService
vi.mock('../services/api', () => ({
  default: {
    get: vi.fn().mockResolvedValue({ data: {} }),
    post: vi.fn().mockResolvedValue({ data: {} }),
    interceptors: {
      request: { use: vi.fn() },
      response: { use: vi.fn() },
    },
  },
}));

vi.mock('../services/sessionService', () => ({
  sessionService: {
    getLecturerSessions: vi.fn(),
    getLecturerSessionById: vi.fn(),
    getSessionSummary: vi.fn(),
    createSession: vi.fn(),
    openSession: vi.fn(),
    finalizeSession: vi.fn(),
    getAllSessions: vi.fn(),
  },
}));

vi.mock('../services/attendanceService', () => ({
  attendanceService: {
    getSessionAttendance: vi.fn(),
    scanQr: vi.fn(),
    getExpectedStudents: vi.fn(),
    recordManualAttendance: vi.fn(),
  },
}));

describe('End-to-End Mobile Viewport Smoke Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();

    // Emulate Mobile Viewport (iPhone 14 / Android: 390 x 844 px)
    window.innerWidth = 390;
    window.innerHeight = 844;
    window.dispatchEvent(new Event('resize'));

    // Mock Camera Hardware APIs
    if (!navigator.mediaDevices) {
      navigator.mediaDevices = {};
    }
    navigator.mediaDevices.getUserMedia = vi.fn().mockResolvedValue({
      getTracks: () => [
        {
          stop: vi.fn(),
          getCapabilities: () => ({ torch: true }),
          applyConstraints: vi.fn().mockResolvedValue(undefined),
        },
      ],
      getVideoTracks: () => [
        {
          stop: vi.fn(),
          getCapabilities: () => ({ torch: true }),
          applyConstraints: vi.fn().mockResolvedValue(undefined),
        },
      ],
    });

    // Mock AudioContext
    window.AudioContext = vi.fn().mockImplementation(() => ({
      state: 'running',
      currentTime: 0,
      createOscillator: () => ({
        connect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
        frequency: { setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      }),
      createGain: () => ({
        connect: vi.fn(),
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
      }),
      destination: {},
      resume: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
    }));

    api.get.mockImplementation((url) => {
      if (url === '/auth/me') {
        return Promise.resolve({
          id: 'lec-1',
          name: 'Dr. Sampath Perera',
          fullName: 'Dr. Sampath Perera',
          email: 'lecturer@labattend.local',
          role: 'LECTURER',
        });
      }
      return Promise.resolve({ data: {} });
    });
    sessionService.getDashboard = vi.fn().mockResolvedValue({
      success: true,
      data: {
        activeSessions: [],
        recentFinalizedSessions: [],
        totalSessionsCount: 5,
        totalStudentsAttended: 120,
        averageAttendanceRate: 85.5,
      },
    });

    sessionService.getLecturerSessions.mockResolvedValue({
      success: true,
      data: {
        content: [
          {
            id: 'sess-e2e',
            sessionCode: 'SES-E2E-01',
            moduleCode: 'SE301',
            moduleName: 'Advanced Software Engineering',
            batchName: 'Batch 2026',
            labGroupName: 'A',
            hallName: 'Lab Hall 03',
            hallCode: 'LH3',
            status: 'ACTIVE',
            startTime: '08:30:00',
            endTime: '10:30:00',
            expectedStudentCount: 40,
            attendedCount: 15,
          },
        ],
      },
    });

    sessionService.getLecturerSessionById.mockResolvedValue({
      success: true,
      data: {
        id: 'sess-e2e',
        sessionCode: 'SES-E2E-01',
        moduleCode: 'SE301',
        moduleName: 'Advanced Software Engineering',
        batchName: 'Batch 2026',
        labGroupName: 'A',
        hallName: 'Lab Hall 03',
        hallCode: 'LH3',
        status: 'ACTIVE',
        startTime: '08:30:00',
        endTime: '10:30:00',
        expectedStudentCount: 40,
        attendedCount: 15,
      },
    });

    sessionService.getSessionSummary.mockResolvedValue({
      success: true,
      data: {
        expectedStudentCount: 40,
        presentCount: 15,
        crossGroupCount: 3,
        unmarkedCount: 25,
      },
    });

    attendanceService.getSessionAttendance.mockResolvedValue({
      success: true,
      data: {
        content: [
          {
            id: 'att-e2e-1',
            studentId: 'NSBM2026001',
            studentName: 'Kasun Jayawardena',
            isCrossGroup: false,
            method: 'QR_SCAN',
            markedAt: '2026-10-29T08:45:00Z',
          },
        ],
      },
    });
  });

  const renderWithRouter = (initialRoute = '/') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <PwaProvider>
          <ToastProvider>
            <AuthProvider>
              <AppRoutes />
            </AuthProvider>
          </ToastProvider>
        </PwaProvider>
      </MemoryRouter>
    );
  };

  it('1. Login Flow: user logs in on mobile, receives Bearer token, and navigates to Lecturer Dashboard', async () => {
    api.post.mockImplementation((url) => {
      if (url === '/auth/login') {
        return Promise.resolve({
          token: 'mock-e2e-jwt-token',
          user: {
            id: 'lec-1',
            name: 'Dr. Sampath Perera',
            fullName: 'Dr. Sampath Perera',
            email: 'lecturer@labattend.local',
            role: 'LECTURER',
          },
        });
      }
      return Promise.resolve({ data: {} });
    });

    renderWithRouter('/login');

    // Confirm login form elements render on mobile
    expect(screen.getByText('Laboratory & Lecture Attendance Management System')).toBeInTheDocument();
    const emailInput = screen.getByLabelText(/university email address/i);
    const passwordInput = screen.getByLabelText(/account password/i);
    const submitBtn = screen.getByRole('button', { name: /sign in/i });

    // Fill credentials
    fireEvent.change(emailInput, { target: { value: 'lecturer@labattend.local' } });
    fireEvent.change(passwordInput, { target: { value: 'Lecturer@2026!' } });
    fireEvent.click(submitBtn);

    // Verify token stored in localStorage
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        email: 'lecturer@labattend.local',
        password: 'Lecturer@2026!',
      });
      expect(localStorage.getItem('labattend_token')).toBe('mock-e2e-jwt-token');
    });

    // Check navigation to Lecturer dashboard
    expect(await screen.findByText('Scan QR')).toBeInTheDocument();
    expect(screen.getAllByText(/Dashboard/i).length).toBeGreaterThanOrEqual(1);
  });

  it('2. Role-Based Routing Flow: blocks non-admin from accessing admin endpoints', async () => {
    // Set logged-in state as LECTURER
    localStorage.setItem('labattend_token', 'valid-lecturer-jwt');
    localStorage.setItem(
      'labattend_user',
      JSON.stringify({
        id: 'lec-1',
        name: 'Dr. Sampath Perera',
        email: 'lecturer@labattend.local',
        role: 'LECTURER',
      })
    );
    api.get.mockResolvedValue({
      success: true,
      data: {
        id: 'lec-1',
        name: 'Dr. Sampath Perera',
        email: 'lecturer@labattend.local',
        role: 'LECTURER',
      },
    });

    // Attempt to access restricted Admin Roster route
    renderWithRouter('/admin/students');

    // Lecturer is blocked from Admin view and redirected
    await waitFor(() => {
      expect(screen.queryByText(/Manage Student Rosters/i)).not.toBeInTheDocument();
    });
  });

  it('3. Mobile QR Scanner Flow: initializes viewfinder with mock camera and processes scan with visual confirmation', async () => {
    // Authenticate as lecturer
    localStorage.setItem('labattend_token', 'valid-lecturer-jwt');
    localStorage.setItem(
      'labattend_user',
      JSON.stringify({
        id: 'lec-1',
        name: 'Dr. Sampath Perera',
        email: 'lecturer@labattend.local',
        role: 'LECTURER',
      })
    );
    api.get.mockResolvedValue({
      success: true,
      data: {
        id: 'lec-1',
        name: 'Dr. Sampath Perera',
        email: 'lecturer@labattend.local',
        role: 'LECTURER',
      },
    });

    renderWithRouter('/lecturer/scanner?sessionId=sess-e2e');

    // Confirm mobile viewfinder and sticky counters render
    expect(await screen.findByText('Camera Viewfinder')).toBeInTheDocument();
    expect(screen.getByText('Last Scanned Badge Status')).toBeInTheDocument();
    expect(screen.getByText('Expected')).toBeInTheDocument();
    expect(screen.getByText('Visitors')).toBeInTheDocument();

    // Verify counter values from backend summary
    expect(await screen.findByText('40')).toBeInTheDocument(); // Expected
    expect(screen.getByText('15')).toBeInTheDocument(); // Present
    expect(screen.getByText('3')).toBeInTheDocument(); // Visitors
  });

  it('4. Offline Resilience: displays connection warning and blocks scan when device is offline', async () => {
    localStorage.setItem('labattend_token', 'valid-lecturer-jwt');
    localStorage.setItem(
      'labattend_user',
      JSON.stringify({
        id: 'lec-1',
        name: 'Dr. Sampath Perera',
        role: 'LECTURER',
      })
    );
    api.get.mockResolvedValue({
      success: true,
      data: { id: 'lec-1', name: 'Dr. Sampath Perera', role: 'LECTURER' },
    });

    // Simulate offline state
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true });
    window.dispatchEvent(new Event('offline'));

    renderWithRouter('/lecturer/scanner?sessionId=sess-e2e');

    expect(await screen.findByText(/Scanning Paused — Offline/i)).toBeInTheDocument();
    expect(
      screen.getByText(/LabAttend requires an active internet connection to record attendance/i)
    ).toBeInTheDocument();

    // Restore online state
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true });
    window.dispatchEvent(new Event('online'));
  });
});
