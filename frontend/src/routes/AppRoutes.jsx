import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import HealthCheck from '../pages/HealthCheck';
import AdminLayout from '../layouts/AdminLayout';
import LecturerLayout from '../layouts/LecturerLayout';
import {
  AdminDashboardPage,
  DegreeProgrammesPage,
  BatchesPage,
  ModulesPage,
  LaboratoryHallsPage,
  AssignmentsPage,
  LecturersPage,
  StudentsPage,
  StudentDetailsPage,
  AdminPlaceholderPage,
} from '../pages/admin';
import LecturerDashboardPage from '../pages/lecturer/LecturerDashboardPage';
import LecturerPlaceholderPage from '../pages/lecturer/LecturerPlaceholderPage';

function RootRedirect() {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={role === 'ADMIN' ? '/admin/dashboard' : '/lecturer/dashboard'} replace />;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Root redirect based on authentication and verified role */}
      <Route path="/" element={<RootRedirect />} />

      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/health" element={<HealthCheck />} />

      {/* Protected Admin Routes */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['ADMIN']}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboardPage />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="programmes" element={<DegreeProgrammesPage />} />
        <Route path="batches" element={<BatchesPage />} />
        <Route path="modules" element={<ModulesPage />} />
        <Route path="lecturers" element={<LecturersPage />} />
        <Route path="assignments" element={<AssignmentsPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentDetailsPage />} />
        <Route path="halls" element={<LaboratoryHallsPage />} />
        <Route
          path="audits"
          element={
            <AdminPlaceholderPage
              title="System Audit Ledger"
              description="Immutable audit trail of session state changes and administrative modifications"
            />
          }
        />
      </Route>

      {/* Protected Lecturer Routes */}
      <Route
        path="/lecturer"
        element={
          <ProtectedRoute allowedRoles={['LECTURER']}>
            <LecturerLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<LecturerDashboardPage />} />
        <Route path="dashboard" element={<LecturerDashboardPage />} />
        <Route
          path="sessions"
          element={
            <LecturerPlaceholderPage
              title="My Laboratory Sessions"
              description="View, schedule, and open attendance windows for your assigned courses"
            />
          }
        />
        <Route
          path="scanner"
          element={
            <LecturerPlaceholderPage
              title="Live Badge QR Scanner"
              description="html5-qrcode camera badge check-in terminal with instant feedback"
            />
          }
        />
        <Route
          path="reports"
          element={
            <LecturerPlaceholderPage
              title="Attendance Analytics & Reports"
              description="Attendance percentages, finalized absentee lists, and export summaries"
            />
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
