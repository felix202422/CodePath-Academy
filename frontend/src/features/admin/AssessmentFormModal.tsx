import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Minus, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { SpinnerCentered } from '../../components/ui/Spinner';
import {
  useAssessmentDetail,
  useCreateAssessment,
  useUpdateAssessment,
  type AssessmentDetailAdminResponse,
  type AssessmentQuestionWriteRequest,
  type AssessmentWriteRequest,
  type ModuleAdminResponse,
  type QuestionType,
} from './adminApi';
import { applyServerFieldErrors, isServerFieldError } from './formErrors';

/* --- metadata form (react-hook-form + zod, mirrors ModuleFormModal) ------ */

const assessmentSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(240, 'Keep the title to 240 characters or fewer.'),
  description: z.string().max(2000, 'Keep the description to 2000 characters or fewer.'),
  passScorePercent: z
    .string()
    .regex(/^(?:\d{1,2}|100)$/, 'Enter a whole number from 0 to 100.'),
  maxAttempts: z
    .string()
    .regex(/^[1-9]\d{0,2}$/, 'Enter a whole number from 1 to 999.'),
  timeLimitMinutes: z
    .string()
    .regex(/^$|^[1-9]\d{0,3}$/, 'Enter a whole number from 1 to 9999, or leave it empty.'),
  displayOrder: z.string().regex(/^\d*$/, 'Enter a whole number or leave the field empty.'),
  moduleId: z.string(),
});

type AssessmentFormValues = z.infer<typeof assessmentSchema>;

/* --- question drafts (plain state + zod, validated on save) -------------- */

interface OptionDraft {
  optionText: string;
  isCorrect: boolean;
}

interface QuestionDraft {
  questionType: QuestionType;
  prompt: string;
  explanation: string;
  correctText: string;
  /** Stored as text so typing stays uncontrolled-by-zod; parsed on save. */
  points: string;
  options: OptionDraft[];
}

const optionDraftSchema = z.object({
  optionText: z
    .string()
    .trim()
    .min(1, 'Enter the option text.')
    .max(4000, 'Keep each option to 4000 characters or fewer.'),
  isCorrect: z.boolean(),
});

/**
 * Structural rules mirror AdminAssessmentService#validateQuestion so a set
 * the server would reject never leaves the browser.
 */
const questionDraftSchema = z
  .object({
    questionType: z.enum(['MULTIPLE_CHOICE', 'TRUE_FALSE', 'MULTI_ANSWER', 'SHORT_ANSWER']),
    prompt: z
      .string()
      .trim()
      .min(1, 'Enter the question prompt.')
      .max(10000, 'Keep the prompt to 10000 characters or fewer.'),
    explanation: z.string().trim().max(4000, 'Keep the explanation to 4000 characters or fewer.'),
    correctText: z.string().trim().max(4000, 'Keep the answer key to 4000 characters or fewer.'),
    points: z.string().regex(/^\d{1,4}$/, 'Enter points as a whole number.'),
    options: z.array(optionDraftSchema).max(20, 'A question can have at most 20 options.'),
  })
  .superRefine((question, ctx) => {
    const points = Number(question.points);
    if (!Number.isInteger(points) || points < 1 || points > 1000) {
      ctx.addIssue({
        code: 'custom',
        path: ['points'],
        message: 'Points must be a whole number from 1 to 1000.',
      });
    }
    const correctCount = question.options.filter((option) => option.isCorrect).length;
    switch (question.questionType) {
      case 'MULTIPLE_CHOICE':
        if (question.options.length < 2) {
          ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least two options.' });
        }
        if (correctCount !== 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['options'],
            message: 'Mark exactly one option as correct.',
          });
        }
        break;
      case 'TRUE_FALSE':
        if (question.options.length !== 2) {
          ctx.addIssue({
            code: 'custom',
            path: ['options'],
            message: 'True / false needs exactly two options.',
          });
        }
        if (correctCount !== 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['options'],
            message: 'Mark exactly one option as correct.',
          });
        }
        break;
      case 'MULTI_ANSWER':
        if (question.options.length < 2) {
          ctx.addIssue({ code: 'custom', path: ['options'], message: 'Add at least two options.' });
        }
        if (correctCount < 1) {
          ctx.addIssue({
            code: 'custom',
            path: ['options'],
            message: 'Mark at least one option as correct.',
          });
        }
        break;
      case 'SHORT_ANSWER':
        if (question.options.length > 0) {
          ctx.addIssue({
            code: 'custom',
            path: ['options'],
            message: 'A short-answer question takes an answer key, not options.',
          });
        }
        if (question.correctText === '') {
          ctx.addIssue({
            code: 'custom',
            path: ['correctText'],
            message: 'Enter the answer key.',
          });
        }
        break;
    }
  });

