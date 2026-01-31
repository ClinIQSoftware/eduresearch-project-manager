import { useState } from 'react';
import {
  useIrbBoards,
  useCreateIrbBoard,
  useUpdateIrbBoard,
  useDeleteIrbBoard,
  useIrbBoardMembers,
  useAddIrbBoardMember,
  useRemoveIrbBoardMember,
} from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { Plus, Trash2, Users, X } from 'lucide-react';
import type { BoardType, BoardMemberRole } from '../../types';

export default function IrbAdminBoards() {
  const { data: boards, isLoading } = useIrbBoards();
  const createBoard = useCreateIrbBoard();
  const updateBoard = useUpdateIrbBoard();
  const deleteBoard = useDeleteIrbBoard();

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
    board_type: 'irb' as BoardType,
    institution_id: '',
  });

  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'associate_reviewer' as BoardMemberRole });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBoard.mutateAsync({
        name: createForm.name,
        description: createForm.description || undefined,
        board_type: createForm.board_type,
        institution_id: createForm.institution_id ? Number(createForm.institution_id) : undefined,
      });
      toast.success('Board created');
      setShowCreate(false);
      setCreateForm({ name: '', description: '', board_type: 'irb', institution_id: '' });
    } catch {
      toast.error('Failed to create board');
    }
  };

  const handleToggleActive = async (boardId: string, currentlyActive: boolean) => {
    try {
      await updateBoard.mutateAsync({ boardId, data: { is_active: !currentlyActive } });
      toast.success(currentlyActive ? 'Board deactivated' : 'Board activated');
    } catch {
      toast.error('Failed to update board');
    }
  };

  const handleDelete = async (boardId: string) => {
    if (!confirm('Delete this board? This will remove all associated data.')) return;
    try {
      await deleteBoard.mutateAsync(boardId);
      toast.success('Board deleted');
      if (selectedBoardId === boardId) setSelectedBoardId(null);
    } catch {
      toast.error('Failed to delete board');
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading boards...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">IRB Boards</h2>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          New Board
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Board name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={createForm.board_type}
                onChange={(e) => setCreateForm({ ...createForm, board_type: e.target.value as BoardType })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="irb">IRB</option>
                <option value="research_council">Research Council</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
            />
          </div>
          {createForm.board_type === 'research_council' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Institution ID</label>
              <input
                type="number"
                value={createForm.institution_id}
                onChange={(e) => setCreateForm({ ...createForm, institution_id: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Required for Research Council"
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createBoard.isPending}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createBoard.isPending ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Boards List */}
      {boards && boards.length > 0 ? (
        <div className="space-y-3">
          {boards.map((board) => (
            <div key={board.id} className="bg-white rounded-lg shadow p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium text-gray-900">{board.name}</h3>
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      {board.board_type === 'irb' ? 'IRB' : 'Research Council'}
                    </span>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                        board.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {board.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {board.description && (
                    <p className="text-sm text-gray-500 mt-1">{board.description}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {board.members_count} member(s) &middot; {board.submissions_count} submission(s)
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => setSelectedBoardId(selectedBoardId === board.id ? null : board.id)}
                    className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50"
                    title="Manage members"
                  >
                    <Users className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(board.id, board.is_active)}
                    className={`px-3 py-1 text-xs rounded-lg ${
                      board.is_active
                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {board.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => handleDelete(board.id)}
                    className="p-2 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                    title="Delete board"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Members panel */}
              {selectedBoardId === board.id && (
                <BoardMembersPanel
                  boardId={board.id}
                  memberForm={memberForm}
                  setMemberForm={setMemberForm}
                />
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">No boards configured yet. Create one to get started.</p>
        </div>
      )}
    </div>
  );
}

function BoardMembersPanel({
  boardId,
  memberForm,
  setMemberForm,
}: {
  boardId: string;
  memberForm: { user_id: string; role: BoardMemberRole };
  setMemberForm: (f: { user_id: string; role: BoardMemberRole }) => void;
}) {
  const { data: members, isLoading } = useIrbBoardMembers(boardId);
  const addMember = useAddIrbBoardMember();
  const removeMember = useRemoveIrbBoardMember();

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addMember.mutateAsync({
        boardId,
        data: { user_id: Number(memberForm.user_id), role: memberForm.role },
      });
      toast.success('Member added');
      setMemberForm({ user_id: '', role: 'associate_reviewer' });
    } catch {
      toast.error('Failed to add member');
    }
  };

  const handleRemove = async (memberId: number) => {
    try {
      await removeMember.mutateAsync({ boardId, memberId });
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  return (
    <div className="mt-4 pt-4 border-t border-gray-100">
      <h4 className="text-sm font-medium text-gray-700 mb-3">Board Members</h4>

      {/* Add member form */}
      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2 mb-3">
        <input
          type="number"
          required
          value={memberForm.user_id}
          onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="User ID"
        />
        <select
          value={memberForm.role}
          onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as BoardMemberRole })}
          className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="coordinator">Coordinator</option>
          <option value="main_reviewer">Main Reviewer</option>
          <option value="associate_reviewer">Associate Reviewer</option>
          <option value="statistician">Statistician</option>
        </select>
        <button
          type="submit"
          disabled={addMember.isPending}
          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>

      {/* Members list */}
      {isLoading ? (
        <p className="text-sm text-gray-400">Loading members...</p>
      ) : members && members.length > 0 ? (
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="text-sm">
                <span className="font-medium text-gray-900">
                  {m.user_name || `User #${m.user_id}`}
                </span>
                {m.user_email && (
                  <span className="text-gray-400 ml-2">{m.user_email}</span>
                )}
                <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-50 text-blue-600 capitalize">
                  {m.role.replace(/_/g, ' ')}
                </span>
              </div>
              <button
                onClick={() => handleRemove(m.id)}
                className="p-1 text-gray-400 hover:text-red-500"
                title="Remove member"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-400">No members yet.</p>
      )}
    </div>
  );
}
