import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { PwaProvider, usePwa } from './context/PwaContext';
import ReloadPrompt from './components/pwa/ReloadPrompt';
import OfflineFallback from './components/pwa/OfflineFallback';
import { AppRoutes } from './routes';
import ErrorBoundary from './components/common/ErrorBoundary';

function AppShell() {
  const { isOnline } = usePwa();
  const [initiallyOffline] = useState(() => typeof navigator !== 'undefined' && !navigator.onLine);

  // If the app shell loaded with zero network, present the branded offline fallback screen
  if (initiallyOffline && !isOnline) {
    return <OfflineFallback />;
  }

  return (
    <>
      <AppRoutes />
      <ReloadPrompt />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <PwaProvider>
        <ThemeProvider>
          <ToastProvider>
            <AuthProvider>
              <ErrorBoundary>
                <AppShell />
              </ErrorBoundary>
            </AuthProvider>
          </ToastProvider>
        </ThemeProvider>
      </PwaProvider>
    </BrowserRouter>
  );
}
