import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, getMyProjects, getInstitutions, getDepartments } from '../services/api';
import { DashboardTabs, type DashboardView } from '../components/dashboard/DashboardTabs';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectWithLead, Institution, Department } from '../types';

const VIEW_STORAGE_KEY = 'dashboardView';
const INST_STORAGE_KEY = 'dashboardInstitution';
const DEPT_STORAGE_KEY = 'dashboardDepartment';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithLead[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<string>(() => {
    return localStorage.getItem(INST_STORAGE_KEY) || '';
  });
  const [selectedDeptId, setSelectedDeptId] = useState<string>(() => {
    return localStorage.getItem(DEPT_STORAGE_KEY) || '';
  });
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<DashboardView>(() => {
    const saved = localStorage.getItem(VIEW_STORAGE_KEY);
    return (saved as DashboardView) || 'global';
  });

  // Fetch institutions and departments for the dropdowns (only if user is superuser)
  useEffect(() => {
    if (user?.is_superuser) {
      getInstitutions()
        .then((res) => setInstitutions(res.data))
        .catch((err) => console.error('Error fetching institutions:', err));
      getDepartments()
        .then((res) => setDepartments(res.data))
        .catch((err) => console.error('Error fetching departments:', err));
    }
  }, [user]);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      let response;
      switch (activeView) {
        case 'personal':
          response = await getMyProjects();
          break;
        case 'global':
          response = await getProjects({ view: 'global' });
          break;
        case 'department':
          response = await getProjects({ view: 'global' });
          if (user?.is_superuser && selectedDeptId) {
            response.data = response.data.filter(
              (p) => p.department_id === Number(selectedDeptId)
            );
          } else if (user?.department_id) {
            response.data = response.data.filter(
              (p) => p.department_id === user.department_id
            );
          }
          break;
        case 'institution':
        default:
          response = await getProjects({ view: 'global' });
          if (user?.is_superuser && selectedInstId) {
            response.data = response.data.filter(
              (p) => p.institution_id === Number(selectedInstId)
            );
          } else if (user?.institution_id) {
            response.data = response.data.filter(
              (p) => p.institution_id === user.institution_id
            );
          }
          break;
      }
      setProjects(response.data);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  }, [activeView, selectedInstId, selectedDeptId, user]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleViewChange = (view: DashboardView) => {
    setActiveView(view);
    localStorage.setItem(VIEW_STORAGE_KEY, view);
  };

  const handleInstChange = (instId: string) => {
    setSelectedInstId(instId);
    localStorage.setItem(INST_STORAGE_KEY, instId);
  };

  const handleDeptChange = (deptId: string) => {
    setSelectedDeptId(deptId);
    localStorage.setItem(DEPT_STORAGE_KEY, deptId);
  };

  const getViewTitle = () => {
    switch (activeView) {
      case 'personal':
        return 'My Projects';
      case 'department':
        if (user?.is_superuser && selectedDeptId) {
          const dept = departments.find((d) => d.id === Number(selectedDeptId));
          return dept ? `${dept.name} Projects` : 'Department Projects';
        }
        return 'Department Projects';
      case 'institution':
        if (user?.is_superuser && selectedInstId) {
          const inst = institutions.find((i) => i.id === Number(selectedInstId));
          return inst ? `${inst.name} Projects` : 'Institution Projects';
        }
        return 'Institution Projects';
      case 'global':
        return 'All Projects';
      default:
        return 'Dashboard';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  // Calculate statistics
  const stats = {
    total: projects.length,
    open: projects.filter(p => p.open_to_participants).length,
    byStatus: {
      preparation: projects.filter(p => p.status === 'preparation').length,
      recruitment: projects.filter(p => p.status === 'recruitment').length,
      analysis: projects.filter(p => p.status === 'analysis').length,
      writing: projects.filter(p => p.status === 'writing').length,
    },
    byClassification: {
      education: projects.filter(p => p.classification === 'education').length,
      research: projects.filter(p => p.classification === 'research').length,
      quality_improvement: projects.filter(p => p.classification === 'quality_improvement').length,
      administrative: projects.filter(p => p.classification === 'administrative').length,
    },
  };

  // Get recent projects sorted by updated_at
  const recentProjects = [...projects]
    .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
    .slice(0, 5);

  // Get upcoming projects by start date
  const upcomingProjects = [...projects]
    .filter(p => p.start_date && new Date(p.start_date) >= new Date())
    .sort((a, b) => new Date(a.start_date!).getTime() - new Date(b.start_date!).getTime())
    .slice(0, 5);

  const statusColors: Record<string, string> = {
    preparation: 'bg-yellow-100 text-yellow-800',
    recruitment: 'bg-blue-100 text-blue-800',
    analysis: 'bg-purple-100 text-purple-800',
    writing: 'bg-green-100 text-green-800',
  };

  const classificationColors: Record<string, string> = {
    education: 'bg-blue-100 text-blue-800',
    research: 'bg-purple-100 text-purple-800',
    quality_improvement: 'bg-orange-100 text-orange-800',
    administrative: 'bg-gray-100 text-gray-800',
  };

  // Get institution and department info for display
  const getLocationInfo = (project: ProjectWithLead) => {
    const parts: string[] = [];
    if (project.institution?.name) parts.push(project.institution.name);
    if (project.department?.name) parts.push(project.department.name);
    return parts.length > 0 ? parts.join(' • ') : null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{getViewTitle()}</h1>
      </div>

      <DashboardTabs activeView={activeView} onViewChange={handleViewChange} />

      {/* Department Filter (only for superusers on Department view) */}
      {user?.is_superuser && activeView === 'department' && departments.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by Department:</label>
          <select
            value={selectedDeptId}
            onChange={(e) => handleDeptChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[200px]"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Institution Filter (only for superusers on Institution view) */}
      {user?.is_superuser && activeView === 'institution' && institutions.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
          <label className="text-sm font-medium text-gray-700">Filter by Institution:</label>
          <select
            value={selectedInstId}
            onChange={(e) => handleInstChange(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm w-full sm:w-auto sm:min-w-[200px]"
          >
            <option value="">All Institutions</option>
            {institutions.map((inst) => (
              <option key={inst.id} value={inst.id}>{inst.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Total Projects</p>
          <p className="text-xl md:text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Open to Join</p>
          <p className="text-xl md:text-2xl font-bold text-green-600">{stats.open}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Recruiting</p>
          <p className="text-xl md:text-2xl font-bold text-blue-600">{stats.byStatus.recruitment}</p>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-lg shadow">
          <p className="text-xs md:text-sm text-gray-500">Research</p>
          <p className="text-xl md:text-2xl font-bold text-purple-600">{stats.byClassification.research}</p>
        </div>
      </div>

      {/* Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Projects by Status</h2>
          <div className="space-y-3">
            {Object.entries(stats.byStatus).map(([status, count]) => (
              <div key={status} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[status]}`}>
                    {status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Projects by Classification</h2>
          <div className="space-y-3">
            {Object.entries(stats.byClassification).map(([classification, count]) => (
              <div key={classification} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${classificationColors[classification]}`}>
                    {classification.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-purple-600 h-2 rounded-full"
                      style={{ width: `${stats.total > 0 ? (count / stats.total) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity and Upcoming Projects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently Updated */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Recently Updated Projects</h2>
          {recentProjects.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No projects yet</p>
          ) : (
            <div className="space-y-3">
              {recentProjects.map((project) => {
                const locationInfo = getLocationInfo(project);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-gray-500">
                          Lead: {project.lead?.name || 'Unassigned'}
                        </p>
                        {locationInfo && (
                          <p className="text-xs text-gray-400">{locationInfo}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Updated: {new Date(project.updated_at || project.created_at).toLocaleDateString()}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Upcoming Projects by Start Date */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-4">Upcoming Project Start Dates</h2>
          {upcomingProjects.length === 0 ? (
            <p className="text-center text-gray-500 py-4">No upcoming projects</p>
          ) : (
            <div className="space-y-3">
              {upcomingProjects.map((project) => {
                const locationInfo = getLocationInfo(project);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{project.title}</p>
                        <p className="text-sm text-gray-500">
                          Lead: {project.lead?.name || 'Unassigned'}
                        </p>
                        {locationInfo && (
                          <p className="text-xs text-gray-400">{locationInfo}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${classificationColors[project.classification]}`}>
                        {project.classification.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                      Starts: {new Date(project.start_date!).toLocaleDateString()}
                    </p>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Projects Open to Participants */}
      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4">Projects Open to Participants</h2>
        {projects.filter(p => p.open_to_participants).length === 0 ? (
          <p className="text-center text-gray-500 py-4">No projects currently open</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
            {projects
              .filter(p => p.open_to_participants)
              .slice(0, 6)
              .map((project) => {
                const locationInfo = getLocationInfo(project);
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <p className="font-medium">{project.title}</p>
                      <span className="text-green-600 text-xs">Open</span>
                    </div>
                    {locationInfo && (
                      <p className="text-xs text-gray-400 mb-1">{locationInfo}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{project.description}</p>
                    <div className="flex gap-2">
                      <span className={`text-xs px-2 py-1 rounded ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded ${classificationColors[project.classification]}`}>
                        {project.classification.replace('_', ' ')}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </div>
        )}
        {projects.filter(p => p.open_to_participants).length > 6 && (
          <div className="text-center mt-4">
            <Link to="/projects" className="text-blue-600 hover:underline text-sm">
              View all open projects
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
