import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';
import LoginPage from '../pages/auth/LoginPage';
import HealthCheck from '../pages/HealthCheck';
import AdminLayout from '../layouts/AdminLayout';
import LecturerLayout from '../layouts/LecturerLayout';
import AdminDashboardPage from '../pages/admin/AdminDashboardPage';
import AdminPlaceholderPage from '../pages/admin/AdminPlaceholderPage';
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
        <Route
          path="programmes"
          element={
            <AdminPlaceholderPage
              title="Degree Programmes"
              description="Manage university academic degrees, faculties, and departments"
            />
          }
        />
        <Route
          path="batches"
          element={
            <AdminPlaceholderPage
              title="Student Batches"
              description="Manage student academic intake batches and academic years"
            />
          }
        />
        <Route
          path="modules"
          element={
            <AdminPlaceholderPage
              title="Modules & Courses"
              description="Manage curriculum course codes, module names, and credits"
            />
          }
        />
        <Route
          path="lecturers"
          element={
            <AdminPlaceholderPage
              title="Lecturer Module Assignments"
              description="Allocate certified lecturers to specific course modules per semester"
            />
          }
        />
        <Route
          path="students"
          element={
            <AdminPlaceholderPage
              title="Student Cohort Rosters"
              description="Manage student records and cohort enrollments (records only, no login accounts)"
            />
          }
        />
        <Route
          path="halls"
          element={
            <AdminPlaceholderPage
              title="Laboratory Halls"
              description="Manage physical lab facilities, seat capacities, and room locations"
            />
          }
        />
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
