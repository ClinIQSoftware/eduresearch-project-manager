# Reports Enhancement Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Reports module with visual dashboards, filtering, export, and new report types.

**Architecture:** Tab-based routing (like Admin/Settings) with 5 tabs: Overview, Projects, People, Tasks, Activity. Recharts for visualizations. Backend provides aggregated stats endpoint. Frontend handles CSV export.

**Tech Stack:** React, React Router, Recharts (already installed), TanStack Query, Tailwind CSS, FastAPI backend

---

## Phase 1: Foundation (Tab Structure)

### Task 1: Create Reports Directory Structure

**Files:**
- Create: `frontend/src/pages/reports/ReportsLayout.tsx`
- Create: `frontend/src/pages/reports/index.ts`

**Step 1: Create ReportsLayout component**

Create `frontend/src/pages/reports/ReportsLayout.tsx`:

```tsx
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
```

**Step 2: Create index exports**

Create `frontend/src/pages/reports/index.ts`:

```ts
export { default as ReportsLayout } from './ReportsLayout';
```

**Step 3: Commit**

```bash
git add frontend/src/pages/reports/
git commit -m "feat(reports): add reports layout with tab navigation"
```

---

### Task 2: Create Placeholder Tab Components

**Files:**
- Create: `frontend/src/pages/reports/OverviewTab.tsx`
- Create: `frontend/src/pages/reports/ProjectsTab.tsx`
- Create: `frontend/src/pages/reports/PeopleTab.tsx`
- Create: `frontend/src/pages/reports/TasksTab.tsx`
- Create: `frontend/src/pages/reports/ActivityTab.tsx`
- Modify: `frontend/src/pages/reports/index.ts`

**Step 1: Create OverviewTab placeholder**

Create `frontend/src/pages/reports/OverviewTab.tsx`:

```tsx
export default function OverviewTab() {
  return (
    <div className="text-gray-500">Overview dashboard coming soon...</div>
  );
}
```

**Step 2: Create ProjectsTab placeholder**

Create `frontend/src/pages/reports/ProjectsTab.tsx`:

```tsx
export default function ProjectsTab() {
  return (
    <div className="text-gray-500">Projects report coming soon...</div>
  );
}
```

**Step 3: Create PeopleTab placeholder**

Create `frontend/src/pages/reports/PeopleTab.tsx`:

```tsx
export default function PeopleTab() {
  return (
    <div className="text-gray-500">People report coming soon...</div>
  );
}
```

**Step 4: Create TasksTab placeholder**

Create `frontend/src/pages/reports/TasksTab.tsx`:

```tsx
export default function TasksTab() {
  return (
    <div className="text-gray-500">Tasks report coming soon...</div>
  );
}
```

**Step 5: Create ActivityTab placeholder**

Create `frontend/src/pages/reports/ActivityTab.tsx`:

```tsx
export default function ActivityTab() {
  return (
    <div className="text-gray-500">Activity log coming soon...</div>
  );
}
```

**Step 6: Update index exports**

Modify `frontend/src/pages/reports/index.ts`:

```ts
export { default as ReportsLayout } from './ReportsLayout';
export { default as OverviewTab } from './OverviewTab';
export { default as ProjectsTab } from './ProjectsTab';
export { default as PeopleTab } from './PeopleTab';
export { default as TasksTab } from './TasksTab';
export { default as ActivityTab } from './ActivityTab';
```

**Step 7: Commit**

```bash
git add frontend/src/pages/reports/
git commit -m "feat(reports): add placeholder tab components"
```

---

### Task 3: Update App Routes

**Files:**
- Modify: `frontend/src/App.tsx`

**Step 1: Update imports and routes**

In `frontend/src/App.tsx`, replace the Reports import and route:

Find this import:
```tsx
import Reports from './pages/Reports';
```

Replace with:
```tsx
import {
  ReportsLayout,
  OverviewTab as ReportsOverviewTab,
  ProjectsTab as ReportsProjectsTab,
  PeopleTab as ReportsPeopleTab,
  TasksTab as ReportsTasksTab,
  ActivityTab as ReportsActivityTab,
} from './pages/reports';
```

Find this route block:
```tsx
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
```

Replace with:
```tsx
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <ReportsLayout />
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/reports/overview" replace />} />
          <Route path="overview" element={<ReportsOverviewTab />} />
          <Route path="projects" element={<ReportsProjectsTab />} />
          <Route path="people" element={<ReportsPeopleTab />} />
          <Route path="tasks" element={<ReportsTasksTab />} />
          <Route path="activity" element={<ReportsActivityTab />} />
        </Route>
```

