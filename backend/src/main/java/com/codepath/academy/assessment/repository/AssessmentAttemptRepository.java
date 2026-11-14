package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.AssessmentAttempt;
import com.codepath.academy.assessment.model.AttemptStatus;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for per-student assessment attempts. */
public interface AssessmentAttemptRepository extends JpaRepository<AssessmentAttempt, UUID> {

    List<AssessmentAttempt> findByAssessmentIdAndStudentIdOrderByAttemptNumberAsc(
            UUID assessmentId, UUID studentId);

    /** All of one student's attempts across a set of assessments (list view). */
    List<AssessmentAttempt> findByAssessmentIdInAndStudentId(
            java.util.Collection<UUID> assessmentIds, UUID studentId);

    Optional<AssessmentAttempt> findByAssessmentIdAndStudentIdAndStatus(
            UUID assessmentId, UUID studentId, AttemptStatus status);

    /** Highest attempt number so far — the next attempt is numbered from it. */
    @Query("select coalesce(max(a.attemptNumber), 0) from AssessmentAttempt a "
            + "where a.assessmentId = :assessmentId and a.studentId = :studentId")
    int maxAttemptNumber(@Param("assessmentId") UUID assessmentId,
                         @Param("studentId") UUID studentId);

    long countByAssessmentIdAndStudentId(UUID assessmentId, UUID studentId);

    long countByAssessmentId(UUID assessmentId);

    /** Submitted-attempt counts for a whole course (administrator overview). */
    @Query("""
            select a.assessmentId as assessmentId, count(a.id) as attemptCount
            from AssessmentAttempt a
            where a.assessmentId in :assessmentIds and a.status = :status
            group by a.assessmentId
            """)
    List<AttemptCount> countSubmittedByAssessment(
            @Param("assessmentIds") Collection<UUID> assessmentIds,
            @Param("status") AttemptStatus status);

    /** Aggregate projection for {@link #countSubmittedByAssessment}. */
    interface AttemptCount {
        UUID getAssessmentId();

        Long getAttemptCount();
    }
}
