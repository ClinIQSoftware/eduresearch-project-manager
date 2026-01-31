import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import {
  LayoutDashboard,
  FolderKanban,
  Inbox,
  FileBarChart,
  CheckSquare,
  Clock,
  ClipboardCheck,
  UserPlus,
  Settings as SettingsIcon,
  Shield,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

const navItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/join-requests', label: 'Join Requests', icon: Inbox },
  { to: '/reports', label: 'Reports', icon: FileBarChart },
  { to: '/tasks', label: 'Tasks', icon: CheckSquare },
  { to: '/time', label: 'Time Tracking', icon: Clock },
  { to: '/irb', label: 'IRB', icon: ClipboardCheck },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { branding } = useTenant();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col dark:bg-gray-950">
      {/* Logo */}
      <div className="p-4 border-b border-gray-700/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-display font-bold">EduResearch</h1>
            <p className="text-xs text-gray-400 truncate">
              {branding?.enterpriseName || 'Project Manager'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </li>
            );
          })}

          {/* IRB Admin section - for IRB admins and superusers */}
          {(user?.irb_role === 'admin' || user?.is_superuser) && (
            <>
              <li className="pt-4 mt-4">
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    IRB Administration
                  </span>
                </div>
              </li>
              <li>
                <NavLink
                  to="/irb-admin"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`
                  }
                >
                  <ClipboardCheck className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">IRB Admin</span>
                </NavLink>
              </li>
            </>
          )}

          {/* Admin section - only for superusers */}
          {user?.is_superuser && (
            <>
              <li className="pt-4 mt-4">
                <div className="px-3 mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Administration
                  </span>
                </div>
              </li>
              <li>
                <NavLink
                  to="/pending-users"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`
                  }
                >
                  <UserPlus className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Pending Users</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                        : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
                    }`
                  }
                >
                  <Shield className="w-5 h-5 flex-shrink-0" />
                  <span className="font-medium">Admin Panel</span>
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* User info and logout */}
      <div className="p-3 border-t border-gray-700/50">
        <div className="px-3 py-2 mb-2">
          <p className="font-medium truncate text-white">{user?.name}</p>
          <p className="text-sm text-gray-400 truncate">{user?.email}</p>
          {user?.is_superuser && (
            <span className="inline-flex items-center gap-1 text-xs bg-primary-600/20 text-primary-400 px-2 py-0.5 rounded-full mt-1.5">
              <Shield className="w-3 h-3" />
              Superuser
            </span>
          )}
        </div>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 mb-1 ${
              isActive
                ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                : 'text-gray-300 hover:bg-gray-800/50 hover:text-white'
            }`
          }
        >
          <SettingsIcon className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all duration-150"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
