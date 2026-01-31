import { NavLink, Outlet } from 'react-router-dom';

const tabs = [
  { to: '/irb-admin', label: 'Dashboard', end: true },
  { to: '/irb-admin/members', label: 'Members' },
  { to: '/irb-admin/boards', label: 'Boards' },
  { to: '/irb-admin/questions', label: 'Submission Questions' },
  { to: '/irb-admin/review-questions', label: 'Review Questions' },
  { to: '/irb-admin/assignments', label: 'Assignments' },
  { to: '/irb-admin/reports', label: 'Reports' },
  { to: '/irb-admin/ai-settings', label: 'AI Settings' },
];

export default function IrbAdminLayout() {
  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">IRB Administration</h1>

      {/* Tab navigation */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="-mb-px flex space-x-4 sm:space-x-6 min-w-max px-1" aria-label="IRB Admin Tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `whitespace-nowrap border-b-2 py-3 px-1 text-sm font-medium transition-colors ${
                  isActive
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <Outlet />
    </div>
  );
}
