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
  irb_role: 'member' | 'admin' | null;
  is_approved: boolean;
  approved_at: string | null;
  auth_provider: AuthProvider;
  institution_id: number | null;  // Link to Institution entity
  department_id: number | null;  // Link to Department entity
  enterprise_id: string | null;  // Link to Enterprise (null = needs onboarding)
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

// Enterprise types
export interface EnterpriseBranding {
  enterprise_name: string;
  logo_url: string | null;
  primary_color: string;
  favicon_url: string | null;
}

export interface EnterpriseConfig {
  google_oauth_enabled: boolean;
  google_client_id: string | null;
  microsoft_oauth_enabled: boolean;
  microsoft_client_id: string | null;
  saml_enabled: boolean;
  saml_metadata_url: string | null;
  smtp_host: string | null;
  smtp_port: number;
  smtp_user: string | null;
  smtp_from_email: string | null;
  smtp_from_name: string | null;
  logo_url: string | null;
  primary_color: string;
  favicon_url: string | null;
  features: Record<string, boolean>;
}

// Platform Admin Types
export interface PlatformStats {
  total_enterprises: number;
  active_enterprises: number;
  total_users: number;
  total_projects: number;
  total_institutions: number;
}

export interface EnterpriseListItem {
  id: string;
  slug: string;
  name: string;
  is_active: boolean;
  created_at: string;
  subdomain_url: string | null;
  user_count: number;
  project_count: number;
}

export interface EnterpriseDetail extends EnterpriseListItem {
  updated_at: string | null;
  institution_count: number;
  storage_used_mb: number;
}

export interface EnterpriseCreateData {
  slug: string;
  name: string;
}

export interface EnterpriseUpdateData {
  name?: string;
  is_active?: boolean;
}

// ---------------------------------------------------------------------------
// IRB types
// ---------------------------------------------------------------------------

export type BoardType = 'irb' | 'research_council';
export type BoardMemberRole = 'coordinator' | 'main_reviewer' | 'associate_reviewer' | 'statistician';
export type SubmissionType = 'standard' | 'exempt';
export type SubmissionStatus =
  | 'draft'
  | 'submitted'
  | 'in_triage'
  | 'assigned_to_main'
  | 'under_review'
  | 'decision_made'
  | 'accepted'
  | 'revision_requested'
  | 'declined';
export type RevisionType = 'minor' | 'major';
export type QuestionType = 'text' | 'textarea' | 'select' | 'radio' | 'checkbox' | 'date' | 'number' | 'file_upload';
export type SubmissionTypeFilter = 'standard' | 'exempt' | 'both';
export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty';
export type Recommendation = 'accept' | 'minor_revise' | 'major_revise' | 'decline';
export type DecisionTypeValue = 'accept' | 'minor_revise' | 'major_revise' | 'decline';
export type FileType = 'protocol' | 'consent_form' | 'supporting_doc';
export type AiProvider = 'anthropic' | 'openai' | 'custom';

// Board
export interface IrbBoard {
  id: string;
  name: string;
  description: string | null;
  board_type: BoardType;
  institution_id: number | null;
  is_active: boolean;
  created_at: string;
}

export interface IrbBoardDetail extends IrbBoard {
  members_count: number;
  submissions_count: number;
}

export interface IrbBoardMember {
  id: number;
  board_id: string;
  user_id: number;
  role: BoardMemberRole;
  is_active: boolean;
  assigned_at: string;
  user_name: string | null;
  user_email: string | null;
}

// Question sections
export interface IrbQuestionSection {
  id: number;
  board_id: string;
  name: string;
  slug: string;
  description: string | null;
  order: number;
}

// Question conditions
export interface IrbQuestionCondition {
  id: number;
  question_id: number;
  depends_on_question_id: number;
  operator: ConditionOperator;
  value: string;
}

// Questions
export interface IrbQuestion {
  id: number;
  board_id: string;
  section_id: number;
  text: string;
  description: string | null;
  question_type: QuestionType;
  options: unknown[] | null;
  required: boolean;
  order: number;
  is_active: boolean;
  submission_type: SubmissionTypeFilter;
  question_context: 'submission' | 'review';
  created_at: string;
  conditions: IrbQuestionCondition[];
}

