import { useState } from 'react';
import { useCanEdit } from '../../components/ui/PendingApprovalBanner';
import { changePassword } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';

export default function SecurityTab() {
  const canEdit = useCanEdit();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordError, setPasswordError] = useState('');

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setMessage(null);

    if (passwordData.new_password !== passwordData.confirm_password) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      await changePassword({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setMessage({ type: 'success', text: 'Password changed successfully!' });
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to change password';
      setPasswordError(detail);
    } finally {
      setLoading(false);
    }
  };

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
        <h2 className="text-lg font-semibold mb-4">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {passwordError && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-sm">
              {passwordError}
            </div>
          )}

          <Input
            label="Current Password"
            type="password"
            value={passwordData.current_password}
            onChange={(v) => setPasswordData({ ...passwordData, current_password: v })}
            required
          />

          <Input
            label="New Password"
            type="password"
            value={passwordData.new_password}
            onChange={(v) => setPasswordData({ ...passwordData, new_password: v })}
            required
          />

          <Input
            label="Confirm New Password"
            type="password"
            value={passwordData.confirm_password}
            onChange={(v) => setPasswordData({ ...passwordData, confirm_password: v })}
            required
          />

          <Button
            type="submit"
            loading={loading}
            disabled={!canEdit}
            className="w-full"
          >
            Change Password
          </Button>
          {!canEdit && (
            <p className="text-sm text-gray-500 text-center">
              Password changes are available after your account is approved
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
