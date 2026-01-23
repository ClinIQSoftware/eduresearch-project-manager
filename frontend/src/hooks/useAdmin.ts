import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as adminApi from '../api/admin';
import * as api from '../services/api';
import type { UserFilters, CreateUserData, UpdateUserData, UpdateEmailSettingsData } from '../api/admin';
import type { SystemSettings } from '../types';

// Users
export function useUsers(filters?: UserFilters) {
  return useQuery({
    queryKey: queryKeys.admin.users.list(filters),
    queryFn: async () => {
      const response = await adminApi.getUsers(filters);
      return response.data;
    },
  });
}

export function usePendingUsers() {
  return useQuery({
    queryKey: queryKeys.admin.users.pending(),
    queryFn: async () => {
      const response = await adminApi.getPendingUsers();
      return response.data;
    },
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateUserData) => {
      const response = await adminApi.createUser(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateUserData }) => {
      const response = await adminApi.updateUser(id, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

export function useDeactivateUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.deactivateUser(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

export function useDeleteUserPermanently() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.deleteUserPermanently(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

export function useApproveUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await adminApi.approveUser(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.pending() });
    },
  });
}

export function useRejectUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await adminApi.rejectUser(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.pending() });
    },
  });
}

export function useBulkUploadUsers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (file: File) => {
      const response = await adminApi.bulkUploadUsers(file);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.users.all() });
    },
  });
}

// System Settings
export function useSystemSettings() {
  return useQuery({
    queryKey: queryKeys.admin.systemSettings(),
    queryFn: async () => {
      const response = await adminApi.getSystemSettings();
      return response.data;
    },
  });
}

export function useUpdateSystemSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      const response = await adminApi.updateSystemSettings(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.systemSettings() });
    },
  });
}

// Email Settings
export function useEmailSettings(institutionId?: number) {
  return useQuery({
    queryKey: queryKeys.admin.emailSettings(institutionId),
    queryFn: async () => {
      const response = await adminApi.getEmailSettings(institutionId);
      return response.data;
    },
  });
}

export function useUpdateEmailSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ data, institutionId }: { data: UpdateEmailSettingsData; institutionId?: number }) => {
      const response = await adminApi.updateEmailSettings(data, institutionId);
      return response.data;
    },
    onSuccess: (_, { institutionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.emailSettings(institutionId) });
    },
  });
}

export function useTestEmail() {
  return useMutation({
    mutationFn: async ({ to, institutionId }: { to: string; institutionId?: number }) => {
      const response = await adminApi.testEmail(to, institutionId);
      return response.data;
    },
  });
}

// Email Templates
export function useEmailTemplates(institutionId?: number) {
  return useQuery({
    queryKey: queryKeys.admin.emailTemplates(institutionId),
    queryFn: async () => {
      const response = await api.getEmailTemplates(institutionId);
      return response.data;
    },
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      templateType,
      data,
      institutionId,
    }: {
      templateType: string;
      data: { subject?: string; body?: string; is_active?: boolean };
      institutionId?: number;
    }) => {
      const response = await api.updateEmailTemplate(templateType, data, institutionId);
      return response.data;
    },
    onSuccess: (_, { institutionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.emailTemplates(institutionId) });
    },
  });
}

export function useTestTemplateEmail() {
  return useMutation({
    mutationFn: async ({
      templateType,
      recipientEmail,
      institutionId,
    }: {
      templateType: string;
      recipientEmail: string;
      institutionId?: number;
    }) => {
      const response = await api.sendTestEmail(templateType, recipientEmail, institutionId);
      return response.data;
    },
  });
}
