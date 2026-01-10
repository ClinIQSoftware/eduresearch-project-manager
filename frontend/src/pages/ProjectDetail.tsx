import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getProject, updateProject, deleteProject, getProjectFiles, uploadFile, downloadFile,
  deleteFile, removeProjectMember, getAdminUsers, addProjectMember,
  updateMemberRole, leaveProject, getProjectTasks, createTask, updateTask, deleteTask
} from '../services/api';
import type { ProjectDetail, ProjectFile, ProjectClassification, ProjectStatus, User, Task, TaskStatus, TaskPriority } from '../types';

const statusLabels: Record<ProjectStatus, string> = {
  preparation: 'Preparation',
  recruitment: 'Recruitment',
  analysis: 'Analysis',
  writing: 'Writing',
};

const classificationLabels: Record<ProjectClassification, string> = {
  education: 'Education',
  research: 'Research',
  quality_improvement: 'Quality Improvement',
  administrative: 'Administrative',
};

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [files, setFiles] = useState<ProjectFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<ProjectDetail>>({});
  const [uploading, setUploading] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('participant');

  // Tasks state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskFormData, setTaskFormData] = useState({
    title: '',
    description: '',
    priority: 'medium' as TaskPriority,
    due_date: '',
    assigned_to_id: '' as string | number,
  });
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // Determine if current user is a lead (check ProjectMember role)
  const currentUserMember = project?.members.find(m => m.user_id === user?.id);
  const isLead = currentUserMember?.role === 'lead' || user?.is_superuser;
  const isMember = !!currentUserMember;

  // Count leads for validation
  const leadCount = project?.members.filter(m => m.role === 'lead').length || 0;
  const canLeave = isMember && (currentUserMember?.role !== 'lead' || leadCount > 1);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchFiles();
      fetchTasks();
    }
  }, [id]);

  async function fetchProject() {
    try {
      const response = await getProject(Number(id));
      setProject(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching project:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFiles() {
    try {
      const response = await getProjectFiles(Number(id));
      setFiles(response.data);
    } catch (error) {
      console.error('Error fetching files:', error);
    }
  }

  async function fetchTasks() {
    try {
      const response = await getProjectTasks(Number(id));
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  }

  async function handleCreateTask(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createTask({
        title: taskFormData.title,
        description: taskFormData.description || undefined,
        priority: taskFormData.priority,
        due_date: taskFormData.due_date || undefined,
        project_id: Number(id),
        assigned_to_id: taskFormData.assigned_to_id ? Number(taskFormData.assigned_to_id) : undefined,
      });
      setShowTaskForm(false);
      resetTaskForm();
      fetchTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create task');
    }
  }

  async function handleUpdateTask(taskId: number, data: Partial<Task>) {
    try {
      await updateTask(taskId, data);
      fetchTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update task');
    }
  }

  async function handleDeleteTask(taskId: number) {
    if (!confirm('Delete this task?')) return;
    try {
      await deleteTask(taskId);
      fetchTasks();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete task');
    }
  }

  function resetTaskForm() {
    setTaskFormData({
      title: '',
      description: '',
      priority: 'medium',
      due_date: '',
      assigned_to_id: '',
    });
    setEditingTaskId(null);
  }

  const priorityColors: Record<TaskPriority, string> = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800',
  };

  const taskStatusColors: Record<TaskStatus, string> = {
    todo: 'bg-gray-100 text-gray-800',
    in_progress: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
  };

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    try {
      await updateProject(Number(id), {
        title: editData.title,
        description: editData.description ?? undefined,
        classification: editData.classification,
        status: editData.status,
        open_to_participants: editData.open_to_participants,
        start_date: editData.start_date ?? undefined,
        color: editData.color,
      });
      setEditing(false);
      fetchProject();
    } catch (error) {
      console.error('Error updating project:', error);
    }
  }

  async function handleDeleteProject() {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) return;
    try {
      await deleteProject(Number(id));
      navigate('/projects');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to delete project');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      await uploadFile(Number(id), file);
      fetchFiles();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  async function handleDownload(fileId: number, filename: string) {
    try {
      const response = await downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  }

  async function handleDeleteFile(fileId: number) {
    if (!confirm('Delete this file?')) return;
    try {
      await deleteFile(fileId);
      fetchFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
    }
  }

  async function handleRemoveMember(userId: number, userName: string) {
    const member = project?.members.find(m => m.user_id === userId);
    if (member?.role === 'lead' && leadCount <= 1) {
      alert('Cannot remove the last project lead. Promote another member to lead first.');
      return;
    }
    if (!confirm(`Remove ${userName} from the project?`)) return;
    try {
      await removeProjectMember(Number(id), userId);
      fetchProject();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to remove member');
    }
  }

  async function handleRoleChange(userId: number, newRole: string, userName: string) {
    const member = project?.members.find(m => m.user_id === userId);

    // Check if demoting from lead when they're the only lead
    if (member?.role === 'lead' && newRole === 'participant' && leadCount <= 1) {
      alert('Cannot demote the last project lead. Promote another member to lead first.');
      return;
    }

    const action = newRole === 'lead' ? 'promote to Lead' : 'demote to Participant';
    if (!confirm(`${action} ${userName}?`)) return;

    try {
      await updateMemberRole(Number(id), userId, newRole);
      fetchProject();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to update role');
    }
  }

  async function handleLeaveProject() {
    if (!canLeave) {
      alert('You cannot leave as you are the only project lead. Promote another member to lead first.');
      return;
    }
    if (!confirm('Are you sure you want to leave this project?')) return;
    try {
      await leaveProject(Number(id));
      navigate('/projects');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to leave project');
    }
  }

  async function openAddMember() {
    try {
      const response = await getAdminUsers();
      const existingMemberIds = project?.members.map(m => m.user_id) || [];
      setAvailableUsers(response.data.filter(u => !existingMemberIds.includes(u.id)));
      setShowAddMember(true);
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  }

  async function handleAddMember() {
    if (!selectedUserId) return;
    try {
      await addProjectMember(Number(id), Number(selectedUserId), selectedRole);
      setShowAddMember(false);
      setSelectedUserId('');
      setSelectedRole('participant');
      fetchProject();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to add member');
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (!project) return <div className="text-center py-8">Project not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <button onClick={() => navigate('/projects')} className="text-blue-600 hover:underline">
          Back to Projects
        </button>
        <div className="flex gap-2">
          {isMember && (
            <button
              onClick={handleLeaveProject}
              disabled={!canLeave}
              className={`px-4 py-2 rounded-lg border ${
                canLeave
                  ? 'border-orange-600 text-orange-600 hover:bg-orange-50'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
              title={!canLeave ? 'You are the only lead. Promote another member first.' : ''}
            >
              Leave Project
            </button>
          )}
          {isLead && (
            <>
              <button
                onClick={() => setEditing(!editing)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                {editing ? 'Cancel' : 'Edit Project'}
              </button>
              <button
                onClick={handleDeleteProject}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
              >
                Delete Project
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-6">
        {editing ? (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Title</label>
              <input
                type="text"
                value={editData.title || ''}
                onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                value={editData.description || ''}
                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Classification</label>
                <select
                  value={editData.classification}
                  onChange={(e) => setEditData({ ...editData, classification: e.target.value as ProjectClassification })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {Object.entries(classificationLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  value={editData.status}
                  onChange={(e) => setEditData({ ...editData, status: e.target.value as ProjectStatus })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  {Object.entries(statusLabels).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="open"
                checked={editData.open_to_participants}
                onChange={(e) => setEditData({ ...editData, open_to_participants: e.target.checked })}
                className="mr-2"
              />
              <label htmlFor="open">Open to new participants</label>
            </div>
            <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              Save Changes
            </button>
          </form>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold">{project.title}</h1>
                {project.description && <p className="text-gray-600 mt-2">{project.description}</p>}
              </div>
              {project.open_to_participants && (
                <span className="bg-green-100 text-green-800 px-3 py-1 rounded-lg">Open to Join</span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div>
                <p className="text-sm text-gray-500">Classification</p>
                <p className="font-medium">{classificationLabels[project.classification]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="font-medium">{statusLabels[project.status]}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Leads</p>
                <p className="font-medium">
                  {project.members
                    .filter(m => m.role === 'lead')
                    .map(m => m.user.name)
                    .join(', ') || 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Members */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Team Members ({project.members.length})</h2>
          {isLead && (
            <button
              onClick={openAddMember}
              className="text-blue-600 hover:text-blue-800"
            >
              + Add Member
            </button>
          )}
        </div>
        <div className="divide-y">
          {project.members.map((member) => {
            const isOnlyLead = member.role === 'lead' && leadCount <= 1;
            return (
              <div key={member.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">
                    {member.user.name}
                    {member.user_id === user?.id && <span className="text-gray-500 text-sm ml-2">(You)</span>}
                  </p>
                  <p className="text-sm text-gray-500">{member.user.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-sm px-2 py-1 rounded ${
                    member.role === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role === 'lead' ? 'Lead' : 'Participant'}
                  </span>

                  {isLead && (
                    <div className="flex gap-2">
                      {/* Promote/Demote Button */}
                      {member.role === 'lead' ? (
                        <button
                          onClick={() => handleRoleChange(member.user_id, 'participant', member.user.name)}
                          disabled={isOnlyLead}
                          className={`text-sm ${
                            isOnlyLead
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-orange-600 hover:text-orange-800'
                          }`}
                          title={isOnlyLead ? 'Cannot demote the only lead' : 'Demote to participant'}
                        >
                          Demote
                        </button>
                      ) : (
                        <button
                          onClick={() => handleRoleChange(member.user_id, 'lead', member.user.name)}
                          className="text-blue-600 hover:text-blue-800 text-sm"
                        >
                          Make Lead
                        </button>
                      )}

                      {/* Remove Button */}
                      <button
                        onClick={() => handleRemoveMember(member.user_id, member.user.name)}
                        disabled={isOnlyLead}
                        className={`text-sm ${
                          isOnlyLead
                            ? 'text-gray-400 cursor-not-allowed'
                            : 'text-red-600 hover:text-red-800'
                        }`}
                        title={isOnlyLead ? 'Cannot remove the only lead' : 'Remove from project'}
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Files */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Files ({files.length})</h2>
          <div>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              id="file-upload"
            />
            <label
              htmlFor="file-upload"
              className="cursor-pointer text-blue-600 hover:text-blue-800"
            >
              {uploading ? 'Uploading...' : '+ Upload File'}
            </label>
          </div>
        </div>
        {files.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No files uploaded yet</p>
        ) : (
          <div className="divide-y">
            {files.map((file) => (
              <div key={file.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium">{file.original_filename}</p>
                  <p className="text-sm text-gray-500">
                    {formatFileSize(file.file_size)} • Uploaded {new Date(file.uploaded_at).toLocaleDateString()}
                    {file.uploaded_by && ` by ${file.uploaded_by.name}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDownload(file.id, file.original_filename)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    Download
                  </button>
                  {(isLead || file.uploaded_by_id === user?.id) && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
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

      {/* Tasks */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Tasks ({tasks.length})</h2>
          {isMember && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="text-blue-600 hover:text-blue-800"
            >
              + Add Task
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No tasks yet</p>
        ) : (
          <div className="divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="py-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
                        {task.title}
                      </h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${taskStatusColors[task.status]}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${priorityColors[task.priority]}`}>
                        {task.priority}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                      {task.assigned_to && (
                        <span>Assigned to: <span className="font-medium">{task.assigned_to.first_name} {task.assigned_to.last_name}</span></span>
                      )}
                      {task.due_date && (
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                      {task.created_by && (
                        <span>Created by: {task.created_by.first_name} {task.created_by.last_name}</span>
                      )}
                    </div>
                  </div>
                  {isMember && (
                    <div className="flex gap-2 ml-4">
                      {task.status !== 'completed' && (
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="text-xs border rounded px-2 py-1"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      )}
                      {task.status === 'completed' && (
                        <button
                          onClick={() => handleUpdateTask(task.id, { status: 'todo' })}
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Task Modal */}
      {showTaskForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
                <input
                  type="text"
                  value={taskFormData.title}
                  onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={taskFormData.description}
                  onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Priority</label>
                  <select
                    value={taskFormData.priority}
                    onChange={(e) => setTaskFormData({ ...taskFormData, priority: e.target.value as TaskPriority })}
                    className="w-full border rounded-lg px-3 py-2"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Due Date</label>
                  <input
                    type="date"
                    value={taskFormData.due_date}
                    onChange={(e) => setTaskFormData({ ...taskFormData, due_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Assign To</label>
                <select
                  value={taskFormData.assigned_to_id}
                  onChange={(e) => setTaskFormData({ ...taskFormData, assigned_to_id: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {project?.members.map((member) => (
                    <option key={member.user_id} value={member.user_id}>
                      {member.user.first_name} {member.user.last_name} ({member.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowTaskForm(false); resetTaskForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Member</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">User</label>
                <select
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select a user</option>
                  {availableUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="participant">Participant</option>
                  <option value="lead">Lead (Co-Lead)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedUserId('');
                  setSelectedRole('participant');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
