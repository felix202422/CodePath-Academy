import { Route, Routes } from 'react-router';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { NotFoundPage } from './features/errors/NotFoundPage';
import { AboutPage } from './features/public/AboutPage';
import { HomePage } from './features/public/HomePage';
import { PlaceholderPage } from './features/shared/PlaceholderPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { RequireRole } from './features/auth/RequireRole';

/**
 * Route tree. Layouts establish the public/student/admin shells (Phase 2);
 * screens whose features are not built yet render an honest phase placeholder
 * instead of fake data. Protected routes use server-derived roles for navigation;
 * backend authorization remains the security boundary.
 */
export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/courses"
          element={
            <PlaceholderPage
              title="Course catalog"
              phase="Phase 4 — Public academy"
              description="Browse published courses by subject, level, and duration, with full course details and curricula."
            />
          }
        />
        <Route
          path="/paths"
          element={
            <PlaceholderPage
              title="Learning paths"
              phase="Phase 4 — Public academy"
              description="Compare structured paths — software engineering, cybersecurity, networking, and emerging technologies — and see how courses connect."
            />
          }
        />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<RequireRole role="STUDENT" />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route
            index
            element={
              <PlaceholderPage
                title="Student dashboard"
                phase="Phase 7 — Student learning"
                description="Your enrolled courses, continue-where-you-left-off lessons, and overall progress at a glance."
              />
            }
          />
          <Route
            path="learning"
            element={
              <PlaceholderPage
                title="My learning"
                phase="Phase 7 — Student learning"
                description="Lesson reader with persistent completion tracking across every course you are enrolled in."
              />
            }
          />
          <Route
            path="assessments"
            element={
              <PlaceholderPage
                title="Assessments"
                phase="Phase 8 — Assessments"
                description="Assigned quizzes and assignments with server-side grading and honest feedback."
              />
            }
          />
          <Route
            path="profile"
            element={
              <PlaceholderPage
                title="Profile"
                phase="Phase 3 — Authentication and security"
                description="Account details, password changes, and enrollment history."
              />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route
            index
            element={
              <PlaceholderPage
                title="Administration dashboard"
                phase="Phase 9 — Administration and analytics"
                description="Enrollment queue, content status, and platform activity in one place."
              />
            }
          />
          <Route
            path="students"
            element={
              <PlaceholderPage
                title="Students"
                phase="Phase 9 — Administration and analytics"
                description="Review registration requests, approve or reject students, and manage account status."
              />
            }
          />
          <Route
            path="courses"
            element={
              <PlaceholderPage
                title="Courses"
                phase="Phase 5 — Course management"
                description="Create paths, courses, modules, and lessons; control draft and publication state."
              />
            }
          />
          <Route
            path="content"
            element={
              <PlaceholderPage
                title="Content import"
                phase="Phase 5 — Course management"
                description="Run source-aware curriculum imports from CodePath-Masterclass with an audited review workflow."
              />
            }
          />
          <Route
            path="announcements"
            element={
              <PlaceholderPage
                title="Announcements"
                phase="Phase 9 — Administration and analytics"
                description="Publish platform and course announcements to enrolled students."
              />
            }
          />
          <Route
            path="audit"
            element={
              <PlaceholderPage
                title="Audit log"
                phase="Phase 9 — Administration and analytics"
                description="Append-only record of administrative actions for review and accountability."
              />
            }
          />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
