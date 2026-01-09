import { useEffect, useState } from 'react';
import { getJoinRequests, respondToJoinRequest, cancelJoinRequest, getProjects } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { JoinRequestWithUser, ProjectWithLead, RequestStatus } from '../types';

export default function JoinRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<JoinRequestWithUser[]>([]);
  const [projects, setProjects] = useState<ProjectWithLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<RequestStatus | ''>('pending');

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    try {
      const [requestsRes, projectsRes] = await Promise.all([
        getJoinRequests(filter ? { status: filter as RequestStatus } : undefined),
        getProjects()
      ]);
      setRequests(requestsRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleRespond(requestId: number, status: RequestStatus) {
    try {
      await respondToJoinRequest(requestId, status);
      fetchData();
    } catch (error) {
      console.error('Error responding to request:', error);
    }
  }

  async function handleCancel(requestId: number) {
    if (!confirm('Cancel this request?')) return;
    try {
      await cancelJoinRequest(requestId);
      fetchData();
    } catch (error) {
      console.error('Error cancelling request:', error);
    }
  }

  const getProjectTitle = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project?.title || 'Unknown Project';
  };

  const isMyProject = (projectId: number) => {
    const project = projects.find(p => p.id === projectId);
    return project?.lead_id === user?.id;
  };

  const statusBadge = (status: RequestStatus) => {
    const colors: Record<RequestStatus, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return <span className={`text-xs px-2 py-1 rounded ${colors[status]}`}>{status}</span>;
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Join Requests</h1>

      <div className="flex gap-4">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as RequestStatus | '')}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div className="bg-white rounded-lg shadow">
        {requests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No join requests found</p>
        ) : (
          <div className="divide-y">
            {requests.map((request) => (
              <div key={request.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium">{getProjectTitle(request.project_id)}</p>
                  {request.user_id === user?.id ? (
                    <p className="text-sm text-gray-500">Your request</p>
                  ) : (
                    <p className="text-sm text-gray-500">
                      From: {request.user.name} ({request.user.email})
                    </p>
                  )}
                  {request.message && (
                    <p className="text-sm text-gray-600 mt-1">"{request.message}"</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(request.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {statusBadge(request.status)}

                  {request.status === 'pending' && (
                    <>
                      {isMyProject(request.project_id) && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRespond(request.id, 'approved')}
                            className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRespond(request.id, 'rejected')}
                            className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.user_id === user?.id && (
                        <button
                          onClick={() => handleCancel(request.id)}
                          className="text-gray-600 hover:text-gray-800 text-sm"
                        >
                          Cancel
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
