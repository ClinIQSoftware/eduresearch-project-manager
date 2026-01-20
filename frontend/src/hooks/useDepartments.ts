import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as departmentsApi from '../api/departments';
import type { CreateDepartmentData, UpdateDepartmentData } from '../api/departments';

export function useDepartments(institutionId?: number) {
  return useQuery({
    queryKey: queryKeys.departments.list(institutionId),
    queryFn: async () => {
      const response = await departmentsApi.getDepartments(institutionId);
      return response.data;
    },
  });
}

export function useDepartmentsPublic(institutionId?: number) {
  return useQuery({
    queryKey: queryKeys.departments.public(institutionId),
    queryFn: async () => {
      const response = await departmentsApi.getDepartmentsPublic(institutionId);
      return response.data;
    },
  });
}

export function useDepartment(id: number) {
  return useQuery({
    queryKey: queryKeys.departments.detail(id),
    queryFn: async () => {
      const response = await departmentsApi.getDepartment(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useDepartmentMembers(departmentId: number) {
  return useQuery({
    queryKey: queryKeys.departments.members(departmentId),
    queryFn: async () => {
      const response = await departmentsApi.getDepartmentMembers(departmentId);
      return response.data;
    },
    enabled: !!departmentId,
  });
}

export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateDepartmentData) => {
      const response = await departmentsApi.createDepartment(data);
      return response.data;
    },
    onSuccess: (department) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.list(department.institution_id) });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UpdateDepartmentData }) => {
      const response = await departmentsApi.updateDepartment(id, data);
      return response.data;
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.lists() });
    },
  });
}

export function useDeleteDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      await departmentsApi.deleteDepartment(id);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}

export function useAddDepartmentMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId, userId }: { departmentId: number; userId: number }) => {
      const response = await departmentsApi.addDepartmentMember(departmentId, userId);
      return response.data;
    },
    onSuccess: (_, { departmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(departmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.members(departmentId) });
    },
  });
}

export function useRemoveDepartmentMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ departmentId, userId }: { departmentId: number; userId: number }) => {
      await departmentsApi.removeDepartmentMember(departmentId, userId);
      return { departmentId, userId };
    },
    onSuccess: (_, { departmentId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.detail(departmentId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.members(departmentId) });
    },
  });
}
