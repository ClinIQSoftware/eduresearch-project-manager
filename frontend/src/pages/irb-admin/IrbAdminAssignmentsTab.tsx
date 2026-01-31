import { useState } from 'react';
import { useAdminSubmissions, useAdminAssignReviewers, useIrbMembers } from '../../hooks/useIrbAdmin';
import { useIrbBoards } from '../../hooks/useIrb';
import type { IrbSubmission } from '../../types';
import { UserPlus } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-yellow-100 text-yellow-700',
  in_triage: 'bg-orange-100 text-orange-700',
  assigned_to_main: 'bg-blue-100 text-blue-700',
  under_review: 'bg-indigo-100 text-indigo-700',
  decision_made: 'bg-purple-100 text-purple-700',
  accepted: 'bg-green-100 text-green-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  declined: 'bg-red-100 text-red-700',
};

export default function IrbAdminAssignmentsTab() {
  const { data: boards } = useIrbBoards();
  const { data: members } = useIrbMembers();
  const [boardFilter, setBoardFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: submissions, isLoading } = useAdminSubmissions({
    board_id: boardFilter || undefined,
    status: statusFilter || undefined,
  });
  const assignReviewers = useAdminAssignReviewers();

  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [selectedReviewers, setSelectedReviewers] = useState<number[]>([]);

  const handleAssign = (submissionId: string) => {
    if (selectedReviewers.length === 0) return;
    assignReviewers.mutate(
      { submissionId, reviewerIds: selectedReviewers },
      { onSuccess: () => { setAssigningId(null); setSelectedReviewers([]); } }
    );
  };

  const toggleReviewer = (userId: number) => {
    setSelectedReviewers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">Submission Assignments</h2>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={boardFilter}
          onChange={(e) => setBoardFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Boards</option>
          {boards?.map((board) => (
            <option key={board.id} value={board.id}>{board.name}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="submitted">Submitted</option>
          <option value="in_triage">In Triage</option>
          <option value="assigned_to_main">Assigned to Main</option>
          <option value="under_review">Under Review</option>
          <option value="decision_made">Decision Made</option>
          <option value="accepted">Accepted</option>
          <option value="revision_requested">Revision Requested</option>
          <option value="declined">Declined</option>
        </select>
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-gray-500">Loading submissions...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submission</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Main Reviewer</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {submissions?.map((sub: IrbSubmission) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <span className="font-mono text-xs text-gray-500">{sub.id.slice(0, 8)}...</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 capitalize">{sub.submission_type}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sub.status] || 'bg-gray-100 text-gray-700'}`}>
                        {sub.status.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : 'Draft'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {sub.main_reviewer_id ?? 'Unassigned'}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {assigningId === sub.id ? (
                        <div className="space-y-2 text-left">
                          <div className="max-h-32 overflow-y-auto border rounded p-2">
                            {members?.map((m) => (
                              <label key={m.id} className="flex items-center gap-2 text-xs py-0.5">
                                <input
                                  type="checkbox"
                                  checked={selectedReviewers.includes(m.id)}
                                  onChange={() => toggleReviewer(m.id)}
                                />
                                {m.first_name} {m.last_name}
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleAssign(sub.id)}
                              disabled={selectedReviewers.length === 0 || assignReviewers.isPending}
                              className="bg-indigo-600 text-white px-2 py-1 rounded text-xs disabled:opacity-50"
                            >
                              Assign
                            </button>
                            <button
                              onClick={() => { setAssigningId(null); setSelectedReviewers([]); }}
                              className="border text-gray-600 px-2 py-1 rounded text-xs"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setAssigningId(sub.id); setSelectedReviewers([]); }}
                          className="text-indigo-600 hover:text-indigo-800"
                          title="Assign reviewers"
                        >
                          <UserPlus className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!submissions || submissions.length === 0) && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">
                      No submissions found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
