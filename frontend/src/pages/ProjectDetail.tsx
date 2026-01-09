import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  getProject, updateProject, getProjectFiles, uploadFile, downloadFile,
  deleteFile, removeProjectMember, getAdminUsers, addProjectMember
} from '../services/api';
import type { ProjectDetail, ProjectFile, ProjectClassification, ProjectStatus, User } from '../types';

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

  const isLead = project?.lead_id === user?.id || user?.is_superuser;

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchFiles();
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

  async function handleRemoveMember(userId: number) {
    if (!confirm('Remove this member?')) return;
    try {
      await removeProjectMember(Number(id), userId);
      fetchProject();
    } catch (error) {
      console.error('Error removing member:', error);
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
      await addProjectMember(Number(id), Number(selectedUserId));
      setShowAddMember(false);
      setSelectedUserId('');
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
        {isLead && (
          <button
            onClick={() => setEditing(!editing)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            {editing ? 'Cancel' : 'Edit Project'}
          </button>
        )}
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
                <p className="text-sm text-gray-500">Lead</p>
                <p className="font-medium">{project.lead?.name || 'N/A'}</p>
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
          {project.members.map((member) => (
            <div key={member.id} className="py-3 flex justify-between items-center">
              <div>
                <p className="font-medium">{member.user.name}</p>
                <p className="text-sm text-gray-500">{member.user.email}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className={`text-sm px-2 py-1 rounded ${member.role === 'lead' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                  {member.role === 'lead' ? 'Lead' : 'Participant'}
                </span>
                {isLead && member.user_id !== project.lead_id && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          ))}
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

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">Add Member</h2>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-4"
            >
              <option value="">Select a user</option>
              {availableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowAddMember(false)}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMember}
                disabled={!selectedUserId}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
