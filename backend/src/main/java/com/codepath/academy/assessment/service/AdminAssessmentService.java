package com.codepath.academy.assessment.service;

import com.codepath.academy.assessment.api.dto.AssessmentAdminResponse;
import com.codepath.academy.assessment.api.dto.AssessmentDetailAdminResponse;
import com.codepath.academy.assessment.api.dto.AssessmentDetailAdminResponse.OptionAdminResponse;
import com.codepath.academy.assessment.api.dto.AssessmentDetailAdminResponse.QuestionAdminResponse;
import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest;
import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest.OptionWriteRequest;
import com.codepath.academy.assessment.api.dto.AssessmentWriteRequest.QuestionWriteRequest;
import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.AssessmentOption;
import com.codepath.academy.assessment.model.AssessmentQuestion;
import com.codepath.academy.assessment.model.QuestionType;
import com.codepath.academy.assessment.repository.AssessmentAttemptRepository;
import com.codepath.academy.assessment.repository.AssessmentOptionRepository;
import com.codepath.academy.assessment.repository.AssessmentQuestionRepository;
import com.codepath.academy.assessment.repository.AssessmentRepository;
import com.codepath.academy.catalog.api.dto.StatusChangeRequest;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.common.error.ApiException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrator authoring of assessments: metadata, the full question set
 * (replace-all), publication rules and deletion. Cascade rules mirror the
 * curriculum hierarchy — an assessment can only be published when its course
 * (and module, when set) is published and it has at least one valid question.
 * Once a student has attempted an assessment, its questions are locked.
 */
@Service
public class AdminAssessmentService {

    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository questionRepository;
    private final AssessmentOptionRepository optionRepository;
    private final AssessmentAttemptRepository attemptRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;

    public AdminAssessmentService(AssessmentRepository assessmentRepository,
                                  AssessmentQuestionRepository questionRepository,
                                  AssessmentOptionRepository optionRepository,
                                  AssessmentAttemptRepository attemptRepository,
                                  CourseRepository courseRepository,
                                  CourseModuleRepository moduleRepository) {
        this.assessmentRepository = assessmentRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.attemptRepository = attemptRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
    }

    @Transactional(readOnly = true)
    public List<AssessmentAdminResponse> listAssessments(UUID courseId) {
        requireCourse(courseId);
        List<Assessment> assessments =
                assessmentRepository.findByCourseIdOrderByDisplayOrderAsc(courseId);
        return assessments.stream()
                .map(assessment -> AssessmentAdminResponse.of(
                        assessment,
                        questionRepository.countByAssessmentId(assessment.getId()),
                        attemptRepository.countByAssessmentId(assessment.getId())))
                .toList();
    }

    @Transactional
    public AssessmentAdminResponse createAssessment(UUID courseId,
                                                    AssessmentWriteRequest request) {
        Course course = requireCourse(courseId);
        requireModuleForCourse(course, request.moduleId());
        // Validate the whole set before writing anything: a malformed question
        // set must never leave a half-created assessment behind.
        if (request.questions() != null) {
            validateQuestions(request.questions());
        }

        Assessment assessment = new Assessment();
        assessment.setCourseId(course.getId());
        assessment.setModuleId(request.moduleId());
        applyMetadata(assessment, request);
        assessment.setStatus(ContentStatus.DRAFT);
        assessment.setDisplayOrder(request.displayOrder() != null
                ? request.displayOrder()
                : assessmentRepository.maxDisplayOrderForCourse(courseId) + 1);
        assessmentRepository.save(assessment);

        if (request.questions() != null) {
            replaceQuestions(assessment, request.questions());
        }
        return AssessmentAdminResponse.of(assessment,
                questionRepository.countByAssessmentId(assessment.getId()), 0);
    }

    @Transactional(readOnly = true)
    public AssessmentDetailAdminResponse getAssessment(UUID id) {
        Assessment assessment = requireAssessment(id);
        return detailResponse(assessment);
    }

    @Transactional
    public AssessmentAdminResponse updateAssessment(UUID id, AssessmentWriteRequest request) {
        Assessment assessment = requireAssessment(id);
        requireModuleForCourse(requireCourse(assessment.getCourseId()), request.moduleId());

        if (request.questions() != null) {
            if (attemptRepository.countByAssessmentId(id) > 0) {
                throw ApiException.conflict(
                        "Students have attempted this assessment; its questions are locked.");
            }
            replaceQuestions(assessment, request.questions());
        }
        applyMetadata(assessment, request);
        if (request.displayOrder() != null) {
            assessment.setDisplayOrder(request.displayOrder());
        }
        assessment.setModuleId(request.moduleId());
        assessmentRepository.save(assessment);
        return AssessmentAdminResponse.of(assessment,
                questionRepository.countByAssessmentId(assessment.getId()),
                attemptRepository.countByAssessmentId(assessment.getId()));
    }

