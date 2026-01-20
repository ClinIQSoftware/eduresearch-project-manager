import { useEffect, useState, useMemo } from 'react';
import {
  getAdminUsers, createUser, updateUser, deactivateUser, deleteUserPermanently,
  getSystemSettings, updateSystemSettings, getPendingUsers,
  approveUser, rejectUser, bulkUploadUsers, downloadUserTemplate,
  getInstitutions, createInstitution, deleteInstitution,
  getDepartments, createDepartment, deleteDepartment,
  getEmailSettings, updateEmailSettings, getEmailTemplates, updateEmailTemplate, sendTestEmail,
  getJinjaTemplates, getJinjaTemplate, updateJinjaTemplate, previewJinjaTemplate,
  type JinjaTemplateInfo
} from '../services/api';
import type { User, SystemSettings, BulkUploadResult, Institution, Department, EmailTemplate } from '../types';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

type TabType = 'users' | 'institutions' | 'departments' | 'security' | 'email' | 'templates' | 'import';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users');

  return (
    <div className="space-y-4 md:space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Admin Dashboard</h1>

      {/* Tab Navigation - scrollable on mobile */}
      <div className="border-b border-gray-200 overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <nav className="-mb-px flex space-x-4 md:space-x-8 min-w-max">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Users
          </button>
          <button
            onClick={() => setActiveTab('institutions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'institutions'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Institutions
          </button>
          <button
            onClick={() => setActiveTab('departments')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'departments'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Departments
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Security
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'email'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setActiveTab('templates')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'templates'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Templates
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`py-2 px-1 border-b-2 font-medium text-sm whitespace-nowrap ${
              activeTab === 'import'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Import
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'institutions' && <InstitutionsTab />}
      {activeTab === 'departments' && <DepartmentsTab />}
      {activeTab === 'security' && <SecurityTab />}
      {activeTab === 'email' && <EmailTab />}
      {activeTab === 'templates' && <EmailTemplatesTab />}
      {activeTab === 'import' && <ImportTab />}
    </div>
  );
}

// ==================== USERS TAB ====================
function UsersTab() {
  const [users, setUsers] = useState<User[]>([]);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    institution_id: '' as string | number,
    department_id: '' as string | number,
  });
  const [editFormData, setEditFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    institution_id: '' as string | number,
    department_id: '' as string | number,
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [usersRes, pendingRes, instsRes, deptsRes] = await Promise.all([
        getAdminUsers(),
        getPendingUsers(),
        getInstitutions(),
        getDepartments()
      ]);
      setUsers(usersRes.data);
      setPendingUsers(pendingRes.data);
      setInstitutions(instsRes.data);
      setDepartments(deptsRes.data);
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
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
        department_id: formData.department_id ? Number(formData.department_id) : undefined,
      });
      setShowForm(false);
      setFormData({ email: '', first_name: '', last_name: '', institution_id: '', department_id: '' });
      setSuccess('User created! A temporary password has been emailed to them.');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create user');
    }
  }

  // Get institution name by ID
  function getInstitutionName(instId: number | null): string {
    if (!instId) return '-';
    const inst = institutions.find(i => i.id === instId);
    return inst?.name || '-';
  }

  // Filter departments by selected institution
  const filteredDepartments = formData.institution_id
    ? departments.filter(d => d.institution_id === Number(formData.institution_id))
    : departments;

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

  async function handleDeleteUser(userId: number, userName: string) {
    if (!confirm(`PERMANENTLY DELETE ${userName}? This action cannot be undone.`)) return;
    try {
      await deleteUserPermanently(userId);
      setSuccess('User permanently deleted');
      fetchData();
    } catch (error: any) {
      setError(error.response?.data?.detail || 'Error deleting user');
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

  function openEditModal(user: User) {
    setEditingUser(user);
    setEditFormData({
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      institution_id: user.institution_id || '',
      department_id: user.department_id || '',
    });
    setShowEditForm(true);
    setError('');
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setError('');
    try {
      await updateUser(editingUser.id, {
        email: editFormData.email,
        first_name: editFormData.first_name,
        last_name: editFormData.last_name,
        institution_id: editFormData.institution_id ? Number(editFormData.institution_id) : null,
        department_id: editFormData.department_id ? Number(editFormData.department_id) : null,
      });
      setShowEditForm(false);
      setEditingUser(null);
      setSuccess('User updated successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update user');
    }
  }

  // Filter departments for edit form
  const editFilteredDepartments = editFormData.institution_id
    ? departments.filter(d => d.institution_id === Number(editFormData.institution_id))
    : departments;

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Success Message */}
      {success && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg">{success}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Total</p>
          <p className="text-xl md:text-2xl font-bold">{users.length}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Active</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">
            {users.filter(u => u.is_active).length}
          </p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Pending</p>
          <p className="text-xl md:text-2xl font-bold text-yellow-600">{pendingUsers.length}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Superusers</p>
          <p className="text-xl md:text-2xl font-bold text-purple-600">
            {users.filter(u => u.is_superuser).length}
          </p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow col-span-2 sm:col-span-1">
          <p className="text-xs md:text-sm text-gray-500">OAuth</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">
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

      {/* Users List - Card view on mobile, Table on desktop */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Auth</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div>
                      <p className="font-medium text-sm">{u.name}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                    {getInstitutionName(u.institution_id)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      u.auth_provider === 'google' ? 'bg-red-100 text-red-800' :
                      u.auth_provider === 'microsoft' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {u.auth_provider}
                    </span>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                      {u.is_superuser && (
                        <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">Admin</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    <button onClick={() => openEditModal(u)} className="text-blue-600 hover:underline mr-2">Edit</button>
                    <button onClick={() => handleToggleActive(u.id, u.is_active)} className={`mr-2 ${u.is_active ? 'text-orange-600' : 'text-green-600'} hover:underline`}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleToggleSuperuser(u.id, u.is_superuser)} className="text-purple-600 hover:underline mr-2">
                      {u.is_superuser ? 'Remove Admin' : 'Make Admin'}
                    </button>
                    <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200">
          {users.map((u) => (
            <div key={u.id} className="p-4 space-y-2">
              <div className="flex justify-between items-start">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                </div>
                <div className="flex flex-wrap gap-1 ml-2">
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    u.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {u.is_active ? 'Active' : 'Inactive'}
                  </span>
                  {u.is_superuser && (
                    <span className="bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded">Admin</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-gray-500">
                {getInstitutionName(u.institution_id)} • {u.auth_provider}
              </div>
              <div className="flex flex-wrap gap-3 text-xs pt-1">
                <button onClick={() => openEditModal(u)} className="text-blue-600">Edit</button>
                <button onClick={() => handleToggleActive(u.id, u.is_active)} className={u.is_active ? 'text-orange-600' : 'text-green-600'}>
                  {u.is_active ? 'Deactivate' : 'Activate'}
                </button>
                <button onClick={() => handleToggleSuperuser(u.id, u.is_superuser)} className="text-purple-600">
                  {u.is_superuser ? 'Remove Admin' : 'Make Admin'}
                </button>
                <button onClick={() => handleDeleteUser(u.id, u.name)} className="text-red-600">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
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
                <label className="block text-sm font-medium mb-1">Institution</label>
                <select
                  value={formData.institution_id}
                  onChange={(e) => setFormData({ ...formData, institution_id: e.target.value, department_id: '' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">No Institution</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  disabled={!formData.institution_id}
                >
                  <option value="">No Department</option>
                  {filteredDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {!formData.institution_id && (
                  <p className="text-xs text-gray-500 mt-1">Select an institution first</p>
                )}
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

      {/* Edit User Modal */}
      {showEditForm && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Edit User</h2>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">First Name *</label>
                  <input
                    type="text"
                    value={editFormData.first_name}
                    onChange={(e) => setEditFormData({ ...editFormData, first_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Last Name *</label>
                  <input
                    type="text"
                    value={editFormData.last_name}
                    onChange={(e) => setEditFormData({ ...editFormData, last_name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={editFormData.email}
                  onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Institution</label>
                <select
                  value={editFormData.institution_id}
                  onChange={(e) => setEditFormData({ ...editFormData, institution_id: e.target.value, department_id: '' })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">No Institution</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  value={editFormData.department_id}
                  onChange={(e) => setEditFormData({ ...editFormData, department_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  disabled={!editFormData.institution_id}
                >
                  <option value="">No Department</option>
                  {editFilteredDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
                {!editFormData.institution_id && (
                  <p className="text-xs text-gray-500 mt-1">Select an institution first</p>
                )}
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowEditForm(false); setEditingUser(null); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
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

// ==================== DEPARTMENTS TAB ====================
function DepartmentsTab() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', description: '', institution_id: '' as string | number });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [deptsRes, instsRes] = await Promise.all([
        getDepartments(),
        getInstitutions()
      ]);
      setDepartments(deptsRes.data);
      setInstitutions(instsRes.data);
    } catch (error) {
      console.error('Error fetching departments:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!formData.institution_id) {
      setError('Please select an institution');
      return;
    }
    try {
      await createDepartment({
        name: formData.name,
        description: formData.description || undefined,
        institution_id: Number(formData.institution_id),
      });
      setShowForm(false);
      setFormData({ name: '', description: '', institution_id: '' });
      setSuccess('Department created successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to create department');
    }
  }

  async function handleDelete(deptId: number, deptName: string) {
    if (!confirm(`Delete department "${deptName}"? This cannot be undone.`)) return;
    setError('');
    setSuccess('');
    try {
      await deleteDepartment(deptId);
      setSuccess('Department deleted successfully');
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete department');
    }
  }

  // Get institution name by ID
  function getInstitutionName(instId: number): string {
    const inst = institutions.find(i => i.id === instId);
    return inst?.name || '-';
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
          <p className="text-sm text-gray-500">Total Departments</p>
          <p className="text-2xl font-bold">{departments.length}</p>
        </div>
      </div>

      {/* Add Department Button */}
      <div className="flex justify-end">
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + Add Department
        </button>
      </div>

      {/* Departments Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Institution</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {departments.map((dept) => (
              <tr key={dept.id}>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {dept.id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap font-medium">
                  {dept.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {getInstitutionName(dept.institution_id)}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {dept.description || '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(dept.created_at).toLocaleDateString()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <button
                    onClick={() => handleDelete(dept.id, dept.name)}
                    className="text-red-600 hover:underline"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {departments.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                  No departments yet. Create one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Create Department Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Department</h2>
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">{error}</div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Institution *</label>
                <select
                  value={formData.institution_id}
                  onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                >
                  <option value="">Select an institution</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
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
                  Create Department
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
          Optional fields: phone, bio, institution (by name), department (by name), is_superuser.
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

// ==================== EMAIL TAB ====================
function EmailTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Form state for SMTP settings
  const [smtpForm, setSmtpForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    is_active: false
  });

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const settingsRes = await getEmailSettings();
      const settings = settingsRes.data;
      setSmtpForm({
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || '',
        smtp_password: '',
        from_email: settings.from_email || '',
        from_name: settings.from_name || '',
        is_active: settings.is_active
      });
    } catch (error) {
      console.error('Error fetching email settings:', error);
      setMessage('Failed to load email settings');
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveSettings() {
    setSaving(true);
    setMessage('');
    try {
      const updateData: Record<string, unknown> = {
        smtp_host: smtpForm.smtp_host,
        smtp_port: smtpForm.smtp_port,
        smtp_user: smtpForm.smtp_user || null,
        from_email: smtpForm.from_email || null,
        from_name: smtpForm.from_name,
        is_active: smtpForm.is_active
      };
      // Only include password if it was changed
      if (smtpForm.smtp_password) {
        updateData.smtp_password = smtpForm.smtp_password;
      }
      await updateEmailSettings(updateData);
      setMessage('Email settings saved successfully');
      setSmtpForm({ ...smtpForm, smtp_password: '' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { detail?: string } } };
      setMessage(err.response?.data?.detail || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="max-w-4xl space-y-6">
      {message && (
        <div className={`p-3 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
          {message}
        </div>
      )}

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-1">Email Configuration</h3>
        <p className="text-sm text-blue-700">
          Configure SMTP settings for sending email notifications. To edit email templates, go to the <strong>Templates</strong> tab.
        </p>
      </div>

      {/* SMTP Settings */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">SMTP Configuration</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">SMTP Host</label>
            <input
              type="text"
              value={smtpForm.smtp_host}
              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_host: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="smtp.gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SMTP Port</label>
            <input
              type="number"
              value={smtpForm.smtp_port}
              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_port: parseInt(e.target.value) || 587 })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SMTP Username</label>
            <input
              type="text"
              value={smtpForm.smtp_user}
              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_user: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="your-email@gmail.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">SMTP Password</label>
            <input
              type="password"
              value={smtpForm.smtp_password}
              onChange={(e) => setSmtpForm({ ...smtpForm, smtp_password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="Leave blank to keep existing"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From Email</label>
            <input
              type="email"
              value={smtpForm.from_email}
              onChange={(e) => setSmtpForm({ ...smtpForm, from_email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="noreply@yourdomain.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">From Name</label>
            <input
              type="text"
              value={smtpForm.from_name}
              onChange={(e) => setSmtpForm({ ...smtpForm, from_name: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              placeholder="EduResearch Project Manager"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={smtpForm.is_active}
              onChange={(e) => setSmtpForm({ ...smtpForm, is_active: e.target.checked })}
              className="w-4 h-4"
            />
            <span>Enable email notifications</span>
          </label>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save SMTP Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ==================== EMAIL TEMPLATES TAB ====================
// Template metadata for DB-stored templates
const DB_TEMPLATE_LABELS: Record<string, { name: string; description: string; variables: string[] }> = {
  user_approval_request: {
    name: 'User Approval Request',
    description: 'Sent to admins when a new user registers and requires approval',
    variables: ['user_name', 'user_email', 'institution_name', 'department_name', 'approval_link']
  },
  join_request: {
    name: 'Join Request',
    description: 'Sent to project leads when someone requests to join their project',
    variables: ['project_name', 'requester_name', 'message', 'project_link']
  },
  task_assignment: {
    name: 'Task Assignment',
    description: 'Sent to users when a task is assigned to them',
    variables: ['task_title', 'project_name', 'priority', 'due_date', 'description', 'task_link']
  }
};

// Unified template item interface
interface UnifiedTemplate {
  id: string;
  name: string;
  description: string;
  variables: string[];
  type: 'jinja' | 'db';
  // For DB templates
  subject?: string;
  body?: string;
  is_active?: boolean;
  template_type?: string;
  // For Jinja templates
  filename?: string;
  content?: string;
}

function EmailTemplatesTab() {
  // Jinja templates state
  const [jinjaTemplates, setJinjaTemplates] = useState<JinjaTemplateInfo[]>([]);
  // DB templates state
  const [dbTemplates, setDbTemplates] = useState<EmailTemplate[]>([]);

  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<UnifiedTemplate | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [editedSubject, setEditedSubject] = useState('');
  const [editedIsActive, setEditedIsActive] = useState(true);
  const [preview, setPreview] = useState<{ html: string; subject: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [editorMode, setEditorMode] = useState<'wysiwyg' | 'html'>('wysiwyg');
  const [testEmail, setTestEmail] = useState('');
  const [testingEmail, setTestingEmail] = useState(false);
  const [templateCategory, setTemplateCategory] = useState<'all' | 'reminder' | 'notification'>('all');

  // Quill editor modules configuration
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ],
  }), []);

  useEffect(() => {
    fetchAllTemplates();
  }, []);

  async function fetchAllTemplates() {
    setLoading(true);
    try {
      const [jinjaRes, dbRes] = await Promise.all([
        getJinjaTemplates(),
        getEmailTemplates()
      ]);
      setJinjaTemplates(jinjaRes.data);
      setDbTemplates(dbRes.data);
    } catch (err) {
      console.error('Error fetching templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  }

  // Convert templates to unified format for display
  const unifiedTemplates: UnifiedTemplate[] = [
    // Jinja templates (reminder emails)
    ...jinjaTemplates.map(t => ({
      id: `jinja-${t.filename}`,
      name: t.name,
      description: t.description,
      variables: t.variables,
      type: 'jinja' as const,
      filename: t.filename
    })),
    // DB templates (notification emails)
    ...dbTemplates.map(t => {
      const meta = DB_TEMPLATE_LABELS[t.template_type] || {
        name: t.template_type,
        description: '',
        variables: []
      };
      return {
        id: `db-${t.template_type}`,
        name: meta.name,
        description: meta.description,
        variables: meta.variables,
        type: 'db' as const,
        subject: t.subject,
        body: t.body,
        is_active: t.is_active,
        template_type: t.template_type
      };
    })
  ];

  // Filter templates by category
  const filteredTemplates = unifiedTemplates.filter(t => {
    if (templateCategory === 'all') return true;
    if (templateCategory === 'reminder') return t.type === 'jinja';
    if (templateCategory === 'notification') return t.type === 'db';
    return true;
  });

  async function handleSelectTemplate(template: UnifiedTemplate) {
    setError('');
    setMessage('');
    setPreview(null);

    if (template.type === 'jinja' && template.filename) {
      try {
        const response = await getJinjaTemplate(template.filename);
        setSelectedTemplate({
          ...template,
          content: response.data.content
        });
        setEditedContent(response.data.content);
        setEditedSubject('');
        setEditedIsActive(true);
      } catch (err) {
        console.error('Error loading template:', err);
        setError('Failed to load template content');
      }
    } else if (template.type === 'db') {
      setSelectedTemplate(template);
      setEditedContent(template.body || '');
      setEditedSubject(template.subject || '');
      setEditedIsActive(template.is_active ?? true);
    }
  }

  async function handlePreview() {
    if (!selectedTemplate) return;
    setPreviewing(true);
    setError('');

    if (selectedTemplate.type === 'jinja' && selectedTemplate.filename) {
      try {
        const response = await previewJinjaTemplate(selectedTemplate.filename);
        setPreview(response.data);
      } catch (err: unknown) {
        const error = err as { response?: { data?: { detail?: string } } };
        setError(error.response?.data?.detail || 'Failed to preview template');
      }
    } else if (selectedTemplate.type === 'db') {
      // For DB templates, create a simple preview
      setPreview({
        html: editedContent,
        subject: editedSubject
      });
    }
    setPreviewing(false);
  }

  async function handleSave() {
    if (!selectedTemplate) return;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      if (selectedTemplate.type === 'jinja' && selectedTemplate.filename) {
        await updateJinjaTemplate(selectedTemplate.filename, editedContent);
        // Refresh the template content
        const response = await getJinjaTemplate(selectedTemplate.filename);
        setSelectedTemplate({
          ...selectedTemplate,
          content: response.data.content
        });
        setEditedContent(response.data.content);
      } else if (selectedTemplate.type === 'db' && selectedTemplate.template_type) {
        await updateEmailTemplate(selectedTemplate.template_type, {
          subject: editedSubject,
          body: editedContent,
          is_active: editedIsActive
        });
        // Refresh all templates
        await fetchAllTemplates();
        // Update selected template
        setSelectedTemplate({
          ...selectedTemplate,
          subject: editedSubject,
          body: editedContent,
          is_active: editedIsActive
        });
      }
      setMessage('Template saved successfully');
      setPreview(null);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    if (!selectedTemplate) return;

    if (selectedTemplate.type === 'jinja') {
      setEditedContent(selectedTemplate.content || '');
    } else {
      setEditedContent(selectedTemplate.body || '');
      setEditedSubject(selectedTemplate.subject || '');
      setEditedIsActive(selectedTemplate.is_active ?? true);
    }
    setMessage('');
    setError('');
  }

  async function handleTestEmail() {
    if (!selectedTemplate || !testEmail) return;
    if (selectedTemplate.type !== 'db' || !selectedTemplate.template_type) {
      setError('Test email is only available for notification templates');
      return;
    }

    setTestingEmail(true);
    setError('');
    setMessage('');

    try {
      await sendTestEmail(selectedTemplate.template_type, testEmail);
      setMessage(`Test email sent to ${testEmail}`);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { detail?: string } } };
      setError(error.response?.data?.detail || 'Failed to send test email');
    } finally {
      setTestingEmail(false);
    }
  }

  // Check if content has changed
  const hasChanges = selectedTemplate ? (
    selectedTemplate.type === 'jinja'
      ? editedContent !== (selectedTemplate.content || '')
      : (editedContent !== (selectedTemplate.body || '') ||
         editedSubject !== (selectedTemplate.subject || '') ||
         editedIsActive !== (selectedTemplate.is_active ?? true))
  ) : false;

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-800 mb-1">Email Templates</h3>
        <p className="text-sm text-blue-700">
          Manage all email templates. <strong>Reminder Templates</strong> (Jinja2) are used for automatic meeting/deadline reminders.
          <strong> Notification Templates</strong> are used for user actions like join requests and task assignments.
          Use <code className="bg-blue-100 px-1 rounded">{'{{variable}}'}</code> syntax for dynamic content.
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-50 text-green-600 p-4 rounded-lg">{message}</div>
      )}
      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">{error}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template List */}
        <div className="bg-white rounded-lg shadow p-4">
          <h3 className="font-semibold mb-3">Templates</h3>

          {/* Category Filter */}
          <div className="flex gap-1 mb-4">
            <button
              onClick={() => setTemplateCategory('all')}
              className={`px-2 py-1 text-xs rounded ${templateCategory === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setTemplateCategory('reminder')}
              className={`px-2 py-1 text-xs rounded ${templateCategory === 'reminder' ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Reminders
            </button>
            <button
              onClick={() => setTemplateCategory('notification')}
              className={`px-2 py-1 text-xs rounded ${templateCategory === 'notification' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              Notifications
            </button>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredTemplates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleSelectTemplate(template)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  selectedTemplate?.id === template.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <p className="font-medium text-sm">{template.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    template.type === 'jinja'
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {template.type === 'jinja' ? 'Reminder' : 'Notification'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">{template.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Editor */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTemplate ? (
            <>
              {/* Template Info */}
              <div className="bg-white rounded-lg shadow p-4">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{selectedTemplate.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        selectedTemplate.type === 'jinja'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {selectedTemplate.type === 'jinja' ? 'Jinja2 Template' : 'DB Template'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">{selectedTemplate.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handlePreview}
                      disabled={previewing}
                      className="px-3 py-1 text-sm border border-purple-600 text-purple-600 rounded hover:bg-purple-50 disabled:opacity-50"
                    >
                      {previewing ? 'Loading...' : 'Preview'}
                    </button>
                    <button
                      onClick={handleReset}
                      className="px-3 py-1 text-sm border border-gray-400 text-gray-600 rounded hover:bg-gray-50"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || !hasChanges}
                      className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </div>

                {/* Variables */}
                <div className="bg-gray-50 p-3 rounded-lg mb-4">
                  <p className="text-xs font-medium text-gray-700 mb-1">Available Variables:</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedTemplate.variables.map((v) => (
                      <code key={v} className="text-xs bg-gray-200 px-2 py-1 rounded cursor-pointer hover:bg-gray-300"
                        onClick={() => {
                          navigator.clipboard.writeText(`{{${v}}}`);
                          setMessage(`Copied {{${v}}} to clipboard`);
                          setTimeout(() => setMessage(''), 2000);
                        }}
                        title="Click to copy"
                      >
                        {`{{${v}}}`}
                      </code>
                    ))}
                  </div>
                </div>

                {/* Subject (DB templates only) */}
                {selectedTemplate.type === 'db' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Subject</label>
                    <input
                      type="text"
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                      placeholder="Email subject line..."
                    />
                  </div>
                )}

                {/* Editor Mode Toggle */}
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium">
                    {selectedTemplate.type === 'jinja' ? 'Template HTML' : 'Email Body'}
                  </label>
                  <div className="flex gap-1 bg-gray-100 p-1 rounded">
                    <button
                      onClick={() => setEditorMode('wysiwyg')}
                      className={`px-3 py-1 text-xs rounded ${editorMode === 'wysiwyg' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                    >
                      Visual Editor
                    </button>
                    <button
                      onClick={() => setEditorMode('html')}
                      className={`px-3 py-1 text-xs rounded ${editorMode === 'html' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}
                    >
                      HTML Code
                    </button>
                  </div>
                </div>

                {/* WYSIWYG Editor or HTML Editor */}
                {editorMode === 'wysiwyg' ? (
                  <div className="border rounded-lg overflow-hidden">
                    <ReactQuill
                      theme="snow"
                      value={editedContent}
                      onChange={setEditedContent}
                      modules={quillModules}
                      className="bg-white"
                      style={{ minHeight: '300px' }}
                    />
                  </div>
                ) : (
                  <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full h-80 border rounded-lg px-3 py-2 font-mono text-sm bg-gray-50"
                    spellCheck={false}
                    placeholder="Enter HTML template content..."
                  />
                )}

                {/* Active toggle (DB templates only) */}
                {selectedTemplate.type === 'db' && (
                  <div className="mt-4 flex items-center justify-between">
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={editedIsActive}
                        onChange={(e) => setEditedIsActive(e.target.checked)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm">Template Active</span>
                    </label>

                    {/* Test Email */}
                    <div className="flex gap-2 items-center">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="test@example.com"
                        className="border rounded px-2 py-1 text-sm w-48"
                      />
                      <button
                        onClick={handleTestEmail}
                        disabled={testingEmail || !testEmail}
                        className="px-3 py-1 text-sm border border-green-600 text-green-600 rounded hover:bg-green-50 disabled:opacity-50"
                      >
                        {testingEmail ? 'Sending...' : 'Send Test'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Preview Panel */}
              {preview && (
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="font-semibold">Preview</h3>
                    <button
                      onClick={() => setPreview(null)}
                      className="text-gray-400 hover:text-gray-600 text-xl"
                    >
                      &times;
                    </button>
                  </div>
                  {preview.subject && (
                    <div className="mb-3">
                      <span className="text-sm font-medium text-gray-700">Subject: </span>
                      <span className="text-sm">{preview.subject}</span>
                    </div>
                  )}
                  <div className="border rounded-lg overflow-hidden">
                    <iframe
                      srcDoc={preview.html}
                      className="w-full h-96 bg-white"
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
              <p>Select a template from the list to edit it</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
