package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.AssessmentQuestion;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for the questions inside one assessment. */
public interface AssessmentQuestionRepository extends JpaRepository<AssessmentQuestion, UUID> {

    List<AssessmentQuestion> findByAssessmentIdOrderByDisplayOrderAsc(UUID assessmentId);

    long countByAssessmentId(UUID assessmentId);

    /** Sum of all question points — the denominator of every score. */
    @Query("select coalesce(sum(q.points), 0) from AssessmentQuestion q where q.assessmentId = :assessmentId")
    int totalPointsForAssessment(@Param("assessmentId") UUID assessmentId);

    /** Question counts for a set of assessments (student assessment list). */
    @Query("""
            select q.assessmentId as assessmentId, count(q.id) as questionCount
            from AssessmentQuestion q
            where q.assessmentId in :assessmentIds
            group by q.assessmentId
            """)
    List<QuestionCount> countByAssessmentIdIn(@Param("assessmentIds") java.util.Collection<UUID> assessmentIds);

    /** Aggregate projection for {@link #countByAssessmentIdIn}. */
    interface QuestionCount {
        java.util.UUID getAssessmentId();

        Long getQuestionCount();
    }

    /** Replace-all authoring wipes the old question set in one statement. */
    @Modifying
    @Query("delete from AssessmentQuestion q where q.assessmentId = :assessmentId")
    void deleteAllForAssessment(@Param("assessmentId") UUID assessmentId);

    List<AssessmentQuestion> findByIdIn(Collection<UUID> ids);
}
