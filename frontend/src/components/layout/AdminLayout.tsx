import { Outlet } from 'react-router';
import { Alert } from '../ui/Alert';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppHeader, type NavItem } from './AppHeader';
import { useLogout } from '../../features/auth/useSession';

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
  { to: '/admin/enrollments', label: 'Enrollments' },
  { to: '/admin/courses', label: 'Courses' },
  { to: '/admin/content', label: 'Content' },
  { to: '/admin/announcements', label: 'Announcements' },
  { to: '/admin/audit', label: 'Audit log' },
];

/**
 * Shell for administrators. Server-side ADMIN checks guard every /api/v1/admin
 * endpoint; this navigation is usability only (see docs/ARCHITECTURE.md).
 * Admin authentication is wired in Phase 3.
 */
export function AdminLayout() {
  const logout = useLogout();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AppHeader
        items={ADMIN_NAV}
        breakpoint="lg"
        trailing={
          // Wrapper carries the visibility rule: the Badge's own inline-flex
          // utility would otherwise override a `hidden` class on the badge itself.
          <span className="hidden xl:block">
            <Badge tone="info">Administration</Badge>
          </span>
        }
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
