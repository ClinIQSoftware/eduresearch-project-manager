import { NavLink, useNavigate } from 'react-router-dom';
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

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <aside className="w-64 bg-gray-900 text-white flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">EduResearch</h1>
            <p className="text-sm text-gray-400">Project Manager</p>
          </div>
          <NotificationBell />
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`
                }
              >
                <span>{item.icon}</span>
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
                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`
                  }
                >
                  <span>👤</span>
                  <span>Pending Users</span>
                </NavLink>
              </li>
              <li>
                <NavLink
                  to="/admin"
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`
                  }
                >
                  <span>🔧</span>
                  <span>Admin</span>
                </NavLink>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* User info and logout */}
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
            `flex items-center gap-3 px-4 py-2 rounded-lg transition-colors mb-2 ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`
          }
        >
          <span>&#x2699;</span>
          <span>Settings</span>
        </NavLink>
        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors"
        >
          Sign Out
        </button>
      </div>
    </aside>
  );
}
