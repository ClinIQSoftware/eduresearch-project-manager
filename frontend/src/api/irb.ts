import client from './client';
import type {
  IrbBoard,
  IrbBoardDetail,
  IrbBoardMember,
  IrbQuestionSection,
  IrbQuestion,
  IrbSubmission,
  IrbSubmissionDetail,
  IrbSubmissionResponseData,
  IrbReview,
  IrbDecision,
  IrbAiConfig,
  IrbDashboard,
  BoardType,
  BoardMemberRole,
  SubmissionType,
  QuestionType,
  SubmissionTypeFilter,
  ConditionOperator,
  Recommendation,
  DecisionTypeValue,
  AiProvider,
  IrbSubmissionFile,
} from '../types';

// ---------------------------------------------------------------------------
// Board data shapes
// ---------------------------------------------------------------------------

export interface CreateBoardData {
  name: string;
  description?: string;
  board_type: BoardType;
  institution_id?: number;
}

export interface UpdateBoardData {
  name?: string;
  description?: string;
  is_active?: boolean;
}

export interface AddBoardMemberData {
  user_id: number;
  role: BoardMemberRole;
}

// ---------------------------------------------------------------------------
// Question data shapes
// ---------------------------------------------------------------------------

export interface CreateSectionData {
  name: string;
  slug: string;
  description?: string;
  order?: number;
}

export interface UpdateSectionData {
  name?: string;
  slug?: string;
  description?: string;
  order?: number;
}

export interface ConditionData {
  depends_on_question_id: number;
  operator: ConditionOperator;
  value: string;
}

export interface CreateQuestionData {
  section_id: number;
  text: string;
  description?: string;
  question_type: QuestionType;
  options?: unknown[];
  required?: boolean;
  order?: number;
  submission_type?: SubmissionTypeFilter;
  conditions?: ConditionData[];
}

export interface UpdateQuestionData {
  text?: string;
  description?: string;
  question_type?: QuestionType;
  options?: unknown[];
  required?: boolean;
  order?: number;
  is_active?: boolean;
  submission_type?: SubmissionTypeFilter;
  section_id?: number;
  conditions?: ConditionData[];
}

// ---------------------------------------------------------------------------
// Submission data shapes
// ---------------------------------------------------------------------------

export interface CreateSubmissionData {
  board_id: string;
  project_id: number;
  submission_type: SubmissionType;
}

export interface UpdateSubmissionData {
  submission_type?: SubmissionType;
  protocol_file_url?: string;
  ai_summary?: string;
  ai_summary_approved?: boolean;
}

export interface SaveResponseData {
  question_id: number;
  answer?: string;
}

export interface UpdateResponseData {
  answer?: string;
  user_confirmed?: boolean;
}

export interface TriageActionData {
  action: 'accept' | 'return';
  note?: string;
}

export interface AssignMainReviewerData {
  reviewer_id: number;
}

export interface AssignReviewersData {
  reviewer_ids: number[];
}

export interface CreateReviewData {
  recommendation: Recommendation;
  comments?: string;
  feedback_to_submitter?: string;
}

export interface CreateDecisionData {
  decision: DecisionTypeValue;
  rationale?: string;
  letter?: string;
  conditions?: string;
}

// ---------------------------------------------------------------------------
// AI config data shapes
// ---------------------------------------------------------------------------

export interface CreateAiConfigData {
  provider: AiProvider;
  api_key: string;
  model_name: string;
  custom_endpoint?: string;
  max_tokens?: number;
}

export interface UpdateAiConfigData {
  provider?: AiProvider;
  api_key?: string;
  model_name?: string;
  custom_endpoint?: string;
  max_tokens?: number;
  is_active?: boolean;
}

// ===========================================================================
// Board API
// ===========================================================================

export const getBoards = () =>
  client.get<IrbBoardDetail[]>('/irb/boards');

export const getBoard = (boardId: string) =>
  client.get<IrbBoardDetail>(`/irb/boards/${boardId}`);

export const createBoard = (data: CreateBoardData) =>
  client.post<IrbBoard>('/irb/boards', data);

export const updateBoard = (boardId: string, data: UpdateBoardData) =>
  client.put<IrbBoard>(`/irb/boards/${boardId}`, data);

export const deleteBoard = (boardId: string) =>
  client.delete(`/irb/boards/${boardId}`);

// Board members
export const getBoardMembers = (boardId: string) =>
  client.get<IrbBoardMember[]>(`/irb/boards/${boardId}/members`);

export const addBoardMember = (boardId: string, data: AddBoardMemberData) =>
  client.post<IrbBoardMember>(`/irb/boards/${boardId}/members`, data);

export const removeBoardMember = (boardId: string, memberId: number) =>
  client.delete(`/irb/boards/${boardId}/members/${memberId}`);

// ===========================================================================
// Question section API
// ===========================================================================

export const getSections = (boardId: string) =>
  client.get<IrbQuestionSection[]>(`/irb/boards/${boardId}/sections`);

