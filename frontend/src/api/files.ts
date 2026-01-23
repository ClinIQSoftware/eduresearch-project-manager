import client from './client';
import type { ProjectFile } from '../types';

export const uploadFile = (projectId: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post<ProjectFile>(`/projects/${projectId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getProjectFiles = (projectId: number) =>
  client.get<ProjectFile[]>(`/projects/${projectId}/files`);

export const downloadFile = (id: number) =>
  client.get(`/files/${id}/download`, { responseType: 'blob' });

export const deleteFile = (id: number) =>
  client.delete(`/files/${id}`);