**Step 2: Verify build**

```bash
cd frontend && npm run build
```

Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add frontend/src/App.tsx
git commit -m "feat(reports): update routing to use tab-based layout"
```

---

## Phase 2: Overview Dashboard

### Task 4: Create StatCard Component

**Files:**
- Create: `frontend/src/components/reports/StatCard.tsx`
- Create: `frontend/src/components/reports/index.ts`

**Step 1: Create StatCard component**

Create `frontend/src/components/reports/StatCard.tsx`:

```tsx
import { Card } from '../ui/Card';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: 'gray' | 'red' | 'green';
  icon?: React.ReactNode;
}

export function StatCard({ title, value, subtitle, subtitleColor = 'gray', icon }: StatCardProps) {
  const subtitleColors = {
    gray: 'text-gray-500',
    red: 'text-red-600',
    green: 'text-green-600',
  };

  return (
    <Card>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && (
            <p className={`text-sm mt-1 ${subtitleColors[subtitleColor]}`}>{subtitle}</p>
          )}
        </div>
        {icon && <div className="text-gray-400">{icon}</div>}
      </div>
    </Card>
  );
}
```

**Step 2: Create index exports**

Create `frontend/src/components/reports/index.ts`:

```ts
export { StatCard } from './StatCard';
```

**Step 3: Commit**

```bash
git add frontend/src/components/reports/
git commit -m "feat(reports): add StatCard component"
```

---

### Task 5: Create Backend Overview Endpoint

**Files:**
- Modify: `backend/app/api/routes/reports.py`

**Step 1: Add overview endpoint**

Add to `backend/app/api/routes/reports.py` after the existing imports:

```python
from datetime import datetime, timedelta
from sqlalchemy import func
from app.models.task import Task
```

Add this schema class after the existing schemas:

```python
class ReportsOverview(BaseModel):
    total_projects: int
    active_projects: int
    total_tasks: int
    open_tasks: int
    overdue_tasks: int
    completed_this_month: int
    total_members: int
    projects_by_status: dict
    projects_by_classification: dict

    class Config:
        from_attributes = True