    @Transactional
    public AssessmentAdminResponse changeStatus(UUID id, StatusChangeRequest request) {
        Assessment assessment = requireAssessment(id);
        if (request.status() == ContentStatus.PUBLISHED) {
            Course course = requireCourse(assessment.getCourseId());
            if (course.getStatus() != ContentStatus.PUBLISHED) {
                throw ApiException.conflict(
                        "Publish the owning course before publishing this assessment.");
            }
            if (assessment.getModuleId() != null) {
                CourseModule module = moduleRepository.findById(assessment.getModuleId())
                        .filter(candidate -> candidate.getCourseId().equals(course.getId()))
                        .orElseThrow(() -> ApiException.notFound("Module not found."));
                if (module.getStatus() != ContentStatus.PUBLISHED) {
                    throw ApiException.conflict(
                            "Publish the owning module before publishing this assessment.");
                }
            }
            if (questionRepository.countByAssessmentId(id) == 0) {
                throw ApiException.conflict(
                        "Add at least one question before publishing this assessment.");
            }
        }
        assessment.setStatus(request.status());
        assessmentRepository.save(assessment);
        return AssessmentAdminResponse.of(assessment,
                questionRepository.countByAssessmentId(assessment.getId()),
                attemptRepository.countByAssessmentId(assessment.getId()));
    }

    /** Deleting cascades questions and options; attempts make it a conflict. */
    @Transactional
    public void deleteAssessment(UUID id) {
        Assessment assessment = requireAssessment(id);
        if (attemptRepository.countByAssessmentId(id) > 0) {
            throw ApiException.conflict(
                    "Students have attempted this assessment; archive it instead of deleting.");
        }
        questionRepository.deleteAllForAssessment(assessment.getId());
        assessmentRepository.delete(assessment);
    }

    // --- helpers -----------------------------------------------------------

    private AssessmentDetailAdminResponse detailResponse(Assessment assessment) {
        List<AssessmentQuestion> questions = questionRepository
                .findByAssessmentIdOrderByDisplayOrderAsc(assessment.getId());
        List<UUID> questionIds = questions.stream()
                .map(AssessmentQuestion::getId)
                .toList();
        Map<UUID, List<AssessmentOption>> optionsByQuestion = questionIds.isEmpty()
                ? Map.of()
                : optionRepository.findByQuestionIdInOrderByDisplayOrderAsc(questionIds).stream()
                        .collect(Collectors.groupingBy(AssessmentOption::getQuestionId));
        List<QuestionAdminResponse> questionResponses = questions.stream()
                .map(question -> QuestionAdminResponse.of(question,
                        optionsByQuestion.getOrDefault(question.getId(), List.of()).stream()
                                .map(option -> new OptionAdminResponse(
                                        option.getId(), option.getOptionText(),
                                        option.isCorrect(), option.getDisplayOrder()))
                                .toList()))
                .toList();
        return AssessmentDetailAdminResponse.of(assessment, questionResponses,
                questions.size(), attemptRepository.countByAssessmentId(assessment.getId()));
    }

