import { useState } from 'react';
import { useIrbBoards } from '../../hooks/useIrb';
import { useReviewQuestions, useCreateReviewQuestion, useDeleteReviewQuestion } from '../../hooks/useIrbAdmin';
import { Plus, Trash2 } from 'lucide-react';
import type { IrbQuestion } from '../../types';

export default function IrbAdminReviewQuestionsTab() {
  const { data: boards } = useIrbBoards();
  const [selectedBoardId, setSelectedBoardId] = useState<string>('');
  const { data: questions, isLoading: questionsLoading } = useReviewQuestions(selectedBoardId);
  const createQuestion = useCreateReviewQuestion();
  const deleteQuestion = useDeleteReviewQuestion();

  const [showAdd, setShowAdd] = useState(false);
  const [formData, setFormData] = useState({ text: '', question_type: 'textarea', required: true, order: 0 });

  const handleCreate = () => {
    if (!selectedBoardId || !formData.text) return;
    // Use first section of the board (review questions need a section)
    // For simplicity, we'll create with section_id = 0 and the backend will handle it
    createQuestion.mutate({
      boardId: selectedBoardId,
      data: {
        section_id: 0, // Will need to select or auto-create
        text: formData.text,
        question_type: formData.question_type,
        required: formData.required,
        order: formData.order,
        question_context: 'review',
      },
    }, {
      onSuccess: () => {
        setShowAdd(false);
        setFormData({ text: '', question_type: 'textarea', required: true, order: 0 });
      },
    });
  };

  const handleDelete = (questionId: number) => {
    if (confirm('Delete this review question?')) {
      deleteQuestion.mutate(questionId);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Review Questions</h2>
        <select
          value={selectedBoardId}
          onChange={(e) => setSelectedBoardId(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm min-w-[200px]"
        >
          <option value="">Select a board...</option>
          {boards?.map((board) => (
            <option key={board.id} value={board.id}>{board.name}</option>
          ))}
        </select>
      </div>

      <p className="text-sm text-gray-500">
        Review questions are answered by IRB reviewers when they submit their review for a submission.
        These are separate from submission questions that applicants answer.
      </p>

      {!selectedBoardId ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          Select a board to manage its review questions
        </div>
      ) : questionsLoading ? (
        <div className="text-center py-8 text-gray-500">Loading questions...</div>
      ) : (
        <>
          <div className="flex justify-end">
            <button
              onClick={() => setShowAdd(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm"
            >
              <Plus className="w-4 h-4" />
              Add Review Question
            </button>
          </div>

          {showAdd && (
            <div className="bg-white rounded-lg shadow p-4 border border-indigo-200">
              <h3 className="font-medium text-gray-800 mb-3">New Review Question</h3>
              <div className="space-y-3">
                <textarea
                  value={formData.text}
                  onChange={(e) => setFormData({ ...formData, text: e.target.value })}
                  placeholder="Enter the review question..."
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  rows={3}
                />
                <div className="flex flex-wrap gap-3">
                  <select
                    value={formData.question_type}
                    onChange={(e) => setFormData({ ...formData, question_type: e.target.value })}
                    className="border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="text">Short Text</option>
                    <option value="textarea">Long Text</option>
                    <option value="select">Select</option>
                    <option value="radio">Radio</option>
                    <option value="checkbox">Checkbox</option>
                    <option value="number">Number</option>
                  </select>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={formData.required}
                      onChange={(e) => setFormData({ ...formData, required: e.target.checked })}
                    />
                    Required
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: Number(e.target.value) })}
                    className="border rounded-lg px-3 py-2 text-sm w-24"
                    placeholder="Order"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!formData.text || createQuestion.isPending}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm disabled:opacity-50"
                  >
                    {createQuestion.isPending ? 'Creating...' : 'Create'}
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

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Question</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Required</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {questions?.map((q: IrbQuestion) => (
                    <tr key={q.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{q.order}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{q.text}</td>
                      <td className="px-4 py-3 text-sm text-gray-500 capitalize">{q.question_type}</td>
                      <td className="px-4 py-3 text-sm">
                        {q.required ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(!questions || questions.length === 0) && (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500 text-sm">
                        No review questions for this board yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
