import type { ProjectFilters } from '../api/projects';
import type { TaskFilters } from '../api/tasks';
import type { UserFilters } from '../api/admin';

export const queryKeys = {
  // Auth / User
  auth: {
    all: ['auth'] as const,
    currentUser: () => [...queryKeys.auth.all, 'currentUser'] as const,
  },

  // Projects
  projects: {
    all: ['projects'] as const,
    lists: () => [...queryKeys.projects.all, 'list'] as const,
    list: (filters?: ProjectFilters) => [...queryKeys.projects.lists(), filters] as const,
    details: () => [...queryKeys.projects.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.projects.details(), id] as const,
    my: () => [...queryKeys.projects.all, 'my'] as const,
    upcomingDeadlines: (weeks?: number) => [...queryKeys.projects.all, 'deadlines', weeks] as const,
    upcomingMeetings: (weeks?: number) => [...queryKeys.projects.all, 'meetings', weeks] as const,
    search: (query: string) => [...queryKeys.projects.all, 'search', query] as const,
  },

  // Tasks
  tasks: {
    all: ['tasks'] as const,
    lists: () => [...queryKeys.tasks.all, 'list'] as const,
    list: (filters?: TaskFilters) => [...queryKeys.tasks.lists(), filters] as const,
    details: () => [...queryKeys.tasks.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.tasks.details(), id] as const,
    my: () => [...queryKeys.tasks.all, 'my'] as const,
    overdue: () => [...queryKeys.tasks.all, 'overdue'] as const,
    project: (projectId: number) => [...queryKeys.tasks.all, 'project', projectId] as const,
  },

  // Institutions
  institutions: {
    all: ['institutions'] as const,
    lists: () => [...queryKeys.institutions.all, 'list'] as const,
    list: () => [...queryKeys.institutions.lists()] as const,
    details: () => [...queryKeys.institutions.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.institutions.details(), id] as const,
    public: () => [...queryKeys.institutions.all, 'public'] as const,
  },

  // Departments
  departments: {
    all: ['departments'] as const,
    lists: () => [...queryKeys.departments.all, 'list'] as const,
    list: (institutionId?: number) => [...queryKeys.departments.lists(), institutionId] as const,
    details: () => [...queryKeys.departments.all, 'detail'] as const,
    detail: (id: number) => [...queryKeys.departments.details(), id] as const,
    public: (institutionId?: number) => [...queryKeys.departments.all, 'public', institutionId] as const,
    members: (departmentId: number) => [...queryKeys.departments.all, 'members', departmentId] as const,
  },

  // Join Requests
  joinRequests: {
    all: ['joinRequests'] as const,
    lists: () => [...queryKeys.joinRequests.all, 'list'] as const,
    list: (filters?: { project_id?: number; status?: string }) => [...queryKeys.joinRequests.lists(), filters] as const,
    my: () => [...queryKeys.joinRequests.all, 'my'] as const,
  },

  // Files
  files: {
    all: ['files'] as const,
    project: (projectId: number) => [...queryKeys.files.all, 'project', projectId] as const,
  },

  // Admin
  admin: {
    all: ['admin'] as const,
    users: {
      all: () => [...queryKeys.admin.all, 'users'] as const,
      list: (filters?: UserFilters) => [...queryKeys.admin.users.all(), 'list', filters] as const,
      pending: () => [...queryKeys.admin.users.all(), 'pending'] as const,
    },
    systemSettings: () => [...queryKeys.admin.all, 'systemSettings'] as const,
    emailSettings: (institutionId?: number) => [...queryKeys.admin.all, 'emailSettings', institutionId] as const,
    emailTemplates: (institutionId?: number) => [...queryKeys.admin.all, 'emailTemplates', institutionId] as const,
  },
};

export default queryKeys;
