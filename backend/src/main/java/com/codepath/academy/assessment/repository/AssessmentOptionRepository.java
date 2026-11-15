package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.AssessmentOption;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for the answer options of assessment questions. */
public interface AssessmentOptionRepository extends JpaRepository<AssessmentOption, UUID> {

    List<AssessmentOption> findByQuestionIdOrderByDisplayOrderAsc(UUID questionId);

    List<AssessmentOption> findByQuestionIdInOrderByDisplayOrderAsc(Collection<UUID> questionIds);

    long countByQuestionId(UUID questionId);

    /**
     * Replace-all authoring wipes options in one statement. Entity-level
     * deletes here would race the schema's ON DELETE CASCADE when the
     * questions go next, leaving queued deletes against already-gone rows.
     */
    @Modifying
    @Query("""
            delete from AssessmentOption o
            where o.questionId in
                  (select q.id from AssessmentQuestion q where q.assessmentId = :assessmentId)
            """)
    void deleteAllForAssessment(@Param("assessmentId") UUID assessmentId);
}
