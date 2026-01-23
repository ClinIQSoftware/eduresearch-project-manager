import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as projectsApi from '../api/projects';
import type { ProjectFilters, CreateProjectData, UpdateProjectData } from '../api/projects';
import type { MemberRole } from '../types';

export function useProjects(filters?: ProjectFilters) {
  return useQuery({
    queryKey: queryKeys.projects.list(filters),
    queryFn: async () => {
      const response = await projectsApi.getProjects(filters);
      return response.data;
    },
  });
}

export function useProject(id: number) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: async () => {
      const response = await projectsApi.getProject(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useMyProjects() {
  return useQuery({
    queryKey: queryKeys.projects.my(),
    queryFn: async () => {
      const response = await projectsApi.getMyProjects();
      return response.data;
    },
  });
}

export function useUpcomingDeadlines(weeks?: number) {
  return useQuery({
    queryKey: queryKeys.projects.upcomingDeadlines(weeks),
    queryFn: async () => {
      const response = await projectsApi.getUpcomingDeadlines(weeks);
      return response.data;
    },
  });
}

export function useUpcomingMeetings(weeks?: number) {
  return useQuery({
    queryKey: queryKeys.projects.upcomingMeetings(weeks),
    queryFn: async () => {
      const response = await projectsApi.getUpcomingMeetings(weeks);
      return response.data;
    },
  });
}

export function useSearchProjects(query: string, filters?: Omit<ProjectFilters, 'view'>) {
  return useQuery({
    queryKey: queryKeys.projects.search(query),
    queryFn: async () => {
      const response = await projectsApi.searchProjects(query, filters);
      return response.data;
    },
    enabled: query.length > 0,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateProjectData) => {
      const response = await projectsApi.createProject(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateProjectData }) => {
      const response = await projectsApi.updateProject(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.lists() });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.my() });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await projectsApi.deleteProject(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useAddProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId, role = 'participant' }: { projectId: number; userId: number; role?: MemberRole }) => {
      const response = await projectsApi.addMember(projectId, userId, role);
      return response.data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useRemoveProjectMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId }: { projectId: number; userId: number }) => {
      await projectsApi.removeMember(projectId, userId);
      return { projectId, userId };
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ projectId, userId, role }: { projectId: number; userId: number; role: MemberRole }) => {
      const response = await projectsApi.updateMemberRole(projectId, userId, role);
      return response.data;
    },
    onSuccess: (_, { projectId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
    },
  });
}

export function useLeaveProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (projectId: number) => {
      await projectsApi.leaveProject(projectId);
      return projectId;
    },
    onSuccess: (projectId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.detail(projectId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.projects.my() });
    },
  });
}