const questionsSchema = z
  .array(questionDraftSchema)
  .max(50, 'An assessment can have at most 50 questions.');

interface QuestionFieldErrors {
  prompt?: string;
  explanation?: string;
  correctText?: string;
  points?: string;
  options?: string;
  optionTexts?: Record<number, string>;
}

interface QuestionErrorState {
  list?: string | undefined;
  questions: Record<number, QuestionFieldErrors>;
}

/** Maps zod issue paths ([question, field, option, field]) onto the editor. */
function questionErrorsFrom(error: z.ZodError): QuestionErrorState {
  const questions: Record<number, QuestionFieldErrors> = {};
  let list: string | undefined;
  for (const issue of error.issues) {
    const [index, field, optionIndex, optionField] = issue.path;
    if (typeof index !== 'number') {
      list = issue.message;
      continue;
    }
    const entry = (questions[index] ??= {});
    if (field === 'prompt') entry.prompt = issue.message;
    else if (field === 'explanation') entry.explanation = issue.message;
    else if (field === 'correctText') entry.correctText = issue.message;
    else if (field === 'points') entry.points = issue.message;
    else if (field === 'options') {
      if (optionIndex === undefined) entry.options = issue.message;
      else if (optionField === 'optionText' && typeof optionIndex === 'number') {
        (entry.optionTexts ??= {})[optionIndex] = issue.message;
      }
    }
  }
  return { list, questions };
}

/* --- draft helpers ------------------------------------------------------- */

const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionType; label: string }> = [
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice — one correct' },
  { value: 'TRUE_FALSE', label: 'True / false' },
  { value: 'MULTI_ANSWER', label: 'Multi-answer — select all that apply' },
  { value: 'SHORT_ANSWER', label: 'Short answer — typed response' },
];

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  MULTIPLE_CHOICE: 'Multiple choice',
  TRUE_FALSE: 'True / false',
  MULTI_ANSWER: 'Multi-answer',
  SHORT_ANSWER: 'Short answer',
};

function templateFor(type: QuestionType): QuestionDraft {
  const draft: QuestionDraft = {
    questionType: type,
    prompt: '',
    explanation: '',
    correctText: '',
    points: '1',
    options: [],
  };
  if (type === 'TRUE_FALSE') {
    draft.options = [
      { optionText: 'True', isCorrect: false },
      { optionText: 'False', isCorrect: false },
    ];
  } else if (type === 'MULTIPLE_CHOICE' || type === 'MULTI_ANSWER') {
    draft.options = Array.from({ length: 4 }, () => ({ optionText: '', isCorrect: false }));
  }
  return draft;
}

/** Reshapes the option list when the question type changes. */
function optionsForType(type: QuestionType, current: OptionDraft[]): OptionDraft[] {
  if (type === 'SHORT_ANSWER') return [];
  if (type === 'TRUE_FALSE') {
    return current.length === 2 ? current : templateFor('TRUE_FALSE').options;
  }
  if (current.length === 0) return templateFor(type).options;
  return current;
}

