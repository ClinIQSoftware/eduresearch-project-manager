import { useState } from 'react';
import { useEmailTemplates, useUpdateEmailTemplate, useTestTemplateEmail } from '../../hooks/useAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import PlanGate from '../../components/PlanGate';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Checkbox } from '../../components/ui/Checkbox';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { RichTextEditor } from '../../components/ui/RichTextEditor';
import type { EmailTemplate } from '../../types';

const TEMPLATE_TYPE_LABELS: Record<string, string> = {
  welcome: 'Welcome Email',
  user_approval_request: 'User Approval Request',
  approval_request: 'Approval Request',
  approval_notification: 'Approval Notification',
  join_request: 'Join Request',
  join_response: 'Join Response',
  task_assigned: 'Task Assigned',
  task_assignment: 'Task Assignment',
  project_update: 'Project Update',
  reminder: 'Reminder (Meetings & Deadlines)',
};

function formatTemplateType(type: string): string {
  return TEMPLATE_TYPE_LABELS[type] || type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

export default function EmailTemplatesTab() {
  const { data: templates = [], isLoading } = useEmailTemplates();
  const updateTemplate = useUpdateEmailTemplate();
  const testEmail = useTestTemplateEmail();

  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [form, setForm] = useState({ subject: '', body: '', is_active: true });
  const [testTo, setTestTo] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setForm({
      subject: template.subject,
      body: template.body,
      is_active: template.is_active,
    });
    setTestTo('');
  };

  const handleSave = async () => {
    if (!editingTemplate) return;
    try {
      await updateTemplate.mutateAsync({
        templateType: editingTemplate.template_type,
        data: form,
      });
      setEditingTemplate(null);
      setMessage({ type: 'success', text: 'Template updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleTestEmail = async () => {
    if (!editingTemplate || !testTo) {
      setMessage({ type: 'error', text: 'Enter a recipient email address' });
      return;
    }
    try {
      await testEmail.mutateAsync({
        templateType: editingTemplate.template_type,
        recipientEmail: testTo,
      });
      setMessage({ type: 'success', text: `Test email sent to ${testTo}` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const columns: TableColumn<EmailTemplate>[] = [
    {
      key: 'template_type',
      header: 'Template',
      render: t => <span className="font-medium">{formatTemplateType(t.template_type)}</span>,
    },
    {
      key: 'subject',
      header: 'Subject',
      render: t => <span className="text-gray-600 truncate max-w-xs block">{t.subject}</span>,
    },
    {
      key: 'is_active',
      header: 'Status',
      render: t => (
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
          {t.is_active ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'updated_at',
      header: 'Last Updated',
      render: t => t.updated_at ? new Date(t.updated_at).toLocaleDateString() : '-',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: t => (
        <button onClick={() => handleEdit(t)} className="text-blue-600 hover:underline text-sm">
          Edit
        </button>
      ),
    },
  ];

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <PlanGate requiredPlan="starter" featureName="Email Templates">
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <p className="text-sm text-gray-500">Email Templates</p>
        <p className="text-2xl font-bold">{templates.length}</p>
      </Card>

      <Card>
        <Table
          columns={columns}
          data={templates}
          emptyMessage="No email templates configured."
        />
      </Card>

      <Modal
        isOpen={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={`Edit Template: ${editingTemplate ? formatTemplateType(editingTemplate.template_type) : ''}`}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Subject"
            value={form.subject}
            onChange={v => setForm({ ...form, subject: v })}
            placeholder="Email subject line"
          />

          <RichTextEditor
            label="Body"
            value={form.body}
            onChange={v => setForm({ ...form, body: v })}
            placeholder="Email body content with {{variable}} placeholders"
          />

          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-xs font-medium text-gray-600 mb-2">Available Variables:</p>
            <p className="text-xs text-gray-500">
              {'{{user_name}}, {{user_email}}, {{project_name}}, {{task_title}}, {{institution_name}}, {{department_name}}, {{message}}, {{approval_link}}, {{project_link}}, {{task_link}}, {{reminder_type}}, {{item_name}}, {{item_label}}, {{date}}, {{description}}'}
            </p>
          </div>

          <Checkbox
            label="Template is active"
            checked={form.is_active}
            onChange={v => setForm({ ...form, is_active: v })}
          />

          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Send Test Email</p>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  value={testTo}
                  onChange={setTestTo}
                  placeholder="recipient@example.com"
                  type="email"
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleTestEmail}
                loading={testEmail.isPending}
              >
                Send Test
              </Button>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="secondary" onClick={() => setEditingTemplate(null)}>
              Cancel
            </Button>
            <Button onClick={handleSave} loading={updateTemplate.isPending}>
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>
    </div>
    </PlanGate>
  );
}
