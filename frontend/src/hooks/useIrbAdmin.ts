import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as irbAdminApi from '../api/irbAdmin';
import type { IrbRole } from '../types';

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export function useIrbAdminDashboard() {
  return useQuery({
    queryKey: queryKeys.irbAdmin.dashboard(),
    queryFn: irbAdminApi.getAdminDashboard,
  });
}

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------

export function useIrbMembers() {
  return useQuery({
    queryKey: queryKeys.irbAdmin.members(),
    queryFn: irbAdminApi.getMembers,
  });
}

export function useAddIrbMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { user_id: number; irb_role: IrbRole }) =>
      irbAdminApi.addMember(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.members() });
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.dashboard() });
    },
  });
}

export function useUpdateIrbMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, irb_role }: { userId: number; irb_role: IrbRole }) =>
      irbAdminApi.updateMember(userId, { irb_role }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.members() });
    },
  });
}

export function useRemoveIrbMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (userId: number) => irbAdminApi.removeMember(userId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.members() });
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.dashboard() });
    },
  });
}

// ---------------------------------------------------------------------------
// Admin submissions
// ---------------------------------------------------------------------------

export function useAdminSubmissions(filters?: { board_id?: string; status?: string }) {
  return useQuery({
    queryKey: queryKeys.irbAdmin.submissions(filters),
    queryFn: () => irbAdminApi.getAdminSubmissions(filters),
  });
}

export function useAdminAssignReviewers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ submissionId, reviewerIds }: { submissionId: string; reviewerIds: number[] }) =>
      irbAdminApi.assignReviewers(submissionId, reviewerIds),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.submissions() });
      qc.invalidateQueries({ queryKey: queryKeys.irb.submissions.all() });
    },
  });
}

// ---------------------------------------------------------------------------
// Review questions
// ---------------------------------------------------------------------------

export function useReviewQuestions(boardId: string) {
  return useQuery({
    queryKey: queryKeys.irbAdmin.reviewQuestions(boardId),
    queryFn: () => irbAdminApi.getReviewQuestions(boardId),
    enabled: !!boardId,
  });
}

export function useCreateReviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ boardId, data }: { boardId: string; data: irbAdminApi.CreateReviewQuestionData }) =>
      irbAdminApi.createReviewQuestion(boardId, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.reviewQuestions(variables.boardId) });
    },
  });
}

export function useUpdateReviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: number; data: Partial<irbAdminApi.CreateReviewQuestionData> }) =>
      irbAdminApi.updateReviewQuestion(questionId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.all });
    },
  });
}

export function useDeleteReviewQuestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (questionId: number) => irbAdminApi.deleteReviewQuestion(questionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.irbAdmin.all });
    },
  });
}

// ---------------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------------

export function useIrbReports() {
  return useQuery({
    queryKey: queryKeys.irbAdmin.reports(),
    queryFn: irbAdminApi.getReports,
  });
}

// ---------------------------------------------------------------------------
// My Reviews (IRB member)
// ---------------------------------------------------------------------------

export function useMyReviews() {
  return useQuery({
    queryKey: queryKeys.irb.myReviews(),
    queryFn: irbAdminApi.getMyReviews,
  });
}
