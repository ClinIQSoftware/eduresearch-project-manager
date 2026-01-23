import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Folder, CheckSquare, Clock } from 'lucide-react';
import { getProjects, getTasks } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StatCard } from '../../components/reports/StatCard';
import { ExportButton } from '../../components/reports/ExportButton';

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '14', label: 'Last 14 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const ACTION_TYPE_OPTIONS = [
  { value: '', label: 'All Activity' },
  { value: 'project', label: 'Projects Only' },
  { value: 'task', label: 'Tasks Only' },
];

interface ActivityItem {
  id: string;
  type: 'project_created' | 'project_updated' | 'task_created' | 'task_completed';
  title: string;
  description: string;
  projectId?: number;
  projectTitle?: string;
  timestamp: Date;
  icon: 'folder' | 'check' | 'clock';
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function groupByDate(items: ActivityItem[]): Map<string, ActivityItem[]> {
  const groups = new Map<string, ActivityItem[]>();

  items.forEach((item) => {
    const dateKey = item.timestamp.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });

    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(item);
  });

  return groups;
}

function ActivityIcon({ type }: { type: 'folder' | 'check' | 'clock' }) {
  const iconClass = 'w-4 h-4';
  switch (type) {
    case 'folder':
      return <Folder className={`${iconClass} text-blue-500`} />;
    case 'check':
      return <CheckSquare className={`${iconClass} text-green-500`} />;
    case 'clock':
      return <Clock className={`${iconClass} text-gray-500`} />;
  }
}

export default function ActivityTab() {
  const [dateRange, setDateRange] = useState('7');
  const [actionType, setActionType] = useState('');

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await getProjects();
      return response.data;
    },
  });

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await getTasks();
      return response.data;
    },
  });

  const isLoading = projectsLoading || tasksLoading;

  // Calculate date cutoff
  const dateCutoff = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() - Number(dateRange));
    date.setHours(0, 0, 0, 0);
    return date;
  }, [dateRange]);

  // Build activity items from projects and tasks
  const allActivity = useMemo(() => {
    const items: ActivityItem[] = [];

    // Project activities
    projects.forEach((project) => {
      const createdAt = new Date(project.created_at);
      if (createdAt >= dateCutoff) {
        items.push({
          id: `project-created-${project.id}`,
          type: 'project_created',
          title: 'Project created',
          description: project.title,
          projectId: project.id,
          projectTitle: project.title,
          timestamp: createdAt,
          icon: 'folder',
        });
      }

      // Check for status changes (using last_status_change if available)
      if (project.last_status_change) {
        const statusChangeDate = new Date(project.last_status_change);
        if (statusChangeDate >= dateCutoff && statusChangeDate > createdAt) {
          items.push({
            id: `project-status-${project.id}-${statusChangeDate.getTime()}`,
            type: 'project_updated',
            title: `Project status changed to ${project.status?.replace('_', ' ') || 'unknown'}`,
            description: project.title,
            projectId: project.id,
            projectTitle: project.title,
            timestamp: statusChangeDate,
            icon: 'clock',
          });
        }
      }
    });

    // Task activities
    tasks.forEach((task) => {
      const createdAt = new Date(task.created_at);
      if (createdAt >= dateCutoff) {
        const projectTitle = projects.find((p) => p.id === task.project_id)?.title;
        items.push({
          id: `task-created-${task.id}`,
          type: 'task_created',
          title: 'Task created',
          description: task.title,
          projectId: task.project_id || undefined,
          projectTitle: projectTitle,
          timestamp: createdAt,
          icon: 'clock',
        });
      }

      // Task completed
      if (task.status === 'completed' && task.updated_at) {
        const completedAt = new Date(task.updated_at);
        if (completedAt >= dateCutoff) {
          const projectTitle = projects.find((p) => p.id === task.project_id)?.title;
          items.push({
            id: `task-completed-${task.id}`,
            type: 'task_completed',
            title: 'Task completed',
            description: task.title,
            projectId: task.project_id || undefined,
            projectTitle: projectTitle,
            timestamp: completedAt,
            icon: 'check',
          });
        }
      }
    });

    // Sort by timestamp descending
    items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return items;
  }, [projects, tasks, dateCutoff]);

  // Filter by action type
  const filteredActivity = useMemo(() => {
    if (!actionType) return allActivity;

    return allActivity.filter((item) => {
      if (actionType === 'project') {
        return item.type.startsWith('project');
      }
      if (actionType === 'task') {
        return item.type.startsWith('task');
      }
      return true;
    });
  }, [allActivity, actionType]);

  // Group by date
  const groupedActivity = useMemo(() => {
    return groupByDate(filteredActivity);
  }, [filteredActivity]);

  // Stats
  const totalActions = filteredActivity.length;
  const projectsCreated = filteredActivity.filter((a) => a.type === 'project_created').length;
  const tasksCompleted = filteredActivity.filter((a) => a.type === 'task_completed').length;

  // Export data
  const exportData = filteredActivity.map((item) => ({
    date: item.timestamp.toLocaleDateString(),
    time: item.timestamp.toLocaleTimeString(),
    action: item.title,
    item: item.description,
    project: item.projectTitle || '',
  }));

  const exportColumns = [
    { key: 'date', header: 'Date' },
    { key: 'time', header: 'Time' },
    { key: 'action', header: 'Action' },
    { key: 'item', header: 'Item' },
    { key: 'project', header: 'Project' },
  ];

  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total Actions"
          value={totalActions}
          subtitle={`in last ${dateRange} days`}
        />
        <StatCard
          title="Projects Created"
          value={projectsCreated}
        />
        <StatCard
          title="Tasks Completed"
          value={tasksCompleted}
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select options={DATE_RANGE_OPTIONS} value={dateRange} onChange={setDateRange} />
          <Select options={ACTION_TYPE_OPTIONS} value={actionType} onChange={setActionType} />
          <ExportButton
            data={exportData}
            filename="activity-report"
            columns={exportColumns}
          />
        </div>
      </Card>

      {/* Timeline */}
      <div className="space-y-6">
        {groupedActivity.size > 0 ? (
          Array.from(groupedActivity.entries()).map(([dateKey, items]) => (
            <div key={dateKey}>
              <h3 className="text-sm font-medium text-gray-500 mb-3">{dateKey}</h3>
              <Card>
                <div className="divide-y divide-gray-100">
                  {items.map((item) => (
                    <div key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="mt-1">
                        <ActivityIcon type={item.icon} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{item.title}</span>
                          {': '}
                          {item.projectId ? (
                            <Link
                              to={`/projects/${item.projectId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {item.description}
                            </Link>
                          ) : (
                            item.description
                          )}
                        </p>
                        {item.projectTitle && item.type.startsWith('task') && (
                          <p className="text-xs text-gray-500">
                            in{' '}
                            <Link
                              to={`/projects/${item.projectId}`}
                              className="text-blue-600 hover:underline"
                            >
                              {item.projectTitle}
                            </Link>
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatRelativeTime(item.timestamp)}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-4">
              No activity in the selected time period
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
