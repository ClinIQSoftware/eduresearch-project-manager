import { Link } from 'react-router-dom';
import { useIrbDashboard } from '../../hooks/useIrb';
import { useAuth } from '../../contexts/AuthContext';
import { FileText, Clock, Inbox, Plus } from 'lucide-react';
import type { IrbSubmission, SubmissionStatus } from '../../types';

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

function StatusBadge({ status }: { status: SubmissionStatus }) {
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>
      {formatStatus(status)}
    </span>
  );
}

function SubmissionCard({ submission }: { submission: IrbSubmission }) {
  return (
    <Link
      to={`/irb/submissions/${submission.id}`}
      className="block bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {submission.id.slice(0, 8)}...
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Project #{submission.project_id} &middot; {submission.submission_type} &middot; v{submission.version}
          </p>
        </div>
        <StatusBadge status={submission.status} />
      </div>
      {submission.submitted_at && (
        <p className="text-xs text-gray-400 mt-2">
          Submitted {new Date(submission.submitted_at).toLocaleDateString()}
        </p>
      )}
    </Link>
  );
}

function SectionEmpty({ message }: { message: string }) {
  return (
    <div className="text-center py-8 text-gray-400">
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function IrbDashboardTab() {
  const { user } = useAuth();
  const isMemberOrAdmin = user?.irb_role === 'member' || user?.irb_role === 'admin' || user?.is_superuser;
  const { data: dashboard, isLoading } = useIrbDashboard();

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      {/* My Submissions */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-gray-800">My Submissions</h2>
          </div>
          <Link
            to="/irb/submissions/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Submission
          </Link>
        </div>
        {dashboard?.my_submissions && dashboard.my_submissions.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.my_submissions.map((s) => (
              <SubmissionCard key={s.id} submission={s} />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">
            <p className="text-sm">You have no submissions yet.</p>
            <Link to="/irb/submissions/new" className="text-sm text-blue-600 hover:text-blue-700 font-medium mt-1 inline-block">
              Create your first submission →
            </Link>
          </div>
        )}
      </div>

      {/* My Pending Reviews — only visible to IRB members/admins */}
      {isMemberOrAdmin && (
        <div className="bg-white rounded-lg shadow p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-gray-800">My Pending Reviews</h2>
          </div>
          {dashboard?.my_pending_reviews && dashboard.my_pending_reviews.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboard.my_pending_reviews.map((s) => (
                <SubmissionCard key={s.id} submission={s} />
              ))}
            </div>
          ) : (
            <SectionEmpty message="No reviews are pending for you at this time." />
          )}
        </div>
      )}

      {/* Board Queue */}
      <div className="bg-white rounded-lg shadow p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <Inbox className="w-5 h-5 text-purple-500" />
          <h2 className="text-lg font-semibold text-gray-800">Board Queue</h2>
        </div>
        {dashboard?.board_queue && dashboard.board_queue.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dashboard.board_queue.map((s) => (
              <SubmissionCard key={s.id} submission={s} />
            ))}
          </div>
        ) : (
          <SectionEmpty message="The board queue is empty. All submissions have been processed." />
        )}
      </div>
    </div>
  );
}
