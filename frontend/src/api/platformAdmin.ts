import client from './client';
import type {
  PlatformStats,
  EnterpriseListItem,
  EnterpriseDetail,
  EnterpriseCreateData,
  EnterpriseUpdateData,
} from '../types';

export const platformAdminApi = {
  getStats: () =>
    client.get<PlatformStats>('/platform/stats'),

  listEnterprises: () =>
    client.get<EnterpriseListItem[]>('/platform/enterprises'),

  getEnterprise: (id: string) =>
    client.get<EnterpriseDetail>(`/platform/enterprises/${id}`),

  createEnterprise: (data: EnterpriseCreateData) =>
    client.post<EnterpriseListItem>('/platform/enterprises', data),

  updateEnterprise: (id: string, data: EnterpriseUpdateData) =>
    client.patch<EnterpriseListItem>(`/platform/enterprises/${id}`, data),

  deleteEnterprise: (id: string) =>
    client.delete<void>(`/platform/enterprises/${id}`),
};

export default platformAdminApi;
