import { NavLink, Outlet } from 'react-router-dom';
import { usePlatformStats } from '../../hooks/usePlatformAdmin';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const platformAdminTabs = [
  { to: '/platform-admin/enterprises', label: 'Enterprises' },
  { to: '/platform-admin/settings', label: 'Settings' },
];

export default function PlatformAdminLayout() {
  const { data: stats, isLoading } = usePlatformStats();

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="bg-indigo-600 -mx-4 -mt-4 px-4 py-6 sm:-mx-6 sm:-mt-6 sm:px-6 md:-mx-8 md:-mt-8 md:px-8">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Platform Administration</h1>
        <p className="text-indigo-200 text-sm mt-1">Manage enterprises and platform-wide settings</p>
      </div>

      {/* Stats Cards */}
      {isLoading ? (
        <div className="py-4">
          <LoadingSpinner size="sm" />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: 'Total Enterprises', value: stats?.total_enterprises ?? 0 },
            { label: 'Active', value: stats?.active_enterprises ?? 0, color: 'text-green-600' },
            { label: 'Users', value: stats?.total_users ?? 0, color: 'text-blue-600' },
            { label: 'Projects', value: stats?.total_projects ?? 0, color: 'text-purple-600' },
            { label: 'Institutions', value: stats?.total_institutions ?? 0, color: 'text-indigo-600' },
          ].map((stat) => (
            <Card key={stat.label}>
              <p className="text-xs text-gray-500">{stat.label}</p>
              <p className={`text-xl font-bold ${stat.color || ''}`}>{stat.value}</p>
            </Card>
          ))}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
          {platformAdminTabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={({ isActive }) =>
                `py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
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
