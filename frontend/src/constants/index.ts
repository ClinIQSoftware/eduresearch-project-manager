export const PROJECT_CLASSIFICATIONS = {
  research: { label: 'Research', color: 'bg-blue-100 text-blue-800' },
  education: { label: 'Education', color: 'bg-purple-100 text-purple-800' },
  quality_improvement: { label: 'Quality Improvement', color: 'bg-green-100 text-green-800' },
  administrative: { label: 'Administrative', color: 'bg-gray-100 text-gray-800' },
} as const;

export const PROJECT_STATUSES = {
  preparation: { label: 'Preparation', color: 'bg-yellow-100 text-yellow-800' },
  recruitment: { label: 'Recruitment', color: 'bg-orange-100 text-orange-800' },
  analysis: { label: 'Analysis', color: 'bg-cyan-100 text-cyan-800' },
  writing: { label: 'Writing', color: 'bg-pink-100 text-pink-800' },
} as const;

export const TASK_STATUSES = {
  todo: { label: 'To Do', color: 'bg-gray-100 text-gray-800' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-800' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-800' },
} as const;

export const TASK_PRIORITIES = {
  low: { label: 'Low', color: 'bg-gray-100 text-gray-800' },
  medium: { label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
  high: { label: 'High', color: 'bg-red-100 text-red-800' },
} as const;

// Type helpers
export type ProjectClassificationKey = keyof typeof PROJECT_CLASSIFICATIONS;
export type ProjectStatusKey = keyof typeof PROJECT_STATUSES;
export type TaskStatusKey = keyof typeof TASK_STATUSES;
export type TaskPriorityKey = keyof typeof TASK_PRIORITIES;
