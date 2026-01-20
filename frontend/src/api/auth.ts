import client from './client';
import type { User } from '../types';

export interface LoginResponse {
  access_token: string;
  token_type: string;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  bio?: string;
  institution_id?: number;
  department_id?: number;
}

export interface UpdateProfileData {
  first_name?: string;
  last_name?: string;
  phone?: string;
  bio?: string;
  email?: string;
  institution_id?: number | null;
  department_id?: number | null;
}

export interface ChangePasswordData {
  current_password: string;
  new_password: string;
}

export const login = (email: string, password: string) =>
  client.post<LoginResponse>('/auth/login', { email, password });

export const register = (data: RegisterData) =>
  client.post<User>('/auth/register', data);

export const getCurrentUser = () =>
  client.get<User>('/auth/me');

export const updateProfile = (data: UpdateProfileData) =>
  client.put<User>('/auth/me', data);

export const changePassword = (data: ChangePasswordData) =>
  client.post<{ message: string }>('/auth/change-password', data);
