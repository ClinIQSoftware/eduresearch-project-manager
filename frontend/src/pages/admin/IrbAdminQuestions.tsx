import { useState } from 'react';
import {
  useIrbBoards,
  useIrbSections,
  useCreateIrbSection,
  useDeleteIrbSection,
  useIrbQuestions,
  useCreateIrbQuestion,
  useUpdateIrbQuestion,
  useDeleteIrbQuestion,
} from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import type { QuestionType, SubmissionTypeFilter } from '../../types';

export default function IrbAdminQuestions() {
  const { data: boards, isLoading: boardsLoading } = useIrbBoards();
  const [selectedBoardId, setSelectedBoardId] = useState('');

  if (boardsLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-800">IRB Questions</h2>
      </div>

      {/* Board selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Board</label>
        <select
          value={selectedBoardId}
          onChange={(e) => setSelectedBoardId(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a board...</option>
          {boards?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.board_type === 'irb' ? 'IRB' : 'Research Council'})
            </option>
          ))}
        </select>
      </div>

      {selectedBoardId && <SectionsManager boardId={selectedBoardId} />}
    </div>
  );
}

function SectionsManager({ boardId }: { boardId: string }) {
  const { data: sections, isLoading } = useIrbSections(boardId);
  const createSection = useCreateIrbSection();
  const deleteSection = useDeleteIrbSection();

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '', order: '0' });
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSection.mutateAsync({
        boardId,
        data: {
          name: createForm.name,
          slug: createForm.slug || createForm.name.toLowerCase().replace(/\s+/g, '_'),
          description: createForm.description || undefined,
          order: Number(createForm.order) || 0,
        },
      });
      toast.success('Section created');
      setShowCreate(false);
      setCreateForm({ name: '', slug: '', description: '', order: '0' });
    } catch {
      toast.error('Failed to create section');
    }
  };

  const handleDelete = async (sectionId: number) => {
    if (!confirm('Delete this section and all its questions?')) return;
    try {
      await deleteSection.mutateAsync({ boardId, sectionId });
      toast.success('Section deleted');
    } catch {
      toast.error('Failed to delete section');
    }
  };

  if (isLoading) return <p className="text-sm text-gray-400">Loading sections...</p>;

  const sorted = [...(sections || [])].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Sections</h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-3 h-3" />
          Add Section
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-gray-50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
              <input
                required
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
              <input
                value={createForm.slug}
                onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="auto-generated"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
              <input
                type="number"
                value={createForm.order}
                onChange={(e) => setCreateForm({ ...createForm, order: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={createSection.isPending} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded-lg hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400">No sections yet. Add one to start creating questions.</p>
      ) : (
        <div className="space-y-2">
          {sorted.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow">
              <button
                onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
                className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-2">
                  {expandedSection === section.id ? (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="font-medium text-gray-900 text-sm">{section.name}</span>
                  <span className="text-xs text-gray-400">({section.slug})</span>
                  <span className="text-xs text-gray-400">Order: {section.order}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(section.id);
                  }}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </button>
              {expandedSection === section.id && (
                <div className="px-3 pb-3">
                  <QuestionsManager boardId={boardId} sectionId={section.id} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionsManager({ boardId, sectionId }: { boardId: string; sectionId: number }) {
  const { data: allQuestions, isLoading } = useIrbQuestions(boardId);
  const createQuestion = useCreateIrbQuestion();
  const updateQuestion = useUpdateIrbQuestion();
  const deleteQuestion = useDeleteIrbQuestion();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    text: '',
    description: '',
    question_type: 'text' as QuestionType,
    required: false,
    order: '0',
    submission_type: 'both' as SubmissionTypeFilter,
    options: '',
  });

  const questions = (allQuestions || [])
    .filter((q) => q.section_id === sectionId)
    .sort((a, b) => a.order - b.order);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = form.options
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await createQuestion.mutateAsync({
        boardId,
        data: {
          section_id: sectionId,
          text: form.text,
          description: form.description || undefined,
          question_type: form.question_type,
          required: form.required,
          order: Number(form.order) || 0,
          submission_type: form.submission_type,
          options: opts.length > 0 ? opts : undefined,
        },
      });
      toast.success('Question created');
      setShowCreate(false);
      setForm({ text: '', description: '', question_type: 'text', required: false, order: '0', submission_type: 'both', options: '' });
    } catch {
      toast.error('Failed to create question');
    }
  };

  const handleToggleActive = async (questionId: number, isActive: boolean) => {
    try {
      await updateQuestion.mutateAsync({ boardId, questionId, data: { is_active: !isActive } });
      toast.success(isActive ? 'Question deactivated' : 'Question activated');
    } catch {
      toast.error('Failed to update question');
    }
  };

  const handleDelete = async (questionId: number) => {
    try {
      await deleteQuestion.mutateAsync({ boardId, questionId });
      toast.success('Question deleted');
    } catch {
      toast.error('Failed to delete question');
    }
  };

  if (isLoading) return <p className="text-xs text-gray-400">Loading questions...</p>;

  return (
    <div className="space-y-3 mt-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-gray-500">{questions.length} question(s)</span>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
        >
          <Plus className="w-3 h-3" />
          Add Question
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-blue-50 rounded-lg p-3 space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Question Text</label>
            <input
              required
              value={form.text}
              onChange={(e) => setForm({ ...form, text: e.target.value })}
              className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select
                value={form.question_type}
                onChange={(e) => setForm({ ...form, question_type: e.target.value as QuestionType })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="text">Text</option>
                <option value="textarea">Textarea</option>
                <option value="select">Select</option>
                <option value="radio">Radio</option>
                <option value="checkbox">Checkbox</option>
                <option value="date">Date</option>
                <option value="number">Number</option>
                <option value="file_upload">File Upload</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">For</label>
              <select
                value={form.submission_type}
                onChange={(e) => setForm({ ...form, submission_type: e.target.value as SubmissionTypeFilter })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="both">Both</option>
                <option value="standard">Standard</option>
                <option value="exempt">Exempt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Order</label>
              <input
                type="number"
                value={form.order}
                onChange={(e) => setForm({ ...form, order: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-1.5 text-xs text-gray-700">
                <input
                  type="checkbox"
                  checked={form.required}
                  onChange={(e) => setForm({ ...form, required: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Required
              </label>
            </div>
          </div>
          {['select', 'radio', 'checkbox'].includes(form.question_type) && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Options (one per line)</label>
              <textarea
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder={"Option 1\nOption 2\nOption 3"}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button type="submit" disabled={createQuestion.isPending} className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50">
              Create
            </button>
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </form>
      )}

      {questions.length > 0 ? (
        <div className="space-y-1">
          {questions.map((q) => (
            <div
              key={q.id}
              className={`flex items-start justify-between p-2 rounded-lg text-sm ${
                q.is_active ? 'bg-gray-50' : 'bg-gray-50 opacity-50'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-800 text-sm">{q.text}</span>
                  {q.required && <span className="text-red-500 text-xs">Required</span>}
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                  <span className="capitalize">{q.question_type}</span>
                  <span>&middot;</span>
                  <span>{q.submission_type}</span>
                  <span>&middot;</span>
                  <span>Order {q.order}</span>
                  {q.conditions.length > 0 && (
                    <>
                      <span>&middot;</span>
                      <span className="text-purple-500">{q.conditions.length} condition(s)</span>
                    </>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 ml-2">
                <button
                  onClick={() => handleToggleActive(q.id, q.is_active)}
                  className={`px-2 py-0.5 text-xs rounded ${
                    q.is_active
                      ? 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                      : 'bg-green-100 text-green-700 hover:bg-green-200'
                  }`}
                >
                  {q.is_active ? 'Disable' : 'Enable'}
                </button>
                <button
                  onClick={() => handleDelete(q.id)}
                  className="p-1 text-gray-400 hover:text-red-500"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400">No questions in this section.</p>
      )}
    </div>
  );
}
