import { useState, useEffect } from 'react';
import {
  useNotificationPreferences,
  useUpdateNotificationPreferences,
} from '../../hooks/useNotifications';
import type { NotificationType } from '../../types';

// Notification type metadata
const notificationTypeInfo: Record<NotificationType, { label: string; description: string }> = {
  join_request: {
    label: 'Join Requests',
    description: 'When someone requests to join your project',
  },
  join_request_approved: {
    label: 'Join Request Approved',
    description: 'When your join request is approved',
  },
  join_request_denied: {
    label: 'Join Request Denied',
    description: 'When your join request is denied',
  },
  project_update: {
    label: 'Project Updates',
    description: 'When a project you are part of is updated',
  },
  task_assigned: {
    label: 'Task Assigned',
    description: 'When a task is assigned to you',
  },
  task_updated: {
    label: 'Task Updated',
    description: 'When a task assigned to you is updated',
  },
  task_completed: {
    label: 'Task Completed',
    description: 'When a task is marked as completed',
  },
  member_added: {
    label: 'Member Added',
    description: 'When a new member joins your project',
  },
  member_removed: {
    label: 'Member Removed',
    description: 'When a member leaves or is removed from your project',
  },
  deadline_reminder: {
    label: 'Deadline Reminders',
    description: 'Reminders about upcoming project deadlines',
  },
  meeting_reminder: {
    label: 'Meeting Reminders',
    description: 'Reminders about upcoming project meetings',
  },
};

const allNotificationTypes: NotificationType[] = [
  'join_request',
  'join_request_approved',
  'join_request_denied',
  'project_update',
  'task_assigned',
  'task_updated',
  'task_completed',
  'member_added',
  'member_removed',
  'deadline_reminder',
  'meeting_reminder',
];

interface PreferenceState {
  in_app_enabled: boolean;
  email_enabled: boolean;
}

export default function NotificationPreferences() {
  const { data: preferences, isLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const [localPrefs, setLocalPrefs] = useState<Record<string, PreferenceState>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize local preferences from server data
  useEffect(() => {
    if (preferences) {
      const prefsMap: Record<string, PreferenceState> = {};
      preferences.forEach((pref) => {
        prefsMap[pref.notification_type] = {
          in_app_enabled: pref.in_app_enabled,
          email_enabled: pref.email_enabled,
        };
      });
      // Fill in defaults for any missing types
      allNotificationTypes.forEach((type) => {
        if (!prefsMap[type]) {
          prefsMap[type] = { in_app_enabled: true, email_enabled: true };
        }
      });
      setLocalPrefs(prefsMap);
      setHasChanges(false);
    }
  }, [preferences]);

  function handleToggle(type: NotificationType, field: 'in_app_enabled' | 'email_enabled') {
    setLocalPrefs((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: !prev[type]?.[field],
      },
    }));
    setHasChanges(true);
  }

  async function handleSave() {
    const updates = Object.entries(localPrefs).map(([type, prefs]) => ({
      notification_type: type,
      in_app_enabled: prefs.in_app_enabled,
      email_enabled: prefs.email_enabled,
    }));
    await updateMutation.mutateAsync(updates);
    setHasChanges(false);
  }

  if (isLoading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold mb-4">Notification Preferences</h2>
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold">Notification Preferences</h2>
          <p className="text-sm text-gray-500 mt-1">Choose how you want to be notified about activity</p>
        </div>
        {hasChanges && (
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </button>
        )}
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr,80px,80px] gap-4 px-4 py-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200 text-sm font-medium text-gray-600">
        <div>Notification Type</div>
        <div className="text-center">In-App</div>
        <div className="text-center">Email</div>
      </div>

      {/* Types */}
      <div className="border border-gray-200 rounded-b-lg divide-y divide-gray-200">
        {allNotificationTypes.map((type) => {
          const info = notificationTypeInfo[type];
          const pref = localPrefs[type] || { in_app_enabled: true, email_enabled: true };
          return (
            <div
              key={type}
              className="grid grid-cols-[1fr,80px,80px] gap-4 px-4 py-3 hover:bg-gray-50 items-center"
            >
              <div>
                <p className="text-sm font-medium text-gray-900">{info.label}</p>
                <p className="text-xs text-gray-500">{info.description}</p>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handleToggle(type, 'in_app_enabled')}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    pref.in_app_enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`${info.label} in-app notifications`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      pref.in_app_enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex justify-center">
                <button
                  onClick={() => handleToggle(type, 'email_enabled')}
                  className={`w-10 h-6 rounded-full transition-colors relative ${
                    pref.email_enabled ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                  aria-label={`${info.label} email notifications`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      pref.email_enabled ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {hasChanges && (
        <p className="text-sm text-amber-600 mt-4">You have unsaved changes</p>
      )}
    </div>
  );
}
