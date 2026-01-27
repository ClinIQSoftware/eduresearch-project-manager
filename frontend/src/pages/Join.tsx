import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { validateInviteCode } from '../api/inviteCodes';

export default function Join() {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!code) {
      setError('No invite code provided');
      setLoading(false);
      return;
    }

    async function validate() {
      try {
        const res = await validateInviteCode(code!);
        if (res.data.valid) {
          // Redirect to register with invite code pre-filled
          navigate(`/register?invite=${encodeURIComponent(code!)}`, { replace: true });
        } else {
          setError(res.data.message || 'Invalid invite code');
        }
      } catch {
        setError('Could not validate invite code');
      } finally {
        setLoading(false);
      }
    }

    validate();
  }, [code, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Validating invite code...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">EduResearch</h1>
        <p className="text-gray-600 mb-6">Project Manager</p>

        <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-6">
          {error}
        </div>

        <div className="space-y-3">
          <Link
            to="/register"
            className="block w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
          >
            Register without invite code
          </Link>
          <Link
            to="/login"
            className="block text-sm text-blue-600 hover:underline"
          >
            Already have an account? Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
