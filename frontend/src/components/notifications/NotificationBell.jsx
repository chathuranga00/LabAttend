import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  BellRing, 
  Check, 
  CheckCheck, 
  Trash2, 
  X, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  CalendarClock, 
  Users, 
  ShieldCheck, 
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';

function formatTimeAgo(isoString) {
  if (!isoString) return '';
  const now = Date.now();
  const past = new Date(isoString).getTime();
  const diffMs = now - past;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSec < 45) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function getNotificationIcon(type, category) {
  if (type === 'warning' || category === 'attendance') {
    return <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />;
  }
  if (type === 'success') {
    return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
  }
  if (category === 'session') {
    return <CalendarClock className="h-4 w-4 text-teal-400 shrink-0" />;
  }
  if (category === 'security') {
    return <ShieldCheck className="h-4 w-4 text-indigo-400 shrink-0" />;
  }
  return <Info className="h-4 w-4 text-cyan-400 shrink-0" />;
}

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    browserPermission,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAll,
    requestBrowserPermission,
    addNotification,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');
  const panelRef = useRef(null);
  const buttonRef = useRef(null);
  const navigate = useNavigate();

  // Close when clicking outside on desktop
  useEffect(() => {
    function handleClickOutside(e) {
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Filtered notifications
  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      if (activeTab === 'UNREAD') return !n.read;
      if (activeTab === 'SESSION') return n.category === 'session';
      if (activeTab === 'ATTENDANCE') return n.category === 'attendance';
      if (activeTab === 'SYSTEM') return n.category === 'system' || n.category === 'security';
      return true;
    });
  }, [notifications, activeTab]);

  const handleNotificationClick = (item) => {
    markAsRead(item.id);
    if (item.link) {
      setIsOpen(false);
      navigate(item.link);
    }
  };

  const handleSendTestNotification = () => {
    const samples = [
      {
        title: 'Cross-Group Scan Recorded',
        message: 'Student Janith Silva (Group B) was marked present in Batch 2026.3 as a cross-group visitor.',
        type: 'warning',
        category: 'attendance',
      },
      {
        title: 'Lab Session Finalized',
        message: 'SES-303 (Engineering Mathematics) sealed with 94.5% final attendance.',
        type: 'success',
        category: 'session',
      },
      {
        title: 'Audit Ledger Synced',
        message: 'High-entropy QR cryptographic tokens verified for laboratory entrance.',
        type: 'info',
        category: 'security',
      },
    ];
    const picked = samples[Math.floor(Math.random() * samples.length)];
    addNotification(picked);
  };

  return (
    <div className="relative">
      {/* Bell Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="View notifications"
        aria-expanded={isOpen}
        className="min-h-[44px] min-w-[44px] sm:min-w-0 relative inline-flex items-center justify-center p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500/50"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-black leading-none text-white bg-rose-500 rounded-full shadow-lg shadow-rose-500/50 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Backdrop for Mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Notification Center Dropdown / Bottom Sheet */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed sm:absolute inset-x-3 bottom-3 sm:bottom-auto sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 w-auto sm:w-96 max-h-[85vh] sm:max-h-[560px] bg-slate-900 border border-slate-800 rounded-2xl sm:rounded-3xl shadow-2xl z-50 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 sm:slide-in-from-top-2 duration-200"
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800/80 flex items-center justify-between shrink-0 bg-slate-900/90 backdrop-blur-md">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-white flex items-center gap-2">
                <BellRing className="h-4 w-4 text-teal-400" />
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-500/15 text-teal-300 border border-teal-500/30">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  title="Mark all as read"
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium text-slate-400 hover:text-teal-300 hover:bg-slate-800 transition"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  <span className="hidden xs:inline">Mark read</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Close notification panel"
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Browser Push Notification Permission Banner */}
          {browserPermission === 'default' && (
            <div className="px-4 py-2.5 bg-teal-950/40 border-b border-teal-900/40 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <Sparkles className="h-4 w-4 text-teal-400 shrink-0" />
                <span className="text-[11px] text-teal-200 truncate">
                  Enable device push notifications
                </span>
              </div>
              <button
                type="button"
                onClick={requestBrowserPermission}
                className="px-2.5 py-1 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-[11px] font-bold shrink-0 transition"
              >
                Enable
              </button>
            </div>
          )}

          {/* Category Tabs */}
          <div className="px-3 pt-2.5 pb-1 border-b border-slate-800/60 flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
            {[
              { id: 'ALL', label: 'All' },
              { id: 'UNREAD', label: `Unread (${unreadCount})` },
              { id: 'SESSION', label: 'Sessions' },
              { id: 'ATTENDANCE', label: 'Attendance' },
              { id: 'SYSTEM', label: 'System' },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition ${
                  activeTab === tab.id
                    ? 'bg-slate-800 text-teal-400 border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50 p-1">
            {filteredNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <Bell className="h-8 w-8 text-slate-600 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-semibold text-slate-400">No notifications found</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {activeTab === 'UNREAD' ? 'You have read all your alerts!' : "You're all caught up."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`group relative p-3 rounded-xl transition cursor-pointer flex items-start gap-3 ${
                    !n.read
                      ? 'bg-slate-800/40 hover:bg-slate-800/70'
                      : 'hover:bg-slate-850/50 opacity-80'
                  }`}
                >
                  <div className="mt-0.5 p-1.5 rounded-lg bg-slate-950/80 border border-slate-800">
                    {getNotificationIcon(n.type, n.category)}
                  </div>

                  <div className="flex-1 min-w-0 pr-6">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white truncate">{n.title}</span>
                      {!n.read && (
                        <span className="h-1.5 w-1.5 rounded-full bg-teal-400 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed break-words">
                      {n.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-500">
                      <span>{formatTimeAgo(n.timestamp)}</span>
                      {n.link && (
                        <span className="inline-flex items-center gap-1 text-teal-400 font-medium hover:underline">
                          View details <ExternalLink className="h-2.5 w-2.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Dismiss Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearNotification(n.id);
                    }}
                    title="Dismiss notification"
                    className="absolute top-3 right-3 p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 sm:opacity-0 focus:opacity-100 transition"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center justify-between text-xs shrink-0">
            <button
              type="button"
              onClick={handleSendTestNotification}
              className="flex items-center gap-1 text-[11px] text-teal-400 hover:text-teal-300 transition font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Simulate Alert</span>
            </button>

            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-rose-400 transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear all</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
