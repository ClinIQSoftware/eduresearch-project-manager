import { useState } from 'react';
import {
  useUsers,
  usePendingUsers,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useDeleteUserPermanently,
  useApproveUser,
  useRejectUser
} from '../../hooks/useAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import { useInstitutions } from '../../hooks/useInstitutions';
import { useDepartments } from '../../hooks/useDepartments';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import type { User } from '../../types';

type UserFormData = { email: string; first_name: string; last_name: string; institution_id: string; department_id: string };
const emptyForm: UserFormData = { email: '', first_name: '', last_name: '', institution_id: '', department_id: '' };

export default function UsersTab() {
  const { data: users = [], isLoading } = useUsers();
  const { data: pendingUsers = [] } = usePendingUsers();
  const { data: institutions = [] } = useInstitutions();
  const { data: departments = [] } = useDepartments();

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deactivateUser = useDeactivateUser();
  const deleteUser = useDeleteUserPermanently();
  const approveUser = useApproveUser();
  const rejectUser = useRejectUser();

  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'delete' | 'toggle' | 'admin' | 'reject'; user: User } | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const getInstitutionName = (id: number | null) => institutions.find(i => i.id === id)?.name || '-';
  const filteredDepts = formData.institution_id ? departments.filter(d => d.institution_id === Number(formData.institution_id)) : departments;
  const instOptions = [{ value: '', label: 'No Institution' }, ...institutions.map(i => ({ value: String(i.id), label: i.name }))];
  const deptOptions = [{ value: '', label: 'No Department' }, ...filteredDepts.map(d => ({ value: String(d.id), label: d.name }))];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = { ...formData, institution_id: formData.institution_id ? Number(formData.institution_id) : undefined, department_id: formData.department_id ? Number(formData.department_id) : undefined };
    try {
      if (editingUser) {
        await updateUser.mutateAsync({ id: editingUser.id, data: { ...data, institution_id: data.institution_id ?? null, department_id: data.department_id ?? null } });
        setMessage({ type: 'success', text: 'User updated successfully' });
      } else {
        await createUser.mutateAsync(data);
        setMessage({ type: 'success', text: 'User created! Temporary password emailed.' });
      }
      closeModal();
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const closeModal = () => { setShowForm(false); setEditingUser(null); setFormData(emptyForm); };
  const openEdit = (u: User) => { setEditingUser(u); setFormData({ email: u.email, first_name: u.first_name, last_name: u.last_name, institution_id: String(u.institution_id || ''), department_id: String(u.department_id || '') }); setShowForm(true); };

  const handleConfirm = async () => {
    if (!confirmDialog) return;
    const { type, user } = confirmDialog;
    try {
      if (type === 'delete') await deleteUser.mutateAsync(user.id);
      else if (type === 'toggle') user.is_active ? await deactivateUser.mutateAsync(user.id) : await updateUser.mutateAsync({ id: user.id, data: { is_active: true } });
      else if (type === 'admin') await updateUser.mutateAsync({ id: user.id, data: { is_superuser: !user.is_superuser } });
      else if (type === 'reject') await rejectUser.mutateAsync(user.id);
      setMessage({ type: 'success', text: type === 'delete' ? 'User deleted' : type === 'reject' ? 'User rejected' : 'User updated' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
    setConfirmDialog(null);
  };

  const columns: TableColumn<User>[] = [
    { key: 'name', header: 'User', render: u => <div><p className="font-medium text-sm">{u.name}</p><p className="text-xs text-gray-500">{u.email}</p></div> },
    { key: 'institution', header: 'Institution', render: u => <span className="text-xs text-gray-500">{getInstitutionName(u.institution_id)}</span> },
    { key: 'auth', header: 'Auth', render: u => <Badge variant={u.auth_provider === 'google' ? 'error' : u.auth_provider === 'microsoft' ? 'info' : 'default'}>{u.auth_provider}</Badge> },
    { key: 'status', header: 'Status', render: u => <div className="flex gap-1"><Badge variant={u.is_active ? 'success' : 'error'}>{u.is_active ? 'Active' : 'Inactive'}</Badge>{u.is_superuser && <Badge variant="info">Admin</Badge>}</div> },
    { key: 'actions', header: 'Actions', render: u => (
      <div className="flex gap-2 text-xs">
        <button onClick={() => openEdit(u)} className="text-blue-600 hover:underline">Edit</button>
        <button onClick={() => setConfirmDialog({ type: 'toggle', user: u })} className={u.is_active ? 'text-orange-600' : 'text-green-600'}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
        <button onClick={() => setConfirmDialog({ type: 'admin', user: u })} className="text-purple-600">{u.is_superuser ? 'Remove Admin' : 'Make Admin'}</button>
        <button onClick={() => setConfirmDialog({ type: 'delete', user: u })} className="text-red-600">Delete</button>
      </div>
    )}
  ];

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      {message && <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[{ label: 'Total', value: users.length }, { label: 'Active', value: users.filter(u => u.is_active).length, color: 'text-green-600' }, { label: 'Pending', value: pendingUsers.length, color: 'text-yellow-600' }, { label: 'Superusers', value: users.filter(u => u.is_superuser).length, color: 'text-purple-600' }, { label: 'OAuth', value: users.filter(u => u.auth_provider !== 'local').length, color: 'text-blue-600' }].map(s => (
          <Card key={s.label}><p className="text-xs text-gray-500">{s.label}</p><p className={`text-xl font-bold ${s.color || ''}`}>{s.value}</p></Card>
        ))}
      </div>

      {pendingUsers.length > 0 && (
        <Card className="bg-yellow-50 border-yellow-200" title={`Pending Approval (${pendingUsers.length})`}>
          <div className="space-y-2">
            {pendingUsers.map(u => (
              <div key={u.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                <div><p className="font-medium">{u.name}</p><p className="text-sm text-gray-500">{u.email}</p></div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => approveUser.mutate(u.id)}>Approve</Button>
                  <Button size="sm" variant="danger" onClick={() => setConfirmDialog({ type: 'reject', user: u })}>Reject</Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <div className="flex justify-end"><Button onClick={() => setShowForm(true)}>+ Add User</Button></div>

      <Card><Table columns={columns} data={users} emptyMessage="No users found" /></Card>

      <Modal isOpen={showForm} onClose={closeModal} title={editingUser ? 'Edit User' : 'Add User'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!editingUser && <p className="text-sm text-gray-500">A temporary password will be emailed to the user.</p>}
          <div className="grid grid-cols-2 gap-4">
            <Input label="First Name" required value={formData.first_name} onChange={v => setFormData({ ...formData, first_name: v })} />
            <Input label="Last Name" required value={formData.last_name} onChange={v => setFormData({ ...formData, last_name: v })} />
          </div>
          <Input label="Email" type="email" required value={formData.email} onChange={v => setFormData({ ...formData, email: v })} />
          <Select label="Institution" options={instOptions} value={formData.institution_id} onChange={v => setFormData({ ...formData, institution_id: v, department_id: '' })} />
          <Select label="Department" options={deptOptions} value={formData.department_id} onChange={v => setFormData({ ...formData, department_id: v })} disabled={!formData.institution_id} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeModal}>Cancel</Button>
            <Button type="submit" loading={createUser.isPending || updateUser.isPending}>{editingUser ? 'Save' : 'Create'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={!!confirmDialog} onCancel={() => setConfirmDialog(null)} onConfirm={handleConfirm}
        title={confirmDialog?.type === 'delete' ? 'Delete User' : confirmDialog?.type === 'reject' ? 'Reject User' : 'Update User'}
        message={confirmDialog?.type === 'delete' ? `Permanently delete ${confirmDialog.user.name}? This cannot be undone.` : confirmDialog?.type === 'reject' ? `Reject and delete ${confirmDialog?.user.name}?` : confirmDialog?.type === 'admin' ? `${confirmDialog?.user.is_superuser ? 'Remove' : 'Grant'} admin status?` : `${confirmDialog?.user.is_active ? 'Deactivate' : 'Activate'} this user?`}
        variant={confirmDialog?.type === 'delete' || confirmDialog?.type === 'reject' ? 'danger' : 'primary'}
        confirmText={confirmDialog?.type === 'delete' ? 'Delete' : confirmDialog?.type === 'reject' ? 'Reject' : 'Confirm'} />
    </div>
  );
}
