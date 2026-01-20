import React, { useState, useEffect } from 'react';
import { Button, Input, Select, Textarea } from '../ui';
import { FormField } from './FormField';
import { PROJECT_CLASSIFICATIONS, PROJECT_STATUSES } from '../../constants';
import type { ProjectClassification, ProjectStatus, Institution, Department } from '../../types';

export interface ProjectFormData {
  title: string;
  description: string;
  classification: ProjectClassification;
  status: ProjectStatus;
  open_to_participants: boolean;
  start_date: string;
  end_date: string;
  color: string;
  institution_id: number | null;
  department_id: number | null;
}

export interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  institutions?: Institution[];
  departments?: Department[];
}

const defaultFormData: ProjectFormData = {
  title: '',
  description: '',
  classification: 'research',
  status: 'preparation',
  open_to_participants: true,
  start_date: '',
  end_date: '',
  color: '#3B82F6',
  institution_id: null,
  department_id: null,
};

export function ProjectForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  institutions = [],
  departments = [],
}: ProjectFormProps) {
  const [formData, setFormData] = useState<ProjectFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof ProjectFormData, string>>>({});

  // Filter departments based on selected institution
  const filteredDepartments = formData.institution_id
    ? departments.filter((d) => d.institution_id === formData.institution_id)
    : departments;

  // Reset department when institution changes
  useEffect(() => {
    if (
      formData.department_id &&
      !filteredDepartments.some((d) => d.id === formData.department_id)
    ) {
      setFormData((prev) => ({ ...prev, department_id: null }));
    }
  }, [formData.institution_id, filteredDepartments, formData.department_id]);

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof ProjectFormData, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting form:', error);
    }
  };

  const handleChange = (field: keyof ProjectFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const classificationOptions = Object.entries(PROJECT_CLASSIFICATIONS).map(
    ([value, { label }]) => ({ value, label })
  );

  const statusOptions = Object.entries(PROJECT_STATUSES).map(
    ([value, { label }]) => ({ value, label })
  );

  const institutionOptions = institutions.map((inst) => ({
    value: inst.id,
    label: inst.name,
  }));

  const departmentOptions = filteredDepartments.map((dept) => ({
    value: dept.id,
    label: dept.name,
  }));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="Title"
        value={formData.title}
        onChange={(value) => handleChange('title', value)}
        error={errors.title}
        required
        disabled={isLoading}
      />

      <Textarea
        label="Description"
        value={formData.description}
        onChange={(value) => handleChange('description', value)}
        rows={3}
        disabled={isLoading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Classification"
          value={formData.classification}
          onChange={(value) => handleChange('classification', value)}
          options={classificationOptions}
          disabled={isLoading}
        />

        <Select
          label="Status"
          value={formData.status}
          onChange={(value) => handleChange('status', value)}
          options={statusOptions}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Institution"
          value={formData.institution_id?.toString() || ''}
          onChange={(value) =>
            handleChange('institution_id', value ? Number(value) : null)
          }
          options={institutionOptions}
          placeholder="No Institution"
          disabled={isLoading}
        />

        <Select
          label="Department"
          value={formData.department_id?.toString() || ''}
          onChange={(value) =>
            handleChange('department_id', value ? Number(value) : null)
          }
          options={departmentOptions}
          placeholder="No Department"
          disabled={isLoading || !formData.institution_id}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Start Date"
          type="date"
          value={formData.start_date}
          onChange={(value) => handleChange('start_date', value)}
          disabled={isLoading}
        />

        <Input
          label="Deadline"
          type="date"
          value={formData.end_date}
          onChange={(value) => handleChange('end_date', value)}
          disabled={isLoading}
        />
      </div>

      <FormField label="Project Color">
        <div className="flex items-center gap-3">
          <input
            type="color"
            value={formData.color}
            onChange={(e) => handleChange('color', e.target.value)}
            disabled={isLoading}
            className="h-10 w-16 rounded border border-gray-300 cursor-pointer disabled:cursor-not-allowed"
          />
          <span className="text-sm text-gray-500">{formData.color}</span>
        </div>
      </FormField>

      <FormField>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="open_to_participants"
            checked={formData.open_to_participants}
            onChange={(e) => handleChange('open_to_participants', e.target.checked)}
            disabled={isLoading}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <label htmlFor="open_to_participants" className="text-sm text-gray-700">
            Open to participants (allow join requests)
          </label>
        </div>
      </FormField>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {initialData ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  );
}
