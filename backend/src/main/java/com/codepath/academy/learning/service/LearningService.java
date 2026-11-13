package com.codepath.academy.learning.service;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.model.LearningPath;
import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.catalog.model.LessonResource;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.catalog.repository.LessonRepository;
import com.codepath.academy.catalog.repository.LessonResourceRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.repository.CourseEnrollmentRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.learning.api.dto.LearningLessonSummaryResponse;
import com.codepath.academy.learning.api.dto.LearningModuleResponse;
import com.codepath.academy.learning.api.dto.LearningResourceResponse;
import com.codepath.academy.learning.api.dto.LessonProgressResponse;
import com.codepath.academy.learning.api.dto.StudentCourseLearningResponse;
import com.codepath.academy.learning.api.dto.StudentCourseProgressResponse;
import com.codepath.academy.learning.api.dto.StudentDashboardResponse;
import com.codepath.academy.learning.api.dto.StudentLessonResponse;
import com.codepath.academy.learning.model.LessonProgress;
import com.codepath.academy.learning.model.LessonProgressStatus;
import com.codepath.academy.learning.repository.LessonProgressRepository;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Student learning reads and progress writes. Every operation resolves the
 * active student from the session and requires an approved enrollment for the
 * published course containing the lesson.
 */
@Service
public class LearningService {

    private final AppUserRepository userRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final LearningPathRepository pathRepository;
    private final LessonRepository lessonRepository;
    private final LessonResourceRepository resourceRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final LessonProgressRepository progressRepository;

    public LearningService(AppUserRepository userRepository,
                           CourseRepository courseRepository,
                           CourseModuleRepository moduleRepository,
                           LearningPathRepository pathRepository,
                           LessonRepository lessonRepository,
                           LessonResourceRepository resourceRepository,
                           CourseEnrollmentRepository enrollmentRepository,
                           LessonProgressRepository progressRepository) {
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.pathRepository = pathRepository;
        this.lessonRepository = lessonRepository;
        this.resourceRepository = resourceRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.progressRepository = progressRepository;
    }

    /** Dashboard and progress are derived exclusively from approved enrollments and published lessons. */
    @Transactional(readOnly = true)
    public StudentDashboardResponse dashboard(String studentEmail) {
        AppUser student = requireActiveStudent(studentEmail);
        List<CourseEnrollment> enrollments = enrollmentRepository
                .findTop100ByStudent_IdAndStatusOrderByRequestedAtDesc(
                        student.getId(), EnrollmentStatus.APPROVED);
        List<DashboardCourseData> courseData = new ArrayList<>();
        List<UUID> allLessonIds = new ArrayList<>();
        for (CourseEnrollment enrollment : enrollments) {
            Course course = enrollment.getCourse();
            LearningPath path = course.getStatus() == ContentStatus.PUBLISHED
                    ? publishedPath(course.getLearningPathId())
                    : null;
            if (path == null) {
                continue;
            }
            List<Lesson> lessons = lessonRepository
                    .findByCourseIdAndStatusInPublishedModules(course.getId(), ContentStatus.PUBLISHED);
            courseData.add(new DashboardCourseData(enrollment, course, path, lessons));
            lessons.stream().map(Lesson::getId).forEach(allLessonIds::add);
        }

        Map<UUID, LessonProgress> progressByLesson = progressByLesson(student.getId(), allLessonIds);
        List<StudentCourseProgressResponse> courses = new ArrayList<>();
        long totalLessons = 0;
        long completedLessons = 0;
        for (DashboardCourseData data : courseData) {
            List<Lesson> lessons = data.lessons();
            long total = lessons.size();
            long completed = lessons.stream()
                    .map(lesson -> progressByLesson.get(lesson.getId()))
                    .filter(Objects::nonNull)
                    .filter(progress -> progress.getStatus() == LessonProgressStatus.COMPLETED)
                    .count();
            Lesson continueLesson = null;
            if (total > completed) {
                continueLesson = nextIncompleteLesson(
                        lessons, data.enrollment().getLastAccessedLessonId(), progressByLesson);
            }

            Course course = data.course();
            courses.add(new StudentCourseProgressResponse(
                    course.getId(),
                    course.getSlug(),
                    course.getTitle(),
                    course.getSummary(),
                    data.path().getName(),
                    total,
                    completed,
                    percent(completed, total),
                    continueLesson == null ? null : continueLesson.getId(),
                    continueLesson == null ? null : continueLesson.getTitle(),
                    data.enrollment().getLastAccessedAt()));
            totalLessons += total;
            completedLessons += completed;
        }

        // Courses with a recent access are most useful at the top of the dashboard;
        // never fabricate a last-access date for courses that have not been opened.
        courses.sort(Comparator.comparing(
                StudentCourseProgressResponse::lastAccessedAt,
                Comparator.nullsLast(Comparator.reverseOrder())));
        return new StudentDashboardResponse(
                courses.size(), totalLessons, completedLessons,
                percent(completedLessons, totalLessons), courses);
    }

