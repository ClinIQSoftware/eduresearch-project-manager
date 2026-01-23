import { useQuery } from '@tanstack/react-query';
import * as api from '../services/api';

export function useReportsOverview() {
  return useQuery({
    queryKey: ['reports', 'overview'],
    queryFn: async () => {
      const response = await api.getReportsOverview();
      return response.data;
    },
  });
}
