package com.codepath.academy.catalog.service;

import com.codepath.academy.catalog.api.dto.CourseAdminResponse;
import com.codepath.academy.catalog.api.dto.CourseDetailAdminResponse;
import com.codepath.academy.catalog.api.dto.CourseWriteRequest;
import com.codepath.academy.catalog.api.dto.LessonAdminResponse;
import com.codepath.academy.catalog.api.dto.LessonDetailAdminResponse;
import com.codepath.academy.catalog.api.dto.LessonWriteRequest;
import com.codepath.academy.catalog.api.dto.ModuleAdminResponse;
import com.codepath.academy.catalog.api.dto.ModuleWriteRequest;
import com.codepath.academy.catalog.api.dto.PathAdminResponse;
import com.codepath.academy.catalog.api.dto.PathWriteRequest;
import com.codepath.academy.catalog.api.dto.StatusChangeRequest;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.model.LearningPath;
import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.catalog.repository.LessonRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.common.util.Sha256;
import java.time.Instant;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrator writes for the curriculum hierarchy: learning paths → courses
 * → modules → lessons, plus explicit publication transitions.
 *
 * <p>Cascade policy (server-enforced, documented in docs/CONTENT-INTEGRATION.md):
 * content can only be published bottom-up — a course publishes only under a
 * published path, a module only under a published course, a lesson only under a
 * published module. Unpublishing and archiving are always allowed; the public
 * read API independently filters to PUBLISHED rows. {@code publishedAt} records
 * a lesson's first publication and is kept across later republishes.
 *
 * <p>There are no delete endpoints in this phase: ARCHIVED is the removal path,
 * so nothing an enrollment or a public link points at can vanish.
 */
@Service
public class AdminCatalogService {

    private final LearningPathRepository pathRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;

    public AdminCatalogService(LearningPathRepository pathRepository,
                               CourseRepository courseRepository,
                               CourseModuleRepository moduleRepository,
                               LessonRepository lessonRepository) {
        this.pathRepository = pathRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
    }

    // --- learning paths -----------------------------------------------------

    @Transactional
    public List<PathAdminResponse> listPaths() {
        return pathRepository.findAll(Sort.by(Sort.Direction.ASC, "displayOrder")).stream()
                .map(path -> PathAdminResponse.from(
                        path, courseRepository.countByLearningPathId(path.getId())))
                .toList();
    }

    @Transactional
    public PathAdminResponse createPath(PathWriteRequest request) {
        if (pathRepository.existsBySlug(request.slug())) {
            throw ApiException.conflict("A learning path with this slug already exists.");
        }
        LearningPath path = new LearningPath();
        path.setSlug(request.slug());
        path.setName(request.name());
        path.setSummary(request.summary());
        path.setDescription(trimToNull(request.description()));
        path.setAccentColor(trimToNull(request.accentColor()));
        path.setStatus(ContentStatus.DRAFT);
        path.setDisplayOrder(request.displayOrder() != null
                ? request.displayOrder()
                : pathRepository.maxDisplayOrder() + 1);
        pathRepository.save(path);
        return PathAdminResponse.from(path, 0);
    }

    @Transactional
    public PathAdminResponse updatePath(UUID id, PathWriteRequest request) {
        LearningPath path = requirePath(id);
        if (!path.getSlug().equals(request.slug()) && pathRepository.existsBySlug(request.slug())) {
            throw ApiException.conflict("A learning path with this slug already exists.");
        }
        path.setSlug(request.slug());
        path.setName(request.name());
        path.setSummary(request.summary());
        path.setDescription(trimToNull(request.description()));
        path.setAccentColor(trimToNull(request.accentColor()));
        if (request.displayOrder() != null) {
            path.setDisplayOrder(request.displayOrder());
        }
        pathRepository.save(path);
        return PathAdminResponse.from(path, courseRepository.countByLearningPathId(path.getId()));
    }

    @Transactional
    public PathAdminResponse changePathStatus(UUID id, StatusChangeRequest request) {
        LearningPath path = requirePath(id);
        path.setStatus(request.status());
        pathRepository.save(path);
        return PathAdminResponse.from(path, courseRepository.countByLearningPathId(path.getId()));
    }

    // --- courses ------------------------------------------------------------

    @Transactional
    public List<CourseAdminResponse> listCourses(UUID pathId) {
        List<Course> courses = pathId == null
                ? courseRepository.findAll(Sort.by(Sort.Direction.ASC, "displayOrder"))
                : courseRepository.findByLearningPathIdOrderByDisplayOrderAsc(pathId);
        return courses.stream().map(this::courseResponse).toList();
    }

    @Transactional
    public CourseAdminResponse createCourse(CourseWriteRequest request) {
        requirePath(request.pathId());
        assertSlugAvailable(request.slug());
        assertSourcePathAvailable(request.sourcePath(), null);

        Course course = new Course();
        course.setLearningPathId(request.pathId());
        course.setSlug(request.slug());
        course.setTitle(request.title());
        course.setSummary(request.summary());
        course.setDescription(trimToNull(request.description()));
        course.setLevel(request.level());
        course.setEstimatedHours(request.estimatedHours());
        course.setStatus(ContentStatus.DRAFT);
        course.setSourcePath(trimToNull(request.sourcePath()));
        course.setDisplayOrder(request.displayOrder() != null
                ? request.displayOrder()
                : courseRepository.maxDisplayOrderForPath(request.pathId()) + 1);
        courseRepository.save(course);
        return courseResponse(course);
    }

