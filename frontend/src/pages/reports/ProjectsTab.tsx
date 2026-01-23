import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getProjectsWithLeads } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Table, TableColumn } from '../../components/ui/Table';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';
import { ExportButton } from '../../components/reports/ExportButton';
import type { ProjectWithLeadReport } from '../../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'preparation', label: 'Preparation' },
  { value: 'recruitment', label: 'Recruitment' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'writing', label: 'Writing' },
];

const CLASSIFICATION_OPTIONS = [
  { value: '', label: 'All Classifications' },
  { value: 'education', label: 'Education' },
  { value: 'research', label: 'Research' },
  { value: 'quality_improvement', label: 'Quality Improvement' },
  { value: 'administrative', label: 'Administrative' },
];

const OPEN_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'yes', label: 'Open to Participants' },
  { value: 'no', label: 'Not Open' },
];

export default function ProjectsTab() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [classification, setClassification] = useState('');
  const [openFilter, setOpenFilter] = useState('');

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['reports', 'projects-with-leads'],
    queryFn: async () => {
      const response = await getProjectsWithLeads();
      return response.data;
    },
  });

  const filteredProjects = useMemo(() => {
    return projects.filter((p) => {
      if (search && !p.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (status && p.status !== status) return false;
      if (classification && p.classification !== classification) return false;
      if (openFilter === 'yes' && !p.open_to_participants) return false;
      if (openFilter === 'no' && p.open_to_participants) return false;
      return true;
    });
  }, [projects, search, status, classification, openFilter]);

  const columns: TableColumn<ProjectWithLeadReport>[] = [
    {
      key: 'title',
      header: 'Project',
      render: (p) => (
        <Link to={`/projects/${p.id}`} className="font-medium text-blue-600 hover:underline">
          {p.title}
        </Link>
      ),
    },
    {
      key: 'classification',
      header: 'Classification',
      render: (p) => (
        <span className="capitalize">{p.classification?.replace('_', ' ') || '-'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (p) => <span className="capitalize">{p.status?.replace('_', ' ') || '-'}</span>,
    },
    {
      key: 'lead_name',
      header: 'Lead',
      render: (p) =>
        p.lead_name ? (
          <div>
            <p>{p.lead_name}</p>
            <p className="text-xs text-gray-400">{p.lead_email}</p>
          </div>
        ) : (
          <span className="text-gray-400">No lead</span>
        ),
    },
    {
      key: 'open_to_participants',
      header: 'Open',
      render: (p) =>
        p.open_to_participants ? (
          <span className="text-green-600">Yes</span>
        ) : (
          <span className="text-gray-400">No</span>
        ),
    },
    {
      key: 'start_date',
      header: 'Start Date',
      render: (p) => (p.start_date ? new Date(p.start_date).toLocaleDateString() : '-'),
    },
  ];

  const exportColumns = [
    { key: 'title', header: 'Project' },
    { key: 'classification', header: 'Classification' },
    { key: 'status', header: 'Status' },
    { key: 'lead_name', header: 'Lead Name' },
    { key: 'lead_email', header: 'Lead Email' },
    { key: 'open_to_participants', header: 'Open to Participants' },
    { key: 'start_date', header: 'Start Date' },
  ];

  if (isLoading) {
    return <div className="py-8"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Input
            placeholder="Search projects..."
            value={search}
            onChange={setSearch}
          />
          <Select options={STATUS_OPTIONS} value={status} onChange={setStatus} />
          <Select options={CLASSIFICATION_OPTIONS} value={classification} onChange={setClassification} />
          <Select options={OPEN_OPTIONS} value={openFilter} onChange={setOpenFilter} />
          <ExportButton
            data={filteredProjects}
            filename="projects-report"
            columns={exportColumns}
          />
        </div>
      </Card>

      {/* Results count */}
      <p className="text-sm text-gray-500">
        Showing {filteredProjects.length} of {projects.length} projects
      </p>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          data={filteredProjects}
          emptyMessage="No projects match your filters"
        />
      </Card>
    </div>
  );
}
