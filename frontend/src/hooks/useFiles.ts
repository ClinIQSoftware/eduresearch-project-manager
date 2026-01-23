import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as filesApi from '../api/files';

export function useProjectFiles(projectId: number) {
  return useQuery({
    queryKey: queryKeys.files.project(projectId),
    queryFn: async () => {
      const response = await filesApi.getProjectFiles(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useUploadFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, file }: { projectId: number; file: File }) => {
      const response = await filesApi.uploadFile(projectId, file);
      return response.data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.project(projectId) });
    },
  });
}

export function useDownloadFile() {
  return useMutation({
    mutationFn: async (id: number) => {
      const response = await filesApi.downloadFile(id);
      return response.data;
    },
  });
}

export function useDeleteFile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, projectId }: { id: number; projectId: number }) => {
      await filesApi.deleteFile(id);
      return { id, projectId };
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.files.project(projectId) });
    },
  });
}
