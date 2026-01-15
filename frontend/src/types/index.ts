// Auth types
export type AuthProvider = 'local' | 'google' | 'microsoft';

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;  // Computed from first_name + last_name
  phone: string | null;
  bio: string | null;
  is_active: boolean;
  is_superuser: boolean;
  is_approved: boolean;
  approved_at: string | null;
  auth_provider: AuthProvider;
  institution_id: number | null;  // Link to Institution entity
  department_id: number | null;  // Link to Department entity
  created_at: string;
  updated_at: string | null;
}

// System Settings types
export interface SystemSettings {
  id: number;
  require_registration_approval: boolean;
  registration_approval_mode: 'block' | 'limited';
  min_password_length: number;
  require_uppercase: boolean;
  require_lowercase: boolean;
  require_numbers: boolean;
  require_special_chars: boolean;
  session_timeout_minutes: number;
  google_oauth_enabled: boolean;
  microsoft_oauth_enabled: boolean;
  institution_id: number | null;
  updated_at: string | null;
}

export interface BulkUploadResult {
  created: number;
  skipped: number;
  errors: string[];
}

export interface UserBrief {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  name: string;  // Computed from first_name + last_name
  institution_id: number | null;
  department_id: number | null;
}

// Institution types
export interface Institution {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string | null;
}

// Department types
export interface Department {
  id: number;
  name: string;
  description: string | null;
  institution_id: number;
  created_at: string;
  updated_at: string | null;
}

export interface DepartmentWithMembers extends Department {
  users: UserBrief[];
}

// Project types
export type ProjectClassification = 'education' | 'research' | 'quality_improvement' | 'administrative';
export type ProjectStatus = 'preparation' | 'recruitment' | 'analysis' | 'writing';
export type MemberRole = 'lead' | 'participant';

// Brief types for nested objects
export interface InstitutionBrief {
  id: number;
  name: string;
}

export interface DepartmentBrief {
  id: number;
  name: string;
}

export interface Project {
  id: number;
  title: string;
  description: string | null;
  color: string;
  classification: ProjectClassification;
  status: ProjectStatus;
  open_to_participants: boolean;
  start_date: string | null;
  end_date: string | null;  // Deadline/target completion date
  next_meeting_date: string | null;  // Next project discussion meeting
  last_status_change: string | null;
  institution_id: number | null;
  department_id: number | null;
  lead_id: number | null;
  created_at: string;
  updated_at: string | null;
  institution: InstitutionBrief | null;
  department: DepartmentBrief | null;
  // Email reminder settings
  meeting_reminder_enabled: boolean;
  meeting_reminder_days: number;
  deadline_reminder_enabled: boolean;
  deadline_reminder_days: number;
}

export interface ProjectWithLead extends Project {
  lead: UserBrief | null;
}

export interface ProjectMember {
  id: number;
  user_id: number;
  role: MemberRole;
  joined_at: string;
  user: UserBrief;
}

export interface ProjectDetail extends ProjectWithLead {
  members: ProjectMember[];
}

// Join Request types
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface JoinRequest {
  id: number;
  project_id: number;
  user_id: number;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  responded_at: string | null;
}

export interface JoinRequestWithUser extends JoinRequest {
  user: UserBrief;
}

// File types
export interface ProjectFile {
  id: number;
  project_id: number;
  uploaded_by_id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  content_type: string | null;
  uploaded_at: string;
  uploaded_by?: UserBrief;
}

// Report types
export interface ProjectWithLeadReport {
  id: number;
  title: string;
  classification: string;
  status: string;
  open_to_participants: boolean;
  start_date: string | null;
  last_status_change: string | null;
  lead_id: number | null;
  lead_name: string | null;
  lead_email: string | null;
}

export interface LeadWithProjects {
  id: number;
  name: string;
  email: string;
  department_id: number | null;
  projects: {
    id: number;
    title: string;
    status: string | null;
    classification: string | null;
  }[];
}

export interface UserWithProjects {
  id: number;
  name: string;
  email: string;
  department_id: number | null;
  projects: {
    id: number;
    title: string;
    role: string;
    status: string | null;
  }[];
}

// Task types
export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  project_id: number | null;
  assigned_to_id: number | null;
  created_by_id: number | null;
  assigned_to: UserBrief | null;
  created_by: UserBrief | null;
  created_at: string;
  updated_at: string | null;
}

export interface TimeEntry {
  id: number;
  task_id: number | null;
  start_time: string;
  end_time: string | null;
  duration: number | null;
  notes: string | null;
  created_at: string;
}

export interface AnalyticsSummary {
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  pending_tasks: number;
  completion_rate: number;
  total_time_minutes: number;
  today_time_minutes: number;
}

// Email Settings types
export interface EmailSettings {
  id: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string | null;
  from_email: string | null;
  from_name: string;
  is_active: boolean;
  institution_id: number | null;
}

export interface EmailTemplate {
  id: number;
  template_type: string;
  subject: string;
  body: string;
  is_active: boolean;
  institution_id: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Keyword types for interest tracking
export interface UserKeyword {
  id: number;
  keyword: string;
  created_at: string;
}

export type AlertFrequency = 'disabled' | 'daily' | 'weekly' | 'monthly';

export interface AlertPreference {
  id: number;
  alert_frequency: AlertFrequency;
  dashboard_new_weeks: number;
  last_alert_sent_at: string | null;
}

export interface MatchedProject extends ProjectWithLead {
  matched_keywords: string[];
}
