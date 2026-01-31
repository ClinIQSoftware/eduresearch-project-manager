import { useState } from 'react';
import { useIrbMembers, useAddIrbMember, useUpdateIrbMember, useRemoveIrbMember } from '../../hooks/useIrbAdmin';
import { useQuery } from '@tanstack/react-query';
import { getUsers } from '../../api/admin';
import { queryKeys } from '../../utils/queryKeys';
import type { IrbRole } from '../../types';
import { UserPlus, Trash2, Edit2 } from 'lucide-react';

export default function IrbAdminMembersTab() {
  const { data: members, isLoading } = useIrbMembers();
  const addMember = useAddIrbMember();
  const updateMember = useUpdateIrbMember();
  const removeMember = useRemoveIrbMember();

  const [showAdd, setShowAdd] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<IrbRole>('member');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editRole, setEditRole] = useState<IrbRole>('member');

  // Fetch users for the add modal
  const { data: usersResponse } = useQuery({
    queryKey: queryKeys.admin.users.list(),
    queryFn: () => getUsers(),
    enabled: showAdd,
  });
  const allUsers = usersResponse?.data ?? [];

  const handleAdd = () => {
    if (!selectedUserId) return;
    addMember.mutate({ user_id: selectedUserId, irb_role: selectedRole }, {
      onSuccess: () => {
        setShowAdd(false);
        setSelectedUserId(null);
        setSelectedRole('member');
      },
    });
  };

  const handleUpdate = (userId: number) => {
    updateMember.mutate({ userId, irb_role: editRole }, {
      onSuccess: () => setEditingId(null),
    });
  };

  const handleRemove = (userId: number) => {
    if (confirm('Remove this member\'s IRB role?')) {
      removeMember.mutate(userId);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading members...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-800">IRB Members ({members?.length ?? 0})</h2>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add Member
        </button>
      </div>

      {/* Add member form */}
      {showAdd && (
        <div className="bg-white rounded-lg shadow p-4 border border-indigo-200">
          <h3 className="font-medium text-gray-800 mb-3">Add IRB Member</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedUserId ?? ''}
              onChange={(e) => setSelectedUserId(Number(e.target.value))}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Select a user...</option>
              {allUsers
                .filter((u) => !members?.some((m) => m.id === u.id))
                .map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.first_name} {u.last_name} ({u.email})
                  </option>
                ))}
            </select>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as IrbRole)}
              className="border rounded-lg px-3 py-2 text-sm"
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
            <div className="flex gap-2">
              <button
                onClick={handleAdd}
                disabled={!selectedUserId || addMember.isPending}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
              >
                {addMember.isPending ? 'Adding...' : 'Add'}
              </button>
              <button
                onClick={() => setShowAdd(false)}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Members table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Boards</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviews</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {members?.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {member.first_name} {member.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{member.email}</td>
                  <td className="px-4 py-3 text-sm">
                    {editingId === member.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editRole}
                          onChange={(e) => setEditRole(e.target.value as IrbRole)}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="member">Member</option>
                          <option value="admin">Admin</option>
                        </select>
                        <button
                          onClick={() => handleUpdate(member.id)}
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-gray-400 hover:text-gray-600 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        member.irb_role === 'admin'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {member.irb_role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {member.boards.length > 0
                      ? member.boards.map((b) => b.board_name).join(', ')
                      : 'None'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <span className="text-yellow-600">{member.pending_reviews} pending</span>
                    {' / '}
                    <span className="text-green-600">{member.completed_reviews} done</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => { setEditingId(member.id); setEditRole(member.irb_role ?? 'member'); }}
                        className="text-gray-400 hover:text-indigo-600"
                        title="Edit role"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRemove(member.id)}
                        className="text-gray-400 hover:text-red-600"
                        title="Remove"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {(!members || members.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                    No IRB members yet. Add members to get started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
