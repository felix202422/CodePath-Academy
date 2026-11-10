import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input, Textarea } from '../../components/ui/Field';
import { register as registerAccount } from './authApi';

const registrationSchema = z
  .object({
    fullName: z.string().trim().min(1, 'Enter your name.').max(160, 'Name must be 160 characters or fewer.'),
    email: z.string().trim().email('Enter a valid email address.').max(320, 'Email is too long.'),
    password: z
      .string()
      .min(8, 'Use at least 8 characters.')
      .max(72, 'Use no more than 72 characters.'),
    confirmPassword: z.string().min(1, 'Confirm your password.'),
    interests: z.string().max(500, 'Keep your interests to 500 characters or fewer.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type RegistrationValues = z.infer<typeof registrationSchema>;

/** Self-registration always submits a student request; status and role are never client fields. */
export function RegisterPage() {
  const form = useForm<RegistrationValues>({
    resolver: zodResolver(registrationSchema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '', interests: '' },
  });
  const registrationMutation = useMutation({
    mutationFn: registerAccount,
  });

  const submit = form.handleSubmit((values) => {
    registrationMutation.reset();
    const interests = values.interests.trim();
    registrationMutation.mutate({
      fullName: values.fullName,
      email: values.email,
      password: values.password,
      ...(interests ? { interests } : {}),
    });
  });

  return (
    <section aria-labelledby="register-heading" className="mx-auto max-w-xl px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        {registrationMutation.data ? (
          <div>
            <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Request received</p>
            <h1 id="register-heading" className="mt-2 text-2xl font-bold text-navy-950">
              Your registration is submitted
            </h1>
            <Alert tone="success" className="mt-5">
              {registrationMutation.data.message}
            </Alert>
            <p className="mt-4 text-sm text-ink-muted">
              You can sign in after an administrator approves your request.
            </p>
            <Link
              to="/login"
              className="mt-5 inline-flex font-medium text-accent-600 underline underline-offset-2"
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          <>
            <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Join the academy</p>
            <h1 id="register-heading" className="mt-2 text-2xl font-bold text-navy-950">
              Create a student account
            </h1>
            <p className="mt-2 text-sm text-ink-muted">
              Registration requests are reviewed by an administrator before sign-in is enabled.
            </p>

            {registrationMutation.error && (
              <Alert tone="danger" className="mt-5">
                {registrationMutation.error.message || 'Unable to submit your request. Please try again.'}
              </Alert>
            )}

            <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
              <Input
                label="Full name"
                type="text"
                autoComplete="name"
                maxLength={160}
                required
                autoFocus
                error={form.formState.errors.fullName?.message}
                {...form.register('fullName')}
              />
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                autoCapitalize="none"
                maxLength={320}
                required
                error={form.formState.errors.email?.message}
                {...form.register('email')}
              />
              <div className="grid gap-5 sm:grid-cols-2">
                <Input
                  label="Password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  hint="Use 8–72 characters."
                  error={form.formState.errors.password?.message}
                  {...form.register('password')}
                />
                <Input
                  label="Confirm password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={72}
                  required
                  error={form.formState.errors.confirmPassword?.message}
                  {...form.register('confirmPassword')}
                />
              </div>
              <Textarea
                label="Learning interests"
                rows={3}
                maxLength={500}
                hint="Optional — tell us which areas you want to study."
                error={form.formState.errors.interests?.message}
                {...form.register('interests')}
              />
              <Button type="submit" fullWidth loading={registrationMutation.isPending}>
                Submit registration request
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-ink-muted">
              Already have an account?{' '}
              <Link to="/login" className="font-medium text-accent-600 underline underline-offset-2">
                Sign in
              </Link>
            </p>
          </>
        )}
      </Card>
    </section>
  );
}
