import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../pages/auth/LoginPage';
import { AuthContext } from '../context/AuthContext';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('LoginPage Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (authOverrides = {}) => {
    const defaultAuth = {
      login: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
      role: null,
      user: null,
      loading: false,
      ...authOverrides,
    };

    return {
      ...render(
        <AuthContext.Provider value={defaultAuth}>
          <BrowserRouter>
            <LoginPage />
          </BrowserRouter>
        </AuthContext.Provider>
      ),
      authContext: defaultAuth,
    };
  };

  it('renders login form elements properly', () => {
    renderWithAuth();

    expect(screen.getByRole('heading', { name: /LabAttend/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/admin@labattend\.local/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Enter your secure password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In to LabAttend/i })).toBeInTheDocument();
  });

  it('validates empty email submission', async () => {
    renderWithAuth();

    const form = screen.getByRole('button', { name: /Sign In to LabAttend/i }).closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Please enter your university email address/i)).toBeInTheDocument();
  });

  it('validates invalid email format', async () => {
    renderWithAuth();

    const emailInput = screen.getByPlaceholderText(/admin@labattend\.local/i);
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });

    const form = screen.getByRole('button', { name: /Sign In to LabAttend/i }).closest('form');
    fireEvent.submit(form);

    expect(await screen.findByText(/Please enter a valid email address/i)).toBeInTheDocument();
  });

  it('displays API error message upon failed login attempt', async () => {
    const loginMock = vi.fn().mockRejectedValue(new Error('Email or password is incorrect.'));
    renderWithAuth({ login: loginMock });

    fireEvent.change(screen.getByPlaceholderText(/admin@labattend\.local/i), {
      target: { value: 'admin@sliit.lk' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your secure password/i), {
      target: { value: 'WrongPassword' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to LabAttend/i }));

    expect(await screen.findByText(/Email or password is incorrect\./i)).toBeInTheDocument();
  });

  it('redirects ADMIN to /admin/dashboard on successful login', async () => {
    const loginMock = vi.fn().mockResolvedValue({ role: 'ADMIN' });
    renderWithAuth({ login: loginMock });

    fireEvent.change(screen.getByPlaceholderText(/admin@labattend\.local/i), {
      target: { value: 'admin@sliit.lk' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your secure password/i), {
      target: { value: 'AdminPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to LabAttend/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin/dashboard', { replace: true });
    });
  });

  it('redirects LECTURER to /lecturer/dashboard on successful login', async () => {
    const loginMock = vi.fn().mockResolvedValue({ role: 'LECTURER' });
    renderWithAuth({ login: loginMock });

    fireEvent.change(screen.getByPlaceholderText(/admin@labattend\.local/i), {
      target: { value: 'lecturer@sliit.lk' },
    });
    fireEvent.change(screen.getByPlaceholderText(/Enter your secure password/i), {
      target: { value: 'LecturerPass123!' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to LabAttend/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/lecturer/dashboard', { replace: true });
    });
  });
});
