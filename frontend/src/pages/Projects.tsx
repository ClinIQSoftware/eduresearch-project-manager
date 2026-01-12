import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, createProject, deleteProject, createJoinRequest, getInstitutionsPublic, getDepartmentsPublic, searchProjects, getMatchedProjects, getUserKeywords, addKeyword, deleteKeyword } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useCanEdit } from '../components/ui/PendingApprovalBanner';
import type { ProjectWithLead, ProjectClassification, ProjectStatus, Institution, Department, MatchedProject, UserKeyword } from '../types';

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

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProjectWithLead[] | null>(null);
  const [searching, setSearching] = useState(false);

  // Matched projects state (based on user's keywords)
  const [matchedProjects, setMatchedProjects] = useState<MatchedProject[]>([]);
  const [showMatchedSection, setShowMatchedSection] = useState(true);

  // User keywords state
  const [userKeywords, setUserKeywords] = useState<UserKeyword[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [addingKeyword, setAddingKeyword] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    classification: 'research' as ProjectClassification,
    status: 'preparation' as ProjectStatus,
    open_to_participants: true,
    start_date: '',
    end_date: '',
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
    // Load all institutions and departments for filters
    getInstitutionsPublic().then(res => setInstitutions(res.data)).catch(console.error);
    getDepartmentsPublic().then(res => setDepartments(res.data)).catch(console.error);
    // Load user's keywords and matched projects
    loadKeywordsAndMatches();
  }, []);

  async function loadKeywordsAndMatches() {
    try {
      const [keywordsRes, matchedRes] = await Promise.all([
        getUserKeywords(),
        getMatchedProjects(10)
      ]);
      setUserKeywords(keywordsRes.data.keywords);
      setMatchedProjects(matchedRes.data);
    } catch (err) {
      console.error('Error loading keywords/matches:', err);
    }
  }

  async function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newKeyword.trim();
    if (!trimmed || addingKeyword) return;

    if (userKeywords.length >= 20) {
      alert('Maximum of 20 keywords allowed');
      return;
    }

    if (userKeywords.some(k => k.keyword.toLowerCase() === trimmed.toLowerCase())) {
      alert('Keyword already exists');
      return;
    }

    setAddingKeyword(true);
    try {
      const res = await addKeyword(trimmed);
      setUserKeywords([res.data, ...userKeywords]);
      setNewKeyword('');
      // Reload matched projects with new keyword
      getMatchedProjects(10).then(res => setMatchedProjects(res.data)).catch(console.error);
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add keyword');
    } finally {
      setAddingKeyword(false);
    }
  }

  async function handleDeleteKeyword(keywordId: number) {
    try {
      await deleteKeyword(keywordId);
      setUserKeywords(userKeywords.filter(k => k.id !== keywordId));
      // Reload matched projects
      getMatchedProjects(10).then(res => setMatchedProjects(res.data)).catch(console.error);
    } catch (err) {
      console.error('Error deleting keyword:', err);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, [filter]);

  async function fetchProjects() {
    try {
      const response = await getProjects({
        view: 'global',  // Fetch all projects, filter client-side
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
        end_date: formData.end_date || undefined,
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
        end_date: '',
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

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }

    setSearching(true);
    try {
      const res = await searchProjects(searchQuery.trim());
      setSearchResults(res.data);
    } catch (error) {
      console.error('Error searching projects:', error);
    } finally {
      setSearching(false);
    }
  }

  function clearSearch() {
    setSearchQuery('');
    setSearchResults(null);
  }

  if (loading) return <div className="text-center py-8">Loading...</div>;

  return (
    <div className="space-y-4 md:space-y-6 pb-6">
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

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search projects by keyword..."
            className="w-full border rounded-lg px-4 py-2 pl-10"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <button
          type="submit"
          disabled={searching}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
        {searchResults !== null && (
          <button
            type="button"
            onClick={clearSearch}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
        )}
      </form>

      {/* Search Results */}
      {searchResults !== null && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="font-semibold text-blue-800">
              Search Results ({searchResults.length})
            </h2>
          </div>
          {searchResults.length === 0 ? (
            <p className="text-blue-600 text-sm">No projects found matching "{searchQuery}"</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {searchResults.map((project) => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
                >
                  <div className="font-medium text-sm mb-1">{project.title}</div>
                  {project.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-2">{project.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${classificationColors[project.classification]}`}>
                      {classificationLabels[project.classification]}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded ${statusColors[project.status]}`}>
                      {statusLabels[project.status]}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Studies Matching Your Interests */}
      <div className="bg-green-50 border border-green-200 rounded-lg">
        <button
          onClick={() => setShowMatchedSection(!showMatchedSection)}
          className="w-full p-4 flex justify-between items-center text-left"
        >
          <div>
            <h2 className="font-semibold text-green-800">
              Projects Matching Your Interests {matchedProjects.length > 0 && `(${matchedProjects.length})`}
            </h2>
            <p className="text-xs text-green-600 mt-1">
              {userKeywords.length > 0
                ? `Tracking ${userKeywords.length} keyword${userKeywords.length !== 1 ? 's' : ''}`
                : 'Add keywords to track projects of interest'}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-green-600 transition-transform ${showMatchedSection ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showMatchedSection && (
          <div className="px-4 pb-4 space-y-4">
            {/* Keywords Management */}
            <div className="bg-white rounded-lg p-3 border border-green-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Your Keywords</span>
                <span className="text-xs text-gray-400">{userKeywords.length}/20</span>
              </div>

              {/* Add Keyword Form */}
              <form onSubmit={handleAddKeyword} className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  placeholder="Add keyword (e.g., clinical trials)"
                  maxLength={100}
                  className="flex-1 px-3 py-1.5 text-sm border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  disabled={addingKeyword || userKeywords.length >= 20}
                />
                <button
                  type="submit"
                  disabled={addingKeyword || !newKeyword.trim() || userKeywords.length >= 20}
                  className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingKeyword ? '...' : 'Add'}
                </button>
              </form>

              {/* Keywords Tags */}
              {userKeywords.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No keywords yet. Add keywords above to track matching projects.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {userKeywords.map((kw) => (
                    <span
                      key={kw.id}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs"
                    >
                      {kw.keyword}
                      <button
                        onClick={() => handleDeleteKeyword(kw.id)}
                        className="text-green-600 hover:text-green-800 hover:bg-green-200 rounded-full p-0.5"
                        title="Remove keyword"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Matched Projects */}
            {matchedProjects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {matchedProjects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="bg-white rounded-lg shadow-sm p-3 hover:shadow-md transition-shadow"
                  >
                    <div className="font-medium text-sm mb-1">{project.title}</div>
                    {project.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-2">{project.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className={`text-xs px-2 py-0.5 rounded ${classificationColors[project.classification]}`}>
                        {classificationLabels[project.classification]}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[project.status]}`}>
                        {statusLabels[project.status]}
                      </span>
                    </div>
                    {project.matched_keywords && project.matched_keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.matched_keywords.map((kw, idx) => (
                          <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : userKeywords.length > 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No projects match your keywords yet.</p>
            ) : null}

            <div className="text-right">
              <Link
                to="/settings"
                className="text-xs text-green-600 hover:text-green-800"
              >
                More options in Settings
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Filters - scrollable on mobile */}
      <div className="overflow-x-auto pb-2">
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
                    {project.end_date && <p>Deadline: {new Date(project.end_date).toLocaleDateString()}</p>}
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
                <div>
                  <label className="block text-sm font-medium mb-1">Deadline</label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="open_to_participants"
                  checked={formData.open_to_participants}
                  onChange={(e) => setFormData({ ...formData, open_to_participants: e.target.checked })}
                  className="mr-2 w-5 h-5"
                />
                <label htmlFor="open_to_participants" className="text-sm">Open to participants</label>
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
