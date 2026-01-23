import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { getLeadsWithProjects, getUsersWithProjects } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { StatCard } from '../../components/reports/StatCard';
import { ExportButton } from '../../components/reports/ExportButton';

const VIEW_OPTIONS = [
  { value: 'all', label: 'All People' },
  { value: 'leads', label: 'Leads Only' },
  { value: 'participants', label: 'Participants Only' },
];

interface PersonWithProjects {
  id: number;
  name: string;
  email: string;
  department_id: number | null;
  projects: { id: number; title: string; role?: string; status: string | null }[];
  isLead: boolean;
}

function getWorkloadColor(count: number): string {
  if (count <= 2) return 'text-green-600 bg-green-100';
  if (count <= 5) return 'text-yellow-600 bg-yellow-100';
  return 'text-red-600 bg-red-100';
}

function PersonCard({ person }: { person: PersonWithProjects }) {
  const [expanded, setExpanded] = useState(false);
  const projectCount = person.projects.length;

  return (
    <Card>
      <div
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
          <div>
            <p className="font-medium">{person.name}</p>
            <p className="text-sm text-gray-500">{person.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {person.isLead && (
            <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded">
              Lead
            </span>
          )}
          <span className={`px-2 py-1 text-sm font-medium rounded ${getWorkloadColor(projectCount)}`}>
            {projectCount} project{projectCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {expanded && person.projects.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500">
                <th className="pb-2">Project</th>
                <th className="pb-2">Role</th>
                <th className="pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {person.projects.map((project) => (
                <tr key={project.id} className="border-t border-gray-50">
                  <td className="py-2">
                    <Link
                      to={`/projects/${project.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {project.title}
                    </Link>
                  </td>
                  <td className="py-2 capitalize">{project.role || 'participant'}</td>
                  <td className="py-2 capitalize">{project.status?.replace('_', ' ') || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export default function PeopleTab() {
  const [search, setSearch] = useState('');
  const [viewFilter, setViewFilter] = useState('all');

  const { data: leadsData = [], isLoading: leadsLoading } = useQuery({
    queryKey: ['reports', 'leads-with-projects'],
    queryFn: async () => {
      const response = await getLeadsWithProjects();
      return response.data;
    },
  });

  const { data: usersData = [], isLoading: usersLoading } = useQuery({
    queryKey: ['reports', 'users-with-projects'],
    queryFn: async () => {
      const response = await getUsersWithProjects();
      return response.data;
    },
  });

  const isLoading = leadsLoading || usersLoading;

  // Merge leads and users into a single list, marking who is a lead
  const allPeople = useMemo(() => {
    const leadIds = new Set(leadsData.map((l) => l.id));
    const peopleMap = new Map<number, PersonWithProjects>();

    // Add leads first
    leadsData.forEach((lead) => {
      peopleMap.set(lead.id, {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        department_id: lead.department_id,
        projects: lead.projects.map((p) => ({ ...p, role: 'lead' })),
        isLead: true,
      });
    });

    // Add/merge users
    usersData.forEach((user) => {
      const existing = peopleMap.get(user.id);
      if (existing) {
        // Merge projects, avoiding duplicates
        const existingProjectIds = new Set(existing.projects.map((p) => p.id));
        user.projects.forEach((p) => {
          if (!existingProjectIds.has(p.id)) {
            existing.projects.push(p);
          }
        });
      } else {
        peopleMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          department_id: user.department_id,
          projects: user.projects,
          isLead: leadIds.has(user.id),
        });
      }
    });

    return Array.from(peopleMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [leadsData, usersData]);

  const filteredPeople = useMemo(() => {
    return allPeople.filter((person) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        if (
          !person.name.toLowerCase().includes(searchLower) &&
          !person.email.toLowerCase().includes(searchLower)
        ) {
          return false;
        }
      }

      // View filter
      if (viewFilter === 'leads' && !person.isLead) return false;
      if (viewFilter === 'participants' && person.isLead) return false;

      return true;
    });
  }, [allPeople, search, viewFilter]);

  // Stats
  const totalPeople = allPeople.length;
  const avgProjects = totalPeople > 0
    ? (allPeople.reduce((sum, p) => sum + p.projects.length, 0) / totalPeople).toFixed(1)
    : '0';
  const noActiveProjects = allPeople.filter(
    (p) => p.projects.every((proj) => proj.status === 'completed' || proj.status === 'on_hold')
  ).length;

  // Export data
  const exportData = filteredPeople.map((p) => ({
    name: p.name,
    email: p.email,
    is_lead: p.isLead ? 'Yes' : 'No',
    project_count: p.projects.length,
    projects: p.projects.map((proj) => proj.title).join('; '),
  }));

  const exportColumns = [
    { key: 'name', header: 'Name' },
    { key: 'email', header: 'Email' },
    { key: 'is_lead', header: 'Is Lead' },
    { key: 'project_count', header: 'Project Count' },
    { key: 'projects', header: 'Projects' },
  ];

  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Total People"
          value={totalPeople}
          subtitle="involved in projects"
        />
        <StatCard
          title="Avg. Projects per Person"
          value={avgProjects}
        />
        <StatCard
          title="No Active Projects"
          value={noActiveProjects}
          subtitle="people"
          subtitleColor={noActiveProjects > 0 ? 'gray' : 'green'}
        />
      </div>

      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={setSearch}
          />
          <Select options={VIEW_OPTIONS} value={viewFilter} onChange={setViewFilter} />
          <ExportButton
            data={exportData}
            filename="people-report"
            columns={exportColumns}
          />
        </div>
      </Card>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filteredPeople.length} of {allPeople.length} people
      </p>

      {/* Person Cards */}
      <div className="space-y-3">
        {filteredPeople.length > 0 ? (
          filteredPeople.map((person) => (
            <PersonCard key={person.id} person={person} />
          ))
        ) : (
          <Card>
            <p className="text-center text-gray-500 py-4">No people match your filters</p>
          </Card>
        )}
      </div>
    </div>
  );
}
