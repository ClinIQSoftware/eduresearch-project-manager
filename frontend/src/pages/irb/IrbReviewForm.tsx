import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useIrbSubmission, useCreateIrbReview } from '../../hooks/useIrb';
import { useReviewQuestions } from '../../hooks/useIrbAdmin';
import SubmissionTimeline from '../../components/irb/SubmissionTimeline';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, MessageSquare, Scale } from 'lucide-react';
import type { Recommendation, SubmissionStatus } from '../../types';

const STATUS_COLORS: Record<SubmissionStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  in_triage: 'bg-yellow-100 text-yellow-700',
  assigned_to_main: 'bg-purple-100 text-purple-700',
  under_review: 'bg-orange-100 text-orange-700',
  decision_made: 'bg-indigo-100 text-indigo-700',
  accepted: 'bg-green-100 text-green-700',
  revision_requested: 'bg-amber-100 text-amber-700',
  declined: 'bg-red-100 text-red-700',
};

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function IrbReviewForm() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { data: submission, isLoading, error } = useIrbSubmission(submissionId || '');
  const createReviewMutation = useCreateIrbReview();

  const { data: reviewQuestions } = useReviewQuestions(submission?.board_id || '');
  const [reviewAnswers, setReviewAnswers] = useState<Record<number, string>>({});

  const [form, setForm] = useState({
    recommendation: 'accept' as Recommendation,
    comments: '',
    feedback_to_submitter: '',
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading submission...</div>;
  }

  if (error || !submission) {
    return <div className="text-center py-12 text-red-500">Submission not found.</div>;
  }

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const review_responses = Object.entries(reviewAnswers)
        .filter(([, answer]) => answer.trim())
        .map(([questionId, answer]) => ({ question_id: Number(questionId), answer }));

      await createReviewMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          recommendation: form.recommendation,
          comments: form.comments || undefined,
          feedback_to_submitter: form.feedback_to_submitter || undefined,
          review_responses: review_responses.length > 0 ? review_responses : undefined,
        },
      });
      toast.success('Review submitted successfully');
      navigate('/irb/reviews');
    } catch {
      toast.error('Failed to submit review');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/irb/reviews"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Review Queue
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Review Submission</h1>
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[submission.status]}`}
          >
            {formatStatus(submission.status)}
          </span>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Progress</h2>
        <SubmissionTimeline currentStatus={submission.status} history={submission.history || []} />
      </div>

      {/* Submission Summary */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Submission Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">Submission ID</dt>
            <dd className="font-medium text-gray-900 font-mono text-xs">{submission.id.slice(0, 12)}...</dd>
          </div>
          <div>
            <dt className="text-gray-500">Project</dt>
            <dd className="font-medium text-gray-900">#{submission.project_id}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Type</dt>
            <dd className="font-medium text-gray-900 capitalize">{submission.submission_type}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Version</dt>
            <dd className="font-medium text-gray-900">v{submission.version}</dd>
          </div>
          <div>
            <dt className="text-gray-500">Submitted By</dt>
            <dd className="font-medium text-gray-900">User #{submission.submitted_by_id}</dd>
          </div>
          {submission.submitted_at && (
            <div>
              <dt className="text-gray-500">Submitted At</dt>
              <dd className="font-medium text-gray-900">
                {new Date(submission.submitted_at).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {/* Protocol / AI Summary */}
      {submission.ai_summary && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-3">AI Summary</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{submission.ai_summary}</p>
        </div>
      )}

      {/* Responses */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Responses</h2>
        </div>
        {submission.responses && submission.responses.length > 0 ? (
          <div className="space-y-3">
            {submission.responses.map((resp) => (
              <div key={resp.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">Question #{resp.question_id}</span>
                  {resp.ai_prefilled && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
                      AI Prefilled
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 mt-1">
                  {resp.answer || <em className="text-gray-400">No answer</em>}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No responses provided.</p>
        )}
      </div>

      {/* Files */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-5 h-5 text-green-600" />
          <h2 className="text-lg font-semibold text-gray-800">Files</h2>
        </div>
        {submission.files && submission.files.length > 0 ? (
          <div className="space-y-2">
            {submission.files.map((file) => (
              <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900">{file.file_name}</p>
                  <p className="text-xs text-gray-500">{file.file_type.replace(/_/g, ' ')}</p>
                </div>
                <a
                  href={file.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Download
                </a>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No files uploaded.</p>
        )}
      </div>

      {/* Board Review Questions */}
      {reviewQuestions && reviewQuestions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Review Questions</h2>
          <div className="space-y-4">
            {reviewQuestions.map((q) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {q.text}
                  {q.required && <span className="text-red-500 ml-1">*</span>}
                </label>
                {q.question_type === 'textarea' ? (
                  <textarea
                    value={reviewAnswers[q.id] || ''}
                    onChange={(e) => setReviewAnswers({ ...reviewAnswers, [q.id]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                ) : q.question_type === 'number' ? (
                  <input
                    type="number"
                    value={reviewAnswers[q.id] || ''}
                    onChange={(e) => setReviewAnswers({ ...reviewAnswers, [q.id]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : q.question_type === 'checkbox' ? (
                  <input
                    type="checkbox"
                    checked={reviewAnswers[q.id] === 'true'}
                    onChange={(e) => setReviewAnswers({ ...reviewAnswers, [q.id]: e.target.checked ? 'true' : 'false' })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                ) : (
                  <input
                    type="text"
                    value={reviewAnswers[q.id] || ''}
                    onChange={(e) => setReviewAnswers({ ...reviewAnswers, [q.id]: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Review Form */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-800">Your Review</h2>
        </div>
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
            <select
              value={form.recommendation}
              onChange={(e) => setForm({ ...form, recommendation: e.target.value as Recommendation })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="accept">Accept</option>
              <option value="minor_revise">Minor Revision</option>
              <option value="major_revise">Major Revision</option>
              <option value="decline">Decline</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Comments</label>
            <textarea
              value={form.comments}
              onChange={(e) => setForm({ ...form, comments: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Your review comments (visible to board members)..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Feedback to Submitter</label>
            <textarea
              value={form.feedback_to_submitter}
              onChange={(e) => setForm({ ...form, feedback_to_submitter: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Feedback that will be shared with the submitter..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createReviewMutation.isPending}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
