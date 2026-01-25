import client from './client';
import type {
  PlatformStats,
  EnterpriseListItem,
  EnterpriseDetail,
  EnterpriseCreateData,
  EnterpriseUpdateData,
} from '../types';

export interface PlatformAdminProfile {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface PlatformAdminCredentialsUpdate {
  current_password: string;
  new_email?: string;
  new_password?: string;
  new_name?: string;
}

export interface PlatformEmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string | null;
  from_email: string | null;
  from_name: string;
  is_active: boolean;
}

export interface PlatformEmailSettingsUpdate {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_email?: string;
  from_name?: string;
  is_active?: boolean;
}

export const platformAdminApi = {
  // Admin Profile
  getProfile: () =>
    client.get<PlatformAdminProfile>('/platform/me'),

  updateCredentials: (data: PlatformAdminCredentialsUpdate) =>
    client.put<PlatformAdminProfile>('/platform/me', data),

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

  // Email Settings
  getEmailSettings: () =>
    client.get<PlatformEmailSettings>('/platform/settings/email'),

  updateEmailSettings: (data: PlatformEmailSettingsUpdate) =>
    client.put<PlatformEmailSettings>('/platform/settings/email', data),

  sendTestEmail: (to: string) =>
    client.post<{ message: string }>('/platform/settings/email/test', { to }),
};

export default platformAdminApi;
