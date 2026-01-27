import client from './client';

export interface InviteCode {
  id: number;
  code: string;
  token: string;
  label: string | null;
  invite_url: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  is_valid: boolean;
  expires_at: string | null;
  created_at: string;
  created_by_name: string | null;
}

export interface InviteCodeCreate {
  label?: string;
  max_uses?: number;
  expires_in_days?: number;
}

export interface InviteCodeValidation {
  valid: boolean;
  enterprise_name: string | null;
  enterprise_slug: string | null;
  message: string | null;
}

export const getInviteCodes = () =>
  client.get<InviteCode[]>('/admin/invite-codes');

export const createInviteCode = (data: InviteCodeCreate) =>
  client.post<InviteCode>('/admin/invite-codes', data);

export const deactivateInviteCode = (id: number) =>
  client.delete(`/admin/invite-codes/${id}`);

export const validateInviteCode = (code: string) =>
  client.get<InviteCodeValidation>('/join/validate', { params: { code } });
