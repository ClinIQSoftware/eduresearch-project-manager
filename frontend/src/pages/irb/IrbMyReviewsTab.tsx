import { Link } from 'react-router-dom';
import { useMyReviews } from '../../hooks/useIrbAdmin';
import { Clock, CheckCircle, FileText } from 'lucide-react';

export default function IrbMyReviewsTab() {
  const { data, isLoading } = useMyReviews();

  if (isLoading) {
    return <div className="text-center py-8 text-gray-500">Loading reviews...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data?.total_pending ?? 0}</p>
            <p className="text-sm text-gray-500">Pending Reviews</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-5 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{data?.total_completed ?? 0}</p>
            <p className="text-sm text-gray-500">Completed Reviews</p>
          </div>
        </div>
      </div>

      {/* Pending reviews */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Pending Reviews</h2>
        {data?.pending_reviews && data.pending_reviews.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.pending_reviews.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{submission.submission_type} — {submission.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
                          {submission.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Link
                          to={`/irb/reviews/${submission.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <FileText className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No pending reviews assigned to you.
          </div>
        )}
      </div>

      {/* Completed reviews */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Completed Reviews</h2>
        {data?.completed_reviews && data.completed_reviews.length > 0 ? (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submission</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Submitted</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data.completed_reviews.map((submission) => (
                    <tr key={submission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{submission.submission_type} — {submission.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          {submission.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {new Date(submission.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-sm text-right">
                        <Link
                          to={`/irb/submissions/${submission.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            No completed reviews yet.
          </div>
        )}
      </div>
    </div>
  );
}
