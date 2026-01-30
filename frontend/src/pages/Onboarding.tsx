import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { completeOnboarding } from '../services/api';

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  // Check URL param first, then localStorage (set by Join page for unauthenticated users)
  const pendingCode = localStorage.getItem('pending_invite_code') || '';
  const prefilledCode = searchParams.get('invite') || pendingCode;

  const [mode, setMode] = useState<'create' | 'join'>(prefilledCode ? 'join' : 'create');
  const [teamName, setTeamName] = useState('');
  const [inviteCode, setInviteCode] = useState(prefilledCode);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { user, login, refreshUser } = useAuth();
  const navigate = useNavigate();

  // If user already has an enterprise, redirect to dashboard
  if (user?.enterprise_id) {
    return <Navigate to="/dashboard" replace />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'create' && !teamName.trim()) {
      setError('Please enter a team name');
      return;
    }

    if (mode === 'join' && !inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }

    setLoading(true);

    try {
      const response = await completeOnboarding({
        mode,
        enterprise_name: mode === 'create' ? teamName.trim() : undefined,
        invite_code: mode === 'join' ? inviteCode.trim() : undefined,
      });

      localStorage.removeItem('pending_invite_code');

      // Save the fresh JWT (includes enterprise_id for tenant-scoped API calls)
      if (response.data.access_token) {
        await login(response.data.access_token);
      } else {
        // Fallback for older API that returns User directly
        await refreshUser();
      }
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome to EduResearch</h1>
          <p className="text-gray-600 mt-2">
            {user ? `Hi ${user.first_name}! ` : ''}Set up your team to get started.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-gray-300 mb-6 overflow-hidden">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Create a new team
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`flex-1 py-2 text-sm font-medium transition-colors ${
              mode === 'join'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            Join an existing team
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'create' && (
            <div>
              <label className="block text-sm font-medium mb-1">Team / Organization Name *</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Smith Research Lab"
                required
                minLength={2}
                maxLength={255}
              />
              <p className="text-xs text-gray-400 mt-1">You'll be the admin of this team.</p>
            </div>
          )}

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium mb-1">Invite Code *</label>
              <input
                type="text"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter invite code from your team admin"
                required
                maxLength={50}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? (mode === 'create' ? 'Creating team...' : 'Joining team...')
              : (mode === 'create' ? 'Create Team' : 'Join Team')
            }
          </button>
        </form>
      </div>
    </div>
  );
}
