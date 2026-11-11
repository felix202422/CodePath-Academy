package com.codepath.academy.catalog.repository;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.LearningPath;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

/** Read access for learning paths; writes belong to the administration phase. */
public interface LearningPathRepository extends JpaRepository<LearningPath, UUID> {

    List<LearningPath> findByStatusOrderByDisplayOrderAsc(ContentStatus status);

    Optional<LearningPath> findBySlugAndStatus(String slug, ContentStatus status);

    long countByStatus(ContentStatus status);

    boolean existsBySlug(String slug);

    /** Next display order tail when an administrator creates a path. */
    @Query("SELECT COALESCE(MAX(p.displayOrder), 0) FROM LearningPath p")
    int maxDisplayOrder();
}
