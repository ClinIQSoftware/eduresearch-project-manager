import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useIrbBoard,
  useIrbBoardMembers,
  useAddIrbBoardMember,
  useRemoveIrbBoardMember,
  useIrbSections,
  useCreateIrbSection,
} from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Users, List } from 'lucide-react';
import type { BoardMemberRole } from '../../types';

export default function IrbBoardDetailPage() {
  const { id: boardId } = useParams<{ id: string }>();
  const { data: board, isLoading: boardLoading } = useIrbBoard(boardId || '');
  const { data: members, isLoading: membersLoading } = useIrbBoardMembers(boardId || '');
  const { data: sections, isLoading: sectionsLoading } = useIrbSections(boardId || '');
  const addMember = useAddIrbBoardMember();
  const removeMember = useRemoveIrbBoardMember();
  const createSection = useCreateIrbSection();

  const [memberForm, setMemberForm] = useState({ user_id: '', role: 'associate_reviewer' as BoardMemberRole });
  const [sectionForm, setSectionForm] = useState({ name: '', slug: '', description: '', order: '' });

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return;
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

  const handleRemoveMember = async (memberId: number) => {
    if (!boardId) return;
    try {
      await removeMember.mutateAsync({ boardId, memberId });
      toast.success('Member removed');
    } catch {
      toast.error('Failed to remove member');
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!boardId) return;
    try {
      await createSection.mutateAsync({
        boardId,
        data: {
          name: sectionForm.name,
          slug: sectionForm.slug,
          description: sectionForm.description || undefined,
          order: sectionForm.order ? Number(sectionForm.order) : undefined,
        },
      });
      toast.success('Section created');
      setSectionForm({ name: '', slug: '', description: '', order: '' });
    } catch {
      toast.error('Failed to create section');
    }
  };

  if (boardLoading || membersLoading || sectionsLoading) {
    return <div className="text-center py-12 text-gray-500">Loading board details...</div>;
  }

  if (!board) {
    return <div className="text-center py-12 text-red-500">Board not found.</div>;
  }

  const roleColors: Record<BoardMemberRole, string> = {
    coordinator: 'bg-blue-100 text-blue-700',
    main_reviewer: 'bg-purple-100 text-purple-700',
    associate_reviewer: 'bg-green-100 text-green-700',
    statistician: 'bg-orange-100 text-orange-700',
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Link to="/irb/boards" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Boards
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">{board.name}</h1>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              board.board_type === 'irb' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
            }`}
          >
            {board.board_type === 'irb' ? 'IRB' : 'Research Council'}
          </span>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              board.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            {board.is_active ? 'Active' : 'Inactive'}
          </span>
        </div>
        {board.description && <p className="text-sm text-gray-500 mt-1">{board.description}</p>}
      </div>

      {/* Members Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Members</h2>
        </div>

        {members && members.length > 0 ? (
          <div className="space-y-2 mb-6">
            {members.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {member.user_name || `User #${member.user_id}`}
                    </p>
                    {member.user_email && (
                      <p className="text-xs text-gray-500">{member.user_email}</p>
                    )}
                  </div>
                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${roleColors[member.role]}`}>
                    {member.role.replace(/_/g, ' ')}
                  </span>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-red-400 hover:text-red-600"
                  title="Remove member"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-6">No members yet.</p>
        )}

        {/* Add Member Form */}
        <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
            <input
              type="number"
              required
              value={memberForm.user_id}
              onChange={(e) => setMemberForm({ ...memberForm, user_id: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter user ID"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={memberForm.role}
              onChange={(e) => setMemberForm({ ...memberForm, role: e.target.value as BoardMemberRole })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="coordinator">Coordinator</option>
              <option value="main_reviewer">Main Reviewer</option>
              <option value="associate_reviewer">Associate Reviewer</option>
              <option value="statistician">Statistician</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={addMember.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              {addMember.isPending ? 'Adding...' : 'Add'}
            </button>
          </div>
        </form>
      </div>

      {/* Sections Section */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <List className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-800">Question Sections</h2>
        </div>

        {sections && sections.length > 0 ? (
          <div className="space-y-2 mb-6">
            {sections.map((section) => (
              <div key={section.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{section.name}</p>
                  <p className="text-xs text-gray-500">
                    slug: {section.slug} &middot; order: {section.order}
                  </p>
                  {section.description && (
                    <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-6">No question sections yet.</p>
        )}

        {/* Create Section Form */}
        <form onSubmit={handleCreateSection} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section Name</label>
              <input
                type="text"
                required
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Study Information"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                required
                value={sectionForm.slug}
                onChange={(e) => setSectionForm({ ...sectionForm, slug: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. study-info"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
              <input
                type="text"
                value={sectionForm.description}
                onChange={(e) => setSectionForm({ ...sectionForm, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional description"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Order (optional)</label>
              <input
                type="number"
                value={sectionForm.order}
                onChange={(e) => setSectionForm({ ...sectionForm, order: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 1"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createSection.isPending}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="w-4 h-4" />
            {createSection.isPending ? 'Creating...' : 'Add Section'}
          </button>
        </form>
      </div>
    </div>
  );
}