function storedDrafts(initial: AssessmentDetailAdminResponse | null): QuestionDraft[] {
  if (!initial) return [];
  return initial.questions.map((question) => ({
    questionType: question.questionType,
    prompt: question.prompt,
    explanation: question.explanation ?? '',
    correctText: question.correctText ?? '',
    points: String(question.points),
    options: question.options.map((option) => ({
      optionText: option.optionText,
      isCorrect: option.correct,
    })),
  }));
}

function toWriteQuestions(drafts: QuestionDraft[]): AssessmentQuestionWriteRequest[] {
  return drafts.map((draft) => ({
    questionType: draft.questionType,
    prompt: draft.prompt.trim(),
    explanation: draft.explanation.trim() || null,
    correctText: draft.questionType === 'SHORT_ANSWER' ? draft.correctText.trim() : null,
    points: Number(draft.points),
    options: draft.options.map((option) => ({
      optionText: option.optionText.trim(),
      isCorrect: option.isCorrect,
    })),
  }));
}

/* --- modal --------------------------------------------------------------- */

export interface AssessmentFormModalProps {
  courseId: string;
  /** Existing assessment to edit, or null to create one. */
  assessmentId: string | null;
  modules: ModuleAdminResponse[];
  onClose: () => void;
}

/**
 * Create/edit dialog for an assessment: settings plus the full question set.
 * The question set is replace-all — saving sends the whole authored set (or
 * omits it while locked after the first student attempt).
 */
export function AssessmentFormModal({
  courseId,
  assessmentId,
  modules,
  onClose,
}: AssessmentFormModalProps) {
  const isEdit = assessmentId !== null;
  const detail = useAssessmentDetail(assessmentId ?? '', isEdit);

  if (isEdit && detail.isPending) {
    return (
      <Modal open onClose={onClose} title="Edit assessment">
        <SpinnerCentered label="Loading assessment…" />
      </Modal>
    );
  }
  if (isEdit && detail.isError) {
    return (
      <Modal open onClose={onClose} title="Edit assessment">
        <Alert tone="danger">
          {detail.error.message || 'The assessment could not be loaded.'}
        </Alert>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Modal>
    );
  }

  // Keyed so the form mounts fresh with the stored values as defaults.
  return (
    <AssessmentForm
      key={assessmentId ?? 'create'}
      courseId={courseId}
      assessmentId={assessmentId}
      initial={detail.data ?? null}
      modules={modules}
      onClose={onClose}
    />
  );
}

interface AssessmentFormProps {
  courseId: string;
  assessmentId: string | null;
  initial: AssessmentDetailAdminResponse | null;
  modules: ModuleAdminResponse[];
  onClose: () => void;
}

