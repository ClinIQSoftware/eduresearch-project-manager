import { useEffect, useState } from 'react';
import { getAdminUsers, createUser, updateUser, deactivateUser } from '../services/api';
import type { User } from '../types';

export default function AdminDashboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    department: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const response = await getAdminUsers();
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createUser({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        department: formData.department || undefined,
      });
      setShowForm(false);
      setFormData({ email: '', password: '', name: '', department: '' });
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  }

  async function handleToggleActive(userId: number, currentStatus: boolean) {
    try {
      if (currentStatus) {
        await deactivateUser(userId);
      } else {
        await updateUser(userId, { is_active: true });
      }
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  async function handleToggleSuperuser(userId: number, currentStatus: boolean) {
    if (!confirm(currentStatus ? 'Remove superuser status?' : 'Grant superuser status?')) return;
    try {
      await updateUser(userId, { is_superuser: !currentStatus });
      fetchUsers();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Users</p>
          <p className="text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Active Users</p>
          <p className="text-2xl font-bold text-green-600">
            {users.filter(u => u.is_active).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Superusers</p>
          <p className="text-2xl font-bold text-purple-600">
            {users.filter(u => u.is_superuser).length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">OAuth Users</p>
          <p className="text-2xl font-bold text-blue-600">
            {users.filter(u => u.auth_provider !== 'local').length}
          </p>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Department</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auth</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-sm text-gray-500">{u.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {u.department || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded ${
                    u.auth_provider === 'google' ? 'bg-red-100 text-red-800' :
                    u.auth_provider === 'microsoft' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {u.auth_provider}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-xs px-2 py-1 rounded ${
                    u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {u.is_superuser && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                      Superuser
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleToggleActive(u.id, u.is_active)}
                    className={`mr-2 ${u.is_active ? 'text-red-600' : 'text-green-600'} hover:underline`}
                  >
                    {u.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleToggleSuperuser(u.id, u.is_superuser)}
                    className="text-purple-600 hover:underline"
                  >
                    {u.is_superuser ? 'Remove Admin' : 'Make Admin'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add User</h2>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
