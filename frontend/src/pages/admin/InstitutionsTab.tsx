import { useState } from 'react';
import { useInstitutions, useCreateInstitution, useDeleteInstitution } from '../../hooks/useInstitutions';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Institution } from '../../types';

export default function InstitutionsTab() {
  const { data: institutions = [], isLoading } = useInstitutions();
  const createInst = useCreateInstitution();
  const deleteInst = useDeleteInstitution();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });
  const [deleteTarget, setDeleteTarget] = useState<Institution | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createInst.mutateAsync({ name: form.name, description: form.description || undefined });
      setShowForm(false);
      setForm({ name: '', description: '' });
      setMessage({ type: 'success', text: 'Institution created' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteInst.mutateAsync(deleteTarget.id);
      setMessage({ type: 'success', text: 'Institution deleted' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
    setDeleteTarget(null);
  };

  const columns: TableColumn<Institution>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name', render: i => <span className="font-medium">{i.name}</span> },
    { key: 'description', header: 'Description', render: i => i.description || '-' },
    { key: 'created', header: 'Created', render: i => new Date(i.created_at).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: i => <button onClick={() => setDeleteTarget(i)} className="text-red-600 hover:underline text-sm">Delete</button> }
  ];

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {message && <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

      <Card><p className="text-sm text-gray-500">Total Institutions</p><p className="text-2xl font-bold">{institutions.length}</p></Card>

      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}>+ Add Institution</Button></div>

      <Card><Table columns={columns} data={institutions} emptyMessage="No institutions yet. Create one to get started." /></Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Institution">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" required value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Textarea label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={createInst.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Institution" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} variant="danger" confirmText="Delete" />
    </div>
  );
}
