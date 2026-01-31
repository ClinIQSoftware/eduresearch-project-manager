import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Menu,
  X,
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

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
  const { branding } = useTenant();
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  function handleLogout() {
    logout();
    navigate('/login');
    setIsOpen(false);
  }

  return (
    <>
      {/* Mobile Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white md:hidden dark:bg-gray-950">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <GraduationCap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-display font-bold">EduResearch</h1>
              {branding?.enterpriseName && (
                <p className="text-xs text-gray-400 truncate max-w-[180px]">{branding.enterpriseName}</p>
              )}
            </div>
          </div>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out md:hidden dark:bg-gray-950 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700/50 flex items-center justify-between">
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
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
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
                        `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white active:bg-gray-700'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium">{item.label}</span>
                    </NavLink>
                  </li>
                );
              })}

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
                        `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white active:bg-gray-700'
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
                        `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 ${
                          isActive
                            ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                            : 'text-gray-300 hover:bg-gray-800/50 hover:text-white active:bg-gray-700'
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

          {/* User info and actions */}
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
                `flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-150 mb-1 ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-600/25'
                    : 'text-gray-300 hover:bg-gray-800/50 hover:text-white active:bg-gray-700'
                }`
              }
            >
              <SettingsIcon className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Settings</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-3 text-gray-300 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all duration-150"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