    @Transactional
    public CourseDetailAdminResponse getCourse(UUID id) {
        Course course = requireCourse(id);
        List<ModuleAdminResponse> modules =
                moduleRepository.findByCourseIdOrderByDisplayOrderAsc(course.getId()).stream()
                        .map(this::moduleResponse)
                        .toList();
        return new CourseDetailAdminResponse(courseResponse(course), modules);
    }

    @Transactional
    public CourseAdminResponse updateCourse(UUID id, CourseWriteRequest request) {
        Course course = requireCourse(id);
        requirePath(request.pathId());
        if (!course.getSlug().equals(request.slug())) {
            assertSlugAvailable(request.slug());
        }
        assertSourcePathAvailable(request.sourcePath(), course.getId());

        course.setLearningPathId(request.pathId());
        course.setSlug(request.slug());
        course.setTitle(request.title());
        course.setSummary(request.summary());
        course.setDescription(trimToNull(request.description()));
        course.setLevel(request.level());
        course.setEstimatedHours(request.estimatedHours());
        course.setSourcePath(trimToNull(request.sourcePath()));
        if (request.displayOrder() != null) {
            course.setDisplayOrder(request.displayOrder());
        }
        courseRepository.save(course);
        return courseResponse(course);
    }

    @Transactional
    public CourseAdminResponse changeCourseStatus(UUID id, StatusChangeRequest request) {
        Course course = requireCourse(id);
        if (request.status() == ContentStatus.PUBLISHED) {
            LearningPath path = requirePath(course.getLearningPathId());
            if (path.getStatus() != ContentStatus.PUBLISHED) {
                throw ApiException.conflict(
                        "Publish the owning learning path before publishing this course.");
            }
        }
        course.setStatus(request.status());
        courseRepository.save(course);
        return courseResponse(course);
    }

    // --- modules ------------------------------------------------------------

    @Transactional
    public ModuleAdminResponse createModule(UUID courseId, ModuleWriteRequest request) {
        Course course = requireCourse(courseId);
        assertModuleSourcePathAvailable(courseId, request.sourcePath());

        CourseModule module = new CourseModule();
        module.setCourseId(course.getId());
        module.setTitle(request.title());
        module.setSummary(trimToNull(request.summary()));
        module.setStatus(ContentStatus.DRAFT);
        module.setSourcePath(trimToNull(request.sourcePath()));
        module.setDisplayOrder(request.displayOrder() != null
                ? request.displayOrder()
                : moduleRepository.maxDisplayOrderForCourse(courseId) + 1);
        moduleRepository.save(module);
        return moduleResponse(module);
    }

    @Transactional
    public ModuleAdminResponse getModule(UUID id) {
        return moduleResponse(requireModule(id));
    }

    @Transactional
    public ModuleAdminResponse updateModule(UUID id, ModuleWriteRequest request) {
        CourseModule module = requireModule(id);
        assertModuleSourcePathAvailable(module.getCourseId(), request.sourcePath(), module.getId());
        module.setTitle(request.title());
        module.setSummary(trimToNull(request.summary()));
        module.setSourcePath(trimToNull(request.sourcePath()));
        if (request.displayOrder() != null) {
            module.setDisplayOrder(request.displayOrder());
        }
        moduleRepository.save(module);
        return moduleResponse(module);
    }

    @Transactional
    public ModuleAdminResponse changeModuleStatus(UUID id, StatusChangeRequest request) {
        CourseModule module = requireModule(id);
        if (request.status() == ContentStatus.PUBLISHED) {
            Course course = requireCourse(module.getCourseId());
            if (course.getStatus() != ContentStatus.PUBLISHED) {
                throw ApiException.conflict(
                        "Publish the owning course before publishing this module.");
            }
        }
        module.setStatus(request.status());
        moduleRepository.save(module);
        return moduleResponse(module);
    }

    // --- lessons ------------------------------------------------------------

    @Transactional
    public List<LessonAdminResponse> listLessons(UUID moduleId) {
        requireModule(moduleId);
        return lessonRepository.findByModuleIdOrderByDisplayOrderAsc(moduleId).stream()
                .map(LessonAdminResponse::of)
                .toList();
    }

    @Transactional
    public LessonDetailAdminResponse createLesson(UUID moduleId, LessonWriteRequest request) {
        requireModule(moduleId);
        if (lessonRepository.findByModuleIdAndSlug(moduleId, request.slug()).isPresent()) {
            throw ApiException.conflict("A lesson with this slug already exists in the module.");
        }
        Lesson lesson = new Lesson();
        lesson.setModuleId(moduleId);
        lesson.setSlug(request.slug());
        lesson.setTitle(request.title());
        lesson.setSummary(trimToNull(request.summary()));
        lesson.setBodyMarkdown(request.bodyMarkdown());
        lesson.setStatus(ContentStatus.DRAFT);
        lesson.setContentHash(Sha256.hex(request.bodyMarkdown()));
        lesson.setEditedByAdmin(true);
        lesson.setDisplayOrder(request.displayOrder() != null
                ? request.displayOrder()
                : lessonRepository.maxDisplayOrderForModule(moduleId) + 1);
        lessonRepository.save(lesson);
        return LessonDetailAdminResponse.of(lesson);
    }

