import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import NotificationBell from '../notifications/NotificationBell';

const navItems = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/projects', label: 'Projects', icon: '📁' },
  { to: '/join-requests', label: 'Join Requests', icon: '📨' },
  { to: '/reports', label: 'Reports', icon: '📋' },
  { to: '/tasks', label: 'Tasks', icon: '✓' },
  { to: '/time', label: 'Time Tracking', icon: '⏱' },
];

export default function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout } = useAuth();
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
      <header className="fixed top-0 left-0 right-0 z-40 bg-gray-900 text-white md:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <h1 className="text-lg font-bold">EduResearch</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label={isOpen ? 'Close menu' : 'Open menu'}
            >
              {isOpen ? (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Slide-out Drawer */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-72 bg-gray-900 text-white transform transition-transform duration-300 ease-in-out md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-700 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">EduResearch</h1>
              <p className="text-sm text-gray-400">Project Manager</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-800 transition-colors"
              aria-label="Close menu"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 overflow-y-auto">
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                      }`
                    }
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              ))}

              {/* Admin section - only for superusers */}
              {user?.is_superuser && (
                <>
                  <li className="pt-4 border-t border-gray-700 mt-4">
                    <NavLink
                      to="/pending-users"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                        }`
                      }
                    >
                      <span className="text-lg">👤</span>
                      <span>Pending Users</span>
                    </NavLink>
                  </li>
                  <li>
                    <NavLink
                      to="/admin"
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                          isActive
                            ? 'bg-purple-600 text-white'
                            : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                        }`
                      }
                    >
                      <span className="text-lg">🔧</span>
                      <span>Admin</span>
                    </NavLink>
                  </li>
                </>
              )}
            </ul>
          </nav>

          {/* User info and actions */}
          <div className="p-4 border-t border-gray-700">
            <div className="mb-3">
              <p className="font-medium truncate">{user?.name}</p>
              <p className="text-sm text-gray-400 truncate">{user?.email}</p>
              {user?.is_superuser && (
                <span className="text-xs bg-purple-600 px-2 py-0.5 rounded mt-1 inline-block">
                  Superuser
                </span>
              )}
            </div>
            <NavLink
              to="/settings"
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-lg transition-colors mb-2 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-300 hover:bg-gray-800 active:bg-gray-700'
                }`
              }
            >
              <span className="text-lg">&#x2699;</span>
              <span>Settings</span>
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-gray-300 hover:bg-gray-800 active:bg-gray-700 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
