package com.codepath.academy.catalog.repository;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Lesson;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Read/write access for lessons (administrator + importer writes). */
public interface LessonRepository extends JpaRepository<Lesson, UUID> {

    List<Lesson> findByModuleIdOrderByDisplayOrderAsc(UUID moduleId);

    List<Lesson> findByModuleIdAndStatusOrderByDisplayOrderAsc(UUID moduleId,
                                                               ContentStatus status);

    Optional<Lesson> findByIdAndStatus(UUID id, ContentStatus status);

    /** Published lessons ordered by course module, then by lesson display order. */
    @Query("""
            select lesson from Lesson lesson, CourseModule module
            where lesson.moduleId = module.id
              and module.courseId = :courseId
              and module.status = :status
              and lesson.status = :status
            order by module.displayOrder asc, lesson.displayOrder asc
            """)
    List<Lesson> findByCourseIdAndStatusInPublishedModules(@Param("courseId") UUID courseId,
                                                           @Param("status") ContentStatus status);

    Optional<Lesson> findByModuleIdAndSlug(UUID moduleId, String slug);

    /** Importer lookup: the lesson row holding this exact source file. */
    Optional<Lesson> findBySourceRepositoryAndSourcePath(String sourceRepository, String sourcePath);

    long countByModuleId(UUID moduleId);

    long countByModuleIdAndStatus(UUID moduleId, ContentStatus status);

    @Query("SELECT COALESCE(MAX(l.displayOrder), 0) FROM Lesson l WHERE l.moduleId = :moduleId")
    int maxDisplayOrderForModule(@Param("moduleId") UUID moduleId);

    /** Total lesson count for one course, regardless of status (admin views). */
    @Query("SELECT COUNT(l) FROM Lesson l, CourseModule m "
            + "WHERE l.moduleId = m.id AND m.courseId = :courseId")
    long countByCourseId(@Param("courseId") UUID courseId);
}
