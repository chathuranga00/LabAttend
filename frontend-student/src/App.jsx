import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { StudentAuthProvider } from './context/StudentAuthContext';
import { PwaProvider } from './context/PwaContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { StudentLayout } from './components/layout/StudentLayout';

// Pages
import { StudentLoginPage } from './pages/auth/StudentLoginPage';
import { StudentActivatePage } from './pages/auth/StudentActivatePage';
import { StudentForgotPasswordPage } from './pages/auth/StudentForgotPasswordPage';
import { StudentResetPasswordPage } from './pages/auth/StudentResetPasswordPage';
import { StudentDashboardPage } from './pages/dashboard/StudentDashboardPage';
import { StudentAttendancePage } from './pages/attendance/StudentAttendancePage';
import { StudentProfilePage } from './pages/profile/StudentProfilePage';

export function App() {
  return (
    <BrowserRouter>
      <PwaProvider>
        <ToastProvider>
          <StudentAuthProvider>
            <Routes>
              {/* Public Student Authentication Routes */}
              <Route path="/login" element={<StudentLoginPage />} />
              <Route path="/activate" element={<StudentActivatePage />} />
              <Route path="/forgot-password" element={<StudentForgotPasswordPage />} />
              <Route path="/reset-password" element={<StudentResetPasswordPage />} />

              {/* Protected Student Portal Routes */}
              <Route
                element={
                  <ProtectedRoute>
                    <StudentLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/dashboard" element={<StudentDashboardPage />} />
                <Route path="/attendance" element={<StudentAttendancePage />} />
                <Route path="/profile" element={<StudentProfilePage />} />
              </Route>

              {/* Default & Fallback Redirection */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </StudentAuthProvider>
        </ToastProvider>
      </PwaProvider>
    </BrowserRouter>
  );
}

export default App;
