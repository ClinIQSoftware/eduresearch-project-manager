import { useIrbReports } from '../../hooks/useIrbAdmin';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function IrbAdminReportsTab() {
  const { data, isLoading } = useIrbReports();

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading reports...</div>;
  }

  if (!data) {
    return <div className="text-center py-8 text-gray-500">No report data available</div>;
  }

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const timeData = data.submissions_over_time.map((d) => ({
    ...d,
    label: `${monthNames[d.month - 1]} ${d.year}`,
  }));

  const decisionData = Object.entries(data.decisions_breakdown).map(([key, value]) => ({
    name: key.replace(/_/g, ' '),
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Average turnaround */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-2">Average Turnaround</h2>
        <p className="text-3xl font-bold text-indigo-600">
          {data.avg_turnaround_days ? `${data.avg_turnaround_days} days` : 'N/A'}
        </p>
        <p className="text-sm text-gray-500 mt-1">From submission to decision</p>
      </div>

      {/* Submissions over time */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Submissions Over Time</h2>
        {timeData.length === 0 ? (
          <p className="text-gray-500 text-sm">No submission data yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={timeData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Decision breakdown */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Decisions Breakdown</h2>
          {decisionData.length === 0 ? (
            <p className="text-gray-500 text-sm">No decisions yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={decisionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  dataKey="value"
                >
                  {decisionData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Submissions by board */}
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Submissions by Board</h2>
          {data.submissions_by_board.length === 0 ? (
            <p className="text-gray-500 text-sm">No data yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={data.submissions_by_board} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" allowDecimals={false} />
                <YAxis dataKey="board_name" type="category" tick={{ fontSize: 12 }} width={120} />
                <Tooltip />
                <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Reviewer workload */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Reviewer Workload</h2>
        {data.reviewer_workload.length === 0 ? (
          <p className="text-gray-500 text-sm">No reviewer data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Completed</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.reviewer_workload.map((r) => (
                  <tr key={r.reviewer_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{r.reviewer_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{r.total}</td>
                    <td className="px-4 py-3 text-sm text-green-600">{r.completed}</td>
                    <td className="px-4 py-3 text-sm text-yellow-600">{r.pending}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
