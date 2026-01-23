import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as joinRequestsApi from '../api/joinRequests';
import type { JoinRequestFilters } from '../api/joinRequests';

export function useJoinRequests(filters?: JoinRequestFilters) {
  return useQuery({
    queryKey: queryKeys.joinRequests.list(filters),
    queryFn: async () => {
      const response = await joinRequestsApi.getJoinRequests(filters);
      return response.data;
    },
  });
}

export function useMyJoinRequests() {
  return useQuery({
    queryKey: queryKeys.joinRequests.my(),
    queryFn: async () => {
      const response = await joinRequestsApi.getMyJoinRequests();
      return response.data;
    },
  });
}

export function useCreateJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, message }: { projectId: number; message?: string }) => {
      const response = await joinRequestsApi.createJoinRequest(projectId, message);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests.all });
    },
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await joinRequestsApi.approveJoinRequest(id);
      return response.data;
    },
    onSuccess: (joinRequest) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(joinRequest.project_id) });
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const response = await joinRequestsApi.rejectJoinRequest(id);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests.all });
    },
  });
}

export function useCancelJoinRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await joinRequestsApi.cancelJoinRequest(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.joinRequests.all });
    },
  });
}
