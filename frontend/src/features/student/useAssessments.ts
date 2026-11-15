import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getAttemptResult,
  listMyAssessments,
  startOrResumeAttempt,
  submitAttempt,
  type AnswerSubmission,
} from './assessmentApi';

export const assessmentsQueryKey = ['student-assessments'] as const;
export const attemptResultQueryKey = (attemptId: string) =>
  ['student-assessments', 'attempt', attemptId] as const;

export function useMyAssessments() {
  return useQuery({ queryKey: assessmentsQueryKey, queryFn: listMyAssessments });
}

/** Start or resume an attempt; the server decides limits and visibility. */
export function useStartAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startOrResumeAttempt,
    onSuccess: () => {
      // Starting a new attempt changes the list's counters and badges.
      void queryClient.invalidateQueries({ queryKey: assessmentsQueryKey });
    },
  });
}

export function useSubmitAttempt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      attemptId,
      answers,
    }: {
      attemptId: string;
      answers: AnswerSubmission[];
    }) => submitAttempt(attemptId, answers),
    onSuccess: (result) => {
      // The list shows attempt history and best score after grading.
      void queryClient.invalidateQueries({ queryKey: assessmentsQueryKey });
      void queryClient.invalidateQueries({ queryKey: attemptResultQueryKey(result.attemptId) });
    },
  });
}

export function useAttemptResult(attemptId: string) {
  return useQuery({
    queryKey: attemptResultQueryKey(attemptId),
    queryFn: () => getAttemptResult(attemptId),
    enabled: attemptId.length > 0,
  });
}
