# Reports Enhancement Design

## Overview

Redesign the Reports module to provide visual dashboards, better filtering, export capabilities, and new report types. The reports serve all user types: project leads, department heads, and institution admins.

## Tab Structure

| Tab | Purpose |
|-----|---------|
| **Overview** | Visual dashboard with key metrics and charts |
| **Projects** | Enhanced project list with filters and export |
| **People** | Merged leads/users view with workload insights |
| **Tasks** | Task completion, overdue items, productivity |
| **Activity** | Timeline of recent actions across projects |

Routes: `/reports`, `/reports/overview`, `/reports/projects`, `/reports/people`, `/reports/tasks`, `/reports/activity`

---

## Overview Tab

### Summary Cards (4-card grid)
- **Projects**: Total count with "X active" subtitle
- **Tasks**: Open tasks with "X overdue" in red if any
- **Completion Rate**: Percentage of tasks completed this month
- **Team Members**: People involved in projects (org-wide for admins)

### Charts
- **Project Status** (donut): Planning / Active / On Hold / Completed
- **Projects by Classification** (horizontal bar): Basic Science / Clinical / etc.
- **Activity Over Time** (line): Projects created and tasks completed per week over last 3 months

### Filter Bar
- Date range: Last 30 days / Last 90 days / This year / Custom
- For admins: Institution and Department dropdowns
- All charts and cards update when filters change

---

## Projects Tab

### Filter Bar
- Search box (title, description)
- Status: All / Planning / Active / On Hold / Completed
- Classification: All / Basic Science / Clinical / etc.
- Open to participants: All / Yes / No
- Date range (project start date)

### Table
Columns: Project title, Classification, Status, Lead, Department, Task count, Last activity, Start date

Features:
- Sortable columns (click header)
- Row click navigates to project detail
- Pagination (25 rows per page)

### Export
- "Export CSV" button downloads current filtered view

---

## People Tab

### View Toggle
- "By Person" (default): Each user with their projects
- "By Role": Grouped by Leads vs Participants

### Filter Bar
- Search (name, email)
- Role: All / Leads only / Participants only
- Institution/Department (for admins)

### Summary Stats
- Total people involved in projects
- Average projects per person
- People with no active projects

### Person Cards (expandable)
- Name, email, role badges
- Workload indicator: project count with color coding (green < 3, yellow 3-5, red > 5)
- Expand to see project details with role and status

### Export
- CSV of people with project assignments

---

## Tasks Tab

### Summary Cards
- **Open Tasks**: Count of incomplete tasks
- **Overdue**: Count in red (click to filter)
- **Completed This Month**: Count with % change vs last month
- **Avg Completion Time**: Days from created to completed

### Filter Bar
- Search (task title)
- Status: All / Open / In Progress / Completed
- Priority: All / Low / Medium / High / Urgent
- Assignee dropdown
- Project dropdown
- Due date range

### Table
Columns: Task title, Project, Assignee, Priority, Status, Due date, Created

Features:
- Sortable columns
- Overdue rows highlighted in light red
- Row click navigates to project detail

### Chart (collapsible)
- Tasks by status: Stacked bar by week showing completion trends

### Export
- CSV of filtered tasks

---

## Activity Tab

### Purpose
Timeline view of recent actions for audit and awareness.

### Filter Bar
- Date range (default: last 7 days)
- Action type: All / Project created / Task created / Task completed / Member joined / Status changed
- Project dropdown
- Person dropdown

### Summary
- Total actions this period
- Most active project
- Most active user

### Timeline View
- Grouped by day with date headers
- Each entry: timestamp, user name, action description, project link
- Example: "Jane Doe completed task 'Literature review' in Clinical Trial Alpha"

### Export
- CSV of activity log

---

## Technical Implementation

### Frontend Structure
```
frontend/src/pages/reports/
├── ReportsLayout.tsx      # Tab navigation
├── OverviewTab.tsx        # Dashboard with charts
├── ProjectsTab.tsx        # Enhanced project list
├── PeopleTab.tsx          # User workload view
├── TasksTab.tsx           # Task reporting
├── ActivityTab.tsx        # Activity timeline
└── index.ts               # Exports

frontend/src/components/reports/
├── FilterBar.tsx          # Reusable filter component
├── StatCard.tsx           # Summary metric card
└── ExportButton.tsx       # CSV export utility
```

### Charts
- Use Recharts library for visualizations
- Lazy-load chart components

### Backend API

New endpoints:
- `GET /api/reports/overview` - Aggregated stats for dashboard
- `GET /api/reports/activity` - Activity log with pagination

Extend existing endpoints:
- Add filter parameters to projects, tasks, users endpoints
- Role-based data scoping (users see their projects, admins see all)

### Export
- Frontend generates CSV from filtered data
- Utility function converts table data to downloadable CSV

### Performance
- Cache overview stats (refresh on page load)
- Paginate large tables (25 rows default)
- Debounce filter inputs (300ms)

---

## Data Scoping by Role

| Role | Data Visible |
|------|--------------|
| Regular user | Projects they lead or participate in |
| Department head | All projects in their department |
| Institution admin | All projects in their institution |
| Superuser | All projects system-wide |

---

## Implementation Phases

### Phase 1: Foundation
- Create reports directory structure with tab routing
- Implement ReportsLayout with navigation
- Migrate existing Projects tab with enhanced filters

### Phase 2: Overview Dashboard
- Build StatCard component
- Integrate Recharts for visualizations
- Create overview API endpoint
- Implement filter bar

### Phase 3: People & Tasks
- Build PeopleTab with workload indicators
- Build TasksTab with overdue highlighting
- Add CSV export functionality

### Phase 4: Activity
- Design activity log schema (if not exists)
- Build activity API endpoint
- Implement timeline UI

---

## Out of Scope (Future)
- PDF export (stick with CSV for now)
- Scheduled report emails
- Custom saved report views
- Real-time dashboard updates
