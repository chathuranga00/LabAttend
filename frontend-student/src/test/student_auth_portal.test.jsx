import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudentLoginPage } from '../pages/auth/StudentLoginPage';
import { StudentDashboardPage } from '../pages/dashboard/StudentDashboardPage';
import { StudentProfilePage } from '../pages/profile/StudentProfilePage';
import { StudentAttendancePage } from '../pages/attendance/StudentAttendancePage';
import { StudentAuthProvider } from '../context/StudentAuthContext';
import { ToastProvider } from '../context/ToastContext';
import { PwaProvider } from '../context/PwaContext';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import api from '../services/api';

vi.mock('../services/api');

describe('Student Portal & Authentication Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('1. StudentLoginPage renders correctly without links to staff login', () => {
    render(
      <MemoryRouter>
        <StudentAuthProvider>
          <StudentLoginPage />
        </StudentAuthProvider>
      </MemoryRouter>
    );

    expect(screen.getByText(/LabAttend/i)).toBeInTheDocument();
    expect(screen.getByText(/Student Attendance Portal/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/student@students.nsbm.ac.lk/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to Portal/i })).toBeInTheDocument();
    
    // Ensure no staff login links
    expect(screen.queryByText(/Staff Login|Admin Login|Lecturer Login/i)).not.toBeInTheDocument();
  });

  it('2. StudentLoginPage calls /auth/student/login and authenticates student', async () => {
    api.post.mockResolvedValueOnce({
      data: {
        success: true,
        message: 'Student authentication successful',
        data: {
          token: 'STUDENT_TEST_JWT_TOKEN',
          user: {
            id: 'stu-uuid-1',
            email: 'kasun@students.nsbm.ac.lk',
            fullName: 'Kasun Perera',
            role: 'STUDENT',
          },
        },
      },
    });

    api.get.mockResolvedValueOnce({
      data: {
        success: true,
        data: {
          studentId: 'NSBM2026042',
          fullName: 'Kasun Perera',
          email: 'kasun@students.nsbm.ac.lk',
          degreeProgramme: 'BSc Software Engineering',
          batch: '2026.1',
          labGroup: 'Group A',
          enrollmentStatus: 'ACTIVE',
        },
      },
    });

    render(
      <MemoryRouter initialEntries={['/login']}>
        <StudentAuthProvider>
          <Routes>
            <Route path="/login" element={<StudentLoginPage />} />
            <Route path="/dashboard" element={<div>STUDENT_DASHBOARD_CONTENT</div>} />
          </Routes>
        </StudentAuthProvider>
      </MemoryRouter>
    );

    fireEvent.change(screen.getByPlaceholderText(/student@students.nsbm.ac.lk/i), {
      target: { value: 'kasun@students.nsbm.ac.lk' },
    });
    fireEvent.change(screen.getByPlaceholderText(/••••••••••••/i), {
      target: { value: 'StudentPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Portal/i }));

    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/auth/student/login', {
        email: 'kasun@students.nsbm.ac.lk',
        password: 'StudentPass123!',
      });
      expect(localStorage.getItem('student_token')).toBe('STUDENT_TEST_JWT_TOKEN');
      expect(screen.getByText('STUDENT_DASHBOARD_CONTENT')).toBeInTheDocument();
    });
  });

  it('3. ProtectedRoute redirects unauthenticated visitor to /login', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <StudentAuthProvider>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>PROTECTED_STUDENT_DASHBOARD</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>LOGIN_PAGE_REDIRECT_TARGET</div>} />
          </Routes>
        </StudentAuthProvider>
      </MemoryRouter>
    );

    expect(screen.queryByText('PROTECTED_STUDENT_DASHBOARD')).not.toBeInTheDocument();
    expect(screen.getByText('LOGIN_PAGE_REDIRECT_TARGET')).toBeInTheDocument();
  });

  it('4. StudentDashboardPage displays overall turnout and below threshold advisory', async () => {
    localStorage.setItem('student_token', 'TOKEN_123');
    localStorage.setItem(
      'student_user',
      JSON.stringify({ id: 'u1', role: 'STUDENT', fullName: 'Kasun' })
    );

    api.get.mockImplementation((url) => {
      if (url === '/student/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              studentId: 'NSBM2026042',
              fullName: 'Kasun Perera',
              degreeProgramme: 'BSc in Software Engineering',
              batch: '2026.1',
              labGroup: 'Group A',
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
              attendedSessions: 7,
              missedSessions: 3,
              attendancePercentage: '70.0%',
              percentageNumeric: 70.0,
              crossGroupVisitsCount: 1,
              threshold: 80.0,
              belowThreshold: true,
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
                moduleId: 'm1',
                moduleCode: 'SE301',
                moduleName: 'Distributed Systems',
                eligibleFinalizedSessions: 10,
                attendedSessions: 7,
                missedSessions: 3,
                attendancePercentage: '70.0%',
                percentageNumeric: 70.0,
                belowThreshold: true,
              },
            ],
          },
        });
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    render(
      <MemoryRouter>
        <StudentAuthProvider>
          <StudentDashboardPage />
        </StudentAuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('70.0%').length).toBeGreaterThan(0);
      expect(screen.getByText(/Attendance Advisory/i)).toBeInTheDocument();
      expect(screen.getByText(/SE301/i)).toBeInTheDocument();
      expect(screen.getByText(/Distributed Systems/i)).toBeInTheDocument();
    });
  });

  it('5. StudentProfilePage displays read-only details and change-password form', async () => {
    localStorage.setItem('student_token', 'TOKEN_123');
    localStorage.setItem(
      'student_user',
      JSON.stringify({ id: 'u1', role: 'STUDENT', fullName: 'Kasun Perera' })
    );

    api.get.mockImplementation((url) => {
      if (url === '/student/me') {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              studentId: 'NSBM2026042',
              fullName: 'Kasun Perera',
              email: 'kasun@students.nsbm.ac.lk',
              degreeProgramme: 'BSc Software Engineering',
              batch: '2026.1',
              labGroup: 'Group A',
              enrollmentStatus: 'ACTIVE',
            },
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: null } });
    });

    render(
      <MemoryRouter>
        <ToastProvider>
          <StudentAuthProvider>
            <StudentProfilePage />
          </StudentAuthProvider>
        </ToastProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Kasun Perera')).toBeInTheDocument();
      expect(screen.getAllByText('NSBM2026042').length).toBeGreaterThan(0);
      expect(screen.getByText('kasun@students.nsbm.ac.lk')).toBeInTheDocument();
      expect(screen.getByText(/Change Password/i)).toBeInTheDocument();
      expect(screen.getByText(/Need to update your details\?/i)).toBeInTheDocument();
    });
  });

  it('6. StudentAttendancePage displays finalized sessions and cross-group badge', async () => {
    localStorage.setItem('student_token', 'TOKEN_123');
    localStorage.setItem(
      'student_user',
      JSON.stringify({ id: 'u1', role: 'STUDENT', fullName: 'Kasun' })
    );

    api.get.mockImplementation((url) => {
      if (url === '/student/attendance/modules') {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ moduleId: 'm1', moduleCode: 'SE301', moduleName: 'Distributed Systems' }],
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
                  sessionDate: '2026-11-05',
                  moduleCode: 'SE301',
                  moduleName: 'Distributed Systems',
                  labSheetNumber: 'SHEET-01',
                  labGroup: 'Group B',
                  status: 'PRESENT',
                  isCrossGroup: true,
                  isCorrected: false,
                },
              ],
              totalElements: 1,
              totalPages: 1,
              number: 0,
            },
          },
        });
      }
      return Promise.reject(new Error('Unknown url: ' + url));
    });

    render(
      <MemoryRouter>
        <StudentAttendancePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('SE301')[0]).toBeInTheDocument();
      expect(screen.getAllByText(/Cross-Group|Visitor/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText('PRESENT')[0]).toBeInTheDocument();
    });
  });

  it('7. Code segregation check: no scanner or html5-qrcode in student portal dependencies', () => {
    const studentPkg = require('../../package.json');
    // Ensure student package does not include html5-qrcode
    expect(studentPkg.dependencies['html5-qrcode']).toBeUndefined();
  });
});
