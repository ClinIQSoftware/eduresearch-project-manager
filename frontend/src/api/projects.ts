import client from './client';
import type {
  Project,
  ProjectWithLead,
  ProjectDetail,
  ProjectClassification,
  ProjectStatus,
  MemberRole,
} from '../types';

export interface ProjectFilters {
  view?: 'global' | 'institution';
  classification?: ProjectClassification;
  status?: ProjectStatus;
  open_to_participants?: boolean;
}

export interface CreateProjectData {
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
}

export interface UpdateProjectData {
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
  meeting_reminder_enabled?: boolean;
  meeting_reminder_days?: number;
  deadline_reminder_enabled?: boolean;
  deadline_reminder_days?: number;
}

export const getProjects = (filters?: ProjectFilters) =>
  client.get<ProjectWithLead[]>('/projects', { params: filters });

export const getProject = (id: number) =>
  client.get<ProjectDetail>(`/projects/${id}`);

export const createProject = (data: CreateProjectData) =>
  client.post<Project>('/projects', data);

export const updateProject = (id: number, data: UpdateProjectData) =>
  client.put<Project>(`/projects/${id}`, data);

export const deleteProject = (id: number) =>
  client.delete(`/projects/${id}`);

export const getMyProjects = () =>
  client.get<ProjectWithLead[]>('/projects/my-projects');

export const getUpcomingDeadlines = (weeks?: number) =>
  client.get<ProjectWithLead[]>('/projects/upcoming-deadlines', { params: { weeks } });

export const getUpcomingMeetings = (weeks?: number) =>
  client.get<ProjectWithLead[]>('/projects/upcoming-meetings', { params: { weeks } });

export const searchProjects = (query: string, filters?: Omit<ProjectFilters, 'view'>) =>
  client.get<ProjectWithLead[]>('/projects/search', { params: { q: query, ...filters } });

export const addMember = (projectId: number, userId: number, role: MemberRole = 'participant') =>
  client.post(`/projects/${projectId}/members`, { user_id: userId, role });

export const removeMember = (projectId: number, userId: number) =>
  client.delete(`/projects/${projectId}/members/${userId}`);

export const updateMemberRole = (projectId: number, userId: number, role: MemberRole) =>
  client.put(`/projects/${projectId}/members/${userId}/role`, null, { params: { role } });

export const leaveProject = (projectId: number) =>
  client.post(`/projects/${projectId}/leave`);
