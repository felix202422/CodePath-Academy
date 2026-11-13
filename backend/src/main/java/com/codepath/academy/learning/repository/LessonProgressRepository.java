package com.codepath.academy.learning.repository;

import com.codepath.academy.learning.model.LessonProgress;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence queries for a student's lesson progress. */
public interface LessonProgressRepository extends JpaRepository<LessonProgress, UUID> {

    Optional<LessonProgress> findByStudentIdAndLessonId(UUID studentId, UUID lessonId);

    List<LessonProgress> findByStudentIdAndLessonIdIn(UUID studentId,
                                                       Collection<UUID> lessonIds);
}
