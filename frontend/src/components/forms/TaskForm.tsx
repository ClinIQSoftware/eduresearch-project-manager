import React, { useState } from 'react';
import { Button, Input, Select, Textarea } from '../ui';
import { TASK_STATUSES, TASK_PRIORITIES } from '../../constants';
import type { TaskStatus, TaskPriority, UserBrief } from '../../types';

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string;
  assigned_to_id: number | null;
}

export interface TaskFormProps {
  initialData?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
  projectId?: number;
  assignableUsers?: UserBrief[];
}

const defaultFormData: TaskFormData = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  due_date: '',
  assigned_to_id: null,
};

export function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  isLoading = false,
  assignableUsers = [],
}: TaskFormProps) {
  const [formData, setFormData] = useState<TaskFormData>({
    ...defaultFormData,
    ...initialData,
  });
  const [errors, setErrors] = useState<Partial<Record<keyof TaskFormData, string>>>({});

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof TaskFormData, string>> = {};

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

  const handleChange = (field: keyof TaskFormData, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const statusOptions = Object.entries(TASK_STATUSES).map(([value, { label }]) => ({
    value,
    label,
  }));

  const priorityOptions = Object.entries(TASK_PRIORITIES).map(([value, { label }]) => ({
    value,
    label,
  }));

  const userOptions = assignableUsers.map((user) => ({
    value: user.id,
    label: user.name || user.email,
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
          label="Status"
          value={formData.status}
          onChange={(value) => handleChange('status', value)}
          options={statusOptions}
          disabled={isLoading}
        />

        <Select
          label="Priority"
          value={formData.priority}
          onChange={(value) => handleChange('priority', value)}
          options={priorityOptions}
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Due Date"
          type="date"
          value={formData.due_date}
          onChange={(value) => handleChange('due_date', value)}
          disabled={isLoading}
        />

        <Select
          label="Assigned To"
          value={formData.assigned_to_id?.toString() || ''}
          onChange={(value) =>
            handleChange('assigned_to_id', value ? Number(value) : null)
          }
          options={userOptions}
          placeholder="Unassigned"
          disabled={isLoading}
        />
      </div>

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
          {initialData ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  );
}
