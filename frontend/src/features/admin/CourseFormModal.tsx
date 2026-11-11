import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Select, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import {
  useCreateCourse,
  useUpdateCourse,
  type CourseAdminResponse,
  type CreateCourseRequest,
  type PathAdminResponse,
} from './adminApi';
import { applyServerFieldErrors, isServerFieldError } from './formErrors';

const courseSchema = z.object({
  pathId: z.string().min(1, 'Choose a learning path.'),
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(160, 'Keep the title to 160 characters or fewer.'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .max(160, 'Keep the slug to 160 characters or fewer.')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase letters, numbers, and hyphens, e.g. frontend-engineering.',
    ),
  summary: z
    .string()
    .trim()
    .min(1, 'Enter a short summary.')
    .max(500, 'Keep the summary to 500 characters or fewer.'),
  description: z.string().max(4000, 'Keep the description to 4000 characters or fewer.'),
  level: z.enum(['BEGINNER', 'INTERMEDIATE', 'ADVANCED']),
  estimatedHours: z.string().regex(/^\d*$/, 'Enter a number of hours or leave the field empty.'),
  displayOrder: z.string().regex(/^\d*$/, 'Enter a whole number or leave the field empty.'),
  sourcePath: z.string().trim().max(300, 'Keep the source path to 300 characters or fewer.'),
});

type CourseFormValues = z.infer<typeof courseSchema>;

const LEVEL_OPTIONS = [
  { value: 'BEGINNER', label: 'Beginner' },
  { value: 'INTERMEDIATE', label: 'Intermediate' },
  { value: 'ADVANCED', label: 'Advanced' },
];

const SOURCE_PATH_HINT =
  'Source subject directory, e.g. 04-JAVA-PROGRAMMING (leave empty for academy-only courses)';

export interface CourseFormModalProps {
  /** Existing course to edit, or null to create a new one. */
  course: CourseAdminResponse | null;
  /** Loaded paths; the picker is disabled until at least one exists. */
  paths: PathAdminResponse[];
  onClose: () => void;
}

/** Create/edit dialog for a course (POST/PUT /admin/courses). */
export function CourseFormModal({ course, paths, onClose }: CourseFormModalProps) {
  const isEdit = course !== null;
  const pathOptions = paths.map((path) => ({ value: path.id, label: path.name }));
  // Keep the course's own path selectable even if the list query missed it.
  if (course && !pathOptions.some((option) => option.value === course.pathId)) {
    pathOptions.unshift({ value: course.pathId, label: course.pathName });
  }

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      pathId: course?.pathId ?? paths[0]?.id ?? '',
      title: course?.title ?? '',
      slug: course?.slug ?? '',
      summary: course?.summary ?? '',
      description: course?.description ?? '',
      level: course?.level ?? 'BEGINNER',
      estimatedHours: course?.estimatedHours === null || course?.estimatedHours === undefined ? '' : String(course.estimatedHours),
      displayOrder: course ? String(course.displayOrder) : '',
      sourcePath: course?.sourcePath ?? '',
    },
  });
  const createMutation = useCreateCourse();
  const updateMutation = useUpdateCourse();
  const error = createMutation.error ?? updateMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    createMutation.reset();
    updateMutation.reset();
    const body: CreateCourseRequest = {
      pathId: values.pathId,
      slug: values.slug,
      title: values.title,
      summary: values.summary,
      description: values.description.trim() || null,
      level: values.level,
      estimatedHours:
        values.estimatedHours.trim() === '' ? null : Number(values.estimatedHours),
      displayOrder: values.displayOrder.trim() === '' ? null : Number(values.displayOrder),
      sourcePath: values.sourcePath.trim() || null,
    };
    try {
      if (course) {
        await updateMutation.mutateAsync({ id: course.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      onClose();
    } catch (caught) {
      applyServerFieldErrors<CourseFormValues>(caught, form.setError);
    }
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit course' : 'New course'}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && !isServerFieldError(error) && (
          <Alert tone="danger">{error.message || 'The course could not be saved.'}</Alert>
        )}
        <Select
          label="Learning path"
          required
          options={pathOptions}
          error={form.formState.errors.pathId?.message}
          {...form.register('pathId')}
        />
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
          hint="URL segment, e.g. frontend-engineering."
          error={form.formState.errors.slug?.message}
          {...form.register('slug')}
        />
        <Textarea
          label="Summary"
          rows={2}
          maxLength={500}
          required
          error={form.formState.errors.summary?.message}
          {...form.register('summary')}
        />
        <Textarea
          label="Description"
          rows={4}
          maxLength={4000}
          hint="Optional long-form overview shown on the course page."
          error={form.formState.errors.description?.message}
          {...form.register('description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Level"
            required
            options={LEVEL_OPTIONS}
            error={form.formState.errors.level?.message}
            {...form.register('level')}
          />
          <Input
            label="Estimated hours"
            type="text"
            inputMode="numeric"
            maxLength={6}
            hint="Optional number, e.g. 12."
            error={form.formState.errors.estimatedHours?.message}
            {...form.register('estimatedHours')}
          />
        </div>
        <Input
          label="Source path"
          type="text"
          maxLength={300}
          autoCapitalize="none"
          spellCheck={false}
          hint={SOURCE_PATH_HINT}
          error={form.formState.errors.sourcePath?.message}
          {...form.register('sourcePath')}
        />
        <Input
          label="Display order"
          type="text"
          inputMode="numeric"
          maxLength={6}
          hint="Optional number; lower sorts first."
          error={form.formState.errors.displayOrder?.message}
          {...form.register('displayOrder')}
        />
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create course'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
