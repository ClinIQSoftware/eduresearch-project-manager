import { useEffect, useState } from 'react';
import { getTasks, createTask, updateTask, deleteTask, getProjects } from '../services/api';
import type { Task, Project, TaskStatus, TaskPriority } from '../types';

const statusColors: Record<TaskStatus, string> = {
  todo: 'bg-gray-100 text-gray-800',
  in_progress: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
};

const priorityColors: Record<TaskPriority, string> = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'todo' as TaskStatus,
    priority: 'medium' as TaskPriority,
    project_id: '',
    due_date: '',
  });
  const [filter, setFilter] = useState<{ status?: TaskStatus; project_id?: number }>({});

  useEffect(() => {
    fetchData();
  }, [filter]);

  async function fetchData() {
    try {
      const [tasksRes, projectsRes] = await Promise.all([
        getTasks(filter),
        getProjects(),
      ]);
      setTasks(tasksRes.data);
      setProjects(projectsRes.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        project_id: formData.project_id ? Number(formData.project_id) : undefined,
        due_date: formData.due_date || undefined,
      };

      if (editingTask) {
        await updateTask(editingTask.id, data);
      } else {
        await createTask(data);
      }

      setShowForm(false);
      setEditingTask(null);
      setFormData({ title: '', description: '', status: 'todo', priority: 'medium', project_id: '', due_date: '' });
      fetchData();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      await updateTask(task.id, { status });
      fetchData();
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      project_id: task.project_id?.toString() || '',
      due_date: task.due_date?.split('T')[0] || '',
    });
    setShowForm(true);
  }

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Tasks</h1>
        <button
          onClick={() => { setShowForm(true); setEditingTask(null); setFormData({ title: '', description: '', status: 'todo', priority: 'medium', project_id: '', due_date: '' }); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filter.status || ''}
          onChange={(e) => setFilter({ ...filter, status: e.target.value as TaskStatus || undefined })}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Status</option>
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        <select
          value={filter.project_id || ''}
          onChange={(e) => setFilter({ ...filter, project_id: e.target.value ? Number(e.target.value) : undefined })}
          className="border rounded-lg px-3 py-2"
        >
          <option value="">All Projects</option>
          {projects.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-center text-gray-500 py-8">No tasks yet. Create your first task!</p>
        ) : (
          tasks.map((task) => (
            <div key={task.id} className="bg-white p-4 rounded-lg shadow flex items-center gap-4">
              <input
                type="checkbox"
                checked={task.status === 'completed'}
                onChange={() => handleStatusChange(task, task.status === 'completed' ? 'todo' : 'completed')}
                className="w-5 h-5"
              />
              <div className="flex-1">
                <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                  {task.title}
                </h3>
                {task.description && (
                  <p className="text-sm text-gray-500">{task.description}</p>
                )}
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded ${statusColors[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded ${priorityColors[task.priority]}`}>
                    {task.priority}
                  </span>
                  {task.due_date && (
                    <span className="text-xs px-2 py-1 rounded bg-purple-100 text-purple-800">
                      Due: {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => openEdit(task)} className="text-blue-600 hover:text-blue-800">Edit</button>
                <button onClick={() => handleDelete(task.id)} className="text-red-600 hover:text-red-800">Delete</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{editingTask ? 'Edit Task' : 'New Task'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as TaskStatus })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value as TaskPriority })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project</label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData({ ...formData, project_id: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="">No Project</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); setEditingTask(null); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  {editingTask ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
