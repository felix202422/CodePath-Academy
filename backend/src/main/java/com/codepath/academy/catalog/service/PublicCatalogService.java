package com.codepath.academy.catalog.service;

import com.codepath.academy.catalog.api.dto.CourseDetailResponse;
import com.codepath.academy.catalog.api.dto.CourseSummaryResponse;
import com.codepath.academy.catalog.api.dto.OverviewResponse;
import com.codepath.academy.catalog.api.dto.PathDetailResponse;
import com.codepath.academy.catalog.api.dto.PathSummaryResponse;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.LearningPath;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.common.error.ApiException;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Public catalog read model. Every query is filtered to {@link
 * ContentStatus#PUBLISHED}: drafts and archived rows are never exposed, and a
 * published course whose owning path is not published stays hidden too. Only
 * PUBLISHED content exists in this phase, but the filters keep future draft
 * content invisible by default.
 */
@Service
public class PublicCatalogService {

    private final LearningPathRepository pathRepository;
    private final CourseRepository courseRepository;

    public PublicCatalogService(LearningPathRepository pathRepository,
                                CourseRepository courseRepository) {
        this.pathRepository = pathRepository;
        this.courseRepository = courseRepository;
    }

    @Transactional(readOnly = true)
    public OverviewResponse getOverview() {
        Map<UUID, LearningPath> publishedPaths = publishedPathIndex();
        Map<UUID, Long> counts = courseCountsByPath();

        List<PathSummaryResponse> paths = publishedPaths.values().stream()
                .sorted(Comparator.comparingInt(LearningPath::getDisplayOrder))
                .map(path -> toPathSummary(path, counts))
                .toList();

        List<CourseSummaryResponse> startHere =
                courseRepository.findTop4ByStatusOrderByDisplayOrderAsc(ContentStatus.PUBLISHED)
                        .stream()
                        .map(course -> toCourseSummary(course, publishedPaths))
                        .filter(Objects::nonNull)
                        .toList();

        int courseCount = Math.toIntExact(courseRepository.countByStatus(ContentStatus.PUBLISHED));
        return new OverviewResponse(paths.size(), courseCount, paths, startHere);
    }

    @Transactional(readOnly = true)
    public List<PathSummaryResponse> listPaths() {
        Map<UUID, Long> counts = courseCountsByPath();
        return pathRepository.findByStatusOrderByDisplayOrderAsc(ContentStatus.PUBLISHED).stream()
                .map(path -> toPathSummary(path, counts))
                .toList();
    }

    @Transactional(readOnly = true)
    public PathDetailResponse getPath(String slug) {
        LearningPath path = pathRepository.findBySlugAndStatus(slug, ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Learning path not found."));
        List<CourseSummaryResponse> courses =
                courseRepository.findByLearningPathIdAndStatusOrderByDisplayOrderAsc(
                                path.getId(), ContentStatus.PUBLISHED)
                        .stream()
                        .map(course -> toCourseSummary(course, Map.of(path.getId(), path)))
                        .filter(Objects::nonNull)
                        .toList();
        return new PathDetailResponse(
                path.getId(), path.getSlug(), path.getName(), path.getSummary(),
                path.getDescription(), path.getAccentColor(), courses);
    }

    @Transactional(readOnly = true)
    public List<CourseSummaryResponse> listCourses() {
        Map<UUID, LearningPath> publishedPaths = publishedPathIndex();
        return courseRepository.findByStatusOrderByDisplayOrderAsc(ContentStatus.PUBLISHED).stream()
                .map(course -> toCourseSummary(course, publishedPaths))
                .filter(Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public CourseDetailResponse getCourse(String slug) {
        Course course = courseRepository.findBySlugAndStatus(slug, ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
        // A course is only reachable through a published owning path.
        LearningPath path = pathRepository.findById(course.getLearningPathId())
                .filter(existing -> existing.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Course not found."));

        Map<UUID, LearningPath> publishedPaths = publishedPathIndex();
        List<CourseSummaryResponse> prerequisites =
                courseRepository.findPrerequisites(course.getId(), ContentStatus.PUBLISHED.name())
                        .stream()
                        .map(prereq -> toCourseSummary(prereq, publishedPaths))
                        .filter(Objects::nonNull)
                        .toList();

        return new CourseDetailResponse(
                course.getId(), course.getSlug(), course.getTitle(), course.getSummary(),
                course.getDescription(), course.getLevel(), path.getSlug(), path.getName(),
                course.getSourceRepository(),
                courseRepository.countPublishedModules(course.getId()),
                courseRepository.countPublishedLessons(course.getId()),
                prerequisites);
    }

    private Map<UUID, LearningPath> publishedPathIndex() {
        return pathRepository.findByStatusOrderByDisplayOrderAsc(ContentStatus.PUBLISHED).stream()
                .collect(Collectors.toMap(LearningPath::getId, Function.identity()));
    }

    private Map<UUID, Long> courseCountsByPath() {
        return courseRepository.countByPath(ContentStatus.PUBLISHED).stream()
                .collect(Collectors.toMap(
                        CourseRepository.PathCourseCount::getLearningPathId,
                        CourseRepository.PathCourseCount::getTotal));
    }

    private PathSummaryResponse toPathSummary(LearningPath path, Map<UUID, Long> counts) {
        int courseCount = counts.getOrDefault(path.getId(), 0L).intValue();
        return new PathSummaryResponse(
                path.getId(), path.getSlug(), path.getName(), path.getSummary(),
                path.getAccentColor(), courseCount);
    }

    /** Null when the course's owning path is not published — such rows stay hidden. */
    private CourseSummaryResponse toCourseSummary(Course course, Map<UUID, LearningPath> paths) {
        LearningPath path = paths.get(course.getLearningPathId());
        if (path == null) {
            return null;
        }
        return new CourseSummaryResponse(
                course.getId(), course.getSlug(), course.getTitle(), course.getSummary(),
                course.getLevel(), path.getSlug(), path.getName());
    }
}
