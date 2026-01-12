import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getProjects, getMyProjects, getInstitutions, getDepartments, getNewMatchedProjects, getUpcomingDeadlines } from '../services/api';
import { DashboardTabs, type DashboardView } from '../components/dashboard/DashboardTabs';
import { useAuth } from '../contexts/AuthContext';
import type { ProjectWithLead, Institution, Department, MatchedProject } from '../types';

const VIEW_STORAGE_KEY = 'dashboardView';
const INST_STORAGE_KEY = 'dashboardInstitution';
const DEPT_STORAGE_KEY = 'dashboardDepartment';
const DEADLINE_WEEKS_KEY = 'dashboardDeadlineWeeks';

export default function Dashboard() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectWithLead[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [newMatchedProjects, setNewMatchedProjects] = useState<MatchedProject[]>([]);
  const [upcomingDeadlineProjects, setUpcomingDeadlineProjects] = useState<ProjectWithLead[]>([]);
  const [deadlineWeeks, setDeadlineWeeks] = useState<number>(() => {
    const saved = localStorage.getItem(DEADLINE_WEEKS_KEY);
    return saved ? Number(saved) : 2;
  });
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

  // Fetch new matched projects based on user's keywords
  useEffect(() => {
    getNewMatchedProjects()
      .then((res) => setNewMatchedProjects(res.data))
      .catch((err) => console.error('Error fetching matched projects:', err));
  }, []);

  // Fetch projects with upcoming deadlines
  useEffect(() => {
    getUpcomingDeadlines(deadlineWeeks)
      .then((res) => setUpcomingDeadlineProjects(res.data))
      .catch((err) => console.error('Error fetching upcoming deadlines:', err));
  }, [deadlineWeeks]);

  const handleDeadlineWeeksChange = (weeks: number) => {
    setDeadlineWeeks(weeks);
    localStorage.setItem(DEADLINE_WEEKS_KEY, String(weeks));
  };

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

      {/* New Projects Matching Interests & Upcoming Deadlines - Side by Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Projects Matching Your Interests */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <h2 className="text-lg font-semibold text-green-800">Matching Your Interests</h2>
            </div>
            <Link
              to="/settings"
              className="text-xs text-green-600 hover:text-green-800"
            >
              Manage keywords
            </Link>
          </div>
          {newMatchedProjects.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-green-600 text-sm mb-2">No new matching projects</p>
              <Link to="/settings" className="text-xs text-green-500 hover:text-green-700">
                Add keywords to track projects of interest
              </Link>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {newMatchedProjects.slice(0, 4).map((project) => {
                  const locationInfo = getLocationInfo(project);
                  return (
                    <Link
                      key={project.id}
                      to={`/projects/${project.id}`}
                      className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className="font-medium text-sm">{project.title}</p>
                        <span className="bg-green-100 text-green-700 text-xs px-2 py-0.5 rounded-full">New</span>
                      </div>
                      {locationInfo && (
                        <p className="text-xs text-gray-400 mb-1">{locationInfo}</p>
                      )}
                      <div className="flex flex-wrap gap-1">
                        <span className={`text-xs px-2 py-0.5 rounded ${statusColors[project.status]}`}>
                          {project.status}
                        </span>
                        {project.matched_keywords && project.matched_keywords.slice(0, 2).map((kw, idx) => (
                          <span key={idx} className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                            {kw}
                          </span>
                        ))}
                      </div>
                    </Link>
                  );
                })}
              </div>
              {newMatchedProjects.length > 4 && (
                <div className="text-center mt-3">
                  <Link to="/projects" className="text-sm text-green-600 hover:text-green-800">
                    View all {newMatchedProjects.length} matching projects
                  </Link>
                </div>
              )}
            </>
          )}
        </div>

        {/* Upcoming Deadlines */}
        <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-lg font-semibold text-orange-800">Upcoming Deadlines</h2>
            </div>
            <select
              value={deadlineWeeks}
              onChange={(e) => handleDeadlineWeeksChange(Number(e.target.value))}
              className="border border-orange-300 rounded-lg px-2 py-1 text-sm bg-white"
            >
              <option value={1}>1 week</option>
              <option value={2}>2 weeks</option>
              <option value={4}>4 weeks</option>
              <option value={8}>8 weeks</option>
              <option value={12}>12 weeks</option>
            </select>
          </div>
          {upcomingDeadlineProjects.length === 0 ? (
            <p className="text-center text-orange-600 py-6">
              No deadlines within {deadlineWeeks} week{deadlineWeeks !== 1 ? 's' : ''}
            </p>
          ) : (
            <div className="space-y-2">
              {upcomingDeadlineProjects.slice(0, 4).map((project) => {
                const locationInfo = getLocationInfo(project);
                const daysUntil = Math.ceil(
                  (new Date(project.end_date!).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                );
                const isUrgent = daysUntil <= 7;
                return (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-1">
                      <p className="font-medium text-sm">{project.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        isUrgent ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                      }`}>
                        {daysUntil === 0 ? 'Today' : daysUntil === 1 ? 'Tomorrow' : `${daysUntil} days`}
                      </span>
                    </div>
                    {locationInfo && (
                      <p className="text-xs text-gray-400 mb-1">{locationInfo}</p>
                    )}
                    <div className="flex flex-wrap gap-1">
                      <span className={`text-xs px-2 py-0.5 rounded ${statusColors[project.status]}`}>
                        {project.status}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(project.end_date!).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
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
    </div>
  );
}