    /** Ordered published outline with only this student's real progress rows. */
    @Transactional(readOnly = true)
    public StudentCourseLearningResponse course(String studentEmail, String courseSlug) {
        AppUser student = requireActiveStudent(studentEmail);
        EnrolledCourse enrolled = requireEnrolledCourse(student, courseSlug);
        List<CourseModule> modules = moduleRepository.findByCourseIdAndStatusOrderByDisplayOrderAsc(
                enrolled.course().getId(), ContentStatus.PUBLISHED);
        Map<UUID, List<Lesson>> lessonsByModule = new HashMap<>();
        List<UUID> lessonIds = new ArrayList<>();
        for (CourseModule module : modules) {
            List<Lesson> lessons = lessonRepository.findByModuleIdAndStatusOrderByDisplayOrderAsc(
                    module.getId(), ContentStatus.PUBLISHED);
            lessonsByModule.put(module.getId(), lessons);
            lessons.stream().map(Lesson::getId).forEach(lessonIds::add);
        }

        Map<UUID, LessonProgress> progressByLesson = progressByLesson(student.getId(), lessonIds);
        List<LearningModuleResponse> moduleResponses = modules.stream()
                .map(module -> new LearningModuleResponse(
                        module.getId(), module.getTitle(), module.getSummary(),
                        module.getDisplayOrder(),
                        lessonsByModule.getOrDefault(module.getId(), List.of()).stream()
                                .map(lesson -> toLessonSummary(lesson,
                                        progressByLesson.get(lesson.getId())))
                                .toList()))
                .toList();
        long completed = progressByLesson.values().stream()
                .filter(progress -> progress.getStatus() == LessonProgressStatus.COMPLETED)
                .count();
        long total = lessonIds.size();
        Course course = enrolled.course();
        return new StudentCourseLearningResponse(
                course.getId(), course.getSlug(), course.getTitle(), course.getSummary(),
                enrolled.path().getName(), total, completed, percent(completed, total),
                moduleResponses);
    }

    /** Full Markdown content is returned only after course and lesson-level authorization. */
    @Transactional(readOnly = true)
    public StudentLessonResponse lesson(String studentEmail, String courseSlug, UUID lessonId) {
        AppUser student = requireActiveStudent(studentEmail);
        LearningContext context = requireLearningContext(student, courseSlug, lessonId, false);
        List<Lesson> courseLessons = lessonRepository.findByCourseIdAndStatusInPublishedModules(
                context.course().getId(), ContentStatus.PUBLISHED);
        int currentIndex = indexOfLesson(courseLessons, lessonId);
        UUID previousId = currentIndex > 0 ? courseLessons.get(currentIndex - 1).getId() : null;
        UUID nextId = currentIndex >= 0 && currentIndex + 1 < courseLessons.size()
                ? courseLessons.get(currentIndex + 1).getId()
                : null;
        LessonProgress progress = progressRepository
                .findByStudentIdAndLessonId(student.getId(), lessonId)
                .orElse(null);
        List<LearningResourceResponse> resources = resourceRepository
                .findByLessonIdOrderByCreatedAtAsc(lessonId).stream()
                .map(LearningResourceResponse::from)
                .toList();

        return new StudentLessonResponse(
                context.lesson().getId(),
                context.lesson().getSlug(),
                context.lesson().getTitle(),
                context.lesson().getSummary(),
                context.lesson().getBodyMarkdown(),
                context.lesson().getDisplayOrder(),
                context.course().getId(),
                context.course().getSlug(),
                context.course().getTitle(),
                context.module().getId(),
                context.module().getTitle(),
                progress == null ? null : progress.getStatus(),
                progress == null ? null : progress.getCompletedAt(),
                previousId,
                nextId,
                resources);
    }

