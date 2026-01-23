import axios from 'axios';
import type {
  User, Institution, Department, DepartmentWithMembers, Project, ProjectWithLead, ProjectDetail,
  JoinRequestWithUser, ProjectFile, ProjectWithLeadReport,
  LeadWithProjects, UserWithProjects, Task, TimeEntry, AnalyticsSummary,
  ProjectClassification, ProjectStatus, RequestStatus,
  SystemSettings, BulkUploadResult, UserBrief,
  EmailSettings, EmailTemplate,
  UserKeyword, AlertPreference, MatchedProject
} from '../types';

// Use environment variable for API URL, fallback to /api for local dev with proxy
const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const register = (data: {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  bio?: string;
  institution_id?: number;
  department_id?: number;
}) => api.post<User>('/auth/register', data);

export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password });

export const getCurrentUser = () => api.get<User>('/auth/me');

export const updateProfile = (data: {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  email?: string;
  institution_id?: number | null;
  department_id?: number | null;
}) => api.put<User>('/auth/me', data);

export const changePassword = (data: {
  current_password: string;
  new_password: string;
}) => api.post<{ message: string }>('/auth/change-password', data);

// Institutions
export const getInstitutions = () => api.get<Institution[]>('/institutions');
export const getInstitutionsPublic = () => api.get<Institution[]>('/institutions/public');
export const getInstitution = (id: number) => api.get<Institution>(`/institutions/${id}`);
export const createInstitution = (data: { name: string; description?: string }) =>
  api.post<Institution>('/institutions', data);
export const updateInstitution = (id: number, data: { name?: string; description?: string }) =>
  api.put<Institution>(`/institutions/${id}`, data);
export const deleteInstitution = (id: number) => api.delete(`/institutions/${id}`);

// Departments
export const getDepartments = (institutionId?: number) =>
  api.get<Department[]>('/departments', { params: { institution_id: institutionId } });
export const getDepartmentsPublic = (institutionId?: number) =>
  api.get<Department[]>('/departments/public', { params: { institution_id: institutionId } });
export const getDepartment = (id: number) => api.get<DepartmentWithMembers>(`/departments/${id}`);
export const createDepartment = (data: { name: string; description?: string; institution_id: number }) =>
  api.post<Department>('/departments', data);
export const updateDepartment = (id: number, data: { name?: string; description?: string }) =>
  api.put<Department>(`/departments/${id}`, data);
export const deleteDepartment = (id: number) => api.delete(`/departments/${id}`);
export const getDepartmentMembers = (deptId: number) =>
  api.get<UserBrief[]>(`/departments/${deptId}/members`);
export const addDepartmentMember = (deptId: number, userId: number) =>
  api.post(`/departments/${deptId}/members/${userId}`);
export const removeDepartmentMember = (deptId: number, userId: number) =>
  api.delete(`/departments/${deptId}/members/${userId}`);

// Projects
export const getProjects = (params?: {
  view?: 'global' | 'institution';
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
}) => api.get<ProjectWithLead[]>('/projects', { params });

export const getMyProjects = () => api.get<ProjectWithLead[]>('/projects/my');

export const getUpcomingDeadlines = (weeks?: number) =>
  api.get<ProjectWithLead[]>('/projects/upcoming-deadlines', { params: { weeks } });

export const getUpcomingMeetings = (weeks?: number) =>
  api.get<ProjectWithLead[]>('/projects/upcoming-meetings', { params: { weeks } });

export const getProject = (id: number) => api.get<ProjectDetail>(`/projects/${id}`);

export const createProject = (data: {
  title: string;
  description?: string;
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
  start_date?: string;
  end_date?: string;
  next_meeting_date?: string;
  color?: string;
  institution_id?: number;
  department_id?: number;
}) => api.post<Project>('/projects', data);

export const updateProject = (id: number, data: {
  title?: string;
  description?: string;
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
  start_date?: string;
  end_date?: string;
  next_meeting_date?: string | null;
  color?: string;
  institution_id?: number | null;
  department_id?: number | null;
  // Email reminder settings
  meeting_reminder_enabled?: boolean;
  meeting_reminder_days?: number;
  deadline_reminder_enabled?: boolean;
  deadline_reminder_days?: number;
}) => api.put<Project>(`/projects/${id}`, data);

