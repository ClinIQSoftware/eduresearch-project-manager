import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useIrbSubmissions } from '../../hooks/useIrb';
import { Plus, ExternalLink } from 'lucide-react';
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

const ALL_STATUSES: SubmissionStatus[] = [
  'draft',
  'submitted',
  'in_triage',
  'assigned_to_main',
  'under_review',
  'decision_made',
  'accepted',
  'revision_requested',
  'declined',
];

function formatStatus(status: string): string {
  return status
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export default function IrbSubmissionsTab() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const { data: submissions, isLoading, error } = useIrbSubmissions(undefined, statusFilter || undefined);

  if (isLoading) {
    return <div className="text-center py-12 text-gray-500">Loading submissions...</div>;
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">Failed to load submissions.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-800">Submissions</h2>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Statuses</option>
            {ALL_STATUSES.map((s) => (
              <option key={s} value={s}>
                {formatStatus(s)}
              </option>
            ))}
          </select>
          <Link
            to="/irb/submissions/new"
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            New Submission
          </Link>
        </div>
      </div>

      {submissions && submissions.length > 0 ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3">ID</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Version</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">
                      {sub.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-900">#{sub.project_id}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-700">
                        {sub.submission_type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${STATUS_COLORS[sub.status]}`}
                      >
                        {formatStatus(sub.status)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">v{sub.version}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {sub.submitted_at
                        ? new Date(sub.submitted_at).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {new Date(sub.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/irb/submissions/${sub.id}`}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="sm:hidden divide-y divide-gray-100">
            {submissions.map((sub) => (
              <Link
                key={sub.id}
                to={`/irb/submissions/${sub.id}`}
                className="block p-4 hover:bg-gray-50"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-mono text-gray-600">{sub.id.slice(0, 8)}...</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Project #{sub.project_id} &middot; {sub.submission_type} &middot; v{sub.version}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${STATUS_COLORS[sub.status]}`}
                  >
                    {formatStatus(sub.status)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {sub.submitted_at
                    ? `Submitted ${new Date(sub.submitted_at).toLocaleDateString()}`
                    : `Created ${new Date(sub.created_at).toLocaleDateString()}`}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p>No submissions found{statusFilter ? ` with status "${formatStatus(statusFilter)}"` : ''}.</p>
        </div>
      )}
    </div>
  );
}
