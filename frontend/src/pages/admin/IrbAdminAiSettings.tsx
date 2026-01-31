import { useState, useEffect } from 'react';
import {
  useIrbBoards,
  useIrbAiConfig,
  useCreateIrbAiConfig,
  useUpdateIrbAiConfig,
} from '../../hooks/useIrb';
import toast from 'react-hot-toast';
import { Bot, Save } from 'lucide-react';
import type { AiProvider } from '../../types';

export default function IrbAdminAiSettings() {
  const { data: boards, isLoading: boardsLoading } = useIrbBoards();
  const [selectedBoardId, setSelectedBoardId] = useState('');

  if (boardsLoading) {
    return <div className="text-center py-8 text-gray-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Bot className="w-6 h-6 text-purple-600" />
        <h2 className="text-lg font-semibold text-gray-800">IRB AI Settings</h2>
      </div>

      <p className="text-sm text-gray-500">
        Configure AI-powered features for protocol summarization and question pre-fill.
        Each board can have its own AI configuration.
      </p>

      {/* Board selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Select Board</label>
        <select
          value={selectedBoardId}
          onChange={(e) => setSelectedBoardId(e.target.value)}
          className="w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Choose a board...</option>
          {boards?.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} ({b.board_type === 'irb' ? 'IRB' : 'Research Council'})
            </option>
          ))}
        </select>
      </div>

      {selectedBoardId && <AiConfigForm boardId={selectedBoardId} />}
    </div>
  );
}

function AiConfigForm({ boardId }: { boardId: string }) {
  const { data: config, isLoading } = useIrbAiConfig(boardId);
  const createConfig = useCreateIrbAiConfig();
  const updateConfig = useUpdateIrbAiConfig();

  const [form, setForm] = useState({
    provider: 'anthropic' as AiProvider,
    api_key: '',
    model_name: 'claude-sonnet-4-20250514',
    custom_endpoint: '',
    max_tokens: 4096,
    is_active: true,
  });

  const isExisting = !!config;

  useEffect(() => {
    if (config) {
      setForm({
        provider: config.provider,
        api_key: '',
        model_name: config.model_name,
        custom_endpoint: config.custom_endpoint || '',
        max_tokens: config.max_tokens,
        is_active: config.is_active,
      });
    }
  }, [config]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isExisting) {
        await updateConfig.mutateAsync({
          boardId,
          data: {
            provider: form.provider,
            api_key: form.api_key || undefined,
            model_name: form.model_name,
            custom_endpoint: form.custom_endpoint || undefined,
            max_tokens: form.max_tokens,
            is_active: form.is_active,
          },
        });
        toast.success('AI config updated');
      } else {
        if (!form.api_key) {
          toast.error('API key is required for new configurations');
          return;
        }
        await createConfig.mutateAsync({
          boardId,
          data: {
            provider: form.provider,
            api_key: form.api_key,
            model_name: form.model_name,
            custom_endpoint: form.custom_endpoint || undefined,
            max_tokens: form.max_tokens,
          },
        });
        toast.success('AI config created');
      }
    } catch {
      toast.error('Failed to save AI config');
    }
  };

  if (isLoading) {
    return <p className="text-sm text-gray-400">Loading AI config...</p>;
  }

  const isSaving = createConfig.isPending || updateConfig.isPending;

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-4 sm:p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">
          {isExisting ? 'Update Configuration' : 'New Configuration'}
        </h3>
        {isExisting && (
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full ${
              config.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}
          >
            {config.is_active ? 'Active' : 'Inactive'}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
          <select
            value={form.provider}
            onChange={(e) => setForm({ ...form, provider: e.target.value as AiProvider })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="openai">OpenAI (GPT)</option>
            <option value="custom">Custom Endpoint</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
          <input
            required
            value={form.model_name}
            onChange={(e) => setForm({ ...form, model_name: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder={
              form.provider === 'anthropic'
                ? 'claude-sonnet-4-20250514'
                : form.provider === 'openai'
                  ? 'gpt-4o'
                  : 'model-name'
            }
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          API Key {isExisting && <span className="text-gray-400 font-normal">(leave blank to keep current)</span>}
        </label>
        <input
          type="password"
          value={form.api_key}
          onChange={(e) => setForm({ ...form, api_key: e.target.value })}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder={isExisting ? '••••••••' : 'Enter API key'}
          required={!isExisting}
        />
        {isExisting && config.api_key_set && (
          <p className="text-xs text-green-600 mt-1">API key is configured.</p>
        )}
      </div>

      {form.provider === 'custom' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Custom Endpoint URL</label>
          <input
            value={form.custom_endpoint}
            onChange={(e) => setForm({ ...form, custom_endpoint: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://your-api.example.com/v1/completions"
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Max Tokens</label>
          <input
            type="number"
            value={form.max_tokens}
            onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={256}
            max={32768}
          />
        </div>
        {isExisting && (
          <div className="flex items-end">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="rounded border-gray-300"
              />
              AI features enabled
            </label>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isSaving}
          className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : isExisting ? 'Update Config' : 'Save Config'}
        </button>
      </div>
    </form>
  );
}
