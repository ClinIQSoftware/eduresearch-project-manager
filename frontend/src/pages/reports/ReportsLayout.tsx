import { NavLink, Outlet } from 'react-router-dom';

const reportsTabs = [
  { to: '/reports/overview', label: 'Overview' },
  { to: '/reports/projects', label: 'Projects' },
  { to: '/reports/people', label: 'People' },
  { to: '/reports/tasks', label: 'Tasks' },
  { to: '/reports/activity', label: 'Activity' },
];

export default function ReportsLayout() {
  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Reports</h1>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
          {reportsTabs.map((tab) => (
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

      <Outlet />
    </div>
  );
}