export const deleteProject = (id: number) => api.delete(`/projects/${id}`);

// Project Members
export const addProjectMember = (projectId: number, userId: number, role: string = 'participant') =>
  api.post(`/projects/${projectId}/members`, { user_id: userId, role });

export const removeProjectMember = (projectId: number, userId: number) =>
  api.delete(`/projects/${projectId}/members/${userId}`);

// Join Requests
export const createJoinRequest = (projectId: number, message?: string) =>
  api.post<JoinRequestWithUser>('/join-requests/', { project_id: projectId, message });

export const getJoinRequests = (params?: { project_id?: number; status?: RequestStatus }) =>
  api.get<JoinRequestWithUser[]>('/join-requests/', { params });

export const respondToJoinRequest = (requestId: number, status: RequestStatus) =>
  api.put<JoinRequestWithUser>(`/join-requests/${requestId}`, { status });

export const cancelJoinRequest = (requestId: number) =>
  api.delete(`/join-requests/${requestId}`);

// Files
export const uploadFile = (projectId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<ProjectFile>(`/files/project/${projectId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getProjectFiles = (projectId: number) =>
  api.get<ProjectFile[]>(`/files/project/${projectId}`);

export const downloadFile = (fileId: number) =>
  api.get(`/files/${fileId}/download`, { responseType: 'blob' });

export const deleteFile = (fileId: number) => api.delete(`/files/${fileId}`);

// Reports
export const getProjectsWithLeads = () =>
  api.get<ProjectWithLeadReport[]>('/reports/projects-with-leads');

export const getLeadsWithProjects = () =>
  api.get<LeadWithProjects[]>('/reports/leads-with-projects');

export const getUsersWithProjects = () =>
  api.get<UserWithProjects[]>('/reports/users-with-projects');

// Reports Overview
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

// Admin
export const getAdminUsers = (institutionId?: number) =>
  api.get<User[]>('/admin/users', { params: { institution_id: institutionId } });

export const createUser = (data: {
  email: string;
  first_name: string;
  last_name: string;
  institution_id?: number;
  department_id?: number;
  is_superuser?: boolean;
}) => api.post<User>('/admin/users', data);

export const updateUser = (userId: number, data: {
  first_name?: string;
  last_name?: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  institution_id?: number | null;
  department_id?: number | null;
}) => api.put<User>(`/admin/users/${userId}`, data);

export const deactivateUser = (userId: number) =>
  api.delete(`/admin/users/${userId}`);

export const deleteUserPermanently = (userId: number) =>
  api.delete(`/admin/users/${userId}/permanent`);

// System Settings
export const getSystemSettings = () =>
  api.get<SystemSettings>('/admin/system-settings');

export const updateSystemSettings = (data: Partial<SystemSettings>) =>
  api.put<SystemSettings>('/admin/system-settings', data);

// User Approval
export const getPendingUsers = () =>
  api.get<User[]>('/admin/pending-users');

export const approveUser = (userId: number) =>
  api.post<User>(`/admin/approve-user/${userId}`);

export const rejectUser = (userId: number) =>
  api.post(`/admin/reject-user/${userId}`);

// Bulk User Upload
export const bulkUploadUsers = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<BulkUploadResult>('/admin/users/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadUserTemplate = () =>
  api.get('/admin/users/upload-template', { responseType: 'blob' });

// Project Member Role Management
export const updateMemberRole = (projectId: number, userId: number, role: string) =>
  api.put(`/projects/${projectId}/members/${userId}/role`, null, { params: { role } });

export const leaveProject = (projectId: number) =>
  api.post(`/projects/${projectId}/leave`);

// Tasks
import type { TaskStatus, TaskPriority } from '../types';

export const getTasks = (params?: { status?: string; priority?: string; project_id?: number; assigned_to_id?: number }) =>
  api.get<Task[]>('/tasks/', { params });

export const getProjectTasks = (projectId: number) =>
  api.get<Task[]>('/tasks/', { params: { project_id: projectId } });

export const createTask = (data: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  project_id?: number;
  assigned_to_id?: number;
}) => api.post<Task>('/tasks/', data);

export const updateTask = (taskId: number, data: {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to_id?: number | null;
}) => api.put<Task>(`/tasks/${taskId}`, data);

export const deleteTask = (taskId: number) => api.delete(`/tasks/${taskId}`);

// Legacy - Time Entries
export const getTimeEntries = (params?: { task_id?: number }) =>
  api.get<TimeEntry[]>('/time-entries/', { params });
export const getActiveTimer = () => api.get<TimeEntry | null>('/time-entries/active');
export const startTimer = (data: { task_id?: number; notes?: string }) =>
  api.post<TimeEntry>('/time-entries/', data);
export const stopTimer = (id: number) => api.post<TimeEntry>(`/time-entries/${id}/stop`);
export const deleteTimeEntry = (id: number) => api.delete(`/time-entries/${id}`);

// Legacy - Analytics
export const getAnalyticsSummary = () => api.get<AnalyticsSummary>('/analytics/summary');
export const getTimeByProject = () => api.get<any[]>('/analytics/time-by-project');
export const getDailyTime = (days?: number) => api.get<any[]>('/analytics/daily-time', { params: { days } });
export const getTasksCompleted = (days?: number) => api.get<any[]>('/analytics/tasks-completed', { params: { days } });

// Email Settings
export const getEmailSettings = (institutionId?: number) =>
  api.get<EmailSettings>('/admin/email-settings', { params: { institution_id: institutionId } });

export const updateEmailSettings = (data: Partial<EmailSettings> & { smtp_password?: string }, institutionId?: number) =>
  api.put<EmailSettings>('/admin/email-settings', data, { params: { institution_id: institutionId } });

// Email Templates
export const getEmailTemplates = (institutionId?: number) =>
  api.get<EmailTemplate[]>('/admin/email-templates', { params: { institution_id: institutionId } });

export const getEmailTemplate = (templateType: string, institutionId?: number) =>
  api.get<EmailTemplate>(`/admin/email-templates/${templateType}`, { params: { institution_id: institutionId } });

export const updateEmailTemplate = (templateType: string, data: { subject?: string; body?: string; is_active?: boolean }, institutionId?: number) =>
  api.put<EmailTemplate>(`/admin/email-templates/${templateType}`, data, { params: { institution_id: institutionId } });

export const sendTestEmail = (templateType: string, recipientEmail: string, institutionId?: number) =>
  api.post('/admin/email-templates/test', { template_type: templateType, recipient_email: recipientEmail }, { params: { institution_id: institutionId } });

// Keywords (User Interest Tracking)
export const getUserKeywords = () =>
  api.get<{ keywords: UserKeyword[] }>('/keywords');

export const addKeyword = (keyword: string) =>
  api.post<UserKeyword>('/keywords', { keyword });

export const deleteKeyword = (keywordId: number) =>
  api.delete(`/keywords/${keywordId}`);

export const bulkUpdateKeywords = (keywords: string[]) =>
  api.put<{ keywords: UserKeyword[] }>('/keywords/bulk', { keywords });

export const getAlertPreferences = () =>
  api.get<AlertPreference>('/keywords/preferences');

export const updateAlertPreferences = (data: { alert_frequency?: string; dashboard_new_weeks?: number }) =>
  api.put<AlertPreference>('/keywords/preferences', data);

export const getMatchedProjects = (limit?: number, offset?: number) =>
  api.get<MatchedProject[]>('/keywords/matched-projects', { params: { limit, offset } });

export const getNewMatchedProjects = (weeks?: number) =>
  api.get<MatchedProject[]>('/keywords/matched-projects/new', { params: { weeks } });

// Project Search
export const searchProjects = (query: string, filters?: {
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
}) => api.get<ProjectWithLead[]>('/projects/search', { params: { q: query, ...filters } });

export default api;
