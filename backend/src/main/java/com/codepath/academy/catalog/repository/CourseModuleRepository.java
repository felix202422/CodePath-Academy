package com.codepath.academy.catalog.repository;

import com.codepath.academy.catalog.model.CourseModule;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Read/write access for course modules (administrator + importer writes). */
public interface CourseModuleRepository extends JpaRepository<CourseModule, UUID> {

    List<CourseModule> findByCourseIdOrderByDisplayOrderAsc(UUID courseId);

    Optional<CourseModule> findByIdAndCourseId(UUID id, UUID courseId);

    /** Importer lookup: the module created for a course's mapped subject directory. */
    Optional<CourseModule> findByCourseIdAndSourcePath(UUID courseId, String sourcePath);

    long countByCourseId(UUID courseId);

    @Query("SELECT COALESCE(MAX(m.displayOrder), 0) FROM CourseModule m WHERE m.courseId = :courseId")
    int maxDisplayOrderForCourse(@Param("courseId") UUID courseId);
}
