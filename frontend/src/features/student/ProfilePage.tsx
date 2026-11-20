import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardTitle } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { usePageMeta } from '../../lib/pageMeta';
import { ApiRequestError } from '../../lib/api';
import {
  changePassword,
  type ChangePasswordResult,
  type SessionUser,
} from '../auth/authApi';
import { useSession } from '../auth/useSession';

const passwordChangeSchema = z
  .object({
    currentPassword: z
      .string()
      .min(1, 'Enter your current password.')
      .max(72, 'Use no more than 72 characters.'),
    newPassword: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Use no more than 72 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your new password.'),
  })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  })
  .refine((values) => values.newPassword !== values.currentPassword, {
    path: ['newPassword'],
    message: 'Choose a password you have not used before.',
  });

type PasswordChangeValues = z.infer<typeof passwordChangeSchema>;

const EMPTY_FORM: PasswordChangeValues = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const ROLE_LABEL: Record<SessionUser['role'], string> = {
  STUDENT: 'Student',
  ADMIN: 'Administrator',
};

const STATUS_TONE: Record<SessionUser['status'], BadgeTone> = {
  ACTIVE: 'success',
};

interface DetailRowProps {
  term: string;
  children: ReactNode;
}

function DetailRow({ term, children }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-slate-100 py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
      <dt className="text-sm font-medium text-ink-muted">{term}</dt>
      <dd className="text-sm break-words text-navy-950 sm:text-right">{children}</dd>
    </div>
  );
}

/**
 * Signed-in account details plus self-service password change (Phase 3).
 * The backend re-proves the current password, enforces the same 8–72 policy
 * as registration, and keeps this session signed in after a change.
 */
export function ProfilePage() {
  usePageMeta({ title: 'Profile', noindex: true });
  const session = useSession();

  const form = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: EMPTY_FORM,
  });

  const passwordMutation = useMutation<ChangePasswordResult, ApiRequestError, PasswordChangeValues>({
    mutationFn: (values) =>
      changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      }),
    onSuccess: () => {
      form.reset(EMPTY_FORM);
    },
    onError: (error) => {
      // Field-scoped failures (wrong current password, policy breaches) land
      // on the matching control; anything else is shown as a page alert.
      const entries = Object.entries(error.fieldErrors) as [keyof PasswordChangeValues, string][];
      entries.forEach(([field, message]) => form.setError(field, { message }));
    },
  });

  const submit = form.handleSubmit((values) => {
    passwordMutation.reset();
    passwordMutation.mutate(values);
  });

  const fieldErrorKeys =
    passwordMutation.isError ? Object.keys(passwordMutation.error.fieldErrors) : [];
  const showAlert = passwordMutation.isError && fieldErrorKeys.length === 0;
  const user = session.data;

  return (
    <div className="space-y-6">
      <header>
        <p className="text-xs font-bold tracking-[0.14em] text-accent-700 uppercase">
          Student account
        </p>
        <h1 className="mt-2 text-3xl font-bold text-navy-950">Profile</h1>
        <p className="mt-2 max-w-2xl text-ink-muted">
          Your account details and password. Enrollment requests are listed separately in{' '}
          <Link
            to="/student/enrollments"
            className="font-medium text-accent-700 underline underline-offset-2 hover:text-accent-800"
          >
            My enrollments
          </Link>
          .
        </p>
      </header>

      {session.isPending && (
        <p className="text-sm text-ink-muted" role="status">
          Loading your account…
        </p>
      )}

      {user && (
        <>
          <Card className="p-6">
            <CardTitle>Account details</CardTitle>
            <dl className="mt-2">
              <DetailRow term="Full name">{user.fullName}</DetailRow>
              <DetailRow term="Email">{user.email}</DetailRow>
              <DetailRow term="Role">{ROLE_LABEL[user.role]}</DetailRow>
              <DetailRow term="Status">
                <Badge tone={STATUS_TONE[user.status]}>
                  {user.status === 'ACTIVE' ? 'Active' : user.status}
                </Badge>
              </DetailRow>
            </dl>
          </Card>

          <Card className="p-6">
            <CardTitle>Change password</CardTitle>
            <p className="mt-2 text-sm text-ink-muted">
              Re-enter your current password to confirm it is you. Use 8–72 characters.
            </p>

            {passwordMutation.isSuccess && (
              <Alert tone="success" className="mt-4">
                {passwordMutation.data.message} You stay signed in here; other signed-in devices
                remain signed in until they sign out.
              </Alert>
            )}
            {showAlert && (
              <Alert tone="danger" className="mt-4">
                {passwordMutation.error.message ||
                  'Your password could not be changed. Please try again.'}
              </Alert>
            )}

            <form className="mt-5 space-y-5" onSubmit={submit} noValidate>
              <Input
                label="Current password"
                type="password"
                autoComplete="current-password"
                maxLength={72}
                required
                error={form.formState.errors.currentPassword?.message}
                {...form.register('currentPassword')}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="New password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  hint="8–72 characters."
                  error={form.formState.errors.newPassword?.message}
                  {...form.register('newPassword')}
                />
                <Input
                  label="Confirm new password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  required
                  error={form.formState.errors.confirmPassword?.message}
                  {...form.register('confirmPassword')}
                />
              </div>
              <Button type="submit" loading={passwordMutation.isPending}>
                Update password
              </Button>
            </form>
          </Card>
        </>
      )}
    </div>
  );
}
