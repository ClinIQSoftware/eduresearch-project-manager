import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useReportsOverview } from '../../hooks/useReports';
import { StatCard } from '../../components/reports/StatCard';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#6b7280', '#ef4444'];

const STATUS_LABELS: Record<string, string> = {
  planning: 'Planning',
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  unknown: 'Unknown',
};

const CLASSIFICATION_LABELS: Record<string, string> = {
  basic_science: 'Basic Science',
  clinical: 'Clinical',
  translational: 'Translational',
  epidemiological: 'Epidemiological',
  other: 'Other',
  unclassified: 'Unclassified',
};

export default function OverviewTab() {
  const { data, isLoading, error } = useReportsOverview();

  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  if (error || !data) {
    return <div className="text-red-600 py-8">Failed to load overview data</div>;
  }

  const statusData = Object.entries(data.projects_by_status).map(([key, value]) => ({
    name: STATUS_LABELS[key] || key,
    value,
  }));

  const classificationData = Object.entries(data.projects_by_classification).map(([key, value]) => ({
    name: CLASSIFICATION_LABELS[key] || key,
    value,
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Projects"
          value={data.total_projects}
          subtitle={`${data.active_projects} active`}
        />
        <StatCard
          title="Open Tasks"
          value={data.open_tasks}
          subtitle={data.overdue_tasks > 0 ? `${data.overdue_tasks} overdue` : 'None overdue'}
          subtitleColor={data.overdue_tasks > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Completed This Month"
          value={data.completed_this_month}
          subtitle="tasks"
        />
        <StatCard
          title="Team Members"
          value={data.total_members}
          subtitle="involved in projects"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Project Status Pie Chart */}
        <Card>
          <h3 className="font-semibold mb-4">Projects by Status</h3>
          {statusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No project data</p>
          )}
        </Card>

        {/* Classification Bar Chart */}
        <Card>
          <h3 className="font-semibold mb-4">Projects by Classification</h3>
          {classificationData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={classificationData} layout="vertical">
                <XAxis type="number" />
                <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No classification data</p>
          )}
        </Card>
      </div>
    </div>
  );
}
