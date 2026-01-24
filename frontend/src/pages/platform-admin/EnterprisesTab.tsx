import { useState } from 'react';
import {
  useEnterprises,
  useCreateEnterprise,
  useUpdateEnterprise,
} from '../../hooks/usePlatformAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { EnterpriseListItem } from '../../types';

type EnterpriseFormData = { slug: string; name: string };
const emptyForm: EnterpriseFormData = { slug: '', name: '' };

export default function EnterprisesTab() {
  const { data: enterprises = [], isLoading } = useEnterprises();
  const createEnterprise = useCreateEnterprise();
  const updateEnterprise = useUpdateEnterprise();

  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<EnterpriseFormData>(emptyForm);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'activate' | 'deactivate'; enterprise: EnterpriseListItem } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEnterprise.mutateAsync(formData);
      setMessage({ type: 'success', text: 'Enterprise created successfully' });
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const closeModal = () => {
    setShowForm(false);
    setFormData(emptyForm);
  };

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    const { type, enterprise } = confirmDialog;
    try {
      await updateEnterprise.mutateAsync({
        id: enterprise.id,
        data: { is_active: type === 'activate' },
      });
      setMessage({
        type: 'success',
        text: `Enterprise ${type === 'activate' ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
    setConfirmDialog(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const columns: TableColumn<EnterpriseListItem>[] = [
    {
      key: 'name',
      header: 'Enterprise',
      render: (e) => (
        <div>
          <p className="font-medium text-sm">{e.name}</p>
          <p className="text-xs text-gray-500">{e.slug}</p>
        </div>
      ),
    },
    {
      key: 'subdomain',
      header: 'URL',
      render: (e) =>
        e.subdomain_url ? (
          <a
            href={e.subdomain_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800 hover:underline"
          >
            {e.subdomain_url}
          </a>
        ) : (
          <span className="text-gray-400 text-sm">-</span>
        ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (e) => (
        <div className="text-xs text-gray-500">
          <span>{e.user_count} users</span>
          <span className="mx-1">|</span>
          <span>{e.project_count} projects</span>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => (
        <Badge variant={e.is_active ? 'success' : 'error'}>
          {e.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      key: 'created',
      header: 'Created',
      render: (e) => <span className="text-xs text-gray-500">{formatDate(e.created_at)}</span>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (e) => (
        <div className="flex gap-2 text-xs">
          <button
            onClick={() =>
              setConfirmDialog({
                type: e.is_active ? 'deactivate' : 'activate',
                enterprise: e,
              })
            }
            className={e.is_active ? 'text-orange-600 hover:underline' : 'text-green-600 hover:underline'}
          >
            {e.is_active ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ Create Enterprise</Button>
      </div>

      <Card>
        <Table columns={columns} data={enterprises} emptyMessage="No enterprises found" />
      </Card>

      <Modal isOpen={showForm} onClose={closeModal} title="Create Enterprise">
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-500">
            Create a new enterprise tenant. The slug will be used for the subdomain URL.
          </p>
          <Input
            label="Slug"
            required
            value={formData.slug}
            onChange={(v) => setFormData({ ...formData, slug: v })}
            placeholder="e.g., acme-corp"
          />
          <p className="text-xs text-gray-400 -mt-2">
            Lowercase letters, numbers, and hyphens only. Used for subdomain URL.
          </p>
          <Input
            label="Name"
            required
            value={formData.name}
            onChange={(v) => setFormData({ ...formData, name: v })}
            placeholder="e.g., Acme Corporation"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>
              Cancel
            </Button>
            <Button type="submit" loading={createEnterprise.isPending}>
              Create
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!confirmDialog}
        onCancel={() => setConfirmDialog(null)}
        onConfirm={handleConfirm}
        title={confirmDialog?.type === 'activate' ? 'Activate Enterprise' : 'Deactivate Enterprise'}
        message={
          confirmDialog?.type === 'activate'
            ? `Activate ${confirmDialog.enterprise.name}? Users will be able to access the platform.`
            : `Deactivate ${confirmDialog?.enterprise.name}? Users will not be able to access the platform until reactivated.`
        }
        variant={confirmDialog?.type === 'deactivate' ? 'danger' : 'primary'}
        confirmText={confirmDialog?.type === 'activate' ? 'Activate' : 'Deactivate'}
      />
    </div>
  );
}
