import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getTasks, getProjects } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { Badge } from '../../components/ui/Badge';
import { StatCard } from '../../components/reports/StatCard';
import { ExportButton } from '../../components/reports/ExportButton';
import type { Task } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

const PRIORITY_OPTIONS = [
  { value: '', label: 'All Priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const PRIORITY_VARIANTS: Record<string, 'default' | 'info' | 'warning' | 'error'> = {
  low: 'default',
  medium: 'info',
  high: 'error',
};

const STATUS_VARIANTS: Record<string, 'default' | 'info' | 'success'> = {
  todo: 'default',
  in_progress: 'info',
  completed: 'success',
};

function isOverdue(task: Task): boolean {
  if (!task.due_date || task.status === 'completed') return false;
  return new Date(task.due_date) < new Date();
}

export default function TasksTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [overdueOnly, setOverdueOnly] = useState(false);

  const { data: tasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await getTasks();
      return response.data;
    },
  });

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const response = await getProjects();
      return response.data;
    },
  });

  const isLoading = tasksLoading || projectsLoading;

  // Create project lookup
  const projectsById = useMemo(() => {
    return new Map(projects.map((p) => [p.id, p]));
  }, [projects]);

  // Project options for filter
  const projectOptions = useMemo(() => {
    const opts = [{ value: '', label: 'All Projects' }];
    projects.forEach((p) => {
      opts.push({ value: String(p.id), label: p.title });
    });
    return opts;
  }, [projects]);

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Search filter
      if (search && !task.title.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }

      // Status filter
      if (status && task.status !== status) return false;

      // Priority filter
      if (priority && task.priority !== priority) return false;

      // Project filter
      if (projectFilter && task.project_id !== Number(projectFilter)) return false;

      // Overdue only filter
      if (overdueOnly && !isOverdue(task)) return false;

      return true;
    });
  }, [tasks, search, status, priority, projectFilter, overdueOnly]);

  // Stats
  const openTasks = tasks.filter((t) => t.status !== 'completed').length;
  const overdueTasks = tasks.filter(isOverdue).length;

  // Get first day of current month
  const firstOfMonth = new Date();
  firstOfMonth.setDate(1);
  firstOfMonth.setHours(0, 0, 0, 0);

  const completedThisMonth = tasks.filter((t) => {
    if (t.status !== 'completed' || !t.updated_at) return false;
    return new Date(t.updated_at) >= firstOfMonth;
  }).length;

  const columns: TableColumn<Task>[] = [
    {
      key: 'title',
      header: 'Task',
      render: (task) => (
        <div>
          <p className="font-medium">{task.title}</p>
          {task.project_id && projectsById.get(task.project_id) && (
            <Link
              to={`/projects/${task.project_id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              {projectsById.get(task.project_id)?.title}
            </Link>
          )}
        </div>
      ),
    },
    {
      key: 'assigned_to',
      header: 'Assignee',
      render: (task) => task.assigned_to?.name || <span className="text-gray-400">Unassigned</span>,
    },
    {
      key: 'priority',
      header: 'Priority',
      render: (task) => (
        <Badge variant={PRIORITY_VARIANTS[task.priority] || 'gray'}>
          {task.priority}
        </Badge>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (task) => (
        <Badge variant={STATUS_VARIANTS[task.status] || 'gray'}>
          {task.status.replace('_', ' ')}
        </Badge>
      ),
    },
    {
      key: 'due_date',
      header: 'Due Date',
      render: (task) => {
        if (!task.due_date) return <span className="text-gray-400">-</span>;
        const overdue = isOverdue(task);
        return (
          <span className={overdue ? 'text-red-600 font-medium' : ''}>
            {new Date(task.due_date).toLocaleDateString()}
            {overdue && ' (Overdue)'}
          </span>
        );
      },
    },
    {
      key: 'created_at',
      header: 'Created',
      render: (task) => new Date(task.created_at).toLocaleDateString(),
    },
  ];

  const exportColumns = [
    { key: 'title', header: 'Task' },
    { key: 'project_name', header: 'Project' },
    { key: 'assignee_name', header: 'Assignee' },
    { key: 'priority', header: 'Priority' },
    { key: 'status', header: 'Status' },
    { key: 'due_date', header: 'Due Date' },
    { key: 'created_at', header: 'Created' },
    { key: 'is_overdue', header: 'Overdue' },
  ];

  const exportData = filteredTasks.map((task) => ({
    title: task.title,
    project_name: task.project_id ? projectsById.get(task.project_id)?.title || '' : '',
    assignee_name: task.assigned_to?.name || '',
    priority: task.priority,
    status: task.status.replace('_', ' '),
    due_date: task.due_date ? new Date(task.due_date).toLocaleDateString() : '',
    created_at: new Date(task.created_at).toLocaleDateString(),
    is_overdue: isOverdue(task) ? 'Yes' : 'No',
  }));

  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Open Tasks"
          value={openTasks}
          subtitle={`${tasks.length} total`}
        />
        <StatCard
          title="Overdue"
          value={overdueTasks}
          subtitle={overdueTasks > 0 ? 'Click to filter' : 'None overdue'}
          subtitleColor={overdueTasks > 0 ? 'red' : 'green'}
        />
        <StatCard
          title="Completed This Month"
          value={completedThisMonth}
          subtitle="tasks"
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={setSearch}
          />
          <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <Select options={PRIORITY_OPTIONS} value={priority} onChange={setPriority} />
          <Select options={projectOptions} value={projectFilter} onChange={setProjectFilter} />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={overdueOnly}
              onChange={(e) => setOverdueOnly(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            Overdue only
          </label>
          <ExportButton
            data={exportData}
            filename="tasks-report"
            columns={exportColumns}
          />
        </div>
      </Card>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </p>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredTasks}
          emptyMessage="No tasks match your filters"
        />
      </Card>
    </div>
  );
}
