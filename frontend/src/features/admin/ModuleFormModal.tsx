import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Input, Textarea } from '../../components/ui/Field';
import { Modal } from '../../components/ui/Modal';
import {
  useCreateModule,
  useUpdateModule,
  type CreateModuleRequest,
  type ModuleAdminResponse,
  type UpdateModuleRequest,
} from './adminApi';
import { applyServerFieldErrors, isServerFieldError } from './formErrors';

const moduleSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a module title.')
    .max(160, 'Keep the title to 160 characters or fewer.'),
  summary: z.string().max(1000, 'Keep the summary to 1000 characters or fewer.'),
  sourcePath: z.string().trim().max(300, 'Keep the source path to 300 characters or fewer.'),
  displayOrder: z.string().regex(/^\d*$/, 'Enter a whole number or leave the field empty.'),
});

type ModuleFormValues = z.infer<typeof moduleSchema>;

export interface ModuleFormModalProps {
  courseId: string;
  /** Existing module to edit, or null to add one. */
  module: ModuleAdminResponse | null;
  onClose: () => void;
}

/** Add/edit dialog for a module inside a course. */
export function ModuleFormModal({ courseId, module, onClose }: ModuleFormModalProps) {
  const isEdit = module !== null;
  const form = useForm<ModuleFormValues>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: module?.title ?? '',
      summary: module?.summary ?? '',
      sourcePath: module?.sourcePath ?? '',
      displayOrder: module ? String(module.displayOrder) : '',
    },
  });
  const createMutation = useCreateModule();
  const updateMutation = useUpdateModule();
  const error = createMutation.error ?? updateMutation.error;
  const saving = createMutation.isPending || updateMutation.isPending;

  const submit = form.handleSubmit(async (values) => {
    createMutation.reset();
    updateMutation.reset();
    const summary = values.summary.trim() || null;
    const sourcePath = values.sourcePath.trim() || null;
    try {
      if (module) {
        const body: UpdateModuleRequest = { title: values.title, summary, sourcePath };
        await updateMutation.mutateAsync({ id: module.id, body });
      } else {
        const body: CreateModuleRequest = {
          title: values.title,
          summary,
          sourcePath,
          displayOrder: values.displayOrder.trim() === '' ? null : Number(values.displayOrder),
        };
        await createMutation.mutateAsync({ courseId, body });
      }
      onClose();
    } catch (caught) {
      applyServerFieldErrors<ModuleFormValues>(caught, form.setError);
    }
  });

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit module' : 'Add module'}>
      <form className="space-y-4" onSubmit={submit} noValidate>
        {error && !isServerFieldError(error) && (
          <Alert tone="danger">{error.message || 'The module could not be saved.'}</Alert>
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
        <Textarea
          label="Summary"
          rows={3}
          maxLength={1000}
          hint="Optional one-paragraph overview of the module."
          error={form.formState.errors.summary?.message}
          {...form.register('summary')}
        />
        <Input
          label="Source path"
          type="text"
          maxLength={300}
          autoCapitalize="none"
          spellCheck={false}
          hint="Source subject directory, e.g. 04-JAVA-PROGRAMMING (leave empty for academy-only courses)"
          error={form.formState.errors.sourcePath?.message}
          {...form.register('sourcePath')}
        />
        {!isEdit && (
          <Input
            label="Display order"
            type="text"
            inputMode="numeric"
            maxLength={6}
            hint="Optional number; lower sorts first."
            error={form.formState.errors.displayOrder?.message}
            {...form.register('displayOrder')}
          />
        )}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={saving}>
            {isEdit ? 'Save changes' : 'Add module'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
