import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import { SpinnerCentered } from '../../components/ui/Spinner';
import {
  useCreateLesson,
  useLessonDetail,
  useUpdateLesson,
  type CreateLessonRequest,
  type LessonDetailAdminResponse,
  type UpdateLessonRequest,
} from './adminApi';
import { applyServerFieldErrors, isServerFieldError } from './formErrors';

const lessonSchema = z.object({
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .max(160, 'Keep the slug to 160 characters or fewer.')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase letters, numbers, and hyphens, e.g. variables-and-types.',
    ),
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(160, 'Keep the title to 160 characters or fewer.'),
  summary: z.string().max(500, 'Keep the summary to 500 characters or fewer.'),
  bodyMarkdown: z.string().min(1, 'Enter the lesson body in Markdown.'),
});

type LessonFormValues = z.infer<typeof lessonSchema>;

export interface LessonFormModalProps {
  moduleId: string;
  /** Existing lesson id to edit (its body is fetched), or null to add one. */
  lessonId: string | null;
  onClose: () => void;
}

/**
 * Add/edit dialog for a lesson. Editing fetches the full body first; adding
 * starts from an empty form.
 */
export function LessonFormModal({ moduleId, lessonId, onClose }: LessonFormModalProps) {
  const isEdit = lessonId !== null;
  const detail = useLessonDetail(lessonId ?? '', isEdit);

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit lesson' : 'Add lesson'}>
      {isEdit && detail.isPending && <SpinnerCentered label="Loading lesson…" />}
      {isEdit && detail.isError && (
        <Alert tone="danger">
          {detail.error.message || 'The lesson could not be loaded. Please try again.'}
        </Alert>
      )}
      {(!isEdit || detail.data) && (
        <LessonFormBody
          moduleId={moduleId}
          lesson={detail.data ?? null}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

interface LessonFormBodyProps {
  moduleId: string;
  lesson: LessonDetailAdminResponse | null;
  onClose: () => void;
}

/** Owns the form so hook order stays stable while the detail query loads. */
function LessonFormBody({ moduleId, lesson, onClose }: LessonFormBodyProps) {
  const form = useForm<LessonFormValues>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      slug: lesson?.slug ?? '',
      title: lesson?.title ?? '',
      summary: lesson?.summary ?? '',
      bodyMarkdown: lesson?.bodyMarkdown ?? '',
    },
  });
  const createMutation = useCreateLesson();
  const updateMutation = useUpdateLesson();
  const error = createMutation.error ?? updateMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    createMutation.reset();
    updateMutation.reset();
    const summary = values.summary.trim() || null;
    try {
      if (lesson) {
        const body: UpdateLessonRequest = {
          slug: values.slug,
          title: values.title,
          summary,
          bodyMarkdown: values.bodyMarkdown,
        };
        await updateMutation.mutateAsync({ id: lesson.id, body });
      } else {
        const body: CreateLessonRequest = {
          slug: values.slug,
          title: values.title,
          summary,
          bodyMarkdown: values.bodyMarkdown,
        };
        await createMutation.mutateAsync({ moduleId, body });
      }
      onClose();
    } catch (caught) {
      applyServerFieldErrors<LessonFormValues>(caught, form.setError);
    }
  });

  return (
    <form className="space-y-4" onSubmit={submit} noValidate>
      {error && !isServerFieldError(error) && (
        <Alert tone="danger">{error.message || 'The lesson could not be saved.'}</Alert>
      )}
      <Input
        label="Title"
        type="text"
        maxLength={160}
        required
        autoFocus
        error={form.formState.errors.title?.message}
        {...form.register('title')}
      />
      <Input
        label="Slug"
        type="text"
        maxLength={160}
        autoCapitalize="none"
        spellCheck={false}
        required
        hint="URL segment, e.g. variables-and-types."
        error={form.formState.errors.slug?.message}
        {...form.register('slug')}
      />
      <Textarea
        label="Summary"
        rows={2}
        maxLength={500}
        hint="Optional one-line description of the lesson."
        error={form.formState.errors.summary?.message}
        {...form.register('summary')}
      />
      <Textarea
        label="Body (Markdown)"
        rows={14}
        required
        className="font-mono"
        error={form.formState.errors.bodyMarkdown?.message}
        {...form.register('bodyMarkdown')}
      />
      <div className="flex justify-end gap-3 pt-1">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" loading={saving}>
          {lesson ? 'Save lesson' : 'Add lesson'}
        </Button>
      </div>
    </form>
  );
}
