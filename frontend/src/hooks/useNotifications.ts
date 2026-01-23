import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getNotifications,
  getUnreadCount,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../services/api';

// Query keys
export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: { is_read?: boolean; notification_type?: string }) =>
    [...notificationKeys.all, 'list', params] as const,
  unreadCount: ['notifications', 'unread-count'] as const,
  preferences: ['notifications', 'preferences'] as const,
};

// Fetch notifications
export function useNotifications(params?: {
  is_read?: boolean;
  notification_type?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const { data } = await getNotifications(params);
      return data;
    },
  });
}

// Fetch unread count (polls every 30 seconds)
export function useUnreadNotificationCount(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: notificationKeys.unreadCount,
    queryFn: async () => {
      const { data } = await getUnreadCount();
      return data.count;
    },
    refetchInterval: 30000, // Poll every 30 seconds
    enabled: options?.enabled ?? true,
  });
}

// Mark single notification as read
export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const { data } = await markNotificationRead(notificationId);
      return data;
    },
    onSuccess: () => {
      // Invalidate notifications and unread count
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

// Mark all notifications as read
export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data } = await markAllNotificationsRead();
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

// Delete notification
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: number) => {
      const { data } = await deleteNotification(notificationId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCount });
    },
  });
}

// Fetch notification preferences
export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences,
    queryFn: async () => {
      const { data } = await getNotificationPreferences();
      return data.preferences;
    },
  });
}

// Update notification preferences
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      preferences: {
        notification_type: string;
        in_app_enabled: boolean;
        email_enabled: boolean;
      }[]
    ) => {
      const { data } = await updateNotificationPreferences(preferences);
      return data.preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.preferences });
    },
  });
}

