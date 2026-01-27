import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPendingUsers, approveUser, rejectUser } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { User } from '../types';

export default function PendingUsers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Redirect non-superusers
    if (user && !user.is_superuser) {
      navigate('/dashboard');
      return;
    }
    fetchPendingUsers();
  }, [user, navigate]);

  async function fetchPendingUsers() {
    try {
      const response = await getPendingUsers();
      setPendingUsers(response.data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId: number) {
    try {
      await approveUser(userId);
      fetchPendingUsers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to approve user');
    }
  }

  async function handleReject(userId: number) {
    if (!confirm('Are you sure you want to reject this user? They will be deleted.')) return;
    try {
      await rejectUser(userId);
      fetchPendingUsers();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to reject user');
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Pending User Approvals</h1>

      {pendingUsers.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">No pending user approvals</p>
          <p className="text-sm text-gray-400 mt-2">
            New users requiring approval will appear here
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b">
            <p className="text-sm text-gray-600">
              {pendingUsers.length} user{pendingUsers.length !== 1 ? 's' : ''} awaiting approval
            </p>
          </div>
          <div className="divide-y">
            {pendingUsers.map((u) => (
              <div key={u.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                <div>
                  <p className="font-medium">{u.name}</p>
                  <p className="text-sm text-gray-500">{u.email}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Registered: {new Date(u.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(u.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 text-sm"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleReject(u.id)}
                    className="flex-1 sm:flex-none px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 text-sm"
                  >
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
