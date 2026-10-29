import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  CalendarClock, 
  QrCode, 
  BarChart3, 
  LogOut, 
  User as UserIcon,
  Activity,
  Award,
  UserCheck,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';
import ConnectionBanner from '../components/pwa/ConnectionBanner';
import InstallButton from '../components/pwa/InstallButton';
import NotificationBell from '../components/notifications/NotificationBell';

const navItems = [
  { name: 'Dashboard', path: '/lecturer/dashboard', icon: LayoutDashboard },
  { name: 'My Lab Sessions', path: '/lecturer/sessions', icon: CalendarClock },
  { name: 'Live QR Scanner', path: '/lecturer/scanner', icon: QrCode },
  { name: 'Attendance Reports', path: '/lecturer/reports', icon: BarChart3 },
  { name: 'Student Attendance', path: '/lecturer/students', icon: UserCheck },
];

export default function LecturerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Mobile drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Tablet collapsible sidebar state (default collapsed on tablet, expanded on desktop)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 768 && window.innerWidth < 1024;
    }
    return false;
  });

  // Automatically update collapse state on screen resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768 && window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else if (window.innerWidth >= 1024) {
        setIsCollapsed(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close drawer on route change
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-slate-100 flex relative overflow-x-hidden selection:bg-teal-500 selection:text-white">
      {/* Mobile Drawer Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 md:hidden animate-fade-in"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Slide-in Drawer on Mobile (< 768px) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-transform duration-300 ease-in-out md:hidden ${
        isDrawerOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full'
      }`}>
        <div className="overflow-y-auto">
          {/* Drawer Header */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 pt-safe">
            <div className="flex items-center gap-3">
              <div className="h-9 w-20 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-slate-200/40 shrink-0">
                <img src="/logo.png" alt="NSBM Green University" className="h-full w-full object-contain" />
              </div>
              <div className="overflow-hidden">
                <span className="font-bold tracking-tight text-white block text-sm leading-tight">
                  LabAttend
                </span>
                <span className="text-[10px] font-semibold text-teal-400 tracking-wider uppercase">
                  NSBM Lecturer
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsDrawerOpen(false)}
              aria-label="Close navigation drawer"
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Drawer Navigation Links */}
          <nav className="p-3 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 px-3 uppercase tracking-wider mb-2">
              Instructor Desk
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/60 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 mb-3">
            <div className="flex items-center gap-2.5 mb-1.5">
              <div className="h-7 w-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                <UserIcon className="h-3.5 w-3.5" />
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.fullName || 'Lab Instructor'}
              </p>
            </div>
            {user?.staffId && (
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pl-1">
                <Award className="h-3 w-3 text-teal-400" />
                <span>Staff ID: {user.staffId}</span>
              </div>
            )}
            {user?.department && (
              <p className="text-[10px] text-slate-400 pl-1 truncate">
                Dept: {user.department}
              </p>
            )}
          </div>

          <InstallButton variant="menu" className="mb-2 min-h-[44px]" />

          <button
            onClick={handleLogout}
            className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Tablet & Desktop Sidebar (Collapsible on tablet, expanded on desktop) */}
      <aside className={`hidden md:flex flex-col justify-between shrink-0 bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out ${
        isCollapsed ? 'w-20' : 'w-64'
      }`}>
        <div className="overflow-y-auto">
          {/* Header */}
          <div className="h-20 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50">
            {!isCollapsed ? (
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-11 w-22 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md border border-slate-200/40 shrink-0">
                  <img src="/logo.png" alt="NSBM Green University" className="h-full w-full object-contain" />
                </div>
                <div className="overflow-hidden">
                  <span className="font-bold tracking-tight text-white block text-sm leading-tight truncate">
                    LabAttend
                  </span>
                  <span className="text-[10px] font-semibold text-teal-400 tracking-wider uppercase truncate block">
                    NSBM Lecturer
                  </span>
                </div>
              </div>
            ) : (
              <div className="mx-auto">
                <div className="h-10 w-10 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-slate-200/40">
                  <img src="/logo.png" alt="NSBM Logo" className="h-full w-full object-contain" />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {!isCollapsed && (
              <div className="text-[10px] font-semibold text-slate-400 px-3 uppercase tracking-wider mb-2">
                Instructor Desk
              </div>
            )}
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  title={isCollapsed ? item.name : undefined}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                      isCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-3.5 py-2.5'
                    } ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!isCollapsed && <span className="truncate">{item.name}</span>}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer with Collapse Toggle and User Info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/30">
          {/* Collapse/Expand Toggle for Tablets */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="w-full flex items-center justify-center gap-2 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors mb-2 min-h-[40px]"
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs font-medium">Collapse Menu</span>
              </>
            )}
          </button>

          {!isCollapsed ? (
            <>
              <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 mb-2">
                <div className="flex items-center gap-2.5 mb-1.5">
                  <div className="h-7 w-7 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center shrink-0">
                    <UserIcon className="h-3.5 w-3.5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-200 truncate">
                    {user?.fullName || 'Lab Instructor'}
                  </p>
                </div>
                {user?.staffId && (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 pl-1">
                    <Award className="h-3 w-3 text-teal-400" />
                    <span>Staff ID: {user.staffId}</span>
                  </div>
                )}
                {user?.department && (
                  <p className="text-[10px] text-slate-400 pl-1 truncate">
                    Dept: {user.department}
                  </p>
                )}
              </div>
              <InstallButton variant="menu" className="mb-2" />
              <button
                onClick={handleLogout}
                className="w-full min-h-[44px] flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Sign Out</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={handleLogout}
                title="Sign Out"
                aria-label="Sign out"
                className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 min-h-[44px] min-w-[44px] flex items-center justify-center transition"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Global Connection Loss Banner */}
        <ConnectionBanner />

        {/* Top App Bar */}
        <header className="h-14 sm:h-16 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-3 sm:px-6 lg:px-8 flex items-center justify-between shrink-0 pt-safe">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Drawer menu button on mobile */}
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>

            {/* Mobile Brand Logo */}
            <div className="md:hidden flex items-center shrink-0">
              <div className="h-8 w-18 rounded-lg bg-white p-1 flex items-center justify-center border border-slate-200/40 shadow-sm">
                <img src="/logo.png" alt="NSBM Green University" className="h-full w-full object-contain" />
              </div>
            </div>

            <span className="text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-bold shrink-0">
              LECTURER
            </span>

            <span className="text-xs text-slate-400 hidden lg:inline truncate">
              Classroom Session & Scanner Console
            </span>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3 text-xs text-slate-400 shrink-0">
            <InstallButton variant="header" />
            <NotificationBell />
            <ThemeToggle />
            <NavLink
              to="/health"
              aria-label="System Health Probe"
              className="min-h-[44px] min-w-[44px] sm:min-w-0 inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-teal-400 shrink-0" />
              <span className="hidden sm:inline">Health</span>
            </NavLink>
          </div>
        </header>

        {/* Page Content: padded at bottom on mobile to clear bottom navigation bar */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 lg:p-8 bg-slate-950 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-8">
          <Outlet />
        </main>

        {/* Bottom Navigation Bar for Mobile Phones (< 768px): Dashboard, Sessions, Scanner (prominent), Reports, More */}
        <nav
          aria-label="Lecturer Mobile Bottom Navigation"
          className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-slate-900/95 backdrop-blur-lg border-t border-slate-800/90 flex items-center justify-around px-2 py-1 pb-[env(safe-area-inset-bottom)] shadow-2xl"
        >
          {/* 1. Dashboard */}
          <NavLink
            to="/lecturer/dashboard"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-h-[48px] min-w-[56px] transition-colors ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <LayoutDashboard className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Dashboard</span>
          </NavLink>

          {/* 2. Sessions */}
          <NavLink
            to="/lecturer/sessions"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-h-[48px] min-w-[56px] transition-colors ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <CalendarClock className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Sessions</span>
          </NavLink>

          {/* 3. Scanner (Prominent Elevated Action Button) */}
          <NavLink
            to="/lecturer/scanner"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center -mt-4 py-1 px-3 rounded-2xl min-h-[52px] min-w-[56px] shadow-lg transition-transform active:scale-95 ${
                isActive
                  ? 'bg-teal-500 text-slate-950 shadow-teal-500/30'
                  : 'bg-teal-600 text-slate-950 shadow-teal-600/20'
              }`
            }
          >
            <QrCode className="h-6 w-6 stroke-[2.5]" />
            <span className="text-[10px] font-extrabold tracking-tight">Scan QR</span>
          </NavLink>

          {/* 4. Reports */}
          <NavLink
            to="/lecturer/reports"
            className={({ isActive }) =>
              `flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-h-[48px] min-w-[56px] transition-colors ${
                isActive ? 'text-teal-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`
            }
          >
            <BarChart3 className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">Reports</span>
          </NavLink>

          {/* 5. More */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            aria-label="Open full instructor menu"
            className="flex flex-col items-center justify-center py-1.5 px-2 rounded-xl min-h-[48px] min-w-[56px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <MoreHorizontal className="h-5 w-5 mb-0.5" />
            <span className="text-[10px] tracking-tight">More</span>
          </button>
        </nav>
      </div>
    </div>
  );
}
