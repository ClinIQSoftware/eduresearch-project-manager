import { useEffect, useState } from 'react';
import { getTimeEntries, getActiveTimer, startTimer, stopTimer, deleteTimeEntry, getTasks } from '../services/api';
import { useCanEdit } from '../components/ui/PendingApprovalBanner';
import type { TimeEntry, Task } from '../types';

export default function TimeTracking() {
  const canEdit = useCanEdit();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (activeEntry) {
      interval = setInterval(() => {
        const start = new Date(activeEntry.start_time).getTime();
        const now = Date.now();
        setElapsedTime(Math.floor((now - start) / 1000));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [activeEntry]);

  async function fetchData() {
    try {
      const [entriesRes, activeRes, tasksRes] = await Promise.all([
        getTimeEntries(),
        getActiveTimer(),
        getTasks(),
      ]);
      setEntries(entriesRes.data);
      setActiveEntry(activeRes.data);
      setTasks(tasksRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleStart() {
    try {
      await startTimer({
        task_id: selectedTaskId ? Number(selectedTaskId) : undefined,
        notes: notes || undefined,
      });
      setNotes('');
      setSelectedTaskId('');
      fetchData();
    } catch (error) {
      console.error('Error starting timer:', error);
    }
  }

  async function handleStop() {
    if (!activeEntry) return;
    try {
      await stopTimer(activeEntry.id);
      setElapsedTime(0);
      fetchData();
    } catch (error) {
      console.error('Error stopping timer:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this time entry?')) return;
    try {
      await deleteTimeEntry(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting entry:', error);
    }
  }

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatMinutes = (minutes: number | null) => {
    if (!minutes) return '0m';
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const getTaskTitle = (taskId: number | null) => {
    if (!taskId) return 'No task';
    const task = tasks.find(t => t.id === taskId);
    return task?.title || 'Unknown task';
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Time Tracking</h1>

      {/* Timer Section */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Timer</h2>

        {!canEdit ? (
          <p className="text-center text-gray-500 py-4">Time tracking is available after your account is approved.</p>
        ) : activeEntry ? (
          <div className="text-center">
            <p className="text-5xl font-mono font-bold mb-4">{formatDuration(elapsedTime)}</p>
            <p className="text-gray-500 mb-2">Working on: {getTaskTitle(activeEntry.task_id)}</p>
            {activeEntry.notes && <p className="text-gray-400 mb-4">{activeEntry.notes}</p>}
            <button
              onClick={handleStop}
              className="bg-red-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-red-700"
            >
              Stop Timer
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Task (optional)</label>
                <select
                  value={selectedTaskId}
                  onChange={(e) => setSelectedTaskId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">No specific task</option>
                  {tasks.filter(t => t.status !== 'completed').map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="What are you working on?"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <button
              onClick={handleStart}
              className="bg-green-600 text-white px-8 py-3 rounded-lg text-lg hover:bg-green-700"
            >
              Start Timer
            </button>
          </div>
        )}
      </div>

      {/* Time Entries List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Recent Time Entries</h2>
        </div>
        {entries.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No time entries yet. Start tracking!</p>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div key={entry.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium">{getTaskTitle(entry.task_id)}</p>
                  {entry.notes && <p className="text-sm text-gray-500">{entry.notes}</p>}
                  <p className="text-xs text-gray-400">
                    {new Date(entry.start_time).toLocaleString()}
                    {entry.end_time && ` - ${new Date(entry.end_time).toLocaleTimeString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono text-lg">
                    {entry.end_time ? formatMinutes(entry.duration) : 'Running...'}
                  </span>
                  {canEdit && entry.end_time && (
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
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
