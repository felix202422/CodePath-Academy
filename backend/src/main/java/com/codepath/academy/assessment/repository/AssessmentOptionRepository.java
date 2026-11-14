package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.AssessmentOption;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence for the answer options of assessment questions. */
public interface AssessmentOptionRepository extends JpaRepository<AssessmentOption, UUID> {

    List<AssessmentOption> findByQuestionIdOrderByDisplayOrderAsc(UUID questionId);

    List<AssessmentOption> findByQuestionIdInOrderByDisplayOrderAsc(Collection<UUID> questionIds);

    long countByQuestionId(UUID questionId);
}
