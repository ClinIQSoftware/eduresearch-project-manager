import client from './client';
import type {
  IrbAdminDashboard,
  IrbMember,
  IrbQuestion,
  IrbReportsData,
  IrbSubmission,
  IrbReview,
  IrbMyReviews,
  IrbRole,
  QuestionContext,
} from '../types';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export const getAdminDashboard = async (): Promise<IrbAdminDashboard> => {
  const { data } = await client.get('/irb/admin/dashboard');
  return data;
};

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export const getMembers = async (): Promise<IrbMember[]> => {
  const { data } = await client.get('/irb/admin/members');
  return data;
};

export const addMember = async (payload: { user_id: number; irb_role: IrbRole }): Promise<IrbMember> => {
  const { data } = await client.post('/irb/admin/members', payload);
  return data;
};

export const updateMember = async (userId: number, payload: { irb_role: IrbRole }): Promise<IrbMember> => {
  const { data } = await client.put(`/irb/admin/members/${userId}`, payload);
  return data;
};

export const removeMember = async (userId: number): Promise<void> => {
  await client.delete(`/irb/admin/members/${userId}`);
};

// ---------------------------------------------------------------------------
// Submissions (admin view)
// ---------------------------------------------------------------------------

export const getAdminSubmissions = async (filters?: {
  board_id?: string;
  status?: string;
}): Promise<IrbSubmission[]> => {
  const { data } = await client.get('/irb/admin/submissions', { params: filters });
  return data;
};

export const assignReviewers = async (
  submissionId: string,
  reviewerIds: number[]
): Promise<IrbReview[]> => {
  const { data } = await client.post(`/irb/admin/submissions/${submissionId}/assign`, {
    reviewer_ids: reviewerIds,
  });
  return data;
};

// ---------------------------------------------------------------------------
// Review questions
// ---------------------------------------------------------------------------

export const getReviewQuestions = async (boardId: string): Promise<IrbQuestion[]> => {
  const { data } = await client.get(`/irb/admin/boards/${boardId}/review-questions`);
  return data;
};

export interface CreateReviewQuestionData {
  section_id: number;
  text: string;
  description?: string | null;
  question_type: string;
  options?: unknown[] | null;
  required?: boolean;
  order?: number;
  submission_type?: string;
  question_context?: QuestionContext;
}

export const createReviewQuestion = async (
  boardId: string,
  payload: CreateReviewQuestionData
): Promise<IrbQuestion> => {
  const { data } = await client.post(`/irb/admin/boards/${boardId}/review-questions`, payload);
  return data;
};

export const updateReviewQuestion = async (
  questionId: number,
  payload: Partial<CreateReviewQuestionData>
): Promise<IrbQuestion> => {
  const { data } = await client.put(`/irb/admin/review-questions/${questionId}`, payload);
  return data;
};

export const deleteReviewQuestion = async (questionId: number): Promise<void> => {
  await client.delete(`/irb/admin/review-questions/${questionId}`);
};

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export const getReports = async (): Promise<IrbReportsData> => {
  const { data } = await client.get('/irb/admin/reports');
  return data;
};

// ---------------------------------------------------------------------------
// My Reviews (IRB member endpoint)
// ---------------------------------------------------------------------------

export const getMyReviews = async (): Promise<IrbMyReviews> => {
  const { data } = await client.get('/irb/my-reviews');
  return data;
};
