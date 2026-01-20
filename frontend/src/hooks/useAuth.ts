import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as authApi from '../api/auth';
import type { User } from '../types';

export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.auth.currentUser(),
    queryFn: async () => {
      const response = await authApi.getCurrentUser();
      return response.data;
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useLogin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const response = await authApi.login(email, password);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.access_token);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.currentUser() });
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: authApi.RegisterData) => {
      const response = await authApi.register(data);
      return response.data;
    },
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: authApi.UpdateProfileData) => {
      const response = await authApi.updateProfile(data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData<User>(queryKeys.auth.currentUser(), data);
    },
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (data: authApi.ChangePasswordData) => {
      const response = await authApi.changePassword(data);
      return response.data;
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      localStorage.removeItem('token');
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = '/login';
    },
  });
}
