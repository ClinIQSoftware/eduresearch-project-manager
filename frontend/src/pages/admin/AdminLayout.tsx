import { NavLink, Outlet } from 'react-router-dom';

const adminTabs = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/institutions', label: 'Institutions' },
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/security', label: 'Security' },
  { to: '/admin/email', label: 'Email' },
  { to: '/admin/import', label: 'Import' },
];

export default function AdminLayout() {
  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Tab Navigation - scrollable on mobile */}
      <div className="border-b border-gray-200 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max">
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
