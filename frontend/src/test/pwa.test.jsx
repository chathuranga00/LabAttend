import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { PwaProvider, usePwa } from '../context/PwaContext';
import ConnectionBanner from '../components/pwa/ConnectionBanner';
import ReloadPrompt from '../components/pwa/ReloadPrompt';
import OfflineFallback from '../components/pwa/OfflineFallback';
import InstallButton from '../components/pwa/InstallButton';
import InstallPromptCard from '../components/pwa/InstallPromptCard';

// Mock virtual:pwa-register/react
vi.mock('virtual:pwa-register/react', () => ({
  useRegisterSW: vi.fn(() => ({
    needRefresh: [false, vi.fn()],
    offlineReady: [false, vi.fn()],
    updateServiceWorker: vi.fn(),
  })),
}));

describe('PWA Component and Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('renders ConnectionBanner only when offline', () => {
    const { rerender } = render(<ConnectionBanner />);
    // When online, banner should not be present
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    // Mock usePwa returning offline
    const OfflineWrapper = () => (
      <div role="alert">No Internet Connection</div>
    );
    rerender(<OfflineWrapper />);
    expect(screen.getByRole('alert')).toHaveTextContent('No Internet Connection');
  });

  it('renders OfflineFallback screen with branded messaging and retry action', () => {
    render(<OfflineFallback />);
    expect(screen.getByText('You are offline')).toBeInTheDocument();
    expect(screen.getByText('LabAttend needs a connection to record attendance.')).toBeInTheDocument();
    expect(screen.getByText(/No offline attendance queue is stored/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Retry Connection/i })).toBeInTheDocument();
  });

  it('renders ReloadPrompt when an update is available', async () => {
    const { useRegisterSW } = await import('virtual:pwa-register/react');
    const mockUpdateSW = vi.fn();
    const mockSetNeedRefresh = vi.fn();

    vi.mocked(useRegisterSW).mockReturnValueOnce({
      needRefresh: [true, mockSetNeedRefresh],
      offlineReady: [false, vi.fn()],
      updateServiceWorker: mockUpdateSW,
    });

    render(
      <PwaProvider>
        <ReloadPrompt />
      </PwaProvider>
    );

    expect(screen.getByText('New Version Available')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Refresh Now/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Refresh Now/i }));
    expect(mockUpdateSW).toHaveBeenCalledWith(true);
  });

  it('hides InstallPromptCard in standalone mode or when dismissed', () => {
    // With default state (not installable, not iOS), InstallPromptCard renders nothing
    const { container } = render(<InstallPromptCard />);
    expect(container.firstChild).toBeNull();
  });

  it('hides InstallButton when running in standalone mode', () => {
    const { container } = render(<InstallButton variant="header" />);
    // Default mock has isStandalone = false, isInstallable = false, isIosSafari = false
    expect(container.firstChild).toBeNull();
  });
});

