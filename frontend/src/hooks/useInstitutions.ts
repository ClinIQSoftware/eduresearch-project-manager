import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as institutionsApi from '../api/institutions';
import type { CreateInstitutionData, UpdateInstitutionData } from '../api/institutions';

export function useInstitutions() {
  return useQuery({
    queryKey: queryKeys.institutions.list(),
    queryFn: async () => {
      const response = await institutionsApi.getInstitutions();
      return response.data;
    },
  });
}

export function useInstitutionsPublic() {
  return useQuery({
    queryKey: queryKeys.institutions.public(),
    queryFn: async () => {
      const response = await institutionsApi.getInstitutionsPublic();
      return response.data;
    },
  });
}

export function useInstitution(id: number) {
  return useQuery({
    queryKey: queryKeys.institutions.detail(id),
    queryFn: async () => {
      const response = await institutionsApi.getInstitution(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateInstitution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateInstitutionData) => {
      const response = await institutionsApi.createInstitution(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.all });
    },
  });
}

export function useUpdateInstitution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateInstitutionData }) => {
      const response = await institutionsApi.updateInstitution(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.lists() });
    },
  });
}

export function useDeleteInstitution() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await institutionsApi.deleteInstitution(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.institutions.all });
    },
  });
}
