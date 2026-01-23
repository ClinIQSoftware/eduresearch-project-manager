import client from './client';
import type { User, SystemSettings, EmailSettings, BulkUploadResult } from '../types';

export interface UserFilters {
  institution_id?: number;
}

export interface CreateUserData {
  email: string;
  first_name: string;
  last_name: string;
  institution_id?: number;
  department_id?: number;
  is_superuser?: boolean;
}

export interface UpdateUserData {
  first_name?: string;
  last_name?: string;
  email?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  institution_id?: number | null;
  department_id?: number | null;
}

export interface UpdateEmailSettingsData extends Partial<EmailSettings> {
  smtp_password?: string;
}

// Users
export const getUsers = (filters?: UserFilters) =>
  client.get<User[]>('/admin/users', { params: filters });

export const createUser = (data: CreateUserData) =>
  client.post<User>('/admin/users', data);

export const updateUser = (id: number, data: UpdateUserData) =>
  client.put<User>(`/admin/users/${id}`, data);

export const deactivateUser = (id: number) =>
  client.delete(`/admin/users/${id}`);

export const deleteUserPermanently = (id: number) =>
  client.delete(`/admin/users/${id}/permanent`);

// Pending Users
export const getPendingUsers = () =>
  client.get<User[]>('/admin/pending-users');

export const approveUser = (id: number) =>
  client.post<User>(`/admin/approve-user/${id}`);

export const rejectUser = (id: number) =>
  client.post(`/admin/reject-user/${id}`);

// Bulk Upload
export const bulkUploadUsers = (file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post<BulkUploadResult>('/admin/users/bulk-upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const downloadUserTemplate = () =>
  client.get('/admin/users/upload-template', { responseType: 'blob' });

// System Settings
export const getSystemSettings = () =>
  client.get<SystemSettings>('/admin/system-settings');

export const updateSystemSettings = (data: Partial<SystemSettings>) =>
  client.put<SystemSettings>('/admin/system-settings', data);

// Email Settings
export const getEmailSettings = (institutionId?: number) =>
  client.get<EmailSettings>('/admin/email-settings', { params: { institution_id: institutionId } });

export const updateEmailSettings = (data: UpdateEmailSettingsData, institutionId?: number) =>
  client.put<EmailSettings>('/admin/email-settings', data, { params: { institution_id: institutionId } });

export const testEmail = (to: string, institutionId?: number) =>
  client.post('/admin/email-settings/test', { to }, { params: { institution_id: institutionId } });
