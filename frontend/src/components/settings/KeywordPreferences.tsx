import { useState, useEffect } from 'react';
import {
  getUserKeywords,
  addKeyword,
  deleteKeyword,
  getAlertPreferences,
  updateAlertPreferences
} from '../../services/api';
import type { UserKeyword, AlertPreference, AlertFrequency } from '../../types';

const MAX_KEYWORDS = 20;

export default function KeywordPreferences() {
  const [keywords, setKeywords] = useState<UserKeyword[]>([]);
  const [preferences, setPreferences] = useState<AlertPreference | null>(null);
  const [newKeyword, setNewKeyword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [keywordsRes, prefsRes] = await Promise.all([
        getUserKeywords(),
        getAlertPreferences()
      ]);
      setKeywords(keywordsRes.data.keywords);
      setPreferences(prefsRes.data);
    } catch (err) {
      console.error('Error loading keyword preferences:', err);
      setMessage({ type: 'error', text: 'Failed to load preferences' });
    } finally {
      setLoading(false);
    }
  };

  const handleAddKeyword = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed) return;

    if (keywords.length >= MAX_KEYWORDS) {
      setMessage({ type: 'error', text: `Maximum of ${MAX_KEYWORDS} keywords allowed` });
      return;
    }

    // Check for duplicate
    if (keywords.some(k => k.keyword.toLowerCase() === trimmed.toLowerCase())) {
      setMessage({ type: 'error', text: 'Keyword already exists' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await addKeyword(trimmed);
      setKeywords([res.data, ...keywords]);
      setNewKeyword('');
      setMessage({ type: 'success', text: 'Keyword added' });
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Failed to add keyword';
      setMessage({ type: 'error', text: detail });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteKeyword = async (keywordId: number) => {
    try {
      await deleteKeyword(keywordId);
      setKeywords(keywords.filter(k => k.id !== keywordId));
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to delete keyword' });
    }
  };

  const handleFrequencyChange = async (frequency: AlertFrequency) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const res = await updateAlertPreferences({ alert_frequency: frequency });
      setPreferences(res.data);
      setMessage({ type: 'success', text: 'Alert frequency updated' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update frequency' });
    } finally {
      setSaving(false);
    }
  };

  const handleWeeksChange = async (weeks: number) => {
    if (!preferences) return;

    setSaving(true);
    try {
      const res = await updateAlertPreferences({ dashboard_new_weeks: weeks });
      setPreferences(res.data);
      setMessage({ type: 'success', text: 'Dashboard preference updated' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to update preference' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-2">Topics of Interest</h2>
        <p className="text-sm text-gray-600 mb-4">
          Add keywords to track projects that match your interests. You'll see matching projects on your dashboard and can receive email alerts.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === 'success'
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Add Keyword Form */}
      <form onSubmit={handleAddKeyword} className="flex gap-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="Enter a keyword (e.g., machine learning, clinical trials)"
          maxLength={100}
          className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={saving || keywords.length >= MAX_KEYWORDS}
        />
        <button
          type="submit"
          disabled={saving || !newKeyword.trim() || keywords.length >= MAX_KEYWORDS}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Adding...' : 'Add'}
        </button>
      </form>

      {/* Keywords List */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-600">Your keywords</span>
          <span className="text-xs text-gray-500">{keywords.length}/{MAX_KEYWORDS}</span>
        </div>

        {keywords.length === 0 ? (
          <p className="text-gray-500 text-sm italic py-4 text-center border rounded-lg bg-gray-50">
            No keywords added yet. Add keywords above to track matching projects.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((kw) => (
              <span
                key={kw.id}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {kw.keyword}
                <button
                  onClick={() => handleDeleteKeyword(kw.id)}
                  className="ml-1 text-blue-600 hover:text-blue-800 hover:bg-blue-200 rounded-full p-0.5"
                  title="Remove keyword"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Alert Preferences */}
      <div className="border-t pt-6">
        <h3 className="font-medium mb-4">Email Alert Preferences</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Alert Frequency
            </label>
            <select
              value={preferences?.alert_frequency || 'weekly'}
              onChange={(e) => handleFrequencyChange(e.target.value as AlertFrequency)}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              <option value="disabled">Disabled</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              How often to receive email digests of new matching projects
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dashboard "New" Threshold
            </label>
            <select
              value={preferences?.dashboard_new_weeks || 2}
              onChange={(e) => handleWeeksChange(parseInt(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={saving}
            >
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Show projects created within this time as "new" on dashboard
            </p>
          </div>
        </div>
      </div>

      {preferences?.last_alert_sent_at && (
        <p className="text-xs text-gray-500 text-right">
          Last alert sent: {new Date(preferences.last_alert_sent_at).toLocaleDateString()}
        </p>
      )}
    </div>
  );
}
