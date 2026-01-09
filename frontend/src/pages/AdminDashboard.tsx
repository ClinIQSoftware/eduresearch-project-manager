import { useEffect, useState } from 'react';
import {
  getAdminUsers, createUser, updateUser, deactivateUser,
  getSystemSettings, updateSystemSettings, getPendingUsers,
  approveUser, rejectUser, bulkUploadUsers, downloadUserTemplate,
  getInstitutions, createInstitution, deleteInstitution
} from '../services/api';
import type { User, SystemSettings, BulkUploadResult, Institution } from '../types';

type TabType = 'users' | 'institutions' | 'security' | 'import';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('institutions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'institutions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Institutions
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Security Settings
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            User Import
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'institutions' && <InstitutionsTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'import' && <ImportTab />}
    </div>
  );
}

// ==================== USERS TAB ====================
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    institution: '',
    department: '',
    institution_id: '' as string | number,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [usersRes, pendingRes, instsRes] = await Promise.all([
        getAdminUsers(),
        getPendingUsers(),
        getInstitutions()
      ]);
      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
      setInstitutions(instsRes.data);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      await createUser({
        email: formData.email,
        first_name: formData.first_name,
        last_name: formData.last_name,
        institution: formData.institution || undefined,
        department: formData.department || undefined,
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      });
      setShowForm(false);
      setFormData({ email: '', first_name: '', last_name: '', institution: '', department: '', institution_id: '' });
      setSuccess('User created! A temporary password has been emailed to them.');
      fetchData();
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
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  async function handleToggleSuperuser(userId: number, currentStatus: boolean) {
    if (!confirm(currentStatus ? 'Remove superuser status?' : 'Grant superuser status?')) return;
    try {
      await updateUser(userId, { is_superuser: !currentStatus });
      fetchData();
    } catch (error) {
      console.error('Error updating user:', error);
    }
  }

  async function handleApprove(userId: number) {
    try {
      await approveUser(userId);
      fetchData();
    } catch (error) {
      console.error('Error approving user:', error);
    }
  }

  async function handleReject(userId: number) {
    if (!confirm('Reject and delete this pending user?')) return;
    try {
      await rejectUser(userId);
      fetchData();
    } catch (error) {
      console.error('Error rejecting user:', error);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
          <p className="text-sm text-gray-500">Pending Approval</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingUsers.length}</p>
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

      {/* Pending Users Section */}
      {pendingUsers.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h2 className="text-lg font-semibold text-yellow-800 mb-3">Pending Approval ({pendingUsers.length})</h2>
          <div className="space-y-2">
            {pendingUsers.map((u) => (
              <div key={u.id} className="bg-white p-3 rounded-lg flex justify-between items-center">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add User Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add User
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution / Dept</th>
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
                  <div>
                    {u.institution && <p>{u.institution}</p>}
                    {u.department && <p className="text-xs">{u.department}</p>}
                    {!u.institution && !u.department && '-'}
                  </div>
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
            <p className="text-sm text-gray-500 mb-4">
              A temporary password will be generated and emailed to the user.
            </p>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
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
                <label className="block text-sm font-medium mb-1">Institution/Affiliation</label>
                <input
                  type="text"
                  value={formData.institution}
                  onChange={(e) => setFormData({ ...formData, institution: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., University of Toronto"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  placeholder="e.g., Computer Science"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Institution Entity</label>
                <select
                  value={formData.institution_id}
                  onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">No Institution Entity</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
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

// ==================== INSTITUTIONS TAB ====================
function InstitutionsTab() {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInstitutions();
  }, []);

  async function fetchInstitutions() {
    try {
      const response = await getInstitutions();
      setInstitutions(response.data);
    } catch (error) {
      console.error('Error fetching institutions:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await createInstitution({
        name: formData.name,
        description: formData.description || undefined,
      });
      setShowForm(false);
      setFormData({ name: '', description: '' });
      setSuccess('Institution created successfully');
      fetchInstitutions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create institution');
    }
  }

  async function handleDelete(instId: number, instName: string) {
    if (!confirm(`Delete institution "${instName}"? This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      await deleteInstitution(instId);
      setSuccess('Institution deleted successfully');
      fetchInstitutions();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete institution');
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Messages */}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-500">Total Institutions</p>
          <p className="text-2xl font-bold">{institutions.length}</p>
        </div>
      </div>

      {/* Add Institution Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Institution
        </button>
      </div>

      {/* Institutions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {institutions.map((inst) => (
              <tr key={inst.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {inst.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {inst.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {inst.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(inst.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleDelete(inst.id, inst.name)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {institutions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No institutions yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Institution Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Institution</h2>
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
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
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
                  Create Institution
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ==================== SECURITY TAB ====================
function SecurityTab() {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  async function fetchSettings() {
    try {
      const response = await getSystemSettings();
      setSettings(response.data);
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!settings) return;
    setSaving(true);
    setMessage('');
    try {
      await updateSystemSettings(settings);
      setMessage('Settings saved successfully');
    } catch (error: any) {
      setMessage(error.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!settings) return <div className="text-center py-8 text-red-600">Failed to load settings</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {message && (
        <div className={`p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message}
        </div>
      )}

      {/* Registration Approval */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Registration Approval</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.require_registration_approval}
              onChange={(e) => setSettings({ ...settings, require_registration_approval: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Require approval for new user registrations</span>
          </label>

          {settings.require_registration_approval && (
            <div className="ml-7">
              <label className="block text-sm font-medium mb-2">Approval Mode</label>
              <select
                value={settings.registration_approval_mode}
                onChange={(e) => setSettings({ ...settings, registration_approval_mode: e.target.value as 'block' | 'limited' })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="block">Block login until approved</option>
                <option value="limited">Allow limited access until approved</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Password Policy */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Password Policy</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Minimum Password Length</label>
            <input
              type="number"
              value={settings.min_password_length}
              onChange={(e) => setSettings({ ...settings, min_password_length: parseInt(e.target.value) || 8 })}
              className="w-full border rounded-lg px-3 py-2"
              min={6}
              max={32}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.require_uppercase}
                onChange={(e) => setSettings({ ...settings, require_uppercase: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Require uppercase</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.require_lowercase}
                onChange={(e) => setSettings({ ...settings, require_lowercase: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Require lowercase</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.require_numbers}
                onChange={(e) => setSettings({ ...settings, require_numbers: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Require numbers</span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={settings.require_special_chars}
                onChange={(e) => setSettings({ ...settings, require_special_chars: e.target.checked })}
                className="w-4 h-4"
              />
              <span>Require special characters</span>
            </label>
          </div>
        </div>
      </div>

      {/* Session Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Session Settings</h2>
        <div>
          <label className="block text-sm font-medium mb-2">Session Timeout (minutes)</label>
          <input
            type="number"
            value={settings.session_timeout_minutes}
            onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) || 30 })}
            className="w-full border rounded-lg px-3 py-2"
            min={5}
            max={1440}
          />
        </div>
      </div>

      {/* OAuth Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">OAuth Providers</h2>
        <div className="space-y-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.google_oauth_enabled}
              onChange={(e) => setSettings({ ...settings, google_oauth_enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Enable Google OAuth</span>
          </label>
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={settings.microsoft_oauth_enabled}
              onChange={(e) => setSettings({ ...settings, microsoft_oauth_enabled: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Enable Microsoft OAuth</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}

// ==================== IMPORT TAB ====================
function ImportTab() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkUploadResult | null>(null);
  const [error, setError] = useState('');

  async function handleDownloadTemplate() {
    try {
      const response = await downloadUserTemplate();
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'user_import_template.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading template:', error);
    }
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);

    try {
      const response = await bulkUploadUsers(file);
      setResult(response.data);
      setFile(null);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h2 className="text-lg font-semibold text-blue-800 mb-2">Bulk User Import</h2>
        <p className="text-blue-700 text-sm">
          Upload an Excel file (.xlsx) to create multiple users at once. Users will be created with temporary passwords
          that they can reset on first login.
        </p>
      </div>

      {/* Template Download */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Step 1: Download Template</h3>
        <p className="text-sm text-gray-600 mb-4">
          Download the Excel template and fill in user details. Required fields: email, first_name, last_name.
          Optional fields: institution, department, phone, bio, institution_id, is_superuser.
        </p>
        <button
          onClick={handleDownloadTemplate}
          className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
        >
          Download Template
        </button>
      </div>

      {/* File Upload */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold mb-2">Step 2: Upload Filled File</h3>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            {file ? (
              <div className="text-green-600">
                <p className="font-medium">{file.name}</p>
                <p className="text-sm">Click to change file</p>
              </div>
            ) : (
              <div className="text-gray-500">
                <p className="font-medium">Click to select Excel file</p>
                <p className="text-sm">.xlsx or .xls files only</p>
              </div>
            )}
          </label>
        </div>

        {file && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload & Create Users'}
            </button>
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      {/* Results */}
      {result && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="font-semibold mb-4">Import Results</h3>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{result.created}</p>
              <p className="text-sm text-green-700">Users Created</p>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">{result.skipped}</p>
              <p className="text-sm text-yellow-700">Skipped (Duplicates)</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-2xl font-bold text-red-600">{result.errors.length}</p>
              <p className="text-sm text-red-700">Errors</p>
            </div>
          </div>

          {result.errors.length > 0 && (
            <div className="mt-4">
              <h4 className="font-medium text-red-600 mb-2">Errors:</h4>
              <ul className="text-sm text-red-600 list-disc list-inside space-y-1">
                {result.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
