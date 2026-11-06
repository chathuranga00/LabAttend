import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

// Synthesize a subtle, pleasant notification chime using Web Audio API (offline-safe, no asset dependency)
function playNotificationChime(type = 'info') {
  if (typeof window === 'undefined') return;
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;

    if (type === 'warning' || type === 'alert') {
      // Two-tone alert chime (amber/warning)
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880.00, now + 0.08); // A5
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    } else {
      // Pleasant high chime (info/success)
      osc.frequency.setValueAtTime(659.25, now); // E5
      osc.frequency.setValueAtTime(987.77, now + 0.08); // B5
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    }
  } catch {
    // Audio autoplay restrictions or unsupported
  }
}

export function NotificationProvider({ children }) {
  const { user, role } = useAuth();
  const storageKey = `labattend_notifications_${user?.id || role || 'guest'}`;

  // 1. Initial State from localStorage or Seed Defaults
  const [notifications, setNotifications] = useState(() => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // fallback
    }

    // Default welcoming notifications on first launch
    const now = new Date().toISOString();
    if (role === 'ADMIN') {
      return [
        {
          id: 'init-admin-welcome',
          title: 'Institutional Oversight Active',
          message: 'Admin console initialized. Audit ledger and timetable governance online.',
          type: 'info',
          category: 'system',
          timestamp: now,
          read: false,
          link: '/admin/dashboard',
        },
        {
          id: 'init-admin-audit',
          title: 'Immutable Compliance Logging',
          message: 'All attendance scans and manual adjustments are being recorded in the audit ledger.',
          type: 'success',
          category: 'security',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          read: false,
          link: '/admin/audits',
        },
      ];
    } else {
      return [
        {
          id: 'init-lect-welcome',
          title: 'LabAttend Scanner Ready',
          message: 'Classroom session and QR scanning console is ready for your lab sessions.',
          type: 'info',
          category: 'system',
          timestamp: now,
          read: false,
          link: '/lecturer/scanner',
        },
        {
          id: 'init-lect-rule',
          title: 'Cross-Group Attendance Supported',
          message: 'Students from other lab groups in the same batch are automatically accepted and flagged as Visitors.',
          type: 'success',
          category: 'attendance',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          read: false,
          link: '/lecturer/sessions',
        },
      ];
    }
  });

  // 2. Browser Notifications API Permission State
  const [browserPermission, setBrowserPermission] = useState(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
    return 'unsupported';
  });

  // Sync notifications to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(notifications));
    } catch {
      // quota or private mode
    }
  }, [notifications, storageKey]);

  // Request native browser/device notification permission
  const requestBrowserPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const perm = await Notification.requestPermission();
        setBrowserPermission(perm);
        return perm === 'granted';
      } catch {
        return false;
      }
    }
    return false;
  }, []);

  // Dispatch browser native notification if permitted
  const sendNativeNotification = useCallback((title, message, link) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body: message,
          icon: '/icons/icon-192x192.png',
          badge: '/icons/icon-192x192.png',
          tag: 'labattend-alert',
        });
        if (link) {
          notif.onclick = () => {
            window.focus();
            window.location.href = link;
          };
        }
      } catch {
        // notification failed
      }
    }
  }, []);

  // 3. Add Notification Action (with deduplication by id and optional emailData)
  const addNotification = useCallback(
    ({ id, title, message, type = 'info', category = 'system', link = null, emailData = null, playSound = true }) => {
      const newNotification = {
        id: id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title,
        message,
        type, // 'info' | 'success' | 'warning' | 'alert'
        category, // 'session' | 'attendance' | 'security' | 'system' | 'AT_RISK'
        timestamp: new Date().toISOString(),
        read: false,
        link,
        emailData,
      };

      setNotifications((prev) => {
        if (id && prev.some((n) => n.id === id)) {
          return prev;
        }
        return [newNotification, ...prev];
      });

      if (playSound) {
        playNotificationChime(type);
      }

      sendNativeNotification(title, message, link);

      return newNotification.id;
    },
    [sendNativeNotification]
  );

  // 4. Mark Individual as Read
  const markAsRead = useCallback((id) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  // 5. Mark All as Read
  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // 6. Delete Individual Notification
  const clearNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // 7. Clear All Notifications
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // Computed unread count
  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.read).length;
  }, [notifications]);

  // Listen to network offline/online events to generate notifications
  useEffect(() => {
    const handleOffline = () => {
      addNotification({
        title: 'Device Offline',
        message: 'Network connection lost. Live attendance scanning is paused until connection is restored.',
        type: 'warning',
        category: 'system',
      });
    };

    const handleOnline = () => {
      addNotification({
        title: 'Connection Restored',
        message: 'Back online. All real-time attendance sync capabilities are active.',
        type: 'success',
        category: 'system',
      });
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [addNotification]);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        browserPermission,
        addNotification,
        markAsRead,
        markAllAsRead,
        clearNotification,
        clearAll,
        requestBrowserPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

const defaultNotificationContext = {
  notifications: [],
  unreadCount: 0,
  browserPermission: 'default',
  addNotification: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {},
  clearNotification: () => {},
  clearAll: () => {},
  requestBrowserPermission: async () => false,
};

export function useNotifications() {
  const context = useContext(NotificationContext);
  return context || defaultNotificationContext;
}
