import { Link } from 'react-router-dom';
import { useIrbDashboard } from '../../hooks/useIrb';
import { Scale, FileText } from 'lucide-react';
import type { SubmissionStatus } from '../../types';

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

export default function IrbReviewQueue() {
  const { data: dashboard, isLoading } = useIrbDashboard();

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading review queue...</div>;
  }

  const pendingReviews = dashboard?.my_pending_reviews ?? [];

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center gap-3">
        <Scale className="w-7 h-7 text-orange-500" />
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Review Queue</h1>
      </div>

      {pendingReviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Scale className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h2 className="text-lg font-medium text-gray-600 mb-1">No pending reviews</h2>
          <p className="text-sm text-gray-400">
            You don't have any submissions assigned for review right now.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingReviews.map((submission) => (
            <Link
              key={submission.id}
              to={`/irb/reviews/${submission.id}`}
              className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <FileText className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-900">
                      Submission {submission.id.slice(0, 8)}...
                    </p>
                    <p className="text-sm text-gray-500 mt-0.5">
                      Project #{submission.project_id} &middot;{' '}
                      <span className="capitalize">{submission.submission_type}</span> &middot; v
                      {submission.version}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${STATUS_COLORS[submission.status]}`}
                >
                  {formatStatus(submission.status)}
                </span>
              </div>
              {submission.submitted_at && (
                <p className="text-xs text-gray-400 mt-2 ml-8">
                  Submitted {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
