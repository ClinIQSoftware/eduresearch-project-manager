import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getEnterpriseSettings, updateEnterpriseSettings } from '../../api/admin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function EnterpriseSettingsTab() {
  const queryClient = useQueryClient();
  const { data: enterprise, isLoading, isError } = useQuery({
    queryKey: ['enterprise-settings'],
    queryFn: () => getEnterpriseSettings().then(r => r.data),
  });

  const updateMutation = useMutation({
    mutationFn: updateEnterpriseSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-settings'] });
    },
  });

  const [name, setName] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (enterprise) setName(enterprise.name);
  }, [enterprise]);

  const handleSave = async () => {
    if (!name.trim()) {
      setMessage({ type: 'error', text: 'Enterprise name is required' });
      return;
    }
    try {
      await updateMutation.mutateAsync({ name: name.trim() });
      setMessage({ type: 'success', text: 'Enterprise name updated' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  if (isLoading) return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  if (isError || !enterprise) return <div className="py-8 text-center text-red-600">Failed to load enterprise settings</div>;

  return (
    <div className="max-w-2xl space-y-6">
      {message && <div className={`p-3 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{message.text}</div>}

      <Card title="Enterprise Details">
        <div className="space-y-4">
          <Input
            label="Enterprise Name"
            value={name}
            onChange={setName}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
            <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">{enterprise.slug}</p>
            <p className="text-xs text-gray-400 mt-1">The slug cannot be changed after creation.</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Created</label>
            <p className="text-sm text-gray-500">{new Date(enterprise.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} loading={updateMutation.isPending}>Save Settings</Button>
      </div>
    </div>
  );
}
