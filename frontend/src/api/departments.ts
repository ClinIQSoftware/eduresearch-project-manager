import client from './client';
import type { Department, DepartmentWithMembers, UserBrief } from '../types';

export interface CreateDepartmentData {
  name: string;
  description?: string;
  institution_id: number;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
}

export const getDepartments = (institutionId?: number) =>
  client.get<Department[]>('/departments', { params: { institution_id: institutionId } });

export const getDepartmentsPublic = (institutionId?: number) =>
  client.get<Department[]>('/departments/public', { params: { institution_id: institutionId } });

export const getDepartment = (id: number) =>
  client.get<DepartmentWithMembers>(`/departments/${id}`);

export const createDepartment = (data: CreateDepartmentData) =>
  client.post<Department>('/departments', data);

export const updateDepartment = (id: number, data: UpdateDepartmentData) =>
  client.put<Department>(`/departments/${id}`, data);

export const deleteDepartment = (id: number) =>
  client.delete(`/departments/${id}`);

export const getDepartmentMembers = (departmentId: number) =>
  client.get<UserBrief[]>(`/departments/${departmentId}/members`);

export const addDepartmentMember = (departmentId: number, userId: number) =>
  client.post(`/departments/${departmentId}/members/${userId}`);

export const removeDepartmentMember = (departmentId: number, userId: number) =>
  client.delete(`/departments/${departmentId}/members/${userId}`);
