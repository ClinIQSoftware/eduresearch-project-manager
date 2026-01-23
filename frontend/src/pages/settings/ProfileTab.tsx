import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useCanEdit } from '../../components/ui/PendingApprovalBanner';
import { updateProfile, getInstitutions, getDepartments } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Card } from '../../components/ui/Card';
import type { Institution, Department } from '../../types';

export default function ProfileTab() {
  const { user, refreshUser } = useAuth();
  const canEdit = useCanEdit();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    bio: '',
    institution_id: null as number | null,
    department_id: null as number | null,
  });

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        phone: user.phone || '',
        bio: user.bio || '',
        institution_id: user.institution_id,
        department_id: user.department_id,
      });
    }
  }, [user]);

  useEffect(() => {
    getInstitutions()
      .then((res) => setInstitutions(res.data))
      .catch((err) => console.error('Error fetching institutions:', err));
  }, []);

  useEffect(() => {
    if (profileData.institution_id) {
      getDepartments(profileData.institution_id)
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error('Error fetching departments:', err));
    } else {
      setDepartments([]);
    }
  }, [profileData.institution_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      await updateProfile(profileData);
      await refreshUser();
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to update profile';
      setMessage({ type: 'error', text: detail });
    } finally {
      setLoading(false);
    }
  };

  const handleInstitutionChange = (institutionId: string) => {
    const id = institutionId ? Number(institutionId) : null;
    setProfileData({
      ...profileData,
      institution_id: id,
      department_id: null,
    });
  };

  const instOptions = institutions.map((i) => ({ value: String(i.id), label: i.name }));
  const deptOptions = departments.map((d) => ({ value: String(d.id), label: d.name }));

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <h2 className="text-lg font-semibold mb-4">Profile Information</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              value={profileData.first_name}
              onChange={(v) => setProfileData({ ...profileData, first_name: v })}
              required
            />
            <Input
              label="Last Name"
              value={profileData.last_name}
              onChange={(v) => setProfileData({ ...profileData, last_name: v })}
              required
            />
          </div>

          <Input
            label="Email"
            type="email"
            value={profileData.email}
            onChange={(v) => setProfileData({ ...profileData, email: v })}
            required
          />

          <Input
            label="Phone"
            type="tel"
            value={profileData.phone}
            onChange={(v) => setProfileData({ ...profileData, phone: v })}
          />

          <Textarea
            label="Bio"
            value={profileData.bio}
            onChange={(v) => setProfileData({ ...profileData, bio: v })}
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Institution"
              options={instOptions}
              value={profileData.institution_id ? String(profileData.institution_id) : ''}
              onChange={handleInstitutionChange}
              placeholder="Select Institution"
            />
            <Select
              label="Department"
              options={deptOptions}
              value={profileData.department_id ? String(profileData.department_id) : ''}
              onChange={(v) =>
                setProfileData({ ...profileData, department_id: v ? Number(v) : null })
              }
              placeholder="Select Department"
              disabled={!profileData.institution_id}
            />
          </div>

          <Button
            type="submit"
            loading={loading}
            disabled={!canEdit}
            className="w-full"
          >
            Save Profile
          </Button>
          {!canEdit && (
            <p className="text-sm text-gray-500 text-center">
              Profile updates are available after your account is approved
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