    /** Records an actual reader visit and updates this enrollment's continue target. */
    @Transactional
    public LessonProgressResponse recordAccess(String studentEmail, String courseSlug,
                                               UUID lessonId) {
        AppUser student = requireActiveStudent(studentEmail);
        LearningContext context = requireLearningContext(student, courseSlug, lessonId, true);
        Instant now = Instant.now();
        LessonProgress progress = progressRepository
                .findByStudentIdAndLessonId(student.getId(), lessonId)
                .orElseGet(() -> newProgress(student.getId(), lessonId));
        if (progress.getStatus() == null) {
            progress.setStatus(LessonProgressStatus.IN_PROGRESS);
        }
        progress.setLastAccessedAt(now);
        context.enrollment().setLastAccessedAt(now);
        context.enrollment().setLastAccessedLessonId(lessonId);
        progressRepository.save(progress);
        enrollmentRepository.save(context.enrollment());
        return LessonProgressResponse.from(progress, context.course().getSlug());
    }

    /** Marks the authorized lesson complete; repeated completion is idempotent. */
    @Transactional
    public LessonProgressResponse completeLesson(String studentEmail, String courseSlug,
                                                 UUID lessonId) {
        AppUser student = requireActiveStudent(studentEmail);
        LearningContext context = requireLearningContext(student, courseSlug, lessonId, true);
        Instant now = Instant.now();
        LessonProgress progress = progressRepository
                .findByStudentIdAndLessonId(student.getId(), lessonId)
                .orElseGet(() -> newProgress(student.getId(), lessonId));
        progress.setStatus(LessonProgressStatus.COMPLETED);
        if (progress.getCompletedAt() == null) {
            progress.setCompletedAt(now);
        }
        progress.setLastAccessedAt(now);
        context.enrollment().setLastAccessedAt(now);
        context.enrollment().setLastAccessedLessonId(lessonId);
        progressRepository.save(progress);
        enrollmentRepository.save(context.enrollment());
        return LessonProgressResponse.from(progress, context.course().getSlug());
    }

