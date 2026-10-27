import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from '../components/common/ProtectedRoute';
import { AuthContext } from '../context/AuthContext';

describe('ProtectedRoute Component Tests', () => {
  const renderProtectedRoute = (authContextValue, allowedRoles = null) => {
    return render(
      <AuthContext.Provider value={authContextValue}>
        <MemoryRouter initialEntries={['/protected']}>
          <Routes>
            <Route
              path="/protected"
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  <div data-testid="protected-content">Secret Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
            <Route path="/admin/dashboard" element={<div data-testid="admin-dash">Admin Dashboard</div>} />
            <Route path="/lecturer/dashboard" element={<div data-testid="lecturer-dash">Lecturer Dashboard</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
  };

  it('shows loading indicator while verifying authentication state', () => {
    renderProtectedRoute({ loading: true, isAuthenticated: false, role: null });

    expect(screen.getByText(/Validating authentication credentials/i)).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated user to /login', () => {
    renderProtectedRoute({ loading: false, isAuthenticated: false, role: null });

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders protected content for authenticated user with matching role', () => {
    renderProtectedRoute(
      { loading: false, isAuthenticated: true, role: 'ADMIN' },
      ['ADMIN']
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects user with LECTURER role away from ADMIN-only route to /lecturer/dashboard', () => {
    renderProtectedRoute(
      { loading: false, isAuthenticated: true, role: 'LECTURER' },
      ['ADMIN']
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('lecturer-dash')).toBeInTheDocument();
  });

  it('redirects user with ADMIN role away from LECTURER-only route to /admin/dashboard', () => {
    renderProtectedRoute(
      { loading: false, isAuthenticated: true, role: 'ADMIN' },
      ['LECTURER']
    );

    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    expect(screen.getByTestId('admin-dash')).toBeInTheDocument();
  });
});