function AssessmentForm({
  courseId,
  assessmentId,
  initial,
  modules,
  onClose,
}: AssessmentFormProps) {
  const isEdit = initial !== null;
  const locked = (initial?.attemptCount ?? 0) > 0;
  const form = useForm<AssessmentFormValues>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      title: initial?.title ?? '',
      description: initial?.description ?? '',
      passScorePercent: String(initial?.passScorePercent ?? 70),
      maxAttempts: String(initial?.maxAttempts ?? 1),
      timeLimitMinutes:
        initial?.timeLimitMinutes == null ? '' : String(initial.timeLimitMinutes),
      displayOrder: '',
      moduleId: initial?.moduleId ?? '',
    },
  });
  const [drafts, setDrafts] = useState<QuestionDraft[]>(() => storedDrafts(initial));
  const [initialJson] = useState(() => JSON.stringify(storedDrafts(initial)));
  const [questionErrors, setQuestionErrors] = useState<QuestionErrorState>({ questions: {} });

  const createMutation = useCreateAssessment();
  const updateMutation = useUpdateAssessment();
  const error = createMutation.error ?? updateMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  // Replace-all: only send the question set when it actually changed, so a
  // settings-only save never rewrites stored questions (or trips the lock).
  const questionsDirty = JSON.stringify(drafts) !== initialJson;
  const willSendQuestions = !locked && (questionsDirty || !isEdit);

  function updateQuestion(index: number, patch: Partial<QuestionDraft>) {
    setDrafts((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)));
    setQuestionErrors((prev) => {
      if (!(index in prev.questions)) return prev;
      const questions = { ...prev.questions };
      delete questions[index];
      return { ...prev, questions };
    });
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: OptionDraft) {
    const current = drafts[questionIndex];
    if (!current) return;
    updateQuestion(questionIndex, {
      options: current.options.map((option, i) => (i === optionIndex ? patch : option)),
    });
  }

  function markCorrect(questionIndex: number, optionIndex: number) {
    const current = drafts[questionIndex];
    if (!current) return;
    const multi = current.questionType === 'MULTI_ANSWER';
    updateQuestion(questionIndex, {
      options: current.options.map((option, i) =>
        multi
          ? i === optionIndex
            ? { ...option, isCorrect: !option.isCorrect }
            : option
          : { ...option, isCorrect: i === optionIndex },
      ),
    });
  }

  function addOption(questionIndex: number) {
    const current = drafts[questionIndex];
    if (!current || current.options.length >= 20) return;
    updateQuestion(questionIndex, {
      options: [...current.options, { optionText: '', isCorrect: false }],
    });
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const current = drafts[questionIndex];
    if (!current) return;
    updateQuestion(questionIndex, {
      options: current.options.filter((_, i) => i !== optionIndex),
    });
  }

  function changeType(questionIndex: number, type: QuestionType) {
    const current = drafts[questionIndex];
    if (!current) return;
    updateQuestion(questionIndex, {
      questionType: type,
      options: optionsForType(type, current.options),
    });
  }

  function addQuestion() {
    setDrafts((prev) => [...prev, templateFor('MULTIPLE_CHOICE')]);
    setQuestionErrors({ questions: {} });
  }

  function removeQuestion(index: number) {
    setDrafts((prev) => prev.filter((_, i) => i !== index));
    setQuestionErrors({ questions: {} });
  }

  const submit = form.handleSubmit(async (values) => {
    createMutation.reset();
    updateMutation.reset();

    let questions: AssessmentQuestionWriteRequest[] | undefined;
    if (willSendQuestions) {
      const parsed = questionsSchema.safeParse(drafts);
      if (!parsed.success) {
        setQuestionErrors(questionErrorsFrom(parsed.error));
        return;
      }
      setQuestionErrors({ questions: {} });
      questions = toWriteQuestions(drafts);
    }

    const body: AssessmentWriteRequest = {
      title: values.title,
      description: values.description.trim() || null,
      passScorePercent: Number(values.passScorePercent),
      maxAttempts: Number(values.maxAttempts),
      timeLimitMinutes:
        values.timeLimitMinutes.trim() === '' ? null : Number(values.timeLimitMinutes),
      moduleId: values.moduleId === '' ? null : values.moduleId,
      questions,
    };
    if (!isEdit) {
      body.displayOrder =
        values.displayOrder.trim() === '' ? null : Number(values.displayOrder);
    }

    try {
      if (assessmentId) {
        await updateMutation.mutateAsync({ id: assessmentId, body });
      } else {
        await createMutation.mutateAsync({ courseId, body });
      }
      onClose();
    } catch (caught) {
      applyServerFieldErrors<AssessmentFormValues>(caught, form.setError);
    }
  });

  const errors = form.formState.errors;

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit assessment' : 'Add assessment'}
      className="max-w-3xl"
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && !isServerFieldError(error) && (
          <Alert tone="danger">{error.message || 'The assessment could not be saved.'}</Alert>
        )}

        <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          <Input
            label="Title"
            type="text"
            maxLength={240}
            required
            autoFocus={!isEdit}
            error={errors.title?.message}
            {...form.register('title')}
          />
          <Textarea
            label="Description"
            rows={3}
            maxLength={2000}
            hint="Optional overview shown to students."
            error={errors.description?.message}
            {...form.register('description')}
          />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Pass score (%)"
              type="text"
              inputMode="numeric"
              maxLength={3}
              required
              hint="Score needed to pass, e.g. 70."
              error={errors.passScorePercent?.message}
              {...form.register('passScorePercent')}
            />
            <Input
              label="Max attempts"
              type="text"
              inputMode="numeric"
              maxLength={3}
              required
              hint="Tries each student gets."
              error={errors.maxAttempts?.message}
              {...form.register('maxAttempts')}
            />
            <Input
              label="Time limit (minutes)"
              type="text"
              inputMode="numeric"
              maxLength={4}
              hint="Empty means no time limit."
              error={errors.timeLimitMinutes?.message}
              {...form.register('timeLimitMinutes')}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Select
              label="Module"
              hint="Course-level assessments show across the whole course."
              options={[
                { value: '', label: 'Course-level (no module)' },
                ...modules.map((module) => ({ value: module.id, label: module.title })),
              ]}
              error={errors.moduleId?.message}
              {...form.register('moduleId')}
            />
            {!isEdit && (
              <Input
                label="Display order"
                type="text"
                inputMode="numeric"
                maxLength={6}
                hint="Optional number; lower sorts first."
                error={errors.displayOrder?.message}
                {...form.register('displayOrder')}
              />
            )}
          </div>

          <section aria-label="Questions" className="space-y-3 border-t border-slate-200 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-ink">Questions</h3>
                <p className="text-xs text-ink-muted">
                  Correct answers stay server-side; the server grades every submission.
                </p>
              </div>
              {!locked && (
                <Button size="sm" variant="outline" onClick={addQuestion}>
                  <Plus className="size-4" aria-hidden="true" />
                  Add question
                </Button>
              )}
            </div>

            {questionErrors.list && <Alert tone="danger">{questionErrors.list}</Alert>}

            {locked && (
              <Alert tone="warning">
                Students have attempted this assessment, so its questions are locked. Settings
                above can still be edited.
              </Alert>
            )}

            {initial && locked ? (
              <LockedQuestionList initial={initial} />
            ) : drafts.length === 0 ? (
              <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-ink-muted">
                No questions yet — add the first question. At least one question is required
                before this assessment can be published.
              </p>
            ) : (
              <ol className="space-y-4">
                {drafts.map((draft, index) => {
                  const qErrors = questionErrors.questions[index];
                  return (
                    <li key={index} className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-ink">
                          Question {index + 1}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeQuestion(index)}
                          aria-label={`Remove question ${index + 1}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                          Remove
                        </Button>
                      </div>

                      <Select
                        label="Type"
                        options={QUESTION_TYPE_OPTIONS}
                        value={draft.questionType}
                        onChange={(event) =>
                          changeType(index, event.target.value as QuestionType)
                        }
                      />
                      <Textarea
                        label="Prompt"
                        rows={2}
                        maxLength={10000}
                        required
                        placeholder="e.g. Which command compiles a Java file?"
                        error={qErrors?.prompt}
                        value={draft.prompt}
                        onChange={(event) => updateQuestion(index, { prompt: event.target.value })}
                      />
                      <div className="grid gap-3 sm:grid-cols-[10rem,1fr]">
                        <Input
                          label="Points"
                          type="text"
                          inputMode="numeric"
                          maxLength={4}
                          required
                          error={qErrors?.points}
                          value={draft.points}
                          onChange={(event) => updateQuestion(index, { points: event.target.value })}
                        />
                        <Textarea
                          label="Explanation (optional)"
                          rows={2}
                          maxLength={4000}
                          hint="Shown with the result after grading."
                          error={qErrors?.explanation}
                          value={draft.explanation}
                          onChange={(event) =>
                            updateQuestion(index, { explanation: event.target.value })
                          }
                        />
                      </div>

                      {draft.questionType === 'SHORT_ANSWER' ? (
                        <Input
                          label="Answer key"
                          type="text"
                          maxLength={4000}
                          required
                          hint="Case- and whitespace-insensitive; the server compares normalized text."
                          error={qErrors?.correctText}
                          value={draft.correctText}
                          onChange={(event) =>
                            updateQuestion(index, { correctText: event.target.value })
                          }
                        />
                      ) : (
                        <fieldset className="space-y-2">
                          <legend className="text-sm font-medium text-ink">
                            {draft.questionType === 'MULTI_ANSWER'
                              ? 'Options — select all correct'
                              : 'Options — mark the correct one'}
                          </legend>
                          {qErrors?.options && (
                            <p className="text-sm text-danger">{qErrors.options}</p>
                          )}
                          {draft.options.map((option, optionIndex) => {
                            const optionError = qErrors?.optionTexts?.[optionIndex];
                            return (
                              <div key={optionIndex} className="space-y-1">
                                <div className="flex items-end gap-2">
                                  <div className="flex-1">
                                    <Input
                                      label={`Option ${optionIndex + 1}`}
                                      type="text"
                                      maxLength={4000}
                                      required
                                      error={optionError}
                                      value={option.optionText}
                                      onChange={(event) =>
                                        updateOption(index, optionIndex, {
                                          optionText: event.target.value,
                                          isCorrect: option.isCorrect,
                                        })
                                      }
                                    />
                                  </div>
                                  <label className="mb-2 flex cursor-pointer items-center gap-1.5 text-sm text-ink">
                                    <input
                                      type={
                                        draft.questionType === 'MULTI_ANSWER'
                                          ? 'checkbox'
                                          : 'radio'
                                      }
                                      name={`assessment-${assessmentId ?? 'new'}-q${index}`}
                                      checked={option.isCorrect}
                                      onChange={() => markCorrect(index, optionIndex)}
                                      className="size-4 accent-accent-600"
                                    />
                                    Correct
                                  </label>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="mb-1"
                                    onClick={() => removeOption(index, optionIndex)}
                                    aria-label={`Remove option ${optionIndex + 1}`}
                                  >
                                    <Trash2 className="size-4" aria-hidden="true" />
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                          {draft.options.length < 20 && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => addOption(index)}
                              aria-label={`Add option to question ${index + 1}`}
                            >
                              <Plus className="size-4" aria-hidden="true" />
                              Add option
                            </Button>
                          )}
                        </fieldset>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create assessment'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** Read-only view of a locked question set, including the answer key. */
function LockedQuestionList({ initial }: { initial: AssessmentDetailAdminResponse }) {
  if (initial.questions.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-ink-muted">
        No questions yet — an assessment needs at least one question before it can be published.
      </p>
    );
  }
  return (
    <ol className="space-y-3">
      {initial.questions.map((question, index) => (
        <li key={question.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-ink">Question {index + 1}</span>
            <span className="flex items-center gap-2">
              <Badge tone="info">{QUESTION_TYPE_LABELS[question.questionType]}</Badge>
              <Badge tone="neutral">{question.points} pt</Badge>
            </span>
          </div>
          <p className="mt-1 whitespace-pre-wrap text-sm text-ink">{question.prompt}</p>
          {question.questionType === 'SHORT_ANSWER' ? (
            <p className="mt-2 text-sm text-ink-muted">
              Answer key:{' '}
              <span className="font-medium text-ink">{question.correctText}</span>
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {question.options.map((option) => (
                <li key={option.id} className="flex items-center gap-2 text-sm">
                  {option.correct ? (
                    <Check className="size-4 shrink-0 text-green-700" aria-label="Correct answer" />
                  ) : (
                    <Minus className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  )}
                  <span className="text-ink">{option.optionText}</span>
                </li>
              ))}
            </ul>
          )}
          {question.explanation && (
            <p className="mt-2 text-xs text-ink-muted">Explanation: {question.explanation}</p>
          )}
        </li>
      ))}
    </ol>
  );
}
