import { useIrbAdminDashboard } from '../../hooks/useIrbAdmin';
import { FileText, Users, ClipboardList, Clock, CheckCircle, AlertCircle } from 'lucide-react';

function StatCard({ label, value, icon: Icon, color }: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4 sm:p-5">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

export default function IrbAdminDashboardTab() {
  const { data, isLoading } = useIrbAdminDashboard();

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading dashboard...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-500">No data available</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard label="Total Submissions" value={data.total_submissions} icon={FileText} color="bg-blue-500" />
        <StatCard label="Pending" value={data.pending_submissions} icon={AlertCircle} color="bg-yellow-500" />
        <StatCard label="In Review" value={data.in_review_submissions} icon={ClipboardList} color="bg-indigo-500" />
        <StatCard label="Completed" value={data.completed_submissions} icon={CheckCircle} color="bg-green-500" />
        <StatCard label="Boards" value={data.total_boards} icon={Users} color="bg-purple-500" />
        <StatCard
          label="Avg Review Time"
          value={data.avg_review_days ? `${data.avg_review_days}d` : 'N/A'}
          icon={Clock}
          color="bg-gray-500"
        />
      </div>

      {/* Submissions by status */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Submissions by Status</h2>
        {Object.keys(data.submissions_by_status).length === 0 ? (
          <p className="text-gray-500 text-sm">No submissions yet</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {Object.entries(data.submissions_by_status).map(([status, count]) => (
              <div key={status} className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 capitalize">{status.replace(/_/g, ' ')}</p>
                <p className="text-lg font-bold text-gray-900">{count}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        {data.recent_activity.length === 0 ? (
          <p className="text-gray-500 text-sm">No recent activity</p>
        ) : (
          <div className="space-y-3">
            {data.recent_activity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-3 text-sm border-b border-gray-100 pb-2">
                <div className="flex-1">
                  <span className="capitalize text-gray-600">{activity.from_status.replace(/_/g, ' ')}</span>
                  <span className="text-gray-400 mx-2">&rarr;</span>
                  <span className="font-medium capitalize text-gray-800">{activity.to_status.replace(/_/g, ' ')}</span>
                  {activity.note && (
                    <span className="text-gray-400 ml-2">— {activity.note}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {activity.created_at ? new Date(activity.created_at).toLocaleDateString() : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