    /**
     * Replace-all authoring: wipe the previous question set and insert the
     * submitted one in order. Structural rules per question type are enforced
     * here so a malformed set can never be stored or published.
     */
    private void replaceQuestions(Assessment assessment, List<QuestionWriteRequest> requests) {
        // Validate first, then wipe and rewrite — a late validation failure
        // must not destroy the previously stored question set.
        validateQuestions(requests);

        List<AssessmentQuestion> existing = questionRepository
                .findByAssessmentIdOrderByDisplayOrderAsc(assessment.getId());
        if (!existing.isEmpty()) {
            List<UUID> existingIds = existing.stream()
                    .map(AssessmentQuestion::getId)
                    .toList();
            optionRepository.deleteAll(
                    optionRepository.findByQuestionIdInOrderByDisplayOrderAsc(existingIds));
        }
        questionRepository.deleteAllForAssessment(assessment.getId());

        List<AssessmentQuestion> saved = new ArrayList<>();
        for (int index = 0; index < requests.size(); index++) {
            QuestionWriteRequest request = requests.get(index);
            AssessmentQuestion question = new AssessmentQuestion();
            question.setAssessmentId(assessment.getId());
            question.setQuestionType(request.questionType());
            question.setPrompt(request.prompt().trim());
            question.setExplanation(trimToNull(request.explanation()));
            question.setCorrectText(request.questionType() == QuestionType.SHORT_ANSWER
                    ? trimToNull(request.correctText()) : null);
            question.setPoints(request.points());
            question.setDisplayOrder(index);
            saved.add(questionRepository.save(question));
        }

        for (int index = 0; index < saved.size(); index++) {
            QuestionWriteRequest request = requests.get(index);
            AssessmentQuestion question = saved.get(index);
            List<OptionWriteRequest> options = request.options() == null
                    ? List.of() : request.options();
            for (int order = 0; order < options.size(); order++) {
                OptionWriteRequest option = options.get(order);
                AssessmentOption entity = new AssessmentOption();
                entity.setQuestionId(question.getId());
                entity.setOptionText(option.optionText().trim());
                entity.setCorrect(option.isCorrect());
                entity.setDisplayOrder(order);
                optionRepository.save(entity);
            }
        }
    }

    /** Validates an entire question set up front, naming each bad question. */
    private void validateQuestions(List<QuestionWriteRequest> requests) {
        for (int index = 0; index < requests.size(); index++) {
            validateQuestion(requests.get(index), index);
        }
    }

    /** Type-specific structure rules; messages name the question's position. */
    private void validateQuestion(QuestionWriteRequest request, int index) {
        String label = "Question " + (index + 1);
        List<OptionWriteRequest> options = request.options() == null
                ? List.of() : request.options();
        boolean anyCorrect = options.stream().anyMatch(OptionWriteRequest::isCorrect);
        long correctCount = options.stream().filter(OptionWriteRequest::isCorrect).count();

        switch (request.questionType()) {
            case MULTIPLE_CHOICE -> {
                if (options.size() < 2) {
                    throw ApiException.badRequest(
                            label + " needs at least two options.");
                }
                if (correctCount != 1) {
                    throw ApiException.badRequest(
                            label + " must have exactly one correct option.");
                }
            }
            case TRUE_FALSE -> {
                if (options.size() != 2) {
                    throw ApiException.badRequest(
                            label + " must have exactly two options (True and False).");
                }
                if (correctCount != 1) {
                    throw ApiException.badRequest(
                            label + " must mark exactly one option as correct.");
                }
            }
            case MULTI_ANSWER -> {
                if (options.size() < 2) {
                    throw ApiException.badRequest(
                            label + " needs at least two options.");
                }
                if (correctCount < 1) {
                    throw ApiException.badRequest(
                            label + " needs at least one correct option.");
                }
            }
            case SHORT_ANSWER -> {
                if (!options.isEmpty()) {
                    throw ApiException.badRequest(
                            label + " is a short-answer question; it takes an answer key"
                                    + " instead of options.");
                }
                if (trimToNull(request.correctText()) == null) {
                    throw ApiException.badRequest(
                            label + " needs an answer key.");
                }
            }
            default -> throw ApiException.badRequest(label + " has an unknown question type.");
        }
        if (request.questionType() != QuestionType.SHORT_ANSWER && !anyCorrect) {
            throw ApiException.badRequest(label + " needs at least one correct option.");
        }
    }

    private void applyMetadata(Assessment assessment, AssessmentWriteRequest request) {
        assessment.setTitle(request.title().trim());
        assessment.setDescription(trimToNull(request.description()));
        if (request.passScorePercent() != null) {
            assessment.setPassScorePercent(request.passScorePercent());
        }
        if (request.maxAttempts() != null) {
            assessment.setMaxAttempts(request.maxAttempts());
        }
        assessment.setTimeLimitMinutes(request.timeLimitMinutes());
    }

    private Course requireCourse(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
    }

    private void requireModuleForCourse(Course course, UUID moduleId) {
        if (moduleId == null) {
            return;
        }
        moduleRepository.findById(moduleId)
                .filter(module -> module.getCourseId().equals(course.getId()))
                .orElseThrow(() -> ApiException.notFound("Module not found."));
    }

    private Assessment requireAssessment(UUID id) {
        return assessmentRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Assessment not found."));
    }

    private static String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
