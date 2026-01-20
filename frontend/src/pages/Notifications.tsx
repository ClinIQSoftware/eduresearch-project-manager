import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  useDeleteNotification,
} from '../hooks/useNotifications';
import { formatDistanceToNow } from '../utils/dateUtils';
import type { Notification, NotificationCategory } from '../types';

const categoryLabels: Record<NotificationCategory, string> = {
  tasks: 'Tasks',
  membership: 'Membership',
  projects: 'Projects',
};

const typeToCategory: Record<string, NotificationCategory> = {
  task_assigned: 'tasks',
  task_due_soon: 'tasks',
  task_completed: 'tasks',
  join_approved: 'membership',
  join_rejected: 'membership',
  added_to_project: 'membership',
  removed_from_project: 'membership',
  project_status_changed: 'projects',
  file_uploaded: 'projects',
  deadline_approaching: 'projects',
  meeting_approaching: 'projects',
};

export default function NotificationsPage() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [categoryFilter, setCategoryFilter] = useState<NotificationCategory | 'all'>('all');

  const { data, isLoading } = useNotifications({
    is_read: filter === 'all' ? undefined : filter === 'read',
    limit: 100,
  });

  const markReadMutation = useMarkNotificationRead();
  const markAllReadMutation = useMarkAllNotificationsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = data?.notifications || [];
  const unreadCount = data?.unread_count || 0;

  // Filter by category
  const filteredNotifications = categoryFilter === 'all'
    ? notifications
    : notifications.filter((n) => typeToCategory[n.type] === categoryFilter);

  function getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      task_assigned: '📋',
      task_due_soon: '⏰',
      task_completed: '✅',
      join_approved: '✓',
      join_rejected: '✗',
      added_to_project: '➕',
      removed_from_project: '➖',
      project_status_changed: '🔄',
      file_uploaded: '📎',
      deadline_approaching: '📅',
      meeting_approaching: '📆',
    };
    return icons[type] || '🔔';
  }

  function handleNotificationClick(notification: Notification) {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }

    if (notification.task_id) {
      navigate('/tasks');
    } else if (notification.project_id) {
      navigate(`/projects/${notification.project_id}`);
    }
  }

  function handleDelete(e: React.MouseEvent, id: number) {
    e.stopPropagation();
    deleteMutation.mutate(id);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-600">
            {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        {/* Read status filter */}
        <div className="flex rounded-lg border border-gray-200 overflow-hidden">
          {(['all', 'unread', 'read'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Category filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as NotificationCategory | 'all')}
          className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Categories</option>
          {Object.entries(categoryLabels).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No notifications</h3>
          <p className="text-gray-500">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications to show'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredNotifications.map((notification) => (
              <li key={notification.id}>
                <button
                  onClick={() => handleNotificationClick(notification)}
                  className={`w-full text-left px-6 py-4 hover:bg-gray-50 transition-colors ${
                    !notification.is_read ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex gap-4">
                    <span className="text-2xl flex-shrink-0">
                      {getNotificationIcon(notification.type)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-sm text-gray-500 mt-1">
                              {notification.message}
                            </p>
                          )}
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-gray-400">
                              {formatDistanceToNow(notification.created_at)}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                              {categoryLabels[typeToCategory[notification.type]]}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!notification.is_read && (
                            <span className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                          <button
                            onClick={(e) => handleDelete(e, notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete notification"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
