import { useState, useEffect } from 'react';
import { useEmailSettings, useUpdateEmailSettings, useTestEmail } from '../../hooks/useAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import PlanGate from '../../components/PlanGate';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

function SetupGuide({ onApplyPreset }: { onApplyPreset: (host: string, port: number) => void }) {
  const [open, setOpen] = useState<'gmail' | 'outlook' | null>(null);

  return (
    <Card title="Setup Guide">
      <p className="text-sm text-gray-600 mb-4">
        To send email notifications (approvals, task assignments, reminders), connect an SMTP email account.
        Choose your email provider below for step-by-step instructions.
      </p>

      {/* Gmail */}
      <div className="border rounded-lg mb-3">
        <button
          type="button"
          onClick={() => setOpen(open === 'gmail' ? null : 'gmail')}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">Gmail / Google Workspace</span>
          <span className="text-gray-400 text-lg">{open === 'gmail' ? '\u2212' : '+'}</span>
        </button>
        {open === 'gmail' && (
          <div className="px-4 pb-4 text-sm text-gray-700 space-y-3 border-t">
            <p className="mt-3 font-medium text-gray-900">Step 1: Enable 2-Step Verification</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">myaccount.google.com/security</a></li>
              <li>Under "How you sign in to Google", click <strong>2-Step Verification</strong></li>
              <li>Follow the prompts to enable it (you'll need your phone)</li>
            </ol>

            <p className="font-medium text-gray-900">Step 2: Create an App Password</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">myaccount.google.com/apppasswords</a></li>
              <li>In the "App name" field, type <strong>EduResearch</strong> and click <strong>Create</strong></li>
              <li>Google will show a 16-character password (e.g. <code className="bg-gray-100 px-1 rounded">abcd efgh ijkl mnop</code>)</li>
              <li><strong>Copy this password</strong> — you won't be able to see it again</li>
            </ol>

            <p className="font-medium text-gray-900">Step 3: Enter settings below</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 font-mono text-xs">
              <div><span className="text-gray-500">SMTP Host:</span> smtp.gmail.com</div>
              <div><span className="text-gray-500">SMTP Port:</span> 587</div>
              <div><span className="text-gray-500">SMTP Username:</span> your-email@gmail.com</div>
              <div><span className="text-gray-500">SMTP Password:</span> (the 16-character app password)</div>
              <div><span className="text-gray-500">From Email:</span> your-email@gmail.com</div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <strong>Important:</strong> Use the App Password, not your regular Gmail password.
              Your regular password will not work and will be rejected by Google.
            </div>

            <button
              type="button"
              onClick={() => onApplyPreset('smtp.gmail.com', 587)}
              className="text-blue-600 text-xs font-medium hover:underline"
            >
              Apply Gmail settings automatically
            </button>
          </div>
        )}
      </div>

      {/* Outlook / Microsoft 365 */}
      <div className="border rounded-lg">
        <button
          type="button"
          onClick={() => setOpen(open === 'outlook' ? null : 'outlook')}
          className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-50 transition-colors"
        >
          <span className="font-medium text-gray-900">Outlook / Microsoft 365</span>
          <span className="text-gray-400 text-lg">{open === 'outlook' ? '\u2212' : '+'}</span>
        </button>
        {open === 'outlook' && (
          <div className="px-4 pb-4 text-sm text-gray-700 space-y-3 border-t">
            <p className="mt-3 font-medium text-gray-900">Option A: Personal Outlook.com account</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Go to <a href="https://account.microsoft.com/security" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">account.microsoft.com/security</a></li>
              <li>Enable <strong>Two-step verification</strong> if not already enabled</li>
              <li>Go to <a href="https://account.live.com/proofs/AppPassword" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">App passwords</a></li>
              <li>Click <strong>Create a new app password</strong></li>
              <li><strong>Copy the generated password</strong></li>
            </ol>

            <p className="font-medium text-gray-900">Option B: Microsoft 365 / Work account</p>
            <ol className="list-decimal ml-5 space-y-1">
              <li>Ask your IT admin to ensure <strong>SMTP AUTH</strong> is enabled for your mailbox</li>
              <li>In Microsoft 365 Admin Center: Users &gt; Active Users &gt; select user &gt; Mail &gt; <strong>Manage email apps</strong></li>
              <li>Ensure <strong>Authenticated SMTP</strong> is checked</li>
              <li>If your org uses MFA, you'll need an App Password (Security info &gt; Add method &gt; App password)</li>
            </ol>

            <p className="font-medium text-gray-900">Enter these settings below</p>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1 font-mono text-xs">
              <div><span className="text-gray-500">SMTP Host:</span> smtp.office365.com</div>
              <div><span className="text-gray-500">SMTP Port:</span> 587</div>
              <div><span className="text-gray-500">SMTP Username:</span> your-email@outlook.com</div>
              <div><span className="text-gray-500">SMTP Password:</span> (your password or app password)</div>
              <div><span className="text-gray-500">From Email:</span> your-email@outlook.com</div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              <strong>Important:</strong> The "From Email" must match your SMTP Username.
              Microsoft rejects emails sent from a different address than the authenticated account.
            </div>

            <button
              type="button"
              onClick={() => onApplyPreset('smtp.office365.com', 587)}
              className="text-blue-600 text-xs font-medium hover:underline"
            >
              Apply Outlook settings automatically
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}

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

  const applyPreset = (host: string, port: number) => {
    setForm(f => ({ ...f, smtp_host: host, smtp_port: port }));
    setMessage({ type: 'success', text: `Applied ${host} settings. Fill in your username and password, then save.` });
  };

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <PlanGate requiredPlan="starter" featureName="Custom Email Settings">
      <div className="max-w-2xl space-y-6">
        {message && <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

        <SetupGuide onApplyPreset={applyPreset} />

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
          <p className="text-sm text-gray-600 mb-3">
            After saving your settings, send a test email to verify everything works.
          </p>
          <div className="flex gap-4 items-end">
            <div className="flex-1"><Input label="Recipient Email" type="email" value={testTo} onChange={setTestTo} placeholder="test@example.com" /></div>
            <Button onClick={handleTest} loading={testEmail.isPending}>Send Test</Button>
          </div>
        </Card>
      </div>
    </PlanGate>
  );
}
