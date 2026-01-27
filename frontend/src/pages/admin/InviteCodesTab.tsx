import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getInviteCodes, createInviteCode, deactivateInviteCode } from '../../api/inviteCodes';
import type { InviteCode, InviteCodeCreate } from '../../api/inviteCodes';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';

export default function InviteCodesTab() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<InviteCodeCreate>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<InviteCode | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const { data: codes = [], isLoading } = useQuery({
    queryKey: ['inviteCodes'],
    queryFn: () => getInviteCodes().then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: InviteCodeCreate) => createInviteCode(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteCodes'] });
      setShowForm(false);
      setFormData({});
      setMessage({ type: 'success', text: 'Invite code created' });
    },
    onError: () => {
      setMessage({ type: 'error', text: 'Failed to create invite code' });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: number) => deactivateInviteCode(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inviteCodes'] });
      setConfirmDelete(null);
      setMessage({ type: 'success', text: 'Invite code deactivated' });
    },
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    createMutation.mutate(formData);
  }

  function copyToClipboard(text: string, codeId: number) {
    navigator.clipboard.writeText(text);
    setCopiedId(codeId);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const baseUrl = window.location.origin;
  const activeCodes = codes.filter(c => c.is_active);
  const inactiveCodes = codes.filter(c => !c.is_active);

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card>
          <p className="text-xs text-gray-500">Total Codes</p>
          <p className="text-xl font-bold">{codes.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Active</p>
          <p className="text-xl font-bold text-green-600">{activeCodes.length}</p>
        </Card>
        <Card>
          <p className="text-xs text-gray-500">Total Uses</p>
          <p className="text-xl font-bold text-blue-600">{codes.reduce((sum, c) => sum + c.use_count, 0)}</p>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => setShowForm(true)}>+ Create Invite Code</Button>
      </div>

      {activeCodes.length === 0 && inactiveCodes.length === 0 && (
        <Card>
          <p className="text-center text-gray-500 py-8">
            No invite codes yet. Create one to let users join your enterprise.
          </p>
        </Card>
      )}

      {activeCodes.length > 0 && (
        <Card title="Active Invite Codes">
          <div className="space-y-3">
            {activeCodes.map(code => (
              <div key={code.id} className="border rounded-lg p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <code className="text-lg font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                        {code.code}
                      </code>
                      {code.label && (
                        <span className="text-sm text-gray-500">{code.label}</span>
                      )}
                      <Badge variant={code.is_valid ? 'success' : 'error'}>
                        {code.is_valid ? 'Valid' : 'Expired'}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                      <span>Uses: {code.use_count}{code.max_uses ? ` / ${code.max_uses}` : ' / Unlimited'}</span>
                      {code.expires_at && (
                        <span>Expires: {new Date(code.expires_at).toLocaleDateString()}</span>
                      )}
                      {code.created_by_name && (
                        <span>By: {code.created_by_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyToClipboard(code.code, code.id)}
                      className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                    >
                      {copiedId === code.id ? 'Copied!' : 'Copy Code'}
                    </button>
                    <button
                      onClick={() => copyToClipboard(`${baseUrl}/join/${code.code}`, -code.id)}
                      className="text-xs px-3 py-1 border rounded hover:bg-gray-50"
                    >
                      {copiedId === -code.id ? 'Copied!' : 'Copy Link'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(code)}
                      className="text-xs px-3 py-1 text-red-600 border border-red-200 rounded hover:bg-red-50"
                    >
                      Deactivate
                    </button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Invite link: <code className="bg-gray-50 px-1">{baseUrl}/join/{code.code}</code>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {inactiveCodes.length > 0 && (
        <Card title="Inactive Codes">
          <div className="space-y-2">
            {inactiveCodes.map(code => (
              <div key={code.id} className="border rounded-lg p-3 opacity-60">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="font-mono text-gray-500">{code.code}</code>
                    {code.label && <span className="text-sm text-gray-400">{code.label}</span>}
                    <Badge variant="default">Inactive</Badge>
                  </div>
                  <span className="text-xs text-gray-400">{code.use_count} uses</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create Modal */}
      <Modal isOpen={showForm} onClose={() => { setShowForm(false); setFormData({}); }} title="Create Invite Code">
        <form onSubmit={handleCreate} className="space-y-4">
          <p className="text-sm text-gray-500">
            Create an invite code that users can enter during registration or share as a link to join your enterprise.
          </p>
          <Input
            label="Label (optional)"
            value={formData.label || ''}
            onChange={v => setFormData({ ...formData, label: v || undefined })}
            placeholder="e.g., Fall 2025 cohort"
          />
          <Input
            label="Max Uses (optional)"
            type="number"
            value={formData.max_uses?.toString() || ''}
            onChange={v => setFormData({ ...formData, max_uses: v ? Number(v) : undefined })}
            placeholder="Leave empty for unlimited"
          />
          <Input
            label="Expires In (days, optional)"
            type="number"
            value={formData.expires_in_days?.toString() || ''}
            onChange={v => setFormData({ ...formData, expires_in_days: v ? Number(v) : undefined })}
            placeholder="Leave empty for no expiration"
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => { setShowForm(false); setFormData({}); }}>Cancel</Button>
            <Button type="submit" loading={createMutation.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      {/* Confirm Deactivate */}
      <ConfirmDialog
        isOpen={!!confirmDelete}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && deactivateMutation.mutate(confirmDelete.id)}
        title="Deactivate Invite Code"
        message={`Deactivate invite code "${confirmDelete?.code}"? Users will no longer be able to use it to join.`}
        variant="danger"
        confirmText="Deactivate"
      />
    </div>
  );
}
