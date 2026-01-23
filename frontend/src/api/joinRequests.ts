import client from './client';
import type { JoinRequestWithUser, RequestStatus } from '../types';

export interface JoinRequestFilters {
  project_id?: number;
  status?: RequestStatus;
}

export const getJoinRequests = (filters?: JoinRequestFilters) =>
  client.get<JoinRequestWithUser[]>('/join-requests/', { params: filters });

export const getMyJoinRequests = () =>
  client.get<JoinRequestWithUser[]>('/join-requests/my-requests');

export const createJoinRequest = (projectId: number, message?: string) =>
  client.post<JoinRequestWithUser>('/join-requests/', { project_id: projectId, message });

export const approveJoinRequest = (id: number) =>
  client.put<JoinRequestWithUser>(`/join-requests/${id}`, { status: 'approved' as RequestStatus });

export const rejectJoinRequest = (id: number) =>
  client.put<JoinRequestWithUser>(`/join-requests/${id}`, { status: 'rejected' as RequestStatus });

export const cancelJoinRequest = (id: number) =>
  client.delete(`/join-requests/${id}`);
