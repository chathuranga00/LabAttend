import React from 'react';
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
  Award
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/lecturer/dashboard', icon: LayoutDashboard },
  { name: 'My Lab Sessions', path: '/lecturer/sessions', icon: CalendarClock },
  { name: 'Live QR Scanner', path: '/lecturer/scanner', icon: QrCode },
  { name: 'Attendance Reports', path: '/lecturer/reports', icon: BarChart3 },
];

export default function LecturerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900/90 border-r border-slate-800 flex flex-col justify-between shrink-0">
        <div>
          {/* Logo Header */}
          <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-800/80 bg-slate-900/50">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-teal-500/20">
              <ShieldCheck className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block leading-tight">
                LabAttend
              </span>
              <span className="text-[10px] font-semibold text-teal-400 tracking-wider uppercase">
                Lecturer Portal
              </span>
            </div>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 border-b border-slate-800 bg-slate-900/40 backdrop-blur-md px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs px-2.5 py-1 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-semibold">
              ROLE: LECTURER
            </span>
            <span className="text-xs text-slate-400">Classroom Session & Scanner Console</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <NavLink
              to="/health"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-teal-400" />
              <span>System Health</span>
            </NavLink>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-950">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
