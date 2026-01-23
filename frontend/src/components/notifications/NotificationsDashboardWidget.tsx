import { Link } from 'react-router-dom';
import { useNotifications, useMarkNotificationRead } from '../../hooks/useNotifications';
import { formatDistanceToNow } from '../../utils/dateUtils';
import type { Notification, NotificationType } from '../../types';

const notificationIcons: Record<NotificationType, string> = {
  join_request: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  join_request_approved: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  join_request_denied: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
  project_update: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15',
  task_assigned: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
  task_updated: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z',
  task_completed: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
  member_added: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
  member_removed: 'M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6',
  deadline_reminder: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
  meeting_reminder: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
};

const notificationColors: Record<NotificationType, string> = {
  join_request: 'text-blue-600',
  join_request_approved: 'text-green-600',
  join_request_denied: 'text-red-600',
  project_update: 'text-purple-600',
  task_assigned: 'text-blue-600',
  task_updated: 'text-blue-600',
  task_completed: 'text-green-600',
  member_added: 'text-green-600',
  member_removed: 'text-gray-600',
  deadline_reminder: 'text-orange-600',
  meeting_reminder: 'text-blue-600',
};

function NotificationIcon({ type }: { type: NotificationType }) {
  const path = notificationIcons[type] || notificationIcons.task_assigned;
  const colorClass = notificationColors[type] || 'text-gray-600';

  return (
    <svg className={`w-5 h-5 ${colorClass}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path} />
    </svg>
  );
}

export default function NotificationsDashboardWidget() {
  const { data: notificationsData, isLoading } = useNotifications({ is_read: false, limit: 5 });
  const markReadMutation = useMarkNotificationRead();

  const notifications = notificationsData?.notifications || [];

  const getNotificationLink = (notification: Notification): string | null => {
    if (notification.task_id) return `/tasks`;
    if (notification.project_id) return `/projects/${notification.project_id}`;
    return null;
  };

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 h-full">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <span className="text-xs text-gray-500">Recent Notifications</span>
          </div>
        </div>
        <div className="flex items-center justify-center py-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow px-3 py-2 h-full">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="text-xs text-gray-500">Recent Notifications</span>
        </div>
        <Link
          to="/notifications"
          className="text-xs text-blue-600 hover:text-blue-800"
        >
          View all
        </Link>
      </div>

      {notifications.length === 0 ? (
        <p className="text-gray-400 text-xs py-1">No unread notifications</p>
      ) : (
        <div className="space-y-1">
          {notifications.slice(0, 3).map((notification) => {
            const link = getNotificationLink(notification);
            const content = (
              <div className="flex gap-2 py-1 px-1.5 rounded bg-blue-50/50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0">
                  <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">
                    {notification.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {formatDistanceToNow(notification.created_at)}
                  </p>
                </div>
              </div>
            );

            if (link) {
              return (
                <Link
                  key={notification.id}
                  to={link}
                  onClick={() => handleNotificationClick(notification)}
                  className="block"
                >
                  {content}
                </Link>
              );
            }

            return (
              <div
                key={notification.id}
                onClick={() => handleNotificationClick(notification)}
                className="cursor-pointer"
              >
                {content}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
