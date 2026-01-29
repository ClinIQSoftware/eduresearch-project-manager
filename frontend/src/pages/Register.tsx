import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { register as registerApi, login as loginApi, getInstitutionsPublic, getDepartmentsPublic } from '../services/api';
import { validateInviteCode } from '../api/inviteCodes';
import type { Institution, Department } from '../types';

const API_URL = import.meta.env.VITE_API_URL || '/api';

export default function Register() {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite') || '';

  // Registration mode: 'create' = new team, 'join' = existing team via invite code
  const [mode, setMode] = useState<'create' | 'join'>(inviteCode ? 'join' : 'create');

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    last_name: '',
    phone: '',
    institution_id: '',
    department_id: '',
    join_code: inviteCode,
    enterprise_name: '',
  });
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [inviteEnterprise, setInviteEnterprise] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch institutions and departments for dropdowns (public endpoints)
    async function fetchData() {
      try {
        const [instsRes, deptsRes] = await Promise.all([
          getInstitutionsPublic(),
          getDepartmentsPublic()
        ]);
        setInstitutions(instsRes.data);
        setDepartments(deptsRes.data);
      } catch (error) {
        console.error('Error fetching institutions/departments:', error);
      }
    }
    fetchData();
  }, []);

  // Validate invite code from URL
  useEffect(() => {
    if (inviteCode) {
      validateInviteCode(inviteCode).then(res => {
        if (res.data.valid && res.data.enterprise_name) {
          setInviteEnterprise(res.data.enterprise_name);
        }
      }).catch(() => {});
    }
  }, [inviteCode]);

  // Filter departments based on selected institution
  const filteredDepartments = formData.institution_id
    ? departments.filter(d => d.institution_id === Number(formData.institution_id))
    : [];

  function handleGoogleLogin() {
    window.location.href = `${API_URL}/auth/google`;
  }

  function handleMicrosoftLogin() {
    window.location.href = `${API_URL}/auth/microsoft`;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'create' && !inviteCode && !formData.enterprise_name.trim()) {
      setError('Please enter a team name');
      return;
    }

    if (mode === 'join' && !inviteCode && !formData.join_code.trim()) {
      setError('Please enter an invite code');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      await registerApi({
        email: formData.email,
        password: formData.password,
        first_name: formData.first_name,
        last_name: formData.last_name,
        phone: formData.phone || undefined,
        institution_id: formData.institution_id ? Number(formData.institution_id) : undefined,
        department_id: formData.department_id ? Number(formData.department_id) : undefined,
        invite_code: mode === 'join' ? (formData.join_code || undefined) : undefined,
        enterprise_name: mode === 'create' ? (formData.enterprise_name || undefined) : undefined,
      });

      // Auto-login after registration
      const loginResponse = await loginApi(formData.email, formData.password);
      await login(loginResponse.data.access_token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-8">
      <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">EduResearch</h1>
          <p className="text-gray-600">Project Manager</p>
        </div>

        <h2 className="text-xl font-semibold mb-6">Create Account</h2>

        {inviteEnterprise && (
          <div className="bg-blue-50 text-blue-700 p-3 rounded-lg mb-4 text-sm">
            You are joining <strong>{inviteEnterprise}</strong>
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {/* Mode toggle - only show if no invite code from URL */}
        {!inviteCode && (
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
        )}

        {/* OAuth Buttons */}
        <div className="mb-6">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleGoogleLogin}
              className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <span className="text-red-500 mr-2">G</span>
              Google
            </button>
            <button
              onClick={handleMicrosoftLogin}
              className="flex items-center justify-center px-4 py-2 border rounded-lg hover:bg-gray-50"
            >
              <span className="text-blue-500 mr-2">M</span>
              Microsoft
            </button>
          </div>
          <div className="relative mt-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Or register with email</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name *</label>
              <input
                type="text"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name *</label>
              <input
                type="text"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Institution</label>
            <select
              value={formData.institution_id}
              onChange={(e) => setFormData({ ...formData, institution_id: e.target.value, department_id: '' })}
              className="w-full border rounded-lg px-3 py-2"
            >
              <option value="">Select your institution (optional)</option>
              {institutions.map((inst) => (
                <option key={inst.id} value={inst.id}>{inst.name}</option>
              ))}
            </select>
          </div>
          {formData.institution_id && filteredDepartments.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Department</label>
              <select
                value={formData.department_id}
                onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">Select your department (optional)</option>
                {filteredDepartments.map((dept) => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Enterprise name field - shown in 'create' mode */}
          {mode === 'create' && !inviteCode && (
            <div>
              <label className="block text-sm font-medium mb-1">Team / Organization Name *</label>
              <input
                type="text"
                value={formData.enterprise_name}
                onChange={(e) => setFormData({ ...formData, enterprise_name: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="e.g. Smith Research Lab"
                required={mode === 'create'}
                minLength={2}
                maxLength={255}
              />
              <p className="text-xs text-gray-400 mt-1">You'll be the admin of this team.</p>
            </div>
          )}

          {/* Join Code field - shown in 'join' mode or when invite from URL */}
          {(mode === 'join' && !inviteCode) && (
            <div>
              <label className="block text-sm font-medium mb-1">Invite Code *</label>
              <input
                type="text"
                value={formData.join_code}
                onChange={(e) => setFormData({ ...formData, join_code: e.target.value.toUpperCase() })}
                className="w-full border rounded-lg px-3 py-2"
                placeholder="Enter invite code from your team admin"
                required={mode === 'join'}
                maxLength={20}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1">Password *</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
              minLength={6}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Confirm Password *</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
