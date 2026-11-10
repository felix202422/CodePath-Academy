import { Outlet, useNavigate } from 'react-router';
import { Button } from '../ui/Button';
import { AppHeader, type NavItem } from './AppHeader';

const STUDENT_NAV: NavItem[] = [
  { to: '/student', label: 'Dashboard', end: true },
  { to: '/student/learning', label: 'My learning' },
  { to: '/student/assessments', label: 'Assessments' },
  { to: '/student/profile', label: 'Profile' },
];

/**
 * Shell for enrolled students. Route protection is added with authentication in
 * Phase 3; until then this shell only establishes the navigation structure.
 */
export function StudentLayout() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col bg-canvas">
      <AppHeader
        items={STUDENT_NAV}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate('/login')}>
            Switch account
          </Button>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
