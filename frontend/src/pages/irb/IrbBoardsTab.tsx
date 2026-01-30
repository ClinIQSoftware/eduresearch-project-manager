import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIrbBoards, useCreateIrbBoard } from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { Plus, X, Users, FileText } from 'lucide-react';
import type { BoardType } from '../../types';

export default function IrbBoardsTab() {
  const { data: boards, isLoading, error } = useIrbBoards();
  const createBoard = useCreateIrbBoard();
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    board_type: 'irb' as BoardType,
    institution_id: '',
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBoard.mutateAsync({
        name: formData.name,
        description: formData.description || undefined,
        board_type: formData.board_type,
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
      });
      toast.success('Board created successfully');
      setShowModal(false);
      setFormData({ name: '', description: '', board_type: 'irb', institution_id: '' });
    } catch {
      toast.error('Failed to create board');
    }
  };

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading boards...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Failed to load boards.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">IRB Boards</h2>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Create Board
        </button>
      </div>

      {boards && boards.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => (
            <Link
              key={board.id}
              to={`/irb/boards/${board.id}`}
              className="bg-white rounded-lg shadow p-4 sm:p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-base font-semibold text-gray-900 truncate">{board.name}</h3>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${
                    board.board_type === 'irb'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
                  {board.board_type === 'irb' ? 'IRB' : 'Research Council'}
                </span>
              </div>
              {board.description && (
                <p className="text-sm text-gray-500 mt-2 line-clamp-2">{board.description}</p>
              )}
              <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  {board.members_count} members
                </span>
                <span className="flex items-center gap-1">
                  <FileText className="w-4 h-4" />
                  {board.submissions_count} submissions
                </span>
              </div>
              <div className="mt-3">
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                    board.is_active
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {board.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>No boards yet. Create your first IRB board to get started.</p>
        </div>
      )}

      {/* Create Board Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Board</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. University IRB"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Board Type</label>
                <select
                  value={formData.board_type}
                  onChange={(e) => setFormData({ ...formData, board_type: e.target.value as BoardType })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="irb">IRB</option>
                  <option value="research_council">Research Council</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Institution ID (optional)</label>
                <input
                  type="number"
                  value={formData.institution_id}
                  onChange={(e) => setFormData({ ...formData, institution_id: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Leave empty if not institution-specific"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createBoard.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createBoard.isPending ? 'Creating...' : 'Create Board'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