export const createSection = (boardId: string, data: CreateSectionData) =>
  client.post<IrbQuestionSection>(`/irb/boards/${boardId}/sections`, data);

export const updateSection = (boardId: string, sectionId: number, data: UpdateSectionData) =>
  client.put<IrbQuestionSection>(`/irb/boards/${boardId}/sections/${sectionId}`, data);

export const deleteSection = (boardId: string, sectionId: number) =>
  client.delete(`/irb/boards/${boardId}/sections/${sectionId}`);

// ===========================================================================
// Question API
// ===========================================================================

export const getQuestions = (boardId: string, submissionType?: SubmissionTypeFilter) =>
  client.get<IrbQuestion[]>(`/irb/boards/${boardId}/questions`, {
    params: submissionType ? { submission_type: submissionType } : undefined,
  });

export const createQuestion = (boardId: string, data: CreateQuestionData) =>
  client.post<IrbQuestion>(`/irb/boards/${boardId}/questions`, data);

export const updateQuestion = (boardId: string, questionId: number, data: UpdateQuestionData) =>
  client.put<IrbQuestion>(`/irb/boards/${boardId}/questions/${questionId}`, data);

export const deleteQuestion = (boardId: string, questionId: number) =>
  client.delete(`/irb/boards/${boardId}/questions/${questionId}`);

// ===========================================================================
// Submission API
// ===========================================================================

export const getSubmissions = (boardId?: string, status?: string) =>
  client.get<IrbSubmission[]>('/irb/submissions', {
    params: { board_id: boardId, status },
  });

export const getSubmission = (submissionId: string) =>
  client.get<IrbSubmissionDetail>(`/irb/submissions/${submissionId}`);

export const createSubmission = (data: CreateSubmissionData) =>
  client.post<IrbSubmission>('/irb/submissions', data);

export const updateSubmission = (submissionId: string, data: UpdateSubmissionData) =>
  client.put<IrbSubmission>(`/irb/submissions/${submissionId}`, data);

export const submitSubmission = (submissionId: string) =>
  client.post<IrbSubmission>(`/irb/submissions/${submissionId}/submit`);

// Submission responses (answers)
export const saveResponse = (submissionId: string, data: SaveResponseData) =>
  client.post<IrbSubmissionResponseData>(`/irb/submissions/${submissionId}/responses`, data);

export const saveBulkResponses = (submissionId: string, responses: SaveResponseData[]) =>
  client.post<IrbSubmissionResponseData[]>(`/irb/submissions/${submissionId}/responses/bulk`, responses);

export const updateResponse = (submissionId: string, responseId: number, data: UpdateResponseData) =>
  client.put<IrbSubmissionResponseData>(`/irb/submissions/${submissionId}/responses/${responseId}`, data);

// Submission files
export const uploadSubmissionFile = (submissionId: string, formData: FormData) =>
  client.post<IrbSubmissionFile>(`/irb/submissions/${submissionId}/files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const deleteSubmissionFile = (submissionId: string, fileId: number) =>
  client.delete(`/irb/submissions/${submissionId}/files/${fileId}`);

// Workflow actions
export const triageSubmission = (submissionId: string, data: TriageActionData) =>
  client.post<IrbSubmission>(`/irb/submissions/${submissionId}/triage`, data);

export const assignMainReviewer = (submissionId: string, data: AssignMainReviewerData) =>
  client.post<IrbSubmission>(`/irb/submissions/${submissionId}/assign-main`, data);

export const assignReviewers = (submissionId: string, data: AssignReviewersData) =>
  client.post<IrbSubmission>(`/irb/submissions/${submissionId}/assign-reviewers`, data);

// Reviews
export const createReview = (submissionId: string, data: CreateReviewData) =>
  client.post<IrbReview>(`/irb/submissions/${submissionId}/reviews`, data);

// Decisions
export const createDecision = (submissionId: string, data: CreateDecisionData) =>
  client.post<IrbDecision>(`/irb/submissions/${submissionId}/decision`, data);

// AI prefill
export const prefillWithAi = (submissionId: string) =>
  client.post<IrbSubmissionResponseData[]>(`/irb/submissions/${submissionId}/ai-prefill`);

// ===========================================================================
// AI config API
// ===========================================================================

export const getAiConfig = (boardId: string) =>
  client.get<IrbAiConfig>(`/irb/boards/${boardId}/ai-config`);

export const createAiConfig = (boardId: string, data: CreateAiConfigData) =>
  client.post<IrbAiConfig>(`/irb/boards/${boardId}/ai-config`, data);

export const updateAiConfig = (boardId: string, data: UpdateAiConfigData) =>
  client.put<IrbAiConfig>(`/irb/boards/${boardId}/ai-config`, data);

// ===========================================================================
// Dashboard API
// ===========================================================================

export const getDashboard = () =>
  client.get<IrbDashboard>('/irb/dashboard');
