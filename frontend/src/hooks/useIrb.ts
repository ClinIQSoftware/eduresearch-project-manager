import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../utils/queryKeys';
import * as irbApi from '../api/irb';
import type {
  CreateBoardData,
  UpdateBoardData,
  AddBoardMemberData,
  CreateSectionData,
  UpdateSectionData,
  CreateQuestionData,
  UpdateQuestionData,
  CreateSubmissionData,
  UpdateSubmissionData,
  SaveResponseData,
  UpdateResponseData,
  TriageActionData,
  AssignMainReviewerData,
  AssignReviewersData,
  CreateReviewData,
  CreateDecisionData,
  CreateAiConfigData,
  UpdateAiConfigData,
} from '../api/irb';
import type { SubmissionTypeFilter } from '../types';

// ===========================================================================
// Board hooks
// ===========================================================================

export function useIrbBoards() {
  return useQuery({
    queryKey: queryKeys.irb.boards.list(),
    queryFn: async () => {
      const response = await irbApi.getBoards();
      return response.data;
    },
  });
}

export function useIrbBoard(boardId: string) {
  return useQuery({
    queryKey: queryKeys.irb.boards.detail(boardId),
    queryFn: async () => {
      const response = await irbApi.getBoard(boardId);
      return response.data;
    },
    enabled: !!boardId,
  });
}

export function useCreateIrbBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBoardData) => {
      const response = await irbApi.createBoard(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.all() });
    },
  });
}

export function useUpdateIrbBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string; data: UpdateBoardData }) => {
      const response = await irbApi.updateBoard(boardId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.detail(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.list() });
    },
  });
}

export function useDeleteIrbBoard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (boardId: string) => {
      await irbApi.deleteBoard(boardId);
      return boardId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.all() });
    },
  });
}

// Board members
export function useIrbBoardMembers(boardId: string) {
  return useQuery({
    queryKey: queryKeys.irb.boards.members(boardId),
    queryFn: async () => {
      const response = await irbApi.getBoardMembers(boardId);
      return response.data;
    },
    enabled: !!boardId,
  });
}

export function useAddIrbBoardMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string; data: AddBoardMemberData }) => {
      const response = await irbApi.addBoardMember(boardId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.members(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.detail(boardId) });
    },
  });
}

export function useRemoveIrbBoardMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, memberId }: { boardId: string; memberId: number }) => {
      await irbApi.removeBoardMember(boardId, memberId);
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.members(boardId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.detail(boardId) });
    },
  });
}

// ===========================================================================
// Question section hooks
// ===========================================================================

export function useIrbSections(boardId: string) {
  return useQuery({
    queryKey: queryKeys.irb.boards.sections(boardId),
    queryFn: async () => {
      const response = await irbApi.getSections(boardId);
      return response.data;
    },
    enabled: !!boardId,
  });
}

export function useCreateIrbSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string; data: CreateSectionData }) => {
      const response = await irbApi.createSection(boardId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.sections(boardId) });
    },
  });
}

export function useUpdateIrbSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, sectionId, data }: { boardId: string; sectionId: number; data: UpdateSectionData }) => {
      const response = await irbApi.updateSection(boardId, sectionId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.sections(boardId) });
    },
  });
}

export function useDeleteIrbSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, sectionId }: { boardId: string; sectionId: number }) => {
      await irbApi.deleteSection(boardId, sectionId);
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.sections(boardId) });
    },
  });
}

// ===========================================================================
// Question hooks
// ===========================================================================

export function useIrbQuestions(boardId: string, submissionType?: SubmissionTypeFilter) {
  return useQuery({
    queryKey: [...queryKeys.irb.boards.questions(boardId), submissionType],
    queryFn: async () => {
      const response = await irbApi.getQuestions(boardId, submissionType);
      return response.data;
    },
    enabled: !!boardId,
  });
}

export function useCreateIrbQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string; data: CreateQuestionData }) => {
      const response = await irbApi.createQuestion(boardId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.questions(boardId) });
    },
  });
}

export function useUpdateIrbQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, questionId, data }: { boardId: string; questionId: number; data: UpdateQuestionData }) => {
      const response = await irbApi.updateQuestion(boardId, questionId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.questions(boardId) });
    },
  });
}

