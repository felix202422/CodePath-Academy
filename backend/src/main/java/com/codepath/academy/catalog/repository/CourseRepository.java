package com.codepath.academy.catalog.repository;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Read access for catalog courses; writes belong to the administration phase. */
public interface CourseRepository extends JpaRepository<Course, UUID> {

    List<Course> findByStatusOrderByDisplayOrderAsc(ContentStatus status);

    Optional<Course> findBySlugAndStatus(String slug, ContentStatus status);

    long countByStatus(ContentStatus status);

    List<Course> findByLearningPathIdAndStatusOrderByDisplayOrderAsc(UUID learningPathId,
                                                                     ContentStatus status);

    List<Course> findTop4ByStatusOrderByDisplayOrderAsc(ContentStatus status);

    /** All courses of a path regardless of status (administrator views). */
    List<Course> findByLearningPathIdOrderByDisplayOrderAsc(UUID learningPathId);

    boolean existsBySlug(String slug);

    Optional<Course> findBySourcePath(String sourcePath);

    long countByLearningPathId(UUID learningPathId);

    /** Next display order tail for courses inside one path. */
    @Query("SELECT COALESCE(MAX(c.displayOrder), 0) FROM Course c WHERE c.learningPathId = :pathId")
    int maxDisplayOrderForPath(@Param("pathId") UUID pathId);

    /**
     * Prerequisites of one course in the order the audited source lists them.
     * Native because course_prerequisite is a join table without its own
     * managed entity yet; unpublished prerequisites are filtered out.
     */
    @Query(value = """
            SELECT c.* FROM course c
            JOIN course_prerequisite cp ON cp.prerequisite_id = c.id
            WHERE cp.course_id = :courseId AND c.status = :status
            ORDER BY cp.display_order
            """, nativeQuery = true)
    List<Course> findPrerequisites(@Param("courseId") UUID courseId, @Param("status") String status);

    /** Published course counts grouped by owning path (for the overview). */
    @Query("SELECT c.learningPathId AS learningPathId, COUNT(c) AS total "
            + "FROM Course c WHERE c.status = :status GROUP BY c.learningPathId")
    List<PathCourseCount> countByPath(@Param("status") ContentStatus status);

    /** Published module count for one course. */
    @Query(value = """
            SELECT COUNT(*) FROM course_module m
            WHERE m.course_id = :courseId AND m.status = 'PUBLISHED'
            """, nativeQuery = true)
    long countPublishedModules(@Param("courseId") UUID courseId);

    /** Published lesson count for one course (across all of its modules). */
    @Query(value = """
            SELECT COUNT(*) FROM lesson l
            JOIN course_module m ON m.id = l.module_id
            WHERE m.course_id = :courseId AND m.status = 'PUBLISHED' AND l.status = 'PUBLISHED'
            """, nativeQuery = true)
    long countPublishedLessons(@Param("courseId") UUID courseId);

    /** Aggregate projection of {@link #countByPath}. */
    interface PathCourseCount {
        UUID getLearningPathId();

        Long getTotal();
    }
}
