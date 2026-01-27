import { NavLink, Outlet, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getSubscription } from '../../api/billing';
import { Building2, Users, FolderKanban } from 'lucide-react';

const adminTabs = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/organizations', label: 'Organizations' },
  { to: '/admin/security', label: 'Security' },
  { to: '/admin/email', label: 'Email Settings' },
  { to: '/admin/email-templates', label: 'Email Templates' },
  { to: '/admin/import', label: 'Import' },
];

function UsageBar({ current, max, label }: { current: number; max: number | null; label: string }) {
  if (max === null) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-600">{label}</span>
        <span className="text-sm font-medium">{current} / Unlimited</span>
      </div>
    );
  }
  const percent = max > 0 ? (current / max) * 100 : 0;
  const color = percent >= 100 ? 'bg-red-500' : percent >= 80 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="font-medium">{current} / {max}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

export default function AdminLayout() {
  const { data: subscription } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => getSubscription().then(r => r.data),
    staleTime: 60000,
  });

  const planLabel = subscription?.plan_type
    ? subscription.plan_type.charAt(0).toUpperCase() + subscription.plan_type.slice(1)
    : '';

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Enterprise Stats */}
      {subscription && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <Building2 className="w-8 h-8 text-blue-600" />
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Enterprise Overview</h2>
                <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                  subscription.plan_type === 'pro' ? 'bg-blue-100 text-blue-700' :
                  subscription.plan_type === 'enterprise' ? 'bg-purple-100 text-purple-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {planLabel} Plan
                </span>
              </div>
            </div>
            <Link
              to="/settings/billing"
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Manage Billing →
            </Link>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div className="flex items-start gap-3">
              <Users className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <UsageBar
                  current={subscription.current_users}
                  max={subscription.max_users}
                  label="Users"
                />
              </div>
            </div>
            <div className="flex items-start gap-3">
              <FolderKanban className="w-5 h-5 text-gray-400 mt-0.5" />
              <div className="flex-1">
                <UsageBar
                  current={subscription.current_projects}
                  max={subscription.max_projects}
                  label="Projects"
                />
              </div>
            </div>
          </div>
        </div>
      )}

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
