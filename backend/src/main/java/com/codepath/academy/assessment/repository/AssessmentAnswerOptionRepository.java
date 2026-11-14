package com.codepath.academy.assessment.repository;

import com.codepath.academy.assessment.model.AssessmentAnswerOption;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

/** Persistence for the option links of graded answers. */
public interface AssessmentAnswerOptionRepository extends JpaRepository<AssessmentAnswerOption, AssessmentAnswerOption.Key> {

    List<AssessmentAnswerOption> findByAnswerIdIn(Collection<java.util.UUID> answerIds);
}