    @Transactional
    public LessonDetailAdminResponse getLesson(UUID id) {
        return LessonDetailAdminResponse.of(requireLesson(id));
    }

    @Transactional
    public LessonDetailAdminResponse updateLesson(UUID id, LessonWriteRequest request) {
        Lesson lesson = requireLesson(id);
        if (!lesson.getSlug().equals(request.slug())
                && lessonRepository.findByModuleIdAndSlug(lesson.getModuleId(), request.slug()).isPresent()) {
            throw ApiException.conflict("A lesson with this slug already exists in the module.");
        }
        boolean changed = !Objects.equals(lesson.getSlug(), request.slug())
                || !Objects.equals(lesson.getTitle(), request.title())
                || !Objects.equals(lesson.getSummary(), trimToNull(request.summary()))
                || !Objects.equals(lesson.getBodyMarkdown(), request.bodyMarkdown());
        lesson.setSlug(request.slug());
        lesson.setTitle(request.title());
        lesson.setSummary(trimToNull(request.summary()));
        lesson.setBodyMarkdown(request.bodyMarkdown());
        lesson.setContentHash(Sha256.hex(request.bodyMarkdown()));
        if (changed) {
            // Any academy-side content change protects the lesson from silent
            // importer replacement: future source versions stage as conflicts.
            lesson.setEditedByAdmin(true);
        }
        lessonRepository.save(lesson);
        return LessonDetailAdminResponse.of(lesson);
    }

    @Transactional
    public LessonDetailAdminResponse changeLessonStatus(UUID id, StatusChangeRequest request) {
        Lesson lesson = requireLesson(id);
        if (request.status() == ContentStatus.PUBLISHED) {
            CourseModule module = requireModule(lesson.getModuleId());
            if (module.getStatus() != ContentStatus.PUBLISHED) {
                throw ApiException.conflict(
                        "Publish the owning module before publishing this lesson.");
            }
            if (lesson.getPublishedAt() == null) {
                lesson.setPublishedAt(Instant.now());
            }
        }
        lesson.setStatus(request.status());
        lessonRepository.save(lesson);
        return LessonDetailAdminResponse.of(lesson);
    }

    // --- helpers ------------------------------------------------------------

    private CourseAdminResponse courseResponse(Course course) {
        LearningPath path = requirePath(course.getLearningPathId());
        UUID id = course.getId();
        return CourseAdminResponse.of(
                course, path.getSlug(), path.getName(),
                moduleRepository.countByCourseId(id),
                lessonRepository.countByCourseId(id),
                courseRepository.countPublishedModules(id),
                courseRepository.countPublishedLessons(id));
    }

    private ModuleAdminResponse moduleResponse(CourseModule module) {
        UUID id = module.getId();
        return ModuleAdminResponse.of(
                module,
                lessonRepository.countByModuleId(id),
                lessonRepository.countByModuleIdAndStatus(id, ContentStatus.PUBLISHED));
    }

    private LearningPath requirePath(UUID id) {
        return pathRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Learning path not found."));
    }

    private Course requireCourse(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
    }

    private CourseModule requireModule(UUID id) {
        return moduleRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Module not found."));
    }

    private Lesson requireLesson(UUID id) {
        return lessonRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Lesson not found."));
    }

    private void assertSlugAvailable(String slug) {
        if (courseRepository.existsBySlug(slug)) {
            throw ApiException.conflict("A course with this slug already exists.");
        }
    }

    private void assertSourcePathAvailable(String sourcePath, UUID excludingCourseId) {
        String normalized = trimToNull(sourcePath);
        if (normalized == null) {
            return;
        }
        boolean taken = courseRepository.findBySourcePath(normalized)
                .map(existing -> excludingCourseId == null
                        || !existing.getId().equals(excludingCourseId))
                .orElse(false);
        if (taken) {
            throw ApiException.conflict(
                    "Another course already uses this source subject directory.");
        }
    }

    private void assertModuleSourcePathAvailable(UUID courseId, String sourcePath) {
        assertModuleSourcePathAvailable(courseId, sourcePath, null);
    }

    private void assertModuleSourcePathAvailable(UUID courseId, String sourcePath,
                                                 UUID excludingModuleId) {
        String normalized = trimToNull(sourcePath);
        if (normalized == null) {
            return;
        }
        boolean taken = moduleRepository.findByCourseIdAndSourcePath(courseId, normalized)
                .map(existing -> excludingModuleId == null
                        || !existing.getId().equals(excludingModuleId))
                .orElse(false);
        if (taken) {
            throw ApiException.conflict(
                    "Another module in this course already uses this source subject directory.");
        }
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
