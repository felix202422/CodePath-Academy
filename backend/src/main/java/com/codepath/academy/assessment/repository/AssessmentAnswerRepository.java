package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.AssessmentAnswer;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence for graded answers inside one attempt. */
public interface AssessmentAnswerRepository extends JpaRepository<AssessmentAnswer, UUID> {

    List<AssessmentAnswer> findByAttemptId(UUID attemptId);

    List<AssessmentAnswer> findByAttemptIdIn(Collection<UUID> attemptIds);

    long countByAttemptId(UUID attemptId);
}
