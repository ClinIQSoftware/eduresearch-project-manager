import { useEffect, useState } from 'react';
import { getProjectsWithLeads, getLeadsWithProjects, getUsersWithProjects } from '../services/api';
import type { ProjectWithLeadReport, LeadWithProjects, UserWithProjects } from '../types';

type ReportTab = 'projects' | 'leads' | 'users';

export default function Reports() {
  const [activeTab, setActiveTab] = useState<ReportTab>('projects');
  const [projects, setProjects] = useState<ProjectWithLeadReport[]>([]);
  const [leads, setLeads] = useState<LeadWithProjects[]>([]);
  const [users, setUsers] = useState<UserWithProjects[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === 'projects') {
        const response = await getProjectsWithLeads();
        setProjects(response.data);
      } else if (activeTab === 'leads') {
        const response = await getLeadsWithProjects();
        setLeads(response.data);
      } else {
        const response = await getUsersWithProjects();
        setUsers(response.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Reports</h1>

      {/* Tab Navigation */}
      <div className="flex border-b">
        {[
          { id: 'projects' as const, label: 'Projects with Leads' },
          { id: 'leads' as const, label: 'Leads with Projects' },
          { id: 'users' as const, label: 'Users with Projects' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-medium ${
              activeTab === tab.id
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <>
          {/* Projects with Leads */}
          {activeTab === 'projects' && (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Classification</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Lead</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Open</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Date</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-medium">{project.title}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{project.classification?.replace('_', ' ')}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm capitalize">{project.status}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {project.lead_name ? (
                          <div>
                            <p>{project.lead_name}</p>
                            <p className="text-gray-400">{project.lead_email}</p>
                          </div>
                        ) : (
                          <span className="text-gray-400">No lead</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {project.open_to_participants ? (
                          <span className="text-green-600">Yes</span>
                        ) : (
                          <span className="text-gray-400">No</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {project.start_date ? new Date(project.start_date).toLocaleDateString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {projects.length === 0 && (
                <p className="text-center text-gray-500 py-8">No projects found</p>
              )}
            </div>
          )}

          {/* Leads with Projects */}
          {activeTab === 'leads' && (
            <div className="space-y-4">
              {leads.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No leads found</p>
              ) : (
                leads.map((lead) => (
                  <div key={lead.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{lead.name}</h3>
                        <p className="text-gray-500">{lead.email}</p>
                      </div>
                      <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                        {lead.projects.length} projects
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {lead.projects.map((project) => (
                        <span
                          key={project.id}
                          className="bg-gray-100 px-3 py-1 rounded text-sm"
                        >
                          {project.title}
                          <span className="text-gray-400 ml-1">({project.status})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Users with Projects */}
          {activeTab === 'users' && (
            <div className="space-y-4">
              {users.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No users found</p>
              ) : (
                users.map((u) => (
                  <div key={u.id} className="bg-white rounded-lg shadow p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{u.name}</h3>
                        <p className="text-gray-500">{u.email}</p>
                      </div>
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-sm">
                        {u.projects.length} projects
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {u.projects.map((project) => (
                        <span
                          key={project.id}
                          className={`px-3 py-1 rounded text-sm ${
                            project.role === 'lead'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {project.title}
                          <span className="ml-1">
                            ({project.role === 'lead' ? 'Lead' : 'Participant'})
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
