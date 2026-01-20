import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as tasksApi from '../api/tasks';
import type { TaskFilters, CreateTaskData, UpdateTaskData } from '../api/tasks';

export function useTasks(filters?: TaskFilters) {
  return useQuery({
    queryKey: queryKeys.tasks.list(filters),
    queryFn: async () => {
      const response = await tasksApi.getTasks(filters);
      return response.data;
    },
  });
}

export function useTask(id: number) {
  return useQuery({
    queryKey: queryKeys.tasks.detail(id),
    queryFn: async () => {
      const response = await tasksApi.getTask(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMyTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.my(),
    queryFn: async () => {
      const response = await tasksApi.getMyTasks();
      return response.data;
    },
  });
}

export function useOverdueTasks() {
  return useQuery({
    queryKey: queryKeys.tasks.overdue(),
    queryFn: async () => {
      const response = await tasksApi.getOverdueTasks();
      return response.data;
    },
  });
}

export function useProjectTasks(projectId: number) {
  return useQuery({
    queryKey: queryKeys.tasks.project(projectId),
    queryFn: async () => {
      const response = await tasksApi.getProjectTasks(projectId);
      return response.data;
    },
    enabled: !!projectId,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const response = await tasksApi.createTask(data);
      return response.data;
    },
    onSuccess: (task) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(task.project_id) });
      }
    },
  });
}

export function useUpdateTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateTaskData }) => {
      const response = await tasksApi.updateTask(id, data);
      return response.data;
    },
    onSuccess: (task, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.my() });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.overdue() });
      if (task.project_id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.project(task.project_id) });
      }
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await tasksApi.deleteTask(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}
