import { NavLink, Outlet } from 'react-router-dom';

const adminTabs = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/organizations', label: 'Organizations' },
  { to: '/admin/security', label: 'Security' },
  { to: '/admin/email', label: 'Email Settings' },
  { to: '/admin/email-templates', label: 'Email Templates' },
  { to: '/admin/import', label: 'Import' },
];

export default function AdminLayout() {
  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
          {adminTabs.map((tab) => (
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
