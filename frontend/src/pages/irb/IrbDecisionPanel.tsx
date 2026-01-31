import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useIrbSubmission, useCreateIrbDecision } from '../../hooks/useIrb';
import SubmissionTimeline from '../../components/irb/SubmissionTimeline';
import toast from 'react-hot-toast';
import { ArrowLeft, Scale, Gavel } from 'lucide-react';
import type { DecisionTypeValue, Recommendation } from '../../types';

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

export default function IrbDecisionPanel() {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const { data: submission, isLoading, error } = useIrbSubmission(submissionId || '');
  const createDecisionMutation = useCreateIrbDecision();

  const [form, setForm] = useState({
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

  const handleMakeDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createDecisionMutation.mutateAsync({
        submissionId: submission.id,
        data: {
          decision: form.decision,
          rationale: form.rationale || undefined,
          letter: form.letter || undefined,
          conditions: form.conditions || undefined,
        },
      });
      toast.success('Decision recorded');
      navigate(`/irb/submissions/${submission.id}`);
    } catch {
      toast.error('Failed to record decision');
    }
  };

  const reviews = submission.reviews || [];

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <Link
          to={`/irb/submissions/${submission.id}`}
          className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800 mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Submission
        </Link>
        <div className="flex items-center gap-3">
          <Gavel className="w-7 h-7 text-indigo-600" />
          <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Decision Panel</h1>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Progress</h2>
        <SubmissionTimeline currentStatus={submission.status} history={submission.history || []} />
      </div>

      {/* Submission Summary */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Submission Summary</h2>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-gray-500">ID</dt>
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
        </dl>
      </div>

      {/* Reviews */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Scale className="w-5 h-5 text-orange-500" />
          <h2 className="text-lg font-semibold text-gray-800">
            Independent Reviews ({reviews.length})
          </h2>
        </div>
        {reviews.length > 0 ? (
          <div className="space-y-3">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Reviewer #{review.reviewer_id}
                  </span>
                  <span className="text-xs text-gray-500 capitalize">
                    {review.role.replace(/_/g, ' ')}
                  </span>
                  {review.recommendation && (
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full ${RECOMMENDATION_COLORS[review.recommendation]}`}
                    >
                      {formatStatus(review.recommendation)}
                    </span>
                  )}
                </div>
                {review.comments && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Comments:</p>
                    <p className="text-sm text-gray-700">{review.comments}</p>
                  </div>
                )}
                {review.feedback_to_submitter && (
                  <div className="mt-2">
                    <p className="text-xs font-medium text-gray-500 mb-1">Feedback to Submitter:</p>
                    <p className="text-sm text-gray-600 italic">{review.feedback_to_submitter}</p>
                  </div>
                )}
                {review.completed_at && (
                  <p className="text-xs text-gray-400 mt-2">
                    Completed {new Date(review.completed_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No reviews submitted yet.</p>
        )}
      </div>

      {/* Decision Form */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Gavel className="w-5 h-5 text-indigo-600" />
          <h2 className="text-lg font-semibold text-gray-800">Make Decision</h2>
        </div>
        <form onSubmit={handleMakeDecision} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision</label>
            <select
              value={form.decision}
              onChange={(e) => setForm({ ...form, decision: e.target.value as DecisionTypeValue })}
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
              value={form.rationale}
              onChange={(e) => setForm({ ...form, rationale: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Explain the basis for this decision..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Decision Letter</label>
            <textarea
              value={form.letter}
              onChange={(e) => setForm({ ...form, letter: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={4}
              placeholder="Formal decision letter to the submitter..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conditions (optional)</label>
            <textarea
              value={form.conditions}
              onChange={(e) => setForm({ ...form, conditions: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Any conditions for approval..."
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={createDecisionMutation.isPending}
              className="px-5 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {createDecisionMutation.isPending ? 'Recording...' : 'Record Decision'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
