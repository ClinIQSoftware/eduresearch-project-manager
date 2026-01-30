import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  useIrbSubmission,
  useTriageIrbSubmission,
  useAssignMainReviewer,
  useAssignReviewers,
  useCreateIrbReview,
  useCreateIrbDecision,
} from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { ArrowLeft, FileText, MessageSquare, Scale, Clock, CheckCircle2 } from 'lucide-react';
import type { SubmissionStatus, Recommendation, DecisionTypeValue } from '../../types';

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

const RECOMMENDATION_COLORS: Record<Recommendation, string> = {
  accept: 'bg-green-100 text-green-700',
  minor_revise: 'bg-yellow-100 text-yellow-700',
  major_revise: 'bg-orange-100 text-orange-700',
  decline: 'bg-red-100 text-red-700',
};

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function IrbSubmissionDetailPage() {
  const { id: submissionId } = useParams<{ id: string }>();
  const { data: submission, isLoading, error } = useIrbSubmission(submissionId || '');

  const triageMutation = useTriageIrbSubmission();
  const assignMainMutation = useAssignMainReviewer();
  const assignReviewersMutation = useAssignReviewers();
  const createReviewMutation = useCreateIrbReview();
  const createDecisionMutation = useCreateIrbDecision();

  // Workflow form state
  const [triageNote, setTriageNote] = useState('');
  const [mainReviewerId, setMainReviewerId] = useState('');
  const [reviewerIds, setReviewerIds] = useState('');
  const [reviewForm, setReviewForm] = useState({
    recommendation: 'accept' as Recommendation,
    comments: '',
    feedback_to_submitter: '',
  });
  const [decisionForm, setDecisionForm] = useState({
    decision: 'accept' as DecisionTypeValue,
    rationale: '',
    letter: '',
    conditions: '',
  });

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading submission...</div>;
  }

  if (error || !submission) {
    return <div className="text-center py-12 text-red-500">Submission not found.</div>;
  }

  const handleTriage = async (action: 'accept' | 'return') => {
    try {
      await triageMutation.mutateAsync({
        submissionId: submission.id,
        data: { action, note: triageNote || undefined },
      });
      toast.success(`Submission ${action === 'accept' ? 'accepted for triage' : 'returned'}`);
      setTriageNote('');
    } catch {
      toast.error('Triage action failed');
    }
  };

  const handleAssignMain = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await assignMainMutation.mutateAsync({
        submissionId: submission.id,
        data: { reviewer_id: Number(mainReviewerId) },
      });
      toast.success('Main reviewer assigned');
      setMainReviewerId('');
    } catch {
      toast.error('Failed to assign main reviewer');
    }
  };

  const handleAssignReviewers = async (e: React.FormEvent) => {
    e.preventDefault();
    const ids = reviewerIds
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number);
    if (ids.length === 0) return;
    try {
      await assignReviewersMutation.mutateAsync({
        submissionId: submission.id,
        data: { reviewer_ids: ids },
      });
      toast.success('Reviewers assigned');
      setReviewerIds('');
    } catch {
      toast.error('Failed to assign reviewers');
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReviewMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          recommendation: reviewForm.recommendation,
          comments: reviewForm.comments || undefined,
          feedback_to_submitter: reviewForm.feedback_to_submitter || undefined,
        },
      });
      toast.success('Review submitted');
      setReviewForm({ recommendation: 'accept', comments: '', feedback_to_submitter: '' });
    } catch {
      toast.error('Failed to submit review');
    }
  };

  const handleMakeDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDecisionMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          decision: decisionForm.decision,
          rationale: decisionForm.rationale || undefined,
          letter: decisionForm.letter || undefined,
          conditions: decisionForm.conditions || undefined,
        },
      });
      toast.success('Decision recorded');
      setDecisionForm({ decision: 'accept', rationale: '', letter: '', conditions: '' });
    } catch {
      toast.error('Failed to record decision');
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Link
          to="/irb/submissions"
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submissions
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800 font-mono">
            {submission.id.slice(0, 8)}...
          </h1>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[submission.status]}`}>
            {formatStatus(submission.status)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Submission Info</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
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
          <div>
            <dt className="text-gray-500">Main Reviewer</dt>
            <dd className="font-medium text-gray-900">
              {submission.main_reviewer_id ? `User #${submission.main_reviewer_id}` : '-'}
            </dd>
          </div>
          <div>
            <dt className="text-gray-500">Created</dt>
            <dd className="font-medium text-gray-900">
              {new Date(submission.created_at).toLocaleDateString()}
            </dd>
          </div>
          {submission.submitted_at && (
            <div>
              <dt className="text-gray-500">Submitted At</dt>
              <dd className="font-medium text-gray-900">
                {new Date(submission.submitted_at).toLocaleDateString()}
              </dd>
            </div>
          )}
          {submission.decided_at && (
            <div>
              <dt className="text-gray-500">Decided At</dt>
              <dd className="font-medium text-gray-900">
                {new Date(submission.decided_at).toLocaleDateString()}
              </dd>
            </div>
          )}
        </dl>
      </div>

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
                  {resp.user_confirmed && (
                    <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">
                      Confirmed
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-900 mt-1">{resp.answer || <em className="text-gray-400">No answer</em>}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No responses yet.</p>
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
                  <p className="text-xs text-gray-500">
                    {file.file_type.replace(/_/g, ' ')} &middot; Uploaded{' '}
                    {new Date(file.uploaded_at).toLocaleDateString()}
                  </p>
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

      {/* Reviews */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-3">
          <Scale className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-800">Reviews</h2>
        </div>
        {submission.reviews && submission.reviews.length > 0 ? (
          <div className="space-y-3">
            {submission.reviews.map((review) => (
              <div key={review.id} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">Reviewer #{review.reviewer_id}</span>
                  <span className="text-xs text-gray-500 capitalize">{review.role.replace(/_/g, ' ')}</span>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full ${RECOMMENDATION_COLORS[review.recommendation]}`}
                  >
                    {formatStatus(review.recommendation)}
                  </span>
                </div>
                {review.comments && <p className="text-sm text-gray-700">{review.comments}</p>}
                {review.feedback_to_submitter && (
                  <p className="text-sm text-gray-500 mt-1 italic">
                    Feedback: {review.feedback_to_submitter}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No reviews yet.</p>
        )}
      </div>

      {/* Decision */}
      {submission.decision && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800">Decision</h2>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded-full ${RECOMMENDATION_COLORS[submission.decision.decision] || 'bg-gray-100 text-gray-700'}`}
              >
                {formatStatus(submission.decision.decision)}
              </span>
              <span className="text-sm text-gray-500">
                by User #{submission.decision.decided_by_id} on{' '}
                {new Date(submission.decision.decided_at).toLocaleDateString()}
              </span>
            </div>
            {submission.decision.rationale && (
              <p className="text-sm text-gray-700 mt-2">
                <strong>Rationale:</strong> {submission.decision.rationale}
              </p>
            )}
            {submission.decision.conditions && (
              <p className="text-sm text-gray-700 mt-1">
                <strong>Conditions:</strong> {submission.decision.conditions}
              </p>
            )}
            {submission.decision.letter && (
              <p className="text-sm text-gray-700 mt-1">
                <strong>Letter:</strong> {submission.decision.letter}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Workflow Actions */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">Workflow Actions</h2>
        </div>

        {/* Submitted -> Triage */}
        {submission.status === 'submitted' && (
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Triage Submission</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
              <textarea
                value={triageNote}
                onChange={(e) => setTriageNote(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional triage note..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleTriage('accept')}
                disabled={triageMutation.isPending}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Accept for Review
              </button>
              <button
                onClick={() => handleTriage('return')}
                disabled={triageMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                Return to Submitter
              </button>
            </div>
          </div>
        )}

        {/* In Triage -> Assign Main */}
        {submission.status === 'in_triage' && (
          <form onSubmit={handleAssignMain} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Assign Main Reviewer</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer User ID</label>
              <input
                type="number"
                required
                value={mainReviewerId}
                onChange={(e) => setMainReviewerId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter user ID"
              />
            </div>
            <button
              type="submit"
              disabled={assignMainMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {assignMainMutation.isPending ? 'Assigning...' : 'Assign Main Reviewer'}
            </button>
          </form>
        )}

        {/* Assigned to Main -> Assign Additional Reviewers */}
        {submission.status === 'assigned_to_main' && (
          <form onSubmit={handleAssignReviewers} className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Assign Additional Reviewers</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reviewer User IDs (comma-separated)
              </label>
              <input
                type="text"
                required
                value={reviewerIds}
                onChange={(e) => setReviewerIds(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 5, 12, 23"
              />
            </div>
            <button
              type="submit"
              disabled={assignReviewersMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {assignReviewersMutation.isPending ? 'Assigning...' : 'Assign Reviewers'}
            </button>
          </form>
        )}

        {/* Under Review -> Submit Review & Make Decision */}
        {submission.status === 'under_review' && (
          <div className="space-y-6">
            {/* Submit Review */}
            <form onSubmit={handleSubmitReview} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Submit Review</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recommendation</label>
                <select
                  value={reviewForm.recommendation}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, recommendation: e.target.value as Recommendation })
                  }
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
                  value={reviewForm.comments}
                  onChange={(e) => setReviewForm({ ...reviewForm, comments: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Review comments..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feedback to Submitter
                </label>
                <textarea
                  value={reviewForm.feedback_to_submitter}
                  onChange={(e) =>
                    setReviewForm({ ...reviewForm, feedback_to_submitter: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Feedback visible to submitter..."
                />
              </div>
              <button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {createReviewMutation.isPending ? 'Submitting...' : 'Submit Review'}
              </button>
            </form>

            <hr className="border-gray-200" />

            {/* Make Decision */}
            <form onSubmit={handleMakeDecision} className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Make Decision</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
                <select
                  value={decisionForm.decision}
                  onChange={(e) =>
                    setDecisionForm({ ...decisionForm, decision: e.target.value as DecisionTypeValue })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="accept">Accept</option>
                  <option value="minor_revise">Minor Revision Required</option>
                  <option value="major_revise">Major Revision Required</option>
                  <option value="decline">Decline</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rationale</label>
                <textarea
                  value={decisionForm.rationale}
                  onChange={(e) => setDecisionForm({ ...decisionForm, rationale: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Decision rationale..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Decision Letter</label>
                <textarea
                  value={decisionForm.letter}
                  onChange={(e) => setDecisionForm({ ...decisionForm, letter: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                  placeholder="Formal decision letter..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Conditions</label>
                <textarea
                  value={decisionForm.conditions}
                  onChange={(e) => setDecisionForm({ ...decisionForm, conditions: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Any conditions for approval..."
                />
              </div>
              <button
                type="submit"
                disabled={createDecisionMutation.isPending}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {createDecisionMutation.isPending ? 'Recording...' : 'Record Decision'}
              </button>
            </form>
          </div>
        )}

        {/* No actions available */}
        {!['submitted', 'in_triage', 'assigned_to_main', 'under_review'].includes(submission.status) && (
          <p className="text-sm text-gray-400">No workflow actions available for the current status.</p>
        )}
      </div>
    </div>
  );
}
