import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCanEdit } from '../components/ui/PendingApprovalBanner';
import {
  getProject, updateProject, deleteProject, getProjectFiles, uploadFile, downloadFile,
  deleteFile, removeProjectMember, getAdminUsers, addProjectMember,
  updateMemberRole, leaveProject, getProjectTasks, createTask, updateTask, deleteTask,
  getInstitutions, getDepartments, createJoinRequest
} from '../services/api';
import type { ProjectDetail, ProjectFile, ProjectClassification, ProjectStatus, User, Task, TaskStatus, TaskPriority, Institution, Department } from '../types';

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

  // Institution/Department state for editing
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

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
  const [_editingTaskId, setEditingTaskId] = useState<number | null>(null);

  // Determine if current user is a lead (check ProjectMember role)
  const canEdit = useCanEdit();
  const currentUserMember = project?.members.find(m => m.user_id === user?.id);
  const isLead = canEdit && (currentUserMember?.role === 'lead' || user?.is_superuser);
  const isMember = canEdit && !!currentUserMember;

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

  // Fetch institutions and departments when entering edit mode
  useEffect(() => {
    if (editing) {
      getInstitutions().then(res => setInstitutions(res.data)).catch(console.error);
      getDepartments().then(res => setDepartments(res.data)).catch(console.error);
    }
  }, [editing]);

  // Filter departments by selected institution for the edit form
  const editDepartments = editData.institution_id
    ? departments.filter(d => d.institution_id === editData.institution_id)
    : departments;

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
      // Convert null values to undefined for API compatibility
      const apiData = {
        ...data,
        description: data.description === null ? undefined : data.description,
        due_date: data.due_date === null ? undefined : data.due_date,
      };
      await updateTask(taskId, apiData);
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
        end_date: editData.end_date ?? undefined,
        color: editData.color,
        institution_id: editData.institution_id ?? null,
        department_id: editData.department_id ?? null,
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

  async function handleJoinRequest() {
    try {
      await createJoinRequest(Number(id));
      alert('Join request sent! You will be notified when a project lead responds.');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to send join request');
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <button onClick={() => navigate('/projects')} className="text-blue-600 hover:underline text-sm sm:text-base">
          &larr; Back to Projects
        </button>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {canEdit && !currentUserMember && project.open_to_participants && (
            <button
              onClick={handleJoinRequest}
              className="flex-1 sm:flex-none px-3 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 active:bg-green-800 text-sm"
            >
              Request to Join
            </button>
          )}
          {canEdit && currentUserMember && (
            <button
              onClick={handleLeaveProject}
              disabled={!canLeave}
              className={`flex-1 sm:flex-none px-3 py-2 rounded-lg border text-sm ${
                canLeave
                  ? 'border-orange-600 text-orange-600 hover:bg-orange-50 active:bg-orange-100'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed'
              }`}
              title={!canLeave ? 'You are the only lead. Promote another member first.' : ''}
            >
              Leave
            </button>
          )}
          {isLead && (
            <>
              <button
                onClick={() => setEditing(!editing)}
                className="flex-1 sm:flex-none bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800 text-sm"
              >
                {editing ? 'Cancel' : 'Edit'}
              </button>
              <button
                onClick={handleDeleteProject}
                className="flex-1 sm:flex-none bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 active:bg-red-800 text-sm"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Institution</label>
                <select
                  value={editData.institution_id || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    institution_id: e.target.value ? Number(e.target.value) : undefined,
                    department_id: undefined // Reset department when institution changes
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">No Institution</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <select
                  value={editData.department_id || ''}
                  onChange={(e) => setEditData({
                    ...editData,
                    department_id: e.target.value ? Number(e.target.value) : undefined
                  })}
                  className="w-full border rounded-lg px-3 py-2"
                  disabled={!editData.institution_id}
                >
                  <option value="">No Department</option>
                  {editDepartments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input
                  type="date"
                  value={editData.start_date || ''}
                  onChange={(e) => setEditData({ ...editData, start_date: e.target.value || undefined })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Deadline</label>
                <input
                  type="date"
                  value={editData.end_date || ''}
                  onChange={(e) => setEditData({ ...editData, end_date: e.target.value || undefined })}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="open"
                checked={editData.open_to_participants}
                onChange={(e) => setEditData({ ...editData, open_to_participants: e.target.checked })}
                className="mr-2 w-5 h-5"
              />
              <label htmlFor="open">Open to new participants</label>
            </div>
            <button type="submit" className="w-full sm:w-auto bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 active:bg-green-800">
              Save Changes
            </button>
          </form>
        ) : (
          <>
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold">{project.title}</h1>
                {project.description && <p className="text-gray-600 mt-2 text-sm sm:text-base">{project.description}</p>}
              </div>
              {project.open_to_participants && (
                <span className="self-start bg-green-100 text-green-800 px-3 py-1 rounded-lg text-sm whitespace-nowrap">Open to Join</span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 mt-4 md:mt-6">
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
                <p className="text-sm text-gray-500">Institution</p>
                <p className="font-medium">{project.institution?.name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{project.department?.name || 'Not assigned'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Start Date</p>
                <p className="font-medium">
                  {project.start_date ? new Date(project.start_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Deadline</p>
                <p className="font-medium">
                  {project.end_date ? new Date(project.end_date).toLocaleDateString() : 'Not set'}
                </p>
              </div>
            </div>

            {/* Request to Join button for non-members */}
            {canEdit && !currentUserMember && project.open_to_participants && (
              <div className="mt-6 pt-4 border-t">
                <button
                  onClick={handleJoinRequest}
                  className="w-full sm:w-auto bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 active:bg-green-800 font-medium"
                >
                  Request to Join This Project
                </button>
                <p className="text-sm text-gray-500 mt-2">
                  Your request will be sent to the project leads for approval.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Members */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Team ({project.members.length})</h2>
          {isLead && (
            <button
              onClick={openAddMember}
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
            >
              + Add
            </button>
          )}
        </div>
        <div className="space-y-3 sm:space-y-0 sm:divide-y">
          {project.members.map((member) => {
            const isOnlyLead = member.role === 'lead' && leadCount <= 1;
            return (
              <div key={member.id} className="p-3 sm:py-3 sm:px-0 border sm:border-0 rounded-lg sm:rounded-none flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">
                      {member.user.name}
                      {member.user_id === user?.id && <span className="text-gray-500 text-xs ml-1">(You)</span>}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 truncate">{member.user.email}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded whitespace-nowrap ${
                    member.role === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {member.role === 'lead' ? 'Lead' : 'Member'}
                  </span>
                </div>

                {isLead && (
                  <div className="flex gap-3 text-xs sm:text-sm">
                    {member.role === 'lead' ? (
                      <button
                        onClick={() => handleRoleChange(member.user_id, 'participant', member.user.name)}
                        disabled={isOnlyLead}
                        className={`${
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
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Make Lead
                      </button>
                    )}
                    <button
                      onClick={() => handleRemoveMember(member.user_id, member.user.name)}
                      disabled={isOnlyLead}
                      className={`${
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
            );
          })}
        </div>
      </div>

      {/* Files */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Files ({files.length})</h2>
          {canEdit && (
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
                className="cursor-pointer text-blue-600 hover:text-blue-800 text-sm sm:text-base"
              >
                {uploading ? 'Uploading...' : '+ Upload'}
              </label>
            </div>
          )}
        </div>
        {files.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">No files uploaded yet</p>
        ) : (
          <div className="space-y-3 sm:space-y-0 sm:divide-y">
            {files.map((file) => (
              <div key={file.id} className="p-3 sm:py-3 sm:px-0 border sm:border-0 rounded-lg sm:rounded-none flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm sm:text-base truncate">{file.original_filename}</p>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {formatFileSize(file.file_size)} • {new Date(file.uploaded_at).toLocaleDateString()}
                    {file.uploaded_by && <span className="hidden sm:inline"> by {file.uploaded_by.name}</span>}
                  </p>
                </div>
                <div className="flex gap-3 text-xs sm:text-sm">
                  <button
                    onClick={() => handleDownload(file.id, file.original_filename)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Download
                  </button>
                  {canEdit && (isLead || file.uploaded_by_id === user?.id) && (
                    <button
                      onClick={() => handleDeleteFile(file.id)}
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

      {/* Tasks */}
      <div className="bg-white rounded-lg shadow p-4 md:p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-base sm:text-lg font-semibold">Tasks ({tasks.length})</h2>
          {isMember && (
            <button
              onClick={() => setShowTaskForm(true)}
              className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
            >
              + Add Task
            </button>
          )}
        </div>

        {tasks.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">No tasks yet</p>
        ) : (
          <div className="space-y-3 sm:space-y-0 sm:divide-y">
            {tasks.map((task) => (
              <div key={task.id} className="p-3 sm:py-4 sm:px-0 border sm:border-0 rounded-lg sm:rounded-none">
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className={`font-medium text-sm sm:text-base ${task.status === 'completed' ? 'line-through text-gray-400' : ''}`}>
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
                      <p className="text-xs sm:text-sm text-gray-600 mb-2">{task.description}</p>
                    )}
                    <div className="flex flex-wrap gap-2 sm:gap-3 text-xs text-gray-500">
                      {task.assigned_to && (
                        <span>Assigned: <span className="font-medium">{task.assigned_to.first_name}</span></span>
                      )}
                      {task.due_date && (
                        <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {isMember && (
                    <div className="flex gap-2 sm:gap-2 sm:ml-4">
                      {task.status !== 'completed' && (
                        <select
                          value={task.status}
                          onChange={(e) => handleUpdateTask(task.id, { status: e.target.value as TaskStatus })}
                          className="text-xs border rounded px-2 py-1.5 flex-1 sm:flex-none"
                        >
                          <option value="todo">To Do</option>
                          <option value="in_progress">In Progress</option>
                          <option value="completed">Completed</option>
                        </select>
                      )}
                      {task.status === 'completed' && (
                        <button
                          onClick={() => handleUpdateTask(task.id, { status: 'todo' })}
                          className="text-xs text-blue-600 hover:underline px-2 py-1"
                        >
                          Reopen
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-xs text-red-600 hover:underline px-2 py-1"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg md:text-xl font-bold mb-4">Add Task</h2>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                      {member.user.first_name} {member.user.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setShowTaskForm(false); resetTaskForm(); }}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 active:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800"
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-md">
            <h2 className="text-lg md:text-xl font-bold mb-4">Add Member</h2>
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
                    <option key={u.id} value={u.id}>{u.name}</option>
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
            <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setShowAddMember(false);
                  setSelectedUserId('');
                  setSelectedRole('participant');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 active:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
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