// Submission files
export interface IrbSubmissionFile {
  id: number;
  submission_id: string;
  file_name: string;
  file_url: string;
  file_type: FileType;
  uploaded_at: string;
}

// Submission responses (answers)
export interface IrbSubmissionResponseData {
  id: number;
  submission_id: string;
  question_id: number;
  answer: string | null;
  ai_prefilled: boolean | null;
  user_confirmed: boolean | null;
  updated_at: string | null;
}

// Reviews
export interface IrbReviewResponseData {
  id: number;
  review_id: string;
  question_id: number;
  answer: string | null;
  updated_at: string | null;
}

export interface IrbReview {
  id: string;
  submission_id: string;
  reviewer_id: number;
  role: BoardMemberRole;
  recommendation: Recommendation;
  comments: string | null;
  feedback_to_submitter: string | null;
  completed_at: string | null;
  created_at: string;
  review_responses: IrbReviewResponseData[];
}

// Decisions
export interface IrbDecision {
  id: string;
  submission_id: string;
  decided_by_id: number;
  decision: DecisionTypeValue;
  rationale: string | null;
  letter: string | null;
  conditions: string | null;
  decided_at: string;
}

// History
export interface IrbSubmissionHistory {
  id: number;
  submission_id: string;
  from_status: SubmissionStatus | null;
  to_status: SubmissionStatus;
  changed_by_id: number;
  note: string | null;
  created_at: string;
}

// Submissions
export interface IrbSubmission {
  id: string;
  board_id: string;
  project_id: number;
  submitted_by_id: number;
  submission_type: SubmissionType;
  status: SubmissionStatus;
  revision_type: RevisionType | null;
  protocol_file_url: string | null;
  ai_summary: string | null;
  ai_summary_approved: boolean | null;
  escalated_from_id: string | null;
  version: number;
  main_reviewer_id: number | null;
  submitted_at: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface IrbSubmissionDetail extends IrbSubmission {
  files: IrbSubmissionFile[];
  responses: IrbSubmissionResponseData[];
  reviews: IrbReview[];
  decision: IrbDecision | null;
  history: IrbSubmissionHistory[];
}

// AI config
export interface IrbAiConfig {
  id: number;
  provider: AiProvider;
  model_name: string;
  custom_endpoint: string | null;
  max_tokens: number;
  is_active: boolean;
  updated_at: string | null;
  api_key_set: boolean;
}

// Dashboard
export interface IrbDashboard {
  my_submissions: IrbSubmission[];
  my_pending_reviews: IrbSubmission[];
  board_queue: IrbSubmission[];
}

// IRB Admin types
export type IrbRole = 'member' | 'admin';
export type QuestionContext = 'submission' | 'review';

export interface IrbAdminDashboard {
  total_submissions: number;
  pending_submissions: number;
  in_review_submissions: number;
  completed_submissions: number;
  total_boards: number;
  total_members: number;
  avg_review_days: number | null;
  submissions_by_status: Record<string, number>;
  recent_activity: Array<{
    id: number;
    submission_id: string;
    from_status: string;
    to_status: string;
    changed_by_id: number;
    note: string | null;
    created_at: string | null;
  }>;
}

export interface IrbMember {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  irb_role: IrbRole | null;
  boards: Array<{
    board_id: string;
    board_name: string | null;
    role: string;
  }>;
  pending_reviews: number;
  completed_reviews: number;
}

export interface IrbReportsData {
  submissions_over_time: Array<{ year: number; month: number; count: number }>;
  reviewer_workload: Array<{
    reviewer_id: number;
    reviewer_name: string;
    total: number;
    completed: number;
    pending: number;
  }>;
  avg_turnaround_days: number | null;
  decisions_breakdown: Record<string, number>;
  submissions_by_board: Array<{ board_name: string; count: number }>;
}

export interface IrbMyReviews {
  pending_reviews: IrbSubmission[];
  completed_reviews: IrbSubmission[];
  total_pending: number;
  total_completed: number;
}
