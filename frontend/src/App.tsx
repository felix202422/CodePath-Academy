import { Route, Routes } from 'react-router';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { NotFoundPage } from './features/errors/NotFoundPage';
import { AboutPage } from './features/public/AboutPage';
import { CatalogPage } from './features/public/CatalogPage';
import { CourseDetailPage } from './features/public/CourseDetailPage';
import { HomePage } from './features/public/HomePage';
import { LearningPathsPage } from './features/public/LearningPathsPage';
import { PathDetailPage } from './features/public/PathDetailPage';
import { PlaceholderPage } from './features/shared/PlaceholderPage';
import { AdminContentPage } from './features/admin/AdminContentPage';
import { AdminCourseDetailPage } from './features/admin/AdminCourseDetailPage';
import { AdminCoursesPage } from './features/admin/AdminCoursesPage';
import { AdminEnrollmentsPage } from './features/admin/AdminEnrollmentsPage';
import { MyEnrollmentsPage } from './features/student/MyEnrollmentsPage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { RequireRole } from './features/auth/RequireRole';
import { ThemeProvider } from './features/theme/ThemeContext';

/**
 * Route tree. Layouts establish the public/student/admin shells (Phase 2);
 * the public academy screens read the real catalog API (Phase 4); screens
 * whose features are not built yet render an honest phase placeholder instead
 * of fake data. Protected routes use server-derived roles for navigation;
 * backend authorization remains the security boundary.
 */
export default function App() {
  return (
    <ThemeProvider>
      <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CatalogPage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/paths" element={<LearningPathsPage />} />
        <Route path="/paths/:slug" element={<PathDetailPage />} />
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
          <Route path="enrollments" element={<MyEnrollmentsPage />} />
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
                description="Account details and password changes. Enrollment requests are listed separately in My enrollments."
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
          <Route path="enrollments" element={<AdminEnrollmentsPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/:courseId" element={<AdminCourseDetailPage />} />
          <Route path="content" element={<AdminContentPage />} />
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
    </ThemeProvider>
  );
}
