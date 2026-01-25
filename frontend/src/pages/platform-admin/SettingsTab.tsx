import { useState, useEffect } from 'react';
import {
  usePlatformAdminProfile,
  useUpdatePlatformAdminCredentials,
  usePlatformEmailSettings,
  useUpdatePlatformEmailSettings,
  usePlatformTestEmail,
} from '../../hooks/usePlatformAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function SettingsTab() {
  const { data: profile, isLoading: profileLoading } = usePlatformAdminProfile();
  const updateCredentials = useUpdatePlatformAdminCredentials();
  const { data: settings, isLoading } = usePlatformEmailSettings();
  const updateSettings = useUpdatePlatformEmailSettings();
  const testEmail = usePlatformTestEmail();

  const [credentialsForm, setCredentialsForm] = useState({
    current_password: '',
    new_email: '',
    new_password: '',
    new_password_confirm: '',
    new_name: '',
  });
  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    is_active: false,
  });
  const [testTo, setTestTo] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (profile) {
      setCredentialsForm((f) => ({
        ...f,
        new_email: profile.email,
        new_name: profile.name,
      }));
    }
  }, [profile]);

  useEffect(() => {
    if (settings) {
      setForm({
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || '',
        smtp_password: '',
        from_email: settings.from_email || '',
        from_name: settings.from_name || '',
        is_active: settings.is_active,
      });
    }
  }, [settings]);

  const handleUpdateCredentials = async () => {
    if (!credentialsForm.current_password) {
      return setMessage({ type: 'error', text: 'Current password is required' });
    }
    if (
      credentialsForm.new_password &&
      credentialsForm.new_password !== credentialsForm.new_password_confirm
    ) {
      return setMessage({ type: 'error', text: 'New passwords do not match' });
    }
    if (credentialsForm.new_password && credentialsForm.new_password.length < 8) {
      return setMessage({ type: 'error', text: 'New password must be at least 8 characters' });
    }

    try {
      const data: { current_password: string; new_email?: string; new_password?: string; new_name?: string } = {
        current_password: credentialsForm.current_password,
      };
      if (credentialsForm.new_email && credentialsForm.new_email !== profile?.email) {
        data.new_email = credentialsForm.new_email;
      }
      if (credentialsForm.new_password) {
        data.new_password = credentialsForm.new_password;
      }
      if (credentialsForm.new_name && credentialsForm.new_name !== profile?.name) {
        data.new_name = credentialsForm.new_name;
      }

      await updateCredentials.mutateAsync(data);
      setCredentialsForm((f) => ({
        ...f,
        current_password: '',
        new_password: '',
        new_password_confirm: '',
      }));
      setMessage({ type: 'success', text: 'Credentials updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleSave = async () => {
    try {
      const data: Record<string, unknown> = {
        ...form,
        smtp_user: form.smtp_user || null,
        from_email: form.from_email || null,
      };
      if (!form.smtp_password) delete data.smtp_password;
      await updateSettings.mutateAsync(data);
      setForm((f) => ({ ...f, smtp_password: '' }));
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleTest = async () => {
    if (!testTo) {
      return setMessage({ type: 'error', text: 'Enter a test email address' });
    }
    try {
      await testEmail.mutateAsync(testTo);
      setMessage({ type: 'success', text: `Test email sent to ${testTo}` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  if (isLoading || profileLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Admin Credentials Section */}
      <Card title="Admin Credentials">
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              value={credentialsForm.new_email}
              onChange={(v) => setCredentialsForm({ ...credentialsForm, new_email: v })}
            />
            <Input
              label="Name"
              value={credentialsForm.new_name}
              onChange={(v) => setCredentialsForm({ ...credentialsForm, new_name: v })}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="New Password"
              type="password"
              value={credentialsForm.new_password}
              onChange={(v) => setCredentialsForm({ ...credentialsForm, new_password: v })}
              placeholder="Leave blank to keep current"
            />
            <Input
              label="Confirm New Password"
              type="password"
              value={credentialsForm.new_password_confirm}
              onChange={(v) =>
                setCredentialsForm({ ...credentialsForm, new_password_confirm: v })
              }
              placeholder="Leave blank to keep current"
            />
          </div>
          <div className="border-t pt-4">
            <div className="flex items-end gap-4">
              <div className="flex-1">
                <Input
                  label="Current Password (required to save changes)"
                  type="password"
                  value={credentialsForm.current_password}
                  onChange={(v) =>
                    setCredentialsForm({ ...credentialsForm, current_password: v })
                  }
                  placeholder="Enter your current password"
                />
              </div>
              <Button onClick={handleUpdateCredentials} loading={updateCredentials.isPending}>
                Update Credentials
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800">Platform Default Settings</h3>
        <p className="text-sm text-blue-600 mt-1">
          These settings are inherited by all enterprises that don't have their own
          email configuration.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-600'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card title="SMTP Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SMTP Host"
            value={form.smtp_host}
            onChange={(v) => setForm({ ...form, smtp_host: v })}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="SMTP Port"
            type="number"
            value={String(form.smtp_port)}
            onChange={(v) => setForm({ ...form, smtp_port: parseInt(v) || 587 })}
          />
          <Input
            label="SMTP Username"
            value={form.smtp_user}
            onChange={(v) => setForm({ ...form, smtp_user: v })}
            placeholder="your-email@gmail.com"
          />
          <Input
            label="SMTP Password"
            type="password"
            value={form.smtp_password}
            onChange={(v) => setForm({ ...form, smtp_password: v })}
            placeholder="Leave blank to keep existing"
          />
          <Input
            label="From Email"
            type="email"
            value={form.from_email}
            onChange={(v) => setForm({ ...form, from_email: v })}
            placeholder="noreply@domain.com"
          />
          <Input
            label="From Name"
            value={form.from_name}
            onChange={(v) => setForm({ ...form, from_name: v })}
            placeholder="EduResearch Project Manager"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Checkbox
            label="Enable email notifications"
            checked={form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })}
          />
          <Button onClick={handleSave} loading={updateSettings.isPending}>
            Save Settings
          </Button>
        </div>
      </Card>

      <Card title="Test Email">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Recipient Email"
              type="email"
              value={testTo}
              onChange={setTestTo}
              placeholder="test@example.com"
            />
          </div>
          <Button onClick={handleTest} loading={testEmail.isPending}>
            Send Test
          </Button>
        </div>
      </Card>
    </div>
  );
}
