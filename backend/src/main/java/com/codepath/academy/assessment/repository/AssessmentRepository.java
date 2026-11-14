package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.catalog.model.ContentStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for course assessments and their publication state. */
public interface AssessmentRepository extends JpaRepository<Assessment, UUID> {

    List<Assessment> findByCourseIdOrderByDisplayOrderAsc(UUID courseId);

    List<Assessment> findByCourseIdAndStatusOrderByDisplayOrderAsc(UUID courseId, ContentStatus status);

    Optional<Assessment> findByIdAndStatus(UUID id, ContentStatus status);

    long countByCourseId(UUID courseId);

    long countByCourseIdAndStatus(UUID courseId, ContentStatus status);

    /** Highest existing display order so a new assessment lands at the end. */
    @Query("select coalesce(max(a.displayOrder), 0) from Assessment a where a.courseId = :courseId")
    int maxDisplayOrderForCourse(@Param("courseId") UUID courseId);

    /** Published assessments inside a set of courses (student assessment list). */
    @Query("""
            select a from Assessment a
            where a.courseId in :courseIds
              and a.status = :status
            order by a.displayOrder asc, a.createdAt asc
            """)
    List<Assessment> findPublishedInCourses(@Param("courseIds") List<UUID> courseIds,
                                            @Param("status") ContentStatus status);
}
