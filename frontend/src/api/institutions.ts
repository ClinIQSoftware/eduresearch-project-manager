import client from './client';
import type { Institution } from '../types';

export interface CreateInstitutionData {
  name: string;
  description?: string;
}

export interface UpdateInstitutionData {
  name?: string;
  description?: string;
}

export const getInstitutions = () =>
  client.get<Institution[]>('/institutions');

export const getInstitutionsPublic = () =>
  client.get<Institution[]>('/institutions/public');

export const getInstitution = (id: number) =>
  client.get<Institution>(`/institutions/${id}`);

export const createInstitution = (data: CreateInstitutionData) =>
  client.post<Institution>('/institutions', data);

export const updateInstitution = (id: number, data: UpdateInstitutionData) =>
  client.put<Institution>(`/institutions/${id}`, data);

export const deleteInstitution = (id: number) =>
  client.delete(`/institutions/${id}`);
