import { useState } from 'react';
import { useDepartments, useCreateDepartment, useDeleteDepartment } from '../../hooks/useDepartments';
import { useInstitutions } from '../../hooks/useInstitutions';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { Department } from '../../types';

export default function DepartmentsTab() {
  const { data: departments = [], isLoading } = useDepartments();
  const { data: institutions = [] } = useInstitutions();
  const createDept = useCreateDepartment();
  const deleteDept = useDeleteDepartment();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', institution_id: '' });
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getInstName = (id: number) => institutions.find(i => i.id === id)?.name || '-';
  const instOptions = institutions.map(i => ({ value: String(i.id), label: i.name }));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.institution_id) return setMessage({ type: 'error', text: 'Select an institution' });
    try {
      await createDept.mutateAsync({ name: form.name, description: form.description || undefined, institution_id: Number(form.institution_id) });
      setShowForm(false);
      setForm({ name: '', description: '', institution_id: '' });
      setMessage({ type: 'success', text: 'Department created' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteDept.mutateAsync(deleteTarget.id);
      setMessage({ type: 'success', text: 'Department deleted' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
    setDeleteTarget(null);
  };

  const columns: TableColumn<Department>[] = [
    { key: 'id', header: 'ID' },
    { key: 'name', header: 'Name', render: d => <span className="font-medium">{d.name}</span> },
    { key: 'institution', header: 'Institution', render: d => getInstName(d.institution_id) },
    { key: 'description', header: 'Description', render: d => d.description || '-' },
    { key: 'created', header: 'Created', render: d => new Date(d.created_at).toLocaleDateString() },
    { key: 'actions', header: 'Actions', render: d => <button onClick={() => setDeleteTarget(d)} className="text-red-600 hover:underline text-sm">Delete</button> }
  ];

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {message && <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

      <Card><p className="text-sm text-gray-500">Total Departments</p><p className="text-2xl font-bold">{departments.length}</p></Card>

      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}>+ Add Department</Button></div>

      <Card><Table columns={columns} data={departments} emptyMessage="No departments yet. Create one to get started." /></Card>

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="Add Department">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Institution" required options={instOptions} placeholder="Select an institution" value={form.institution_id} onChange={v => setForm({ ...form, institution_id: v })} />
          <Input label="Name" required value={form.name} onChange={v => setForm({ ...form, name: v })} />
          <Textarea label="Description" value={form.description} onChange={v => setForm({ ...form, description: v })} rows={3} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button type="submit" loading={createDept.isPending}>Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onCancel={() => setDeleteTarget(null)} onConfirm={handleDelete}
        title="Delete Department" message={`Delete "${deleteTarget?.name}"? This cannot be undone.`} variant="danger" confirmText="Delete" />
    </div>
  );
}
