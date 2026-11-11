package com.codepath.academy.catalog.repository;

import com.codepath.academy.catalog.model.LessonResource;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Read/write access for lesson resources (importer writes). */
public interface LessonResourceRepository extends JpaRepository<LessonResource, UUID> {

    List<LessonResource> findByLessonIdOrderByCreatedAtAsc(UUID lessonId);

    /** Idempotency guard: the same media location is recorded once per lesson. */
    Optional<LessonResource> findByLessonIdAndLocation(UUID lessonId, String location);
}
