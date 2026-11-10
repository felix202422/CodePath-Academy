import { Outlet, useNavigate } from 'react-router';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { AppHeader, type NavItem } from './AppHeader';

const ADMIN_NAV: NavItem[] = [
  { to: '/admin', label: 'Dashboard', end: true },
  { to: '/admin/students', label: 'Students' },
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
  const navigate = useNavigate();

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
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            Sign in
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
