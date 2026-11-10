import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { z } from 'zod';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Field';
import { ApiRequestError } from '../../lib/api';
import { homeForRole, login, SESSION_QUERY_KEY, type SessionUser } from './authApi';
import { useSession } from './useSession';

const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(320, 'Email is too long.'),
  password: z.string().min(1, 'Enter your password.').max(72, 'Password is too long.'),
});

type LoginValues = z.infer<typeof loginSchema>;

interface ReturnLocation {
  pathname?: string;
  search?: string;
  hash?: string;
}

function getReturnPath(state: unknown, role: SessionUser['role']): string | null {
  if (!state || typeof state !== 'object' || !('from' in state)) return null;
  const from = (state as { from?: ReturnLocation }).from;
  const pathname = from?.pathname;
  if (!pathname || !pathname.startsWith('/') || pathname.startsWith('//')) return null;
  if (pathname === '/login' || pathname === '/register') return null;
  if (pathname.startsWith('/admin') && role !== 'ADMIN') return null;
  if (pathname.startsWith('/student') && role !== 'STUDENT') return null;
  return `${pathname}${from.search ?? ''}${from.hash ?? ''}`;
}

/** Public sign-in form backed by the server session; roles are taken only from the response. */
export function LoginPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionQuery = useSession();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: (user) => {
      queryClient.setQueryData<SessionUser | null>(SESSION_QUERY_KEY, user);
      const returnPath = getReturnPath(location.state, user.role);
      navigate(returnPath ?? homeForRole(user.role), { replace: true });
    },
  });

  if (sessionQuery.data) {
    return <Navigate to={homeForRole(sessionQuery.data.role)} replace />;
  }

  const submit = form.handleSubmit((values) => {
    loginMutation.reset();
    loginMutation.mutate(values);
  });

  return (
    <section aria-labelledby="login-heading" className="mx-auto max-w-md px-4 py-10 sm:py-14">
      <Card className="p-6 sm:p-8">
        <p className="text-sm font-semibold tracking-wide text-accent-600 uppercase">Welcome back</p>
        <h1 id="login-heading" className="mt-2 text-2xl font-bold text-navy-950">
          Sign in to your account
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Use the email and password for your approved CodePath Academy account.
        </p>

        {loginMutation.error && (
          <Alert tone="danger" className="mt-5">
            {loginMutation.error instanceof ApiRequestError
              ? loginMutation.error.message
              : 'Unable to sign in right now. Check your connection and try again.'}
          </Alert>
        )}

        <form className="mt-6 space-y-5" onSubmit={submit} noValidate>
          <Input
            label="Email"
            type="email"
            autoComplete="username"
            autoCapitalize="none"
            maxLength={320}
            required
            autoFocus
            error={form.formState.errors.email?.message}
            {...form.register('email')}
          />
          <Input
            label="Password"
            type="password"
            autoComplete="current-password"
            maxLength={72}
            required
            error={form.formState.errors.password?.message}
            {...form.register('password')}
          />
          <Button type="submit" fullWidth loading={loginMutation.isPending}>
            Sign in
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="font-medium text-accent-600 underline underline-offset-2">
            Create one
          </Link>
        </p>
      </Card>
    </section>
  );
}
