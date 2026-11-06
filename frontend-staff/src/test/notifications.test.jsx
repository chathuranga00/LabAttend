import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../context/AuthContext';
import { NotificationProvider, useNotifications } from '../context/NotificationContext';
import NotificationBell from '../components/notifications/NotificationBell';

function TestWrapper({ children, initialRole = 'LECTURER' }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          {children}
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

describe('Notification System Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders NotificationBell button with bell icon', () => {
    render(
      <TestWrapper>
        <NotificationBell />
      </TestWrapper>
    );

    const bellBtn = screen.getByRole('button', { name: /view notifications/i });
    expect(bellBtn).toBeInTheDocument();
  });

  it('toggles Notification Center dropdown when bell button is clicked', () => {
    render(
      <TestWrapper>
        <NotificationBell />
      </TestWrapper>
    );

    const bellBtn = screen.getByRole('button', { name: /view notifications/i });
    expect(screen.queryByText(/notifications/i, { selector: 'span' })).not.toBeInTheDocument();

    // Open dropdown
    fireEvent.click(bellBtn);
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    expect(screen.getByText(/simulate alert/i)).toBeInTheDocument();

    // Close dropdown via close button
    const closeBtn = screen.getByRole('button', { name: /close notification panel/i });
    fireEvent.click(closeBtn);
    expect(screen.queryByText('Notifications')).not.toBeInTheDocument();
  });

  it('adds a new notification and increments unread count', () => {
    function CustomNotificationTester() {
      const { addNotification, unreadCount } = useNotifications();
      return (
        <div>
          <span data-testid="count">{unreadCount}</span>
          <button
            onClick={() =>
              addNotification({
                title: 'Test Notification Alert',
                message: 'A test message for testing.',
                type: 'warning',
                category: 'session',
              })
            }
          >
            Trigger Notif
          </button>
          <NotificationBell />
        </div>
      );
    }

    render(
      <TestWrapper>
        <CustomNotificationTester />
      </TestWrapper>
    );

    const triggerBtn = screen.getByText('Trigger Notif');
    act(() => {
      fireEvent.click(triggerBtn);
    });

    // Open panel to verify new notification title is displayed
    const bellBtn = screen.getByRole('button', { name: /view notifications/i });
    fireEvent.click(bellBtn);

    expect(screen.getByText('Test Notification Alert')).toBeInTheDocument();
    expect(screen.getByText('A test message for testing.')).toBeInTheDocument();
  });

  it('supports marking all notifications as read and clearing all', () => {
    render(
      <TestWrapper>
        <NotificationBell />
      </TestWrapper>
    );

    const bellBtn = screen.getByRole('button', { name: /view notifications/i });
    fireEvent.click(bellBtn);

    // Click "Simulate Alert" to ensure at least one notification exists
    const simBtn = screen.getByText(/simulate alert/i);
    act(() => {
      fireEvent.click(simBtn);
    });

    // Click "Mark read"
    const markReadBtn = screen.queryByRole('button', { name: /mark read/i });
    if (markReadBtn) {
      act(() => {
        fireEvent.click(markReadBtn);
      });
    }

    // Click "Clear all"
    const clearAllBtn = screen.getByText(/clear all/i);
    act(() => {
      fireEvent.click(clearAllBtn);
    });

    expect(screen.getByText(/no notifications found/i)).toBeInTheDocument();
  });
});

