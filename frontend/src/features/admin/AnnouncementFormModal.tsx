import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import {
  useCreateAnnouncement,
  useUpdateAnnouncement,
  type AnnouncementAdminResponse,
  type AnnouncementAudience,
  type AnnouncementWriteRequest,
} from './adminApi';
import { applyServerFieldErrors, isServerFieldError } from './formErrors';

const announcementSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(240, 'Keep the title to 240 characters or fewer.'),
  bodyMarkdown: z
    .string()
    .trim()
    .min(1, 'Enter the announcement body.')
    .max(20000, 'Keep the body to 20000 characters or fewer.'),
  audience: z.enum(['STUDENTS', 'ALL']),
  courseId: z.string(),
});

type AnnouncementFormValues = z.infer<typeof announcementSchema>;

const AUDIENCE_OPTIONS = [
  { value: 'STUDENTS', label: 'Students' },
  { value: 'ALL', label: 'Everyone (students and future public surface)' },
];

export interface AnnouncementFormModalProps {
  /** Existing announcement to edit, or null to create a new one. */
  announcement: AnnouncementAdminResponse | null;
  /** Loaded courses for the scope picker; empty means platform-wide only. */
  courses: Array<{ id: string; title: string }>;
  onClose: () => void;
}

/**
 * Create/edit dialog for an announcement. The payload never carries a status:
 * publication happens only through the row's explicit status transition.
 */
export function AnnouncementFormModal({
  announcement,
  courses,
  onClose,
}: AnnouncementFormModalProps) {
  const isEdit = announcement !== null;
  const courseOptions = [
    { value: '', label: 'Platform-wide (all students)' },
    ...courses.map((course) => ({ value: course.id, label: course.title })),
  ];

  const form = useForm<AnnouncementFormValues>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: announcement?.title ?? '',
      bodyMarkdown: announcement?.bodyMarkdown ?? '',
      audience: announcement?.audience ?? 'STUDENTS',
      courseId: announcement?.courseId ?? '',
    },
  });
  const createMutation = useCreateAnnouncement();
  const updateMutation = useUpdateAnnouncement();
  const error = createMutation.error ?? updateMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    createMutation.reset();
    updateMutation.reset();
    const body: AnnouncementWriteRequest = {
      title: values.title,
      bodyMarkdown: values.bodyMarkdown,
      audience: values.audience as AnnouncementAudience,
      courseId: values.courseId.trim() || null,
    };
    try {
      if (announcement) {
        await updateMutation.mutateAsync({ id: announcement.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      onClose();
    } catch (caught) {
      applyServerFieldErrors<AnnouncementFormValues>(caught, form.setError);
    }
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit announcement' : 'New announcement'}
      className="max-w-2xl"
    >
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && !isServerFieldError(error) && (
          <Alert tone="danger">{error.message || 'The announcement could not be saved.'}</Alert>
        )}
        <Input
          label="Title"
          type="text"
          maxLength={240}
          required
          autoFocus
          error={form.formState.errors.title?.message}
          {...form.register('title')}
        />
        <Textarea
          label="Body (Markdown)"
          rows={7}
          maxLength={20000}
          required
          hint="Markdown is sanitized before students see it."
          error={form.formState.errors.bodyMarkdown?.message}
          {...form.register('bodyMarkdown')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Audience"
            required
            options={AUDIENCE_OPTIONS}
            error={form.formState.errors.audience?.message}
            {...form.register('audience')}
          />
          <Select
            label="Scope"
            options={courseOptions}
            hint="Course scope is visible only to approved enrollees."
            error={form.formState.errors.courseId?.message}
            {...form.register('courseId')}
          />
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create announcement'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
