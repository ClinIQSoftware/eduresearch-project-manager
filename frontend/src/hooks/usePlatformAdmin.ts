import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import { platformAdminApi } from '../api/platformAdmin';
import type { EnterpriseCreateData, EnterpriseUpdateData } from '../types';

// Platform Stats
export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.platformAdmin.stats(),
    queryFn: async () => {
      const response = await platformAdminApi.getStats();
      return response.data;
    },
  });
}

// Enterprises List
export function useEnterprises() {
  return useQuery({
    queryKey: queryKeys.platformAdmin.enterprises.list(),
    queryFn: async () => {
      const response = await platformAdminApi.listEnterprises();
      return response.data;
    },
  });
}

// Single Enterprise
export function useEnterprise(id: string) {
  return useQuery({
    queryKey: queryKeys.platformAdmin.enterprises.detail(id),
    queryFn: async () => {
      const response = await platformAdminApi.getEnterprise(id);
      return response.data;
    },
    enabled: !!id,
  });
}

// Create Enterprise
export function useCreateEnterprise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: EnterpriseCreateData) => {
      const response = await platformAdminApi.createEnterprise(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.enterprises.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.stats() });
    },
  });
}

// Update Enterprise
export function useUpdateEnterprise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EnterpriseUpdateData }) => {
      const response = await platformAdminApi.updateEnterprise(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.enterprises.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.enterprises.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.stats() });
    },
  });
}

// Delete Enterprise
export function useDeleteEnterprise() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await platformAdminApi.deleteEnterprise(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.enterprises.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.platformAdmin.stats() });
    },
  });
}
