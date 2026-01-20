import { useState } from 'react';
import {
  useNotificationTypes,
  useNotificationPreferences,
  useUpdateNotificationPreferences,
  useResetNotificationPreferences,
} from '../../hooks/useNotifications';
import type { NotificationTypeInfo, NotificationCategory } from '../../types';

const categoryLabels: Record<NotificationCategory, string> = {
  tasks: 'Task Notifications',
  membership: 'Membership Notifications',
  projects: 'Project Notifications',
};

export default function NotificationPreferences() {
  const { data: types, isLoading: typesLoading } = useNotificationTypes();
  const { data: preferences, isLoading: prefsLoading } = useNotificationPreferences();
  const updateMutation = useUpdateNotificationPreferences();
  const resetMutation = useResetNotificationPreferences();
  const [pendingChanges, setPendingChanges] = useState<Map<string, { in_app: boolean; email: boolean }>>(new Map());

  const isLoading = typesLoading || prefsLoading;

  // Group types by category
  const typesByCategory = (types || []).reduce((acc, type) => {
    if (!acc[type.category]) {
      acc[type.category] = [];
    }
    acc[type.category].push(type);
    return acc;
  }, {} as Record<NotificationCategory, NotificationTypeInfo[]>);

  // Get current preference value (pending change or saved preference or default)
  function getPreference(type: string, field: 'in_app' | 'email'): boolean {
    // Check pending changes first
    const pending = pendingChanges.get(type);
    if (pending) {
      return field === 'in_app' ? pending.in_app : pending.email;
    }

    // Check saved preferences
    const pref = preferences?.find((p) => p.notification_type === type);
    if (pref) {
      return field === 'in_app' ? pref.in_app_enabled : pref.email_enabled;
    }

    // Return default from type info
    const typeInfo = types?.find((t) => t.type === type);
    if (typeInfo) {
      return field === 'in_app' ? typeInfo.default_in_app : typeInfo.default_email;
    }

    return true;
  }

  function handleToggle(type: string, field: 'in_app' | 'email') {
    const currentInApp = getPreference(type, 'in_app');
    const currentEmail = getPreference(type, 'email');

    setPendingChanges((prev) => {
      const newMap = new Map(prev);
      newMap.set(type, {
        in_app: field === 'in_app' ? !currentInApp : currentInApp,
        email: field === 'email' ? !currentEmail : currentEmail,
      });
      return newMap;
    });
  }

  async function handleSave() {
    if (pendingChanges.size === 0) return;

    const updates = Array.from(pendingChanges.entries()).map(([type, prefs]) => ({
      notification_type: type,
      in_app_enabled: prefs.in_app,
      email_enabled: prefs.email,
    }));

    await updateMutation.mutateAsync(updates);
    setPendingChanges(new Map());
  }

  async function handleReset() {
    await resetMutation.mutateAsync();
    setPendingChanges(new Map());
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
        <div className="flex gap-2">
          {pendingChanges.size > 0 && (
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          )}
          <button
            onClick={handleReset}
            disabled={resetMutation.isPending}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      {/* Table Header */}
      <div className="grid grid-cols-[1fr,80px,80px] gap-4 px-4 py-2 bg-gray-50 rounded-t-lg border border-b-0 border-gray-200 text-sm font-medium text-gray-600">
        <div>Notification Type</div>
        <div className="text-center">In-App</div>
        <div className="text-center">Email</div>
      </div>

      {/* Categories and Types */}
      <div className="border border-gray-200 rounded-b-lg divide-y divide-gray-200">
        {(['tasks', 'membership', 'projects'] as NotificationCategory[]).map((category) => (
          <div key={category}>
            {/* Category Header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">{categoryLabels[category]}</h3>
            </div>

            {/* Types in Category */}
            {typesByCategory[category]?.map((type) => (
              <div
                key={type.type}
                className="grid grid-cols-[1fr,80px,80px] gap-4 px-4 py-3 hover:bg-gray-50 items-center"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{type.label}</p>
                  <p className="text-xs text-gray-500">{type.description}</p>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleToggle(type.type, 'in_app')}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      getPreference(type.type, 'in_app') ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-label={`${type.label} in-app notifications`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        getPreference(type.type, 'in_app') ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex justify-center">
                  <button
                    onClick={() => handleToggle(type.type, 'email')}
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      getPreference(type.type, 'email') ? 'bg-blue-600' : 'bg-gray-300'
                    }`}
                    aria-label={`${type.label} email notifications`}
                  >
                    <span
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        getPreference(type.type, 'email') ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {pendingChanges.size > 0 && (
        <p className="text-sm text-amber-600 mt-4">You have unsaved changes</p>
      )}
    </div>
  );
}
