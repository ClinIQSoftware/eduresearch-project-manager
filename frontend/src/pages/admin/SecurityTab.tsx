import { useState, useEffect } from 'react';
import { useSystemSettings, useUpdateSystemSettings } from '../../hooks/useAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import type { SystemSettings } from '../../types';

export default function SecurityTab() {
  const { data: settings, isLoading, isError } = useSystemSettings();
  const updateSettings = useUpdateSystemSettings();
  const [form, setForm] = useState<SystemSettings | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const handleSave = async () => {
    if (!form) return;
    try {
      await updateSettings.mutateAsync(form);
      setMessage({ type: 'success', text: 'Settings saved' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  if (isError || !form) return <div className="py-8 text-center text-red-600">Failed to load settings</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {message && <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

      <Card title="Registration Approval">
        <div className="space-y-4">
          <Checkbox label="Require approval for new registrations" checked={form.require_registration_approval} onChange={v => setForm({ ...form, require_registration_approval: v })} />
          {form.require_registration_approval && (
            <div className="ml-7"><Select label="Approval Mode" value={form.registration_approval_mode} onChange={v => setForm({ ...form, registration_approval_mode: v as 'block' | 'limited' })} options={[{ value: 'block', label: 'Block login until approved' }, { value: 'limited', label: 'Allow limited access' }]} /></div>
          )}
        </div>
      </Card>

      <Card title="Password Policy">
        <div className="space-y-4">
          <Input label="Minimum Password Length" type="number" value={String(form.min_password_length)} onChange={v => setForm({ ...form, min_password_length: parseInt(v) || 8 })} min={6} max={32} />
          <div className="grid grid-cols-2 gap-4">
            <Checkbox label="Require uppercase" checked={form.require_uppercase} onChange={v => setForm({ ...form, require_uppercase: v })} />
            <Checkbox label="Require lowercase" checked={form.require_lowercase} onChange={v => setForm({ ...form, require_lowercase: v })} />
            <Checkbox label="Require numbers" checked={form.require_numbers} onChange={v => setForm({ ...form, require_numbers: v })} />
            <Checkbox label="Require special chars" checked={form.require_special_chars} onChange={v => setForm({ ...form, require_special_chars: v })} />
          </div>
        </div>
      </Card>

      <Card title="Session Settings">
        <Input label="Session Timeout (minutes)" type="number" value={String(form.session_timeout_minutes)} onChange={v => setForm({ ...form, session_timeout_minutes: parseInt(v) || 30 })} min={5} max={1440} />
      </Card>

      <Card title="OAuth Providers">
        <div className="space-y-4">
          <Checkbox label="Enable Google OAuth" checked={form.google_oauth_enabled} onChange={v => setForm({ ...form, google_oauth_enabled: v })} />
          <Checkbox label="Enable Microsoft OAuth" checked={form.microsoft_oauth_enabled} onChange={v => setForm({ ...form, microsoft_oauth_enabled: v })} />
        </div>
      </Card>

      <div className="flex justify-end"><Button onClick={handleSave} loading={updateSettings.isPending}>Save Settings</Button></div>
    </div>
  );
}
