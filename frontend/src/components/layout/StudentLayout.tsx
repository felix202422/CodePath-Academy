import { Outlet } from 'react-router';
import { Alert } from '../ui/Alert';
import { Button } from '../ui/Button';
import { AppHeader, type NavItem } from './AppHeader';
import { useLogout } from '../../features/auth/useSession';

const STUDENT_NAV: NavItem[] = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/enrollments', label: 'Enrollments' },
  { to: '/student/learning', label: 'My learning' },
  { to: '/student/assessments', label: 'Assessments' },
  { to: '/student/profile', label: 'Profile' },
];

/**
 * Shell for signed-in students. Route protection is enforced by RequireRole and
 * every student API resolves ownership from the server-side session.
 */
export function StudentLayout() {
  const logout = useLogout();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AppHeader
        items={STUDENT_NAV}
        actions={
          <Button variant="outline" size="sm" loading={logout.isPending} onClick={() => logout.mutate()}>
            Sign out
          </Button>
        }
      />
      {logout.error && (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
          <Alert tone="danger">{logout.error.message}</Alert>
        </div>
      )}
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
