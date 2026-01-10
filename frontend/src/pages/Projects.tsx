import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, createJoinRequest, getInstitutions, getDepartments } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCanEdit } from '../components/ui/PendingApprovalBanner';
import type { ProjectWithLead, ProjectClassification, ProjectStatus, Institution, Department } from '../types';

const classificationColors: Record<ProjectClassification, string> = {
  education: 'bg-purple-100 text-purple-800',
  research: 'bg-blue-100 text-blue-800',
  quality_improvement: 'bg-green-100 text-green-800',
  administrative: 'bg-gray-100 text-gray-800',
};

const statusColors: Record<ProjectStatus, string> = {
  preparation: 'bg-yellow-100 text-yellow-800',
  recruitment: 'bg-orange-100 text-orange-800',
  analysis: 'bg-cyan-100 text-cyan-800',
  writing: 'bg-pink-100 text-pink-800',
};

const classificationLabels: Record<ProjectClassification, string> = {
  education: 'Education',
  research: 'Research',
  quality_improvement: 'Quality Improvement',
  administrative: 'Administrative',
};

const statusLabels: Record<ProjectStatus, string> = {
  preparation: 'Preparation',
  recruitment: 'Recruitment',
  analysis: 'Analysis',
  writing: 'Writing',
};

export default function Projects() {
  const { user } = useAuth();
  const canEdit = useCanEdit();
  const [projects, setProjects] = useState<ProjectWithLead[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classification: 'research' as ProjectClassification,
    status: 'preparation' as ProjectStatus,
    open_to_participants: true,
    start_date: '',
    color: '#3B82F6',
    institution_id: user?.institution_id || null as number | null,
    department_id: user?.department_id || null as number | null,
  });
  const [filter, setFilter] = useState<{
    classification?: ProjectClassification;
    status?: ProjectStatus;
    open_to_participants?: boolean;
    institution_id?: number;
    department_id?: number;
  }>({});

  useEffect(() => {
    // Load institutions and departments once
    getInstitutions().then(res => setInstitutions(res.data)).catch(console.error);
    getDepartments().then(res => setDepartments(res.data)).catch(console.error);
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  async function fetchProjects() {
    try {
      const response = await getProjects({
        classification: filter.classification,
        status: filter.status,
        open_to_participants: filter.open_to_participants,
      });
      // Client-side filtering for institution/department
      let filtered = response.data;
      if (filter.institution_id) {
        filtered = filtered.filter(p => p.institution_id === filter.institution_id);
      }
      if (filter.department_id) {
        filtered = filtered.filter(p => p.department_id === filter.department_id);
      }
      setProjects(filtered);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }

  // Filter departments by selected institution (for filters)
  const filteredDepartments = filter.institution_id
    ? departments.filter(d => d.institution_id === filter.institution_id)
    : departments;

  // Filter departments for the form (by form's institution_id)
  const formDepartments = formData.institution_id
    ? departments.filter(d => d.institution_id === formData.institution_id)
    : departments;

  // Get institution and department info for display
  const getLocationInfo = (project: ProjectWithLead) => {
    const parts: string[] = [];
    if (project.institution?.name) parts.push(project.institution.name);
    if (project.department?.name) parts.push(project.department.name);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await createProject({
        ...formData,
        start_date: formData.start_date || undefined,
        institution_id: formData.institution_id || undefined,
        department_id: formData.department_id || undefined,
      });
      setShowForm(false);
      setFormData({
        title: '',
        description: '',
        classification: 'research',
        status: 'preparation',
        open_to_participants: true,
        start_date: '',
        color: '#3B82F6',
        institution_id: user?.institution_id || null,
        department_id: user?.department_id || null,
      });
      fetchProjects();
    } catch (error) {
      console.error('Error creating project:', error);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      fetchProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  }

  async function handleJoinRequest(projectId: number) {
    try {
      await createJoinRequest(projectId);
      alert('Join request sent!');
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to send request');
    }
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Projects</h1>
        {canEdit && (
          <button
            onClick={() => setShowForm(true)}
            className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:bg-blue-800"
          >
            + New Project
          </button>
        )}
      </div>

      {/* Filters - scrollable on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
        <div className="flex gap-2 md:gap-4 flex-nowrap md:flex-wrap min-w-max md:min-w-0">
          <select
            value={filter.institution_id || ''}
            onChange={(e) => setFilter({
              ...filter,
              institution_id: e.target.value ? Number(e.target.value) : undefined,
              department_id: undefined
            })}
            className="border rounded-lg px-3 py-2 text-sm md:text-base min-w-[140px]"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
          <select
            value={filter.department_id || ''}
            onChange={(e) => setFilter({
              ...filter,
              department_id: e.target.value ? Number(e.target.value) : undefined
            })}
            className="border rounded-lg px-3 py-2 text-sm md:text-base min-w-[140px]"
            disabled={!filter.institution_id}
          >
            <option value="">All Depts</option>
            {filteredDepartments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
          <select
            value={filter.classification || ''}
            onChange={(e) => setFilter({ ...filter, classification: e.target.value as ProjectClassification || undefined })}
            className="border rounded-lg px-3 py-2 text-sm md:text-base min-w-[140px]"
          >
            <option value="">All Types</option>
            {Object.entries(classificationLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value as ProjectStatus || undefined })}
            className="border rounded-lg px-3 py-2 text-sm md:text-base min-w-[120px]"
          >
            <option value="">All Status</option>
            {Object.entries(statusLabels).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          <select
            value={filter.open_to_participants === undefined ? '' : filter.open_to_participants.toString()}
            onChange={(e) => setFilter({
              ...filter,
              open_to_participants: e.target.value === '' ? undefined : e.target.value === 'true'
            })}
            className="border rounded-lg px-3 py-2 text-sm md:text-base min-w-[100px]"
          >
            <option value="">Open?</option>
            <option value="true">Open</option>
            <option value="false">Closed</option>
          </select>
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
        {projects.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 py-8">
            No projects found.
          </p>
        ) : (
          projects.map((project) => {
            const locationInfo = getLocationInfo(project);
            return (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="bg-white rounded-lg shadow overflow-hidden hover:shadow-md transition-shadow block"
              >
                <div className="h-2" style={{ backgroundColor: project.color }} />
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-semibold text-lg">{project.title}</span>
                    {project.open_to_participants && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Open</span>
                    )}
                  </div>

                  {locationInfo && (
                    <p className="text-xs text-gray-400 mb-2">{locationInfo}</p>
                  )}

                  {project.description && (
                    <p className="text-gray-500 text-sm mb-3 line-clamp-2">{project.description}</p>
                  )}

                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className={`text-xs px-2 py-1 rounded ${classificationColors[project.classification]}`}>
                      {classificationLabels[project.classification]}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                  </div>

                  {project.lead && (
                    <p className="text-sm text-gray-600 mb-2">
                      Lead: <span className="font-medium">{project.lead.name}</span>
                    </p>
                  )}

                  <div className="text-xs text-gray-400">
                    {project.start_date && <p>Started: {new Date(project.start_date).toLocaleDateString()}</p>}
                    {project.last_status_change && (
                      <p>Last update: {new Date(project.last_status_change).toLocaleDateString()}</p>
                    )}
                  </div>

                  {(canEdit && (project.lead_id === user?.id || (project.open_to_participants && project.lead_id !== user?.id))) && (
                    <div className="flex gap-2 mt-3 pt-3 border-t">
                      {canEdit && project.lead_id === user?.id && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleDelete(project.id); }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Delete
                        </button>
                      )}
                      {canEdit && project.open_to_participants && project.lead_id !== user?.id && (
                        <button
                          onClick={(e) => { e.preventDefault(); handleJoinRequest(project.id); }}
                          className="text-green-600 hover:text-green-800 text-sm"
                        >
                          Request to Join
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>

      {/* Create Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-4 md:p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg md:text-xl font-bold mb-4">New Project</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title *</label>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Classification</label>
                  <select
                    value={formData.classification}
                    onChange={(e) => setFormData({ ...formData, classification: e.target.value as ProjectClassification })}
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
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as ProjectStatus })}
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
                    value={formData.institution_id || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      institution_id: e.target.value ? Number(e.target.value) : null,
                      department_id: null // Reset department when institution changes
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
                    value={formData.department_id || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      department_id: e.target.value ? Number(e.target.value) : null
                    })}
                    className="w-full border rounded-lg px-3 py-2"
                    disabled={!formData.institution_id}
                  >
                    <option value="">No Department</option>
                    {formDepartments.map((dept) => (
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
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="flex items-center sm:pt-6">
                  <input
                    type="checkbox"
                    id="open_to_participants"
                    checked={formData.open_to_participants}
                    onChange={(e) => setFormData({ ...formData, open_to_participants: e.target.checked })}
                    className="mr-2 w-5 h-5"
                  />
                  <label htmlFor="open_to_participants" className="text-sm">Open to participants</label>
                </div>
              </div>
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-gray-50 active:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800"
                >
                  Create Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
