import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useIrbBoards,
  useCreateIrbSubmission,
  useIrbQuestions,
  useSaveBulkIrbResponses,
  useUploadIrbFile,
  useDeleteIrbFile,
  useSubmitIrbSubmission,
} from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Check, Upload, Trash2 } from 'lucide-react';
import type { SubmissionType, FileType, IrbSubmissionFile } from '../../types';

const STEPS = ['Select Details', 'Answer Questions', 'Upload Files', 'Review & Submit'];

export default function IrbNewSubmissionPage() {
  const navigate = useNavigate();
  const { data: boards, isLoading: boardsLoading } = useIrbBoards();

  const createSubmission = useCreateIrbSubmission();
  const submitSubmission = useSubmitIrbSubmission();
  const saveBulkResponses = useSaveBulkIrbResponses();
  const uploadFile = useUploadIrbFile();
  const deleteFile = useDeleteIrbFile();

  const [step, setStep] = useState(0);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  // Step 1: details
  const [boardId, setBoardId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [submissionType, setSubmissionType] = useState<SubmissionType>('standard');

  // Step 2: questions
  const { data: questions, isLoading: questionsLoading } = useIrbQuestions(
    boardId,
    submissionType === 'exempt' ? 'exempt' : 'standard'
  );
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Step 3: files
  const [uploadedFiles, setUploadedFiles] = useState<IrbSubmissionFile[]>([]);
  const [fileType, setFileType] = useState<FileType>('protocol');

  // Step 1: Create draft submission
  const handleCreateDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createSubmission.mutateAsync({
        board_id: boardId,
        project_id: Number(projectId),
        submission_type: submissionType,
      });
      setSubmissionId(result.id);
      setStep(1);
      toast.success('Draft submission created');
    } catch {
      toast.error('Failed to create submission');
    }
  };

  // Step 2: Save answers
  const handleSaveAnswers = async () => {
    if (!submissionId) return;
    const responses = Object.entries(answers)
      .filter(([, v]) => v.trim())
      .map(([qId, answer]) => ({
        question_id: Number(qId),
        answer,
      }));
    if (responses.length === 0) {
      setStep(2);
      return;
    }
    try {
      await saveBulkResponses.mutateAsync({ submissionId, responses });
      toast.success('Answers saved');
      setStep(2);
    } catch {
      toast.error('Failed to save answers');
    }
  };

  // Step 3: Upload file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!submissionId || !e.target.files?.length) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    formData.append('file_type', fileType);
    try {
      const result = await uploadFile.mutateAsync({ submissionId, formData });
      setUploadedFiles((prev) => [...prev, result]);
      toast.success('File uploaded');
    } catch {
      toast.error('Failed to upload file');
    }
    e.target.value = '';
  };

  const handleDeleteFile = async (fileId: number) => {
    if (!submissionId) return;
    try {
      await deleteFile.mutateAsync({ submissionId, fileId });
      setUploadedFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success('File removed');
    } catch {
      toast.error('Failed to remove file');
    }
  };

  // Step 4: Submit
  const handleSubmit = async () => {
    if (!submissionId) return;
    try {
      await submitSubmission.mutateAsync(submissionId);
      toast.success('Submission submitted successfully!');
      navigate(`/irb/submissions/${submissionId}`);
    } catch {
      toast.error('Failed to submit');
    }
  };

  if (boardsLoading) {
    return <div className="text-center py-12 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <button
          onClick={() => navigate('/irb/submissions')}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submissions
        </button>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">New Submission</h1>
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2 shrink-0">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i < step
                  ? 'bg-green-600 text-white'
                  : i === step
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-500'
              }`}
            >
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span
              className={`text-sm ${
                i === step ? 'font-medium text-gray-900' : 'text-gray-500'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <div className="w-8 h-px bg-gray-300" />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Details */}
      {step === 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Select Submission Details</h2>
          <form onSubmit={handleCreateDraft} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Board</label>
              <select
                required
                value={boardId}
                onChange={(e) => setBoardId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a board...</option>
                {boards?.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.board_type === 'irb' ? 'IRB' : 'Research Council'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project ID</label>
              <input
                type="number"
                required
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your project ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Submission Type</label>
              <select
                value={submissionType}
                onChange={(e) => setSubmissionType(e.target.value as SubmissionType)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="standard">Standard</option>
                <option value="exempt">Exempt</option>
              </select>
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={createSubmission.isPending}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createSubmission.isPending ? 'Creating...' : 'Create Draft & Continue'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 2: Answer Questions */}
      {step === 1 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Answer Questions</h2>
          {questionsLoading ? (
            <p className="text-gray-500">Loading questions...</p>
          ) : questions && questions.length > 0 ? (
            <div className="space-y-4">
              {questions
                .filter((q) => q.is_active)
                .sort((a, b) => a.order - b.order)
                .map((q) => (
                  <div key={q.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {q.text}
                      {q.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {q.description && (
                      <p className="text-xs text-gray-400 mb-1">{q.description}</p>
                    )}
                    {q.question_type === 'textarea' ? (
                      <textarea
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        rows={3}
                      />
                    ) : q.question_type === 'select' || q.question_type === 'radio' ? (
                      <select
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Select...</option>
                        {Array.isArray(q.options) &&
                          q.options.map((opt, idx) => (
                            <option key={idx} value={String(opt)}>
                              {String(opt)}
                            </option>
                          ))}
                      </select>
                    ) : q.question_type === 'checkbox' ? (
                      <div className="space-y-1">
                        {Array.isArray(q.options) &&
                          q.options.map((opt, idx) => {
                            const currentVals = (answers[q.id] || '').split(',').filter(Boolean);
                            const optStr = String(opt);
                            return (
                              <label key={idx} className="flex items-center gap-2 text-sm text-gray-700">
                                <input
                                  type="checkbox"
                                  checked={currentVals.includes(optStr)}
                                  onChange={(e) => {
                                    const newVals = e.target.checked
                                      ? [...currentVals, optStr]
                                      : currentVals.filter((v) => v !== optStr);
                                    setAnswers({ ...answers, [q.id]: newVals.join(',') });
                                  }}
                                  className="rounded border-gray-300"
                                />
                                {optStr}
                              </label>
                            );
                          })}
                      </div>
                    ) : q.question_type === 'date' ? (
                      <input
                        type="date"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : q.question_type === 'number' ? (
                      <input
                        type="number"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <input
                        type="text"
                        value={answers[q.id] || ''}
                        onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No questions configured for this board yet. You can skip this step.</p>
          )}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(0)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleSaveAnswers}
              disabled={saveBulkResponses.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {saveBulkResponses.isPending ? 'Saving...' : 'Save & Continue'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Upload Files */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Upload Files</h2>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">File Type</label>
                <select
                  value={fileType}
                  onChange={(e) => setFileType(e.target.value as FileType)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="protocol">Protocol</option>
                  <option value="consent_form">Consent Form</option>
                  <option value="supporting_doc">Supporting Document</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  Upload File
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploadFile.isPending}
                  />
                </label>
              </div>
            </div>
            {uploadFile.isPending && (
              <p className="text-sm text-blue-600">Uploading...</p>
            )}

            {uploadedFiles.length > 0 ? (
              <div className="space-y-2">
                {uploadedFiles.map((file) => (
                  <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                      <p className="text-xs text-gray-500">{file.file_type.replace(/_/g, ' ')}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-400 hover:text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No files uploaded yet. Files are optional.</p>
            )}
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Continue to Review
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Review & Submit */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Review & Submit</h2>

          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-gray-50 rounded-lg space-y-2">
              <h3 className="text-sm font-medium text-gray-700">Submission Details</h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div>
                  <dt className="text-gray-500">Board</dt>
                  <dd className="font-medium text-gray-900">
                    {boards?.find((b) => b.id === boardId)?.name || boardId}
                  </dd>
                </div>
                <div>
                  <dt className="text-gray-500">Project ID</dt>
                  <dd className="font-medium text-gray-900">#{projectId}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Type</dt>
                  <dd className="font-medium text-gray-900 capitalize">{submissionType}</dd>
                </div>
                <div>
                  <dt className="text-gray-500">Draft ID</dt>
                  <dd className="font-medium text-gray-900 font-mono text-xs">
                    {submissionId?.slice(0, 12)}...
                  </dd>
                </div>
              </dl>
            </div>

            {/* Answers summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Answers</h3>
              {Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length > 0 ? (
                <p className="text-sm text-gray-600">
                  {Object.keys(answers).filter((k) => answers[Number(k)]?.trim()).length} question(s) answered
                </p>
              ) : (
                <p className="text-sm text-gray-400">No answers provided.</p>
              )}
            </div>

            {/* Files summary */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Files</h3>
              {uploadedFiles.length > 0 ? (
                <p className="text-sm text-gray-600">{uploadedFiles.length} file(s) uploaded</p>
              ) : (
                <p className="text-sm text-gray-400">No files uploaded.</p>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-6">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
            >
              Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitSubmission.isPending}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {submitSubmission.isPending ? 'Submitting...' : 'Submit for Review'}
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
