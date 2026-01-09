import axios from 'axios';
import type {
  User, Organization, Project, ProjectWithLead, ProjectDetail,
  JoinRequestWithUser, ProjectFile, ProjectWithLeadReport,
  LeadWithProjects, UserWithProjects, Task, TimeEntry, AnalyticsSummary,
  ProjectClassification, ProjectStatus, RequestStatus
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
  name: string;
  department?: string;
  phone?: string;
  bio?: string;
}) => api.post<User>('/auth/register', data);

export const login = (email: string, password: string) =>
  api.post<{ access_token: string; token_type: string }>('/auth/login', { email, password });

export const getCurrentUser = () => api.get<User>('/auth/me');

export const updateProfile = (data: {
  name?: string;
  department?: string;
  phone?: string;
  bio?: string;
}) => api.put<User>('/auth/me', data);

// Organizations
export const getOrganizations = () => api.get<Organization[]>('/organizations');
export const getOrganization = (id: number) => api.get<Organization>(`/organizations/${id}`);

// Projects
export const getProjects = (params?: {
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
}) => api.get<ProjectWithLead[]>('/projects', { params });

export const getProject = (id: number) => api.get<ProjectDetail>(`/projects/${id}`);

export const createProject = (data: {
  title: string;
  description?: string;
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
  start_date?: string;
  color?: string;
}) => api.post<Project>('/projects', data);

export const updateProject = (id: number, data: {
  title?: string;
  description?: string;
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
  start_date?: string;
  color?: string;
}) => api.put<Project>(`/projects/${id}`, data);

export const deleteProject = (id: number) => api.delete(`/projects/${id}`);

// Project Members
export const addProjectMember = (projectId: number, userId: number, role: string = 'participant') =>
  api.post(`/projects/${projectId}/members`, { user_id: userId, role });

export const removeProjectMember = (projectId: number, userId: number) =>
  api.delete(`/projects/${projectId}/members/${userId}`);

// Join Requests
export const createJoinRequest = (projectId: number, message?: string) =>
  api.post<JoinRequestWithUser>('/join-requests', { project_id: projectId, message });

export const getJoinRequests = (params?: { project_id?: number; status?: RequestStatus }) =>
  api.get<JoinRequestWithUser[]>('/join-requests', { params });

export const respondToJoinRequest = (requestId: number, status: RequestStatus) =>
  api.put<JoinRequestWithUser>(`/join-requests/${requestId}`, { status });

export const cancelJoinRequest = (requestId: number) =>
  api.delete(`/join-requests/${requestId}`);

// Files
export const uploadFile = (projectId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post<ProjectFile>(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getProjectFiles = (projectId: number) =>
  api.get<ProjectFile[]>(`/projects/${projectId}/files`);

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

// Admin
export const getAdminUsers = (organizationId?: number) =>
  api.get<User[]>('/admin/users', { params: { organization_id: organizationId } });

export const createUser = (data: {
  email: string;
  password: string;
  name: string;
  department?: string;
  organization_id?: number;
}) => api.post<User>('/admin/users', data);

export const updateUser = (userId: number, data: {
  name?: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
}) => api.put<User>(`/admin/users/${userId}`, data);

export const deactivateUser = (userId: number) =>
  api.delete(`/admin/users/${userId}`);

// Legacy - Tasks (keeping for backwards compatibility)
export const getTasks = (params?: { status?: string; priority?: string; project_id?: number }) =>
  api.get<Task[]>('/tasks', { params });
export const createTask = (data: any) => api.post<Task>('/tasks', data);
export const updateTask = (id: number, data: any) => api.put<Task>(`/tasks/${id}`, data);
export const deleteTask = (id: number) => api.delete(`/tasks/${id}`);

// Legacy - Time Entries
export const getTimeEntries = (params?: { task_id?: number }) =>
  api.get<TimeEntry[]>('/time-entries', { params });
export const getActiveTimer = () => api.get<TimeEntry | null>('/time-entries/active');
export const startTimer = (data: { task_id?: number; notes?: string }) =>
  api.post<TimeEntry>('/time-entries', data);
export const stopTimer = (id: number) => api.post<TimeEntry>(`/time-entries/${id}/stop`);
export const deleteTimeEntry = (id: number) => api.delete(`/time-entries/${id}`);

// Legacy - Analytics
export const getAnalyticsSummary = () => api.get<AnalyticsSummary>('/analytics/summary');
export const getTimeByProject = () => api.get<any[]>('/analytics/time-by-project');
export const getDailyTime = (days?: number) => api.get<any[]>('/analytics/daily-time', { params: { days } });
export const getTasksCompleted = (days?: number) => api.get<any[]>('/analytics/tasks-completed', { params: { days } });

export default api;