    private AppUser requireActiveStudent(String email) {
        AppUser student = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.forbidden("Signed-in account not found."));
        if (student.getRole() != UserRole.STUDENT || student.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("An active student account is required for learning.");
        }
        return student;
    }

    private EnrolledCourse requireEnrolledCourse(AppUser student, String courseSlug) {
        Course course = courseRepository.findBySlugAndStatus(courseSlug, ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
        LearningPath path = publishedPath(course.getLearningPathId());
        if (path == null || !hasApprovedEnrollment(student.getId(), course.getId())) {
            throw ApiException.notFound("Course not found.");
        }
        return new EnrolledCourse(course, path);
    }

    private LearningContext requireLearningContext(AppUser student, String courseSlug,
                                                    UUID lessonId, boolean lockEnrollment) {
        EnrolledCourse enrolled = requireEnrolledCourse(student, courseSlug);
        Lesson lesson = lessonRepository.findByIdAndStatus(lessonId, ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Lesson not found."));
        CourseModule module = moduleRepository.findById(lesson.getModuleId())
                .filter(candidate -> candidate.getCourseId().equals(enrolled.course().getId()))
                .filter(candidate -> candidate.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Lesson not found."));
        CourseEnrollment enrollment = (lockEnrollment
                ? enrollmentRepository.findApprovedEnrollmentForUpdate(
                        enrolled.course().getId(), student.getId(), EnrollmentStatus.APPROVED)
                : enrollmentRepository.findByCourse_IdAndStudent_IdAndStatus(
                        enrolled.course().getId(), student.getId(), EnrollmentStatus.APPROVED))
                .orElseThrow(() -> ApiException.notFound("Lesson not found."));
        return new LearningContext(enrolled.course(), enrolled.path(), module, lesson, enrollment);
    }

    private boolean hasApprovedEnrollment(UUID studentId, UUID courseId) {
        return enrollmentRepository.findByCourse_IdAndStudent_IdAndStatus(
                courseId, studentId, EnrollmentStatus.APPROVED).isPresent();
    }

    private LearningPath publishedPath(UUID pathId) {
        return pathRepository.findById(pathId)
                .filter(candidate -> candidate.getStatus() == ContentStatus.PUBLISHED)
                .orElse(null);
    }

    private Map<UUID, LessonProgress> progressByLesson(UUID studentId, List<UUID> lessonIds) {
        if (lessonIds.isEmpty()) {
            return Map.of();
        }
        return progressRepository.findByStudentIdAndLessonIdIn(studentId, lessonIds).stream()
                .collect(Collectors.toMap(LessonProgress::getLessonId, Function.identity()));
    }

    private static LearningLessonSummaryResponse toLessonSummary(Lesson lesson,
                                                                  LessonProgress progress) {
        return new LearningLessonSummaryResponse(
                lesson.getId(), lesson.getSlug(), lesson.getTitle(), lesson.getSummary(),
                lesson.getDisplayOrder(), progress == null ? null : progress.getStatus(),
                progress == null ? null : progress.getCompletedAt());
    }

    private static LessonProgress newProgress(UUID studentId, UUID lessonId) {
        LessonProgress progress = new LessonProgress();
        progress.setStudentId(studentId);
        progress.setLessonId(lessonId);
        progress.setStatus(LessonProgressStatus.IN_PROGRESS);
        return progress;
    }

    private static Lesson nextIncompleteLesson(List<Lesson> lessons, UUID lastAccessedLessonId,
                                               Map<UUID, LessonProgress> progressByLesson) {
        int lastIndex = indexOfLesson(lessons, lastAccessedLessonId);
        int startIndex = lastIndex < 0 ? 0 : lastIndex;
        for (int index = startIndex; index < lessons.size(); index++) {
            Lesson lesson = lessons.get(index);
            LessonProgress progress = progressByLesson.get(lesson.getId());
            if (progress == null || progress.getStatus() != LessonProgressStatus.COMPLETED) {
                return lesson;
            }
        }
        for (int index = 0; index < startIndex; index++) {
            Lesson lesson = lessons.get(index);
            LessonProgress progress = progressByLesson.get(lesson.getId());
            if (progress == null || progress.getStatus() != LessonProgressStatus.COMPLETED) {
                return lesson;
            }
        }
        return null;
    }

    private static int percent(long completed, long total) {
        return total == 0 ? 0 : Math.toIntExact(completed * 100 / total);
    }

    private static int indexOfLesson(List<Lesson> lessons, UUID lessonId) {
        for (int index = 0; index < lessons.size(); index++) {
            if (Objects.equals(lessons.get(index).getId(), lessonId)) {
                return index;
            }
        }
        return -1;
    }

    private record EnrolledCourse(Course course, LearningPath path) {
    }

    private record LearningContext(Course course, LearningPath path, CourseModule module,
                                   Lesson lesson, CourseEnrollment enrollment) {
    }

    private record DashboardCourseData(CourseEnrollment enrollment, Course course,
                                       LearningPath path, List<Lesson> lessons) {
    }
}
