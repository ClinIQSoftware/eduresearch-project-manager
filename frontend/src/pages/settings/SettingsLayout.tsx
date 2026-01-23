import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function SettingsLayout() {
  const { user } = useAuth();
  const isOAuthUser = user?.auth_provider !== 'local';

  const settingsTabs = [
    { to: '/settings/profile', label: 'Profile' },
    ...(!isOAuthUser ? [{ to: '/settings/security', label: 'Security' }] : []),
    { to: '/settings/preferences', label: 'Preferences' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Account Settings</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
          {settingsTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <Outlet />
    </div>
  );
}
