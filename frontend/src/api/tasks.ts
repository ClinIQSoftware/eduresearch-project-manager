import client from './client';
import type { Task, TaskStatus, TaskPriority } from '../types';

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  project_id?: number;
  assigned_to_id?: number;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string;
  project_id?: number;
  assigned_to_id?: number;
}

export interface UpdateTaskData {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  due_date?: string | null;
  assigned_to_id?: number | null;
}

export const getTasks = (filters?: TaskFilters) =>
  client.get<Task[]>('/tasks', { params: filters });

export const getTask = (id: number) =>
  client.get<Task>(`/tasks/${id}`);

export const createTask = (data: CreateTaskData) =>
  client.post<Task>('/tasks', data);

export const updateTask = (id: number, data: UpdateTaskData) =>
  client.put<Task>(`/tasks/${id}`, data);

export const deleteTask = (id: number) =>
  client.delete(`/tasks/${id}`);

export const getMyTasks = () =>
  client.get<Task[]>('/tasks/my-tasks');

export const getOverdueTasks = () =>
  client.get<Task[]>('/tasks/overdue');

export const getProjectTasks = (projectId: number) =>
  client.get<Task[]>('/tasks', { params: { project_id: projectId } });
