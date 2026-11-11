import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import {
  useCreatePath,
  useUpdatePath,
  type CreatePathRequest,
  type PathAdminResponse,
} from './adminApi';
import { applyServerFieldErrors, isServerFieldError } from './formErrors';

const pathSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Enter a path name.')
    .max(160, 'Keep the name to 160 characters or fewer.'),
  slug: z
    .string()
    .trim()
    .min(1, 'Enter a slug.')
    .max(160, 'Keep the slug to 160 characters or fewer.')
    .regex(
      /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      'Use lowercase letters, numbers, and hyphens, e.g. software-engineering.',
    ),
  summary: z
    .string()
    .trim()
    .min(1, 'Enter a short summary.')
    .max(500, 'Keep the summary to 500 characters or fewer.'),
  description: z.string().max(4000, 'Keep the description to 4000 characters or fewer.'),
  accentColor: z.string().trim().max(32, 'Keep the accent color to 32 characters or fewer.'),
  displayOrder: z.string().regex(/^\d*$/, 'Enter a whole number or leave the field empty.'),
});

type PathFormValues = z.infer<typeof pathSchema>;

export interface PathFormModalProps {
  /** Existing path to edit, or null to create a new one. */
  path: PathAdminResponse | null;
  onClose: () => void;
}

/** Create/edit dialog for a learning path (POST/PUT /admin/paths). */
export function PathFormModal({ path, onClose }: PathFormModalProps) {
  const isEdit = path !== null;
  const form = useForm<PathFormValues>({
    resolver: zodResolver(pathSchema),
    defaultValues: {
      name: path?.name ?? '',
      slug: path?.slug ?? '',
      summary: path?.summary ?? '',
      description: path?.description ?? '',
      accentColor: path?.accentColor ?? '',
      displayOrder: path ? String(path.displayOrder) : '',
    },
  });
  const createMutation = useCreatePath();
  const updateMutation = useUpdatePath();
  const error = createMutation.error ?? updateMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    createMutation.reset();
    updateMutation.reset();
    const body: CreatePathRequest = {
      slug: values.slug,
      name: values.name,
      summary: values.summary,
      description: values.description.trim() || null,
      accentColor: values.accentColor.trim() || null,
      displayOrder: values.displayOrder.trim() === '' ? null : Number(values.displayOrder),
    };
    try {
      if (path) {
        await updateMutation.mutateAsync({ id: path.id, body });
      } else {
        await createMutation.mutateAsync(body);
      }
      onClose();
    } catch (caught) {
      // 400 fieldErrors land on their inputs; anything else shows as an alert.
      applyServerFieldErrors<PathFormValues>(caught, form.setError);
    }
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit learning path' : 'New learning path'}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && !isServerFieldError(error) && (
          <Alert tone="danger">{error.message || 'The learning path could not be saved.'}</Alert>
        )}
        <Input
          label="Name"
          type="text"
          maxLength={160}
          required
          autoFocus
          error={form.formState.errors.name?.message}
          {...form.register('name')}
        />
        <Input
          label="Slug"
          type="text"
          maxLength={160}
          autoCapitalize="none"
          spellCheck={false}
          required
          hint="URL segment, e.g. software-engineering."
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
          hint="Optional long-form overview shown on the path page."
          error={form.formState.errors.description?.message}
          {...form.register('description')}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Accent color"
            type="text"
            maxLength={32}
            placeholder="#2563eb"
            hint="Optional brand color for the path."
            error={form.formState.errors.accentColor?.message}
            {...form.register('accentColor')}
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
        </div>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Create path'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
