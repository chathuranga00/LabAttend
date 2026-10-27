import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
  X
} from 'lucide-react';
import ThemeToggle from '../components/common/ThemeToggle';

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
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-x-hidden">
      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar (Responsive drawer on mobile, static on desktop) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between shrink-0 transition-transform duration-200 ease-in-out md:static md:translate-x-0 ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="overflow-y-auto">
          {/* Logo Header */}
          <div className="h-20 px-4 flex items-center justify-between border-b border-slate-800/80 bg-slate-900/50">
            <div className="flex items-center gap-3">
              <div className="h-12 w-24 rounded-xl bg-white p-1.5 flex items-center justify-center shadow-md shadow-emerald-500/10 border border-slate-200/40 shrink-0">
                <img src="/logo.png" alt="NSBM Green University" className="h-full w-full object-contain" />
              </div>
              <div className="overflow-hidden">
                <span className="font-bold tracking-tight text-white block leading-tight text-sm">
                  LabAttend
                </span>
                <span className="text-[10px] font-semibold text-emerald-500 tracking-wider uppercase truncate block">
                  NSBM Lecturer
                </span>
              </div>
            </div>
            <button 
              onClick={() => setIsMobileOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 px-3 uppercase tracking-wider mb-2">
              Instructor Desk
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20 shadow-sm'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`
                  }
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/30">
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

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Layout Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 md:hidden"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="md:hidden flex items-center">
              <div className="h-9 w-20 rounded-lg bg-white p-1 flex items-center justify-center shrink-0 border border-slate-200/40 shadow-sm">
                <img src="/logo.png" alt="NSBM Green University" className="h-full w-full object-contain" />
              </div>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
              ROLE: LECTURER
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">Classroom Session & Scanner Console</span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <ThemeToggle />
            <NavLink
              to="/health"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/50 transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-teal-400" />
              <span className="hidden sm:inline">System Health</span>
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
