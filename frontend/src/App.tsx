import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AdminLayout } from './components/layout/AdminLayout';
import { PublicLayout } from './components/layout/PublicLayout';
import { StudentLayout } from './components/layout/StudentLayout';
import { RouteErrorBoundary } from './components/errors/AppErrorBoundary';
import { CookieBanner } from './components/cookie/CookieBanner';
import { SpinnerCentered } from './components/ui/Spinner';
import { NotFoundPage } from './features/errors/NotFoundPage';
import { AboutPage } from './features/public/AboutPage';
import { CatalogPage } from './features/public/CatalogPage';
import { CourseDetailPage } from './features/public/CourseDetailPage';
import { HomePage } from './features/public/HomePage';
import { LearningPathsPage } from './features/public/LearningPathsPage';
import { PathDetailPage } from './features/public/PathDetailPage';
import { ContactPage } from './features/contact/ContactPage';
import { ContactSuccessPage } from './features/contact/ContactSuccessPage';
import { PrivacyPage } from './features/legal/PrivacyPage';
import { TermsPage } from './features/legal/TermsPage';
import { AdminContentPage } from './features/admin/AdminContentPage';
import { AdminCourseDetailPage } from './features/admin/AdminCourseDetailPage';
import { AdminCoursesPage } from './features/admin/AdminCoursesPage';
import { AdminDashboardPage } from './features/admin/AdminDashboardPage';
import { AdminAnnouncementsPage } from './features/admin/AdminAnnouncementsPage';
import { AdminAuditPage } from './features/admin/AdminAuditPage';
import { AdminMessagesPage } from './features/admin/AdminMessagesPage';
import { AdminEnrollmentsPage } from './features/admin/AdminEnrollmentsPage';
import { AdminStudentsPage } from './features/admin/AdminStudentsPage';
import { MyEnrollmentsPage } from './features/student/MyEnrollmentsPage';
import { MyAnnouncementsPage } from './features/student/MyAnnouncementsPage';
import { MyLearningPage } from './features/student/MyLearningPage';
import { MyAssessmentsPage } from './features/student/MyAssessmentsPage';
import { TakeAssessmentPage } from './features/student/TakeAssessmentPage';
import { AssessmentResultPage } from './features/student/AssessmentResultPage';
import { StudentCoursePage } from './features/student/StudentCoursePage';
import { StudentDashboardPage } from './features/student/StudentDashboardPage';
import { ProfilePage } from './features/student/ProfilePage';
import { LoginPage } from './features/auth/LoginPage';
import { RegisterPage } from './features/auth/RegisterPage';
import { RegisterSuccessPage } from './features/auth/RegisterSuccessPage';
import { RequireRole } from './features/auth/RequireRole';
import { ThemeProvider } from './features/theme/ThemeContext';

const LessonReaderPage = lazy(async () => {
  const module = await import('./features/student/LessonReaderPage');
  return { default: module.LessonReaderPage };
});

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
      {/* A crash in one screen falls back to an honest error page instead of a
          blank app; navigating resets the boundary. */}
      <RouteErrorBoundary>
      <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/courses" element={<CatalogPage />} />
        <Route path="/courses/:slug" element={<CourseDetailPage />} />
        <Route path="/paths" element={<LearningPathsPage />} />
        <Route path="/paths/:slug" element={<PathDetailPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/contact" element={<ContactPage />} />
        <Route path="/contact/thank-you" element={<ContactSuccessPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register/success" element={<RegisterSuccessPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      <Route element={<RequireRole role="STUDENT" />}>
        <Route path="/student" element={<StudentLayout />}>
          <Route
            index
            element={<StudentDashboardPage />}
          />
          <Route path="learning" element={<MyLearningPage />} />
          <Route path="learning/:courseSlug" element={<StudentCoursePage />} />
          <Route
            path="learning/:courseSlug/lessons/:lessonId"
            element={(
              <Suspense fallback={<SpinnerCentered label="Loading lesson reader…" />}>
                <LessonReaderPage />
              </Suspense>
            )}
          />
          <Route path="enrollments" element={<MyEnrollmentsPage />} />
          <Route path="announcements" element={<MyAnnouncementsPage />} />
          <Route path="assessments" element={<MyAssessmentsPage />} />
          <Route path="assessments/attempts/:attemptId" element={<AssessmentResultPage />} />
          <Route path="assessments/:assessmentId" element={<TakeAssessmentPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole role="ADMIN" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="students" element={<AdminStudentsPage />} />
          <Route path="enrollments" element={<AdminEnrollmentsPage />} />
          <Route path="courses" element={<AdminCoursesPage />} />
          <Route path="courses/:courseId" element={<AdminCourseDetailPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="announcements" element={<AdminAnnouncementsPage />} />
          <Route path="messages" element={<AdminMessagesPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
      </Routes>
      </RouteErrorBoundary>
      {/* Global: cookie notice + preference center, mounted above the route
          tree so it survives navigation (and route crashes). */}
      <CookieBanner />
    </ThemeProvider>
  );
}
