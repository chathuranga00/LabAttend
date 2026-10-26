import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  ShieldCheck, 
  LayoutDashboard, 
  GraduationCap, 
  Calendar, 
  BookOpen, 
  Users, 
  UserCheck, 
  Building2, 
  FileText, 
  LogOut, 
  User as UserIcon,
  Activity,
  CalendarClock,
  ClipboardCheck
} from 'lucide-react';

const navItems = [
  { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
  { name: 'Degree Programmes', path: '/admin/programmes', icon: GraduationCap },
  { name: 'Batches', path: '/admin/batches', icon: Calendar },
  { name: 'Modules / Courses', path: '/admin/modules', icon: BookOpen },
  { name: 'Lecturers', path: '/admin/lecturers', icon: Users },
  { name: 'Module Assignments', path: '/admin/assignments', icon: Activity },
  { name: 'Student Rosters', path: '/admin/students', icon: UserCheck },
  { name: 'Laboratory Halls', path: '/admin/halls', icon: Building2 },
  { name: 'Lab Sessions', path: '/admin/sessions', icon: CalendarClock },
  { name: 'Attendance Records', path: '/admin/attendance', icon: ClipboardCheck },
  { name: 'System Audit Logs', path: '/admin/audits', icon: FileText },
];

export default function AdminLayout() {
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
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ShieldCheck className="h-5 w-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="font-bold tracking-tight text-white block leading-tight">
                LabAttend
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 tracking-wider uppercase">
                Admin Portal
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1">
            <div className="text-[10px] font-semibold text-slate-400 px-3 uppercase tracking-wider mb-2">
              Administration
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
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm'
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
          <div className="p-3 rounded-xl bg-slate-800/50 border border-slate-800 mb-3 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <UserIcon className="h-4 w-4" />
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {user?.fullName || 'Administrator'}
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {user?.email}
              </p>
            </div>
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
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
              ROLE: ADMIN
            </span>
            <span className="text-xs text-slate-400">Institutional Oversight Dashboard</span>
          </div>

          <div className="flex items-center gap-4 text-xs text-slate-400">
            <NavLink
              to="/health"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Activity className="h-3.5 w-3.5 text-emerald-400" />
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