export function useDeleteIrbQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, questionId }: { boardId: string; questionId: number }) => {
      await irbApi.deleteQuestion(boardId, questionId);
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.questions(boardId) });
    },
  });
}

// ===========================================================================
// Submission hooks
// ===========================================================================

export function useIrbSubmissions(boardId?: string, status?: string) {
  return useQuery({
    queryKey: queryKeys.irb.submissions.list({ board_id: boardId, status }),
    queryFn: async () => {
      const response = await irbApi.getSubmissions(boardId, status);
      return response.data;
    },
  });
}

export function useIrbSubmission(submissionId: string) {
  return useQuery({
    queryKey: queryKeys.irb.submissions.detail(submissionId),
    queryFn: async () => {
      const response = await irbApi.getSubmission(submissionId);
      return response.data;
    },
    enabled: !!submissionId,
  });
}

export function useCreateIrbSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSubmissionData) => {
      const response = await irbApi.createSubmission(data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.all() });
    },
  });
}

export function useUpdateIrbSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: UpdateSubmissionData }) => {
      const response = await irbApi.updateSubmission(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

export function useSubmitIrbSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await irbApi.submitSubmission(submissionId);
      return response.data;
    },
    onSuccess: (_, submissionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.all });
    },
  });
}

// Submission responses (answers)
export function useSaveIrbResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: SaveResponseData }) => {
      const response = await irbApi.saveResponse(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

export function useSaveBulkIrbResponses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, responses }: { submissionId: string; responses: SaveResponseData[] }) => {
      const response = await irbApi.saveBulkResponses(submissionId, responses);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

export function useUpdateIrbResponse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, responseId, data }: { submissionId: string; responseId: number; data: UpdateResponseData }) => {
      const response = await irbApi.updateResponse(submissionId, responseId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

// File uploads
export function useUploadIrbFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, formData }: { submissionId: string; formData: FormData }) => {
      const response = await irbApi.uploadSubmissionFile(submissionId, formData);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

export function useDeleteIrbFile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, fileId }: { submissionId: string; fileId: number }) => {
      await irbApi.deleteSubmissionFile(submissionId, fileId);
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

// Workflow actions
export function useTriageIrbSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: TriageActionData }) => {
      const response = await irbApi.triageSubmission(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.all });
    },
  });
}

export function useAssignMainReviewer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: AssignMainReviewerData }) => {
      const response = await irbApi.assignMainReviewer(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.all() });
    },
  });
}

export function useAssignReviewers() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: AssignReviewersData }) => {
      const response = await irbApi.assignReviewers(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.all() });
    },
  });
}

// Reviews
export function useCreateIrbReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: CreateReviewData }) => {
      const response = await irbApi.createReview(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.all });
    },
  });
}

// Decisions
export function useCreateIrbDecision() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ submissionId, data }: { submissionId: string; data: CreateDecisionData }) => {
      const response = await irbApi.createDecision(submissionId, data);
      return response.data;
    },
    onSuccess: (_, { submissionId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.all });
    },
  });
}

// AI prefill
export function usePrefillWithAi() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (submissionId: string) => {
      const response = await irbApi.prefillWithAi(submissionId);
      return response.data;
    },
    onSuccess: (_, submissionId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.submissions.detail(submissionId) });
    },
  });
}

// ===========================================================================
// AI config hooks
// ===========================================================================

export function useIrbAiConfig(boardId: string) {
  return useQuery({
    queryKey: queryKeys.irb.boards.aiConfig(boardId),
    queryFn: async () => {
      const response = await irbApi.getAiConfig(boardId);
      return response.data;
    },
    enabled: !!boardId,
  });
}

export function useCreateIrbAiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string; data: CreateAiConfigData }) => {
      const response = await irbApi.createAiConfig(boardId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.aiConfig(boardId) });
    },
  });
}

export function useUpdateIrbAiConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, data }: { boardId: string; data: UpdateAiConfigData }) => {
      const response = await irbApi.updateAiConfig(boardId, data);
      return response.data;
    },
    onSuccess: (_, { boardId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.irb.boards.aiConfig(boardId) });
    },
  });
}

// ===========================================================================
// Dashboard hooks
// ===========================================================================

export function useIrbDashboard() {
  return useQuery({
    queryKey: queryKeys.irb.dashboard(),
    queryFn: async () => {
      const response = await irbApi.getDashboard();
      return response.data;
    },
  });
}
