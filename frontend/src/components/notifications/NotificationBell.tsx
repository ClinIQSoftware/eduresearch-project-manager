import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useNotifications, useUnreadNotificationCount, useMarkNotificationRead } from '../../hooks/useNotifications';
import { formatDistanceToNow } from '../../utils/dateUtils';
import type { Notification } from '../../types';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notificationsData } = useNotifications({ limit: 5 });
  const markReadMutation = useMarkNotificationRead();

  const notifications = notificationsData?.notifications || [];

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Handle notification click
  function handleNotificationClick(notification: Notification) {
    // Mark as read
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }

    // Navigate to related item
    if (notification.task_id) {
      navigate(`/tasks`);
    } else if (notification.project_id) {
      navigate(`/projects/${notification.project_id}`);
    }

    setIsOpen(false);
  }

  // Get icon for notification type
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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold text-white bg-red-500 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown - positioned to the left to avoid clipping in sidebar */}
      {isOpen && (
        <div className="absolute left-0 mt-2 w-80 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-xs text-gray-500">{unreadCount} unread</span>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                <p className="text-sm">No notifications yet</p>
              </div>
            ) : (
              <ul>
                {notifications.map((notification) => (
                  <li key={notification.id}>
                    <button
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0 ${
                        !notification.is_read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <span className="text-lg flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notification.is_read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </p>
                          {notification.message && (
                            <p className="text-xs text-gray-500 truncate mt-0.5">
                              {notification.message}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(notification.created_at)}
                          </p>
                        </div>
                        {!notification.is_read && (
                          <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2" />
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
            <Link
              to="/notifications"
              onClick={() => setIsOpen(false)}
              className="block text-center text-sm font-medium text-blue-600 hover:text-blue-800"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
