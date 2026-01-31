import { NavLink, Outlet, Link } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';

const irbTabs = [
  { to: '/irb/dashboard', label: 'Dashboard' },
  { to: '/irb/boards', label: 'Boards' },
  { to: '/irb/submissions', label: 'Submissions' },
];

export default function IrbLayout() {
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ClipboardCheck className="w-7 h-7 text-blue-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">IRB Management</h1>
        </div>
        <Link
          to="/irb/submissions/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Submission
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex flex-wrap gap-x-6 gap-y-1">
          {irbTabs.map((tab) => (
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
