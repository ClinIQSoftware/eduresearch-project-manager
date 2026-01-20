import { useState, useEffect } from 'react';
import { useEmailSettings, useUpdateEmailSettings, useTestEmail } from '../../hooks/useAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function EmailTab() {
  const { data: settings, isLoading } = useEmailSettings();
  const updateSettings = useUpdateEmailSettings();
  const testEmail = useTestEmail();

  const [form, setForm] = useState({ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '', is_active: false });
  const [testTo, setTestTo] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (settings) setForm({ smtp_host: settings.smtp_host || '', smtp_port: settings.smtp_port || 587, smtp_user: settings.smtp_user || '', smtp_password: '', from_email: settings.from_email || '', from_name: settings.from_name || '', is_active: settings.is_active });
  }, [settings]);

  const handleSave = async () => {
    try {
      const data: any = { ...form, smtp_user: form.smtp_user || null, from_email: form.from_email || null };
      if (!form.smtp_password) delete data.smtp_password;
      await updateSettings.mutateAsync({ data });
      setForm(f => ({ ...f, smtp_password: '' }));
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleTest = async () => {
    if (!testTo) return setMessage({ type: 'error', text: 'Enter a test email address' });
    try {
      await testEmail.mutateAsync({ to: testTo });
      setMessage({ type: 'success', text: `Test email sent to ${testTo}` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      {message && <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

      <Card title="SMTP Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="SMTP Host" value={form.smtp_host} onChange={v => setForm({ ...form, smtp_host: v })} placeholder="smtp.gmail.com" />
          <Input label="SMTP Port" type="number" value={String(form.smtp_port)} onChange={v => setForm({ ...form, smtp_port: parseInt(v) || 587 })} />
          <Input label="SMTP Username" value={form.smtp_user} onChange={v => setForm({ ...form, smtp_user: v })} placeholder="your-email@gmail.com" />
          <Input label="SMTP Password" type="password" value={form.smtp_password} onChange={v => setForm({ ...form, smtp_password: v })} placeholder="Leave blank to keep existing" />
          <Input label="From Email" type="email" value={form.from_email} onChange={v => setForm({ ...form, from_email: v })} placeholder="noreply@domain.com" />
          <Input label="From Name" value={form.from_name} onChange={v => setForm({ ...form, from_name: v })} placeholder="EduResearch Project Manager" />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Checkbox
            label="Enable email notifications"
            checked={form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })}
          />
          <Button onClick={handleSave} loading={updateSettings.isPending}>Save Settings</Button>
        </div>
      </Card>

      <Card title="Test Email">
        <div className="flex gap-4 items-end">
          <div className="flex-1"><Input label="Recipient Email" type="email" value={testTo} onChange={setTestTo} placeholder="test@example.com" /></div>
          <Button onClick={handleTest} loading={testEmail.isPending}>Send Test</Button>
        </div>
      </Card>
    </div>
  );
}