```

Add this endpoint at the end of the file:

```python
@router.get("/overview", response_model=ReportsOverview)
def get_reports_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get aggregated statistics for reports dashboard."""
    # Base query filters
    project_filter = []
    if not current_user.is_superuser and current_user.institution_id:
        project_filter.append(Project.institution_id == current_user.institution_id)

    # Project counts
    projects_query = db.query(Project)
    if project_filter:
        projects_query = projects_query.filter(*project_filter)

    total_projects = projects_query.count()
    active_projects = projects_query.filter(Project.status == 'active').count()

    # Project status breakdown
    status_counts = db.query(
        Project.status, func.count(Project.id)
    ).filter(*project_filter).group_by(Project.status).all()
    projects_by_status = {s or 'unknown': c for s, c in status_counts}

    # Project classification breakdown
    class_counts = db.query(
        Project.classification, func.count(Project.id)
    ).filter(*project_filter).group_by(Project.classification).all()
    projects_by_classification = {c or 'unclassified': cnt for c, cnt in class_counts}

    # Task counts - get project IDs first
    project_ids = [p.id for p in projects_query.all()]

    tasks_query = db.query(Task).filter(Task.project_id.in_(project_ids)) if project_ids else db.query(Task).filter(False)

    total_tasks = tasks_query.count()
    open_tasks = tasks_query.filter(Task.status.in_(['open', 'in_progress'])).count()

    # Overdue tasks
    today = datetime.utcnow().date()
    overdue_tasks = tasks_query.filter(
        Task.status.in_(['open', 'in_progress']),
        Task.due_date < today
    ).count()

    # Completed this month
    first_of_month = today.replace(day=1)
    completed_this_month = tasks_query.filter(
        Task.status == 'completed',
        Task.updated_at >= first_of_month
    ).count()

    # Total members
    members_query = db.query(func.count(func.distinct(ProjectMember.user_id))).join(
        Project, ProjectMember.project_id == Project.id
    )
    if project_filter:
        members_query = members_query.filter(*project_filter)
    total_members = members_query.scalar() or 0

    return ReportsOverview(
        total_projects=total_projects,
        active_projects=active_projects,
        total_tasks=total_tasks,
        open_tasks=open_tasks,
        overdue_tasks=overdue_tasks,
        completed_this_month=completed_this_month,
        total_members=total_members,
        projects_by_status=projects_by_status,
        projects_by_classification=projects_by_classification
    )
```

**Step 2: Verify backend starts**

```bash
cd backend && python -c "from app.api.routes.reports import router; print('OK')"
```

**Step 3: Commit**

```bash
git add backend/app/api/routes/reports.py
git commit -m "feat(api): add reports overview endpoint"
```

---

### Task 6: Add Frontend API and Hook

**Files:**
- Modify: `frontend/src/services/api.ts`
- Create: `frontend/src/hooks/useReports.ts`

**Step 1: Add TypeScript types and API function**

Add to `frontend/src/services/api.ts` after the existing report types:

```ts
export interface ReportsOverview {
  total_projects: number;
  active_projects: number;
  total_tasks: number;
  open_tasks: number;
  overdue_tasks: number;
  completed_this_month: number;
  total_members: number;
  projects_by_status: Record<string, number>;
  projects_by_classification: Record<string, number>;
}

export const getReportsOverview = () =>
  api.get<ReportsOverview>('/reports/overview');
```

**Step 2: Create useReports hook**

Create `frontend/src/hooks/useReports.ts`:

```ts
import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

export function useReportsOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const response = await api.getReportsOverview();
      return response.data;
    },
  });
}
```

**Step 3: Export from hooks index**

Add to `frontend/src/hooks/index.ts`:

```ts
export * from './useReports';
```

**Step 4: Commit**

```bash
git add frontend/src/services/api.ts frontend/src/hooks/useReports.ts frontend/src/hooks/index.ts
git commit -m "feat(reports): add overview API and hook"
```

---

### Task 7: Implement OverviewTab with Charts

**Files:**
- Modify: `frontend/src/pages/reports/OverviewTab.tsx`

**Step 1: Implement full OverviewTab**

Replace `frontend/src/pages/reports/OverviewTab.tsx`:

```tsx
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
```

**Step 2: Verify build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/src/pages/reports/OverviewTab.tsx
git commit -m "feat(reports): implement overview dashboard with charts"
```

---

## Phase 3: Enhanced Projects Tab

### Task 8: Create ExportButton Component

**Files:**
- Create: `frontend/src/components/reports/ExportButton.tsx`
- Modify: `frontend/src/components/reports/index.ts`

**Step 1: Create ExportButton**

Create `frontend/src/components/reports/ExportButton.tsx`:

```tsx
import { Button } from '../ui/Button';

interface ExportButtonProps {
  data: Record<string, unknown>[];
  filename: string;
  columns: { key: string; header: string }[];
}

export function ExportButton({ data, filename, columns }: ExportButtonProps) {
  const handleExport = () => {
    if (data.length === 0) return;

    const headers = columns.map((c) => c.header).join(',');
    const rows = data.map((row) =>
      columns
        .map((c) => {
          const value = row[c.key];
          const str = value === null || value === undefined ? '' : String(value);
          // Escape quotes and wrap in quotes if contains comma
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="secondary" onClick={handleExport} disabled={data.length === 0}>
      Export CSV
    </Button>
  );
}
```

**Step 2: Update exports**

Update `frontend/src/components/reports/index.ts`:

```ts
export { StatCard } from './StatCard';
export { ExportButton } from './ExportButton';
```

**Step 3: Commit**

```bash
git add frontend/src/components/reports/
git commit -m "feat(reports): add ExportButton component for CSV downloads"
```

---

### Task 9: Implement ProjectsTab with Filters and Export

**Files:**
- Modify: `frontend/src/pages/reports/ProjectsTab.tsx`

**Step 1: Implement full ProjectsTab**

Replace `frontend/src/pages/reports/ProjectsTab.tsx`:

```tsx
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectsWithLeads } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ExportButton } from '../../components/reports/ExportButton';
import type { ProjectWithLeadReport } from '../../services/api';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
];

const CLASSIFICATION_OPTIONS = [
  { value: '', label: 'All Classifications' },
  { value: 'basic_science', label: 'Basic Science' },
  { value: 'clinical', label: 'Clinical' },
  { value: 'translational', label: 'Translational' },
  { value: 'epidemiological', label: 'Epidemiological' },
  { value: 'other', label: 'Other' },
];

const OPEN_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'yes', label: 'Open to Participants' },
  { value: 'no', label: 'Not Open' },
];

export default function ProjectsTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [classification, setClassification] = useState('');
  const [openFilter, setOpenFilter] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['reports', 'projects-with-leads'],
    queryFn: async () => {
      const response = await getProjectsWithLeads();
      return response.data;
    },
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (status && p.status !== status) return false;
      if (classification && p.classification !== classification) return false;
      if (openFilter === 'yes' && !p.open_to_participants) return false;
      if (openFilter === 'no' && p.open_to_participants) return false;
      return true;
    });
  }, [projects, search, status, classification, openFilter]);

  const columns: TableColumn<ProjectWithLeadReport>[] = [
    {
      key: 'title',
      header: 'Project',
      render: (p) => (
        <Link to={`/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
          {p.title}
        </Link>
      ),
    },
    {
      key: 'classification',
      header: 'Classification',
      render: (p) => (
        <span className="capitalize">{p.classification?.replace('_', ' ') || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <span className="capitalize">{p.status?.replace('_', ' ') || '-'}</span>,
    },
    {
      key: 'lead_name',
      header: 'Lead',
      render: (p) =>
        p.lead_name ? (
          <div>
            <p>{p.lead_name}</p>
            <p className="text-xs text-gray-400">{p.lead_email}</p>
          </div>
        ) : (
          <span className="text-gray-400">No lead</span>
        ),
    },
    {
      key: 'open_to_participants',
      header: 'Open',
      render: (p) =>
        p.open_to_participants ? (
          <span className="text-green-600">Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
    {
      key: 'start_date',
      header: 'Start Date',
      render: (p) => (p.start_date ? new Date(p.start_date).toLocaleDateString() : '-'),
    },
  ];

  const exportColumns = [
    { key: 'title', header: 'Project' },
    { key: 'classification', header: 'Classification' },
    { key: 'status', header: 'Status' },
    { key: 'lead_name', header: 'Lead Name' },
    { key: 'lead_email', header: 'Lead Email' },
    { key: 'open_to_participants', header: 'Open to Participants' },
    { key: 'start_date', header: 'Start Date' },
  ];

  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={setSearch}
          />
          <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <Select options={CLASSIFICATION_OPTIONS} value={classification} onChange={setClassification} />
          <Select options={OPEN_OPTIONS} value={openFilter} onChange={setOpenFilter} />
          <ExportButton
            data={filteredProjects}
            filename="projects-report"
            columns={exportColumns}
          />
        </div>
      </Card>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filteredProjects.length} of {projects.length} projects
      </p>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredProjects}
          emptyMessage="No projects match your filters"
        />
      </Card>
    </div>
  );
}
```

**Step 2: Verify build**

```bash
cd frontend && npm run build
```

**Step 3: Commit**

```bash
git add frontend/src/pages/reports/ProjectsTab.tsx
git commit -m "feat(reports): implement projects tab with filters and export"
```

---

### Task 10: Rebuild Docker and Test

**Step 1: Rebuild containers**

```bash
docker compose -f docker-compose.local.yml up --build -d backend frontend
```

**Step 2: Verify in browser**

1. Navigate to http://localhost:3000/reports
2. Verify Overview tab shows stats and charts
3. Click Projects tab, verify filters and export work
4. Other tabs should show placeholder text

**Step 3: Final commit for Phase 1-3**

```bash
git add -A
git commit -m "feat(reports): complete phases 1-3 - foundation, overview, projects"
```

---

## Phase 4-6: Remaining Tabs (Summary)

The remaining phases follow the same patterns:

### Phase 4: People Tab
- Merge leads/users views
- Add workload indicators
- Add role filtering

### Phase 5: Tasks Tab
- Create tasks report API endpoint
- Add overdue highlighting
- Add task filters and export

### Phase 6: Activity Tab
- Create activity_log table (migration)
- Log events on project/task changes
- Build timeline UI

These can be implemented following the same task structure above.

---

## Files Summary

**Created:**
- `frontend/src/pages/reports/ReportsLayout.tsx`
- `frontend/src/pages/reports/OverviewTab.tsx`
- `frontend/src/pages/reports/ProjectsTab.tsx`
- `frontend/src/pages/reports/PeopleTab.tsx` (placeholder)
- `frontend/src/pages/reports/TasksTab.tsx` (placeholder)
- `frontend/src/pages/reports/ActivityTab.tsx` (placeholder)
- `frontend/src/pages/reports/index.ts`
- `frontend/src/components/reports/StatCard.tsx`
- `frontend/src/components/reports/ExportButton.tsx`
- `frontend/src/components/reports/index.ts`
- `frontend/src/hooks/useReports.ts`

**Modified:**
- `frontend/src/App.tsx`
- `frontend/src/services/api.ts`
- `frontend/src/hooks/index.ts`
- `backend/app/api/routes/reports.py`
