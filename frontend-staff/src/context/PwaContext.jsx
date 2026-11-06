import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const PwaContext = createContext(null);

const DISMISSED_STORAGE_KEY = 'labattend_pwa_install_dismissed';

export function PwaProvider({ children }) {
  const isOnline = useOnlineStatus();

  // Service worker registration & update prompt (registerType: 'prompt')
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodic check for SW updates every 60 minutes
      if (r) {
        setInterval(() => {
          r.update().catch(() => {});
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('[PWA] Service worker registration error:', error);
    },
  });

  // Standalone detection (installed PWA)
  const [isStandalone, setIsStandalone] = useState(() => {
    if (typeof window === 'undefined') return false;
    const mediaMatches = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
    const navStandalone = typeof window.navigator !== 'undefined' && window.navigator.standalone === true;
    const refAndroid = typeof document !== 'undefined' && document.referrer && document.referrer.includes('android-app://');
    return Boolean(mediaMatches || navStandalone || refAndroid);
  });

  // iOS Safari detection
  const [isIosSafari, setIsIosSafari] = useState(() => {
    if (typeof window === 'undefined' || !window.navigator) return false;
    const ua = window.navigator.userAgent.toLowerCase();
    const isIos = /iphone|ipad|ipod/.test(ua) && !window.MSStream;
    const isOtherBrowser = /crios|fxios|edgios|optios/.test(ua);
    return Boolean(isIos && !isOtherBrowser);
  });

  // Native beforeinstallprompt event handling
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isDismissed, setIsDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let mediaQuery = null;
    let handleDisplayModeChange = null;

    if (typeof window.matchMedia === 'function') {
      mediaQuery = window.matchMedia('(display-mode: standalone)');
      handleDisplayModeChange = (e) => {
        setIsStandalone(e.matches || window.navigator?.standalone === true);
      };

      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleDisplayModeChange);
      } else if (mediaQuery.addListener) {
        mediaQuery.addListener(handleDisplayModeChange);
      }
    }

    // Capture browser install prompt
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // When app is successfully installed
    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsStandalone(true);
      try {
        localStorage.removeItem(DISMISSED_STORAGE_KEY);
      } catch {}
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      if (mediaQuery && handleDisplayModeChange) {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleDisplayModeChange);
        } else if (mediaQuery.removeListener) {
          mediaQuery.removeListener(handleDisplayModeChange);
        }
      }
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Trigger browser installation
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.warn('[PWA] Installation prompt error:', err);
      return false;
    }
  }, [deferredPrompt]);

  // Dismiss install banner/card with safe storage
  const dismissInstall = useCallback(() => {
    setIsDismissed(true);
    try {
      localStorage.setItem(DISMISSED_STORAGE_KEY, 'true');
    } catch (err) {
      console.warn('[PWA] Storage access failed while saving dismissal:', err);
    }
  }, []);

  const closeRefreshToast = useCallback(() => {
    setNeedRefresh(false);
  }, [setNeedRefresh]);

  const value = {
    isOnline,
    isStandalone,
    isIosSafari,
    isInstallable: !!deferredPrompt && !isStandalone,
    deferredPrompt,
    isDismissed,
    promptInstall,
    dismissInstall,
    needRefresh,
    offlineReady,
    updateServiceWorker,
    closeRefreshToast,
  };

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

const DEFAULT_PWA_STATE = {
  isOnline: true,
  isStandalone: false,
  isIosSafari: false,
  isInstallable: false,
  deferredPrompt: null,
  isDismissed: false,
  promptInstall: async () => false,
  dismissInstall: () => {},
  needRefresh: false,
  offlineReady: false,
  updateServiceWorker: async () => {},
  closeRefreshToast: () => {},
};

export function usePwa() {
  const context = useContext(PwaContext);
  return context || DEFAULT_PWA_STATE;
}

export default PwaContext;
