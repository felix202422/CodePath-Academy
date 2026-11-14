package com.codepath.academy.assessment.service;

import com.codepath.academy.assessment.api.dto.AttemptResultResponse;
import com.codepath.academy.assessment.api.dto.StudentAssessmentAttemptResponse;
import com.codepath.academy.assessment.api.dto.StudentAssessmentListResponse;
import com.codepath.academy.assessment.api.dto.SubmitAttemptRequest;
import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.AssessmentAnswer;
import com.codepath.academy.assessment.model.AssessmentAnswerOption;
import com.codepath.academy.assessment.model.AssessmentAttempt;
import com.codepath.academy.assessment.model.AssessmentOption;
import com.codepath.academy.assessment.model.AssessmentQuestion;
import com.codepath.academy.assessment.model.AttemptStatus;
import com.codepath.academy.assessment.model.QuestionType;
import com.codepath.academy.assessment.repository.AssessmentAnswerOptionRepository;
import com.codepath.academy.assessment.repository.AssessmentAnswerRepository;
import com.codepath.academy.assessment.repository.AssessmentAttemptRepository;
import com.codepath.academy.assessment.repository.AssessmentOptionRepository;
import com.codepath.academy.assessment.repository.AssessmentQuestionRepository;
import com.codepath.academy.assessment.repository.AssessmentRepository;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.repository.CourseEnrollmentRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Student assessment reads, attempt lifecycle and server-side grading.
 *
 * <p>Access mirrors Phase 7 learning: only PUBLISHED assessments inside a
 * PUBLISHED course the student has an APPROVED enrollment for, with the same
 * module-level publication rule. Questions are returned without answers or
 * keys; every score, correctness flag and pass decision is computed here from
 * the stored answer key — never from the client.
 */
@Service
public class AssessmentService {

    /** Submission grace past the time limit to absorb network latency. */
    private static final Duration SUBMISSION_GRACE = Duration.ofSeconds(30);

    private final AssessmentRepository assessmentRepository;
    private final AssessmentQuestionRepository questionRepository;
    private final AssessmentOptionRepository optionRepository;
    private final AssessmentAttemptRepository attemptRepository;
    private final AssessmentAnswerRepository answerRepository;
    private final AssessmentAnswerOptionRepository answerOptionRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final AppUserRepository userRepository;

    public AssessmentService(AssessmentRepository assessmentRepository,
                            AssessmentQuestionRepository questionRepository,
                            AssessmentOptionRepository optionRepository,
                            AssessmentAttemptRepository attemptRepository,
                            AssessmentAnswerRepository answerRepository,
                            AssessmentAnswerOptionRepository answerOptionRepository,
                            CourseRepository courseRepository,
                            CourseModuleRepository moduleRepository,
                            CourseEnrollmentRepository enrollmentRepository,
                            AppUserRepository userRepository) {
        this.assessmentRepository = assessmentRepository;
        this.questionRepository = questionRepository;
        this.optionRepository = optionRepository;
        this.attemptRepository = attemptRepository;
        this.answerRepository = answerRepository;
        this.answerOptionRepository = answerOptionRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
    }

    /** Published assessments across the student's approved courses, with attempt history. */
    @Transactional(readOnly = true)
    public List<StudentAssessmentListResponse> listAssessments(String studentEmail) {
        AppUser student = requireActiveStudent(studentEmail);
        List<CourseEnrollment> enrollments = enrollmentRepository
                .findTop100ByStudent_IdAndStatusOrderByRequestedAtDesc(
                        student.getId(), EnrollmentStatus.APPROVED);
        List<UUID> courseIds = enrollments.stream()
                .map(enrollment -> enrollment.getCourse())
                .filter(course -> course.getStatus() == ContentStatus.PUBLISHED)
                .map(Course::getId)
                .toList();
        if (courseIds.isEmpty()) {
            return List.of();
        }
        return visibleAssessments(student, courseIds);
    }

    /** One assessment's taking view: metadata, this attempt and key-free questions. */
    @Transactional
    public StudentAssessmentAttemptResponse startOrResumeAttempt(String studentEmail,
                                                                 UUID assessmentId) {
        AppUser student = requireActiveStudent(studentEmail);
        Assessment assessment = requireVisibleAssessment(student, assessmentId);

        AssessmentAttempt attempt = attemptRepository
                .findByAssessmentIdAndStudentIdAndStatus(
                        assessmentId, student.getId(), AttemptStatus.IN_PROGRESS)
                .orElse(null);
        if (attempt == null) {
            int used = Math.toIntExact(attemptRepository
                    .countByAssessmentIdAndStudentId(assessmentId, student.getId()));
            if (used >= assessment.getMaxAttempts()) {
                throw ApiException.conflict(
                        "You have used all " + assessment.getMaxAttempts()
                                + " attempt(s) for this assessment.");
            }
            attempt = new AssessmentAttempt();
            attempt.setAssessmentId(assessmentId);
            attempt.setStudentId(student.getId());
            attempt.setAttemptNumber(attemptRepository
                    .maxAttemptNumber(assessmentId, student.getId()) + 1);
            attempt.setStatus(AttemptStatus.IN_PROGRESS);
            attempt.setStartedAt(Instant.now());
            attemptRepository.save(attempt);
        }
        return takingView(assessment, attempt);
    }

    /**
     * Grades one submitted attempt on the server: validates every answer id
     * against the stored questions, applies the per-type grading rule, awards
     * points, decides pass/fail against the pass score, and persists the
     * outcome. Re-submitting a graded attempt is a conflict.
     */
    @Transactional
    public AttemptResultResponse submitAttempt(String studentEmail, UUID attemptId,
                                               SubmitAttemptRequest request) {
        AppUser student = requireActiveStudent(studentEmail);
        AssessmentAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("Attempt not found."));
        if (!attempt.getStudentId().equals(student.getId())) {
            throw ApiException.notFound("Attempt not found.");
        }
        if (attempt.getStatus() != AttemptStatus.IN_PROGRESS) {
            throw ApiException.conflict("This attempt has already been submitted.");
        }
        Assessment assessment = assessmentRepository.findById(attempt.getAssessmentId())
                .orElseThrow(() -> ApiException.notFound("Assessment not found."));

        boolean timeExpired = isTimeExpired(assessment, attempt, Instant.now());
        List<AssessmentQuestion> questions = questionRepository
                .findByAssessmentIdOrderByDisplayOrderAsc(assessment.getId());
        Map<UUID, AssessmentQuestion> questionsById = questions.stream()
                .collect(Collectors.toMap(AssessmentQuestion::getId, Function.identity()));
        List<AssessmentOption> options = questions.isEmpty() ? List.of()
                : optionRepository.findByQuestionIdInOrderByDisplayOrderAsc(
                        questionsById.keySet());

        Map<UUID, List<UUID>> selectedByQuestion = validateAndIndexAnswers(
                request, questionsById, options);

        List<AssessmentAnswer> answers = new ArrayList<>();
        List<AssessmentAnswerOption> links = new ArrayList<>();
        for (AssessmentQuestion question : questions) {
            List<UUID> selected = selectedByQuestion.getOrDefault(question.getId(), List.of());
            String text = answerTextFor(request, question.getId());
            GradingOutcome outcome = grade(question, options, selected, text, timeExpired);

            AssessmentAnswer answer = new AssessmentAnswer();
            answer.setAttemptId(attempt.getId());
            answer.setQuestionId(question.getId());
            answer.setAnswerText(outcome.answerText());
            answer.setCorrect(outcome.correct());
            answer.setPointsAwarded(outcome.pointsAwarded());
            answerRepository.save(answer);
            answers.add(answer);
            for (UUID optionId : selected) {
                links.add(new AssessmentAnswerOption(answer.getId(), optionId));
            }
        }
        answerOptionRepository.saveAll(links);

        int maxScore = questions.stream().mapToInt(AssessmentQuestion::getPoints).sum();
        int score = answers.stream().mapToInt(AssessmentAnswer::getPointsAwarded).sum();
        attempt.setStatus(AttemptStatus.SUBMITTED);
        attempt.setSubmittedAt(Instant.now());
        attempt.setScore(score);
        attempt.setMaxScore(maxScore);
        attempt.setPassed(maxScore > 0
                && score * 100 >= assessment.getPassScorePercent() * maxScore);
        attemptRepository.save(attempt);

        return AttemptResultResponse.of(assessment, attempt, questions, options,
                answers, answerOptionRepository.findByAnswerIdIn(
                        answers.stream().map(AssessmentAnswer::getId).toList()),
                timeExpired);
    }

    /** Graded results for one of the student's own submitted attempts. */
    @Transactional(readOnly = true)
    public AttemptResultResponse attemptResult(String studentEmail, UUID attemptId) {
        AppUser student = requireActiveStudent(studentEmail);
        AssessmentAttempt attempt = attemptRepository.findById(attemptId)
                .orElseThrow(() -> ApiException.notFound("Attempt not found."));
        if (!attempt.getStudentId().equals(student.getId())) {
            throw ApiException.notFound("Attempt not found.");
        }
        if (attempt.getStatus() != AttemptStatus.SUBMITTED) {
            throw ApiException.conflict("This attempt has not been submitted yet.");
        }
        Assessment assessment = assessmentRepository.findById(attempt.getAssessmentId())
                .orElseThrow(() -> ApiException.notFound("Assessment not found."));
        List<AssessmentQuestion> questions = questionRepository
                .findByAssessmentIdOrderByDisplayOrderAsc(assessment.getId());
        List<AssessmentOption> options = questions.isEmpty() ? List.of()
                : optionRepository.findByQuestionIdInOrderByDisplayOrderAsc(
                        questions.stream().map(AssessmentQuestion::getId).toList());
        List<AssessmentAnswer> answers = answerRepository.findByAttemptId(attemptId);
        List<AssessmentAnswerOption> links = answerOptionRepository.findByAnswerIdIn(
                answers.stream().map(AssessmentAnswer::getId).toList());
        boolean timeExpired = isTimeExpired(assessment, attempt,
                attempt.getSubmittedAt() == null ? Instant.now() : attempt.getSubmittedAt());
        return AttemptResultResponse.of(assessment, attempt, questions, options,
                answers, links, timeExpired);
    }

    // --- grading -----------------------------------------------------------

    private record GradingOutcome(String answerText, Boolean correct, int pointsAwarded) {
    }

    /**
     * Per-type grading rules: choice questions compare the selected option
     * set against the stored correct set, multi-answer requires an exact set
     * match, and short answers compare normalized text against the answer
     * key. An expired attempt records the submission but awards nothing.
     */
    private GradingOutcome grade(AssessmentQuestion question, List<AssessmentOption> options,
                                 List<UUID> selected, String answerText, boolean timeExpired) {
        String text = question.getQuestionType() == QuestionType.SHORT_ANSWER
                ? answerText : null;
        if (timeExpired) {
            return new GradingOutcome(text, false, 0);
        }
        Set<UUID> correctIds = options.stream()
                .filter(option -> option.getQuestionId().equals(question.getId()))
                .filter(AssessmentOption::isCorrect)
                .map(AssessmentOption::getId)
                .collect(Collectors.toSet());

        boolean correct = switch (question.getQuestionType()) {
            case MULTIPLE_CHOICE, TRUE_FALSE -> selected.size() == 1
                    && correctIds.contains(selected.get(0));
            case MULTI_ANSWER -> !selected.isEmpty()
                    && new HashSet<>(selected).equals(correctIds);
            case SHORT_ANSWER -> matchesKey(question.getCorrectText(), answerText);
        };
        return new GradingOutcome(text, correct,
                correct ? question.getPoints() : 0);
    }

    /** Case- and whitespace-insensitive match against the short-answer key. */
    private boolean matchesKey(String key, String answerText) {
        if (key == null || answerText == null) {
            return false;
        }
        return normalize(key).equals(normalize(answerText));
    }

    private static String normalize(String value) {
        return value.trim().replaceAll("\\s+", " ").toLowerCase(Locale.ROOT);
    }

    /**
     * Rejects answers that reference questions or options outside this
     * assessment (400) and returns the selected option ids indexed by
     * question. Choice questions ignore free text; short answers ignore
     * option ids.
     */
    private Map<UUID, List<UUID>> validateAndIndexAnswers(
            SubmitAttemptRequest request, Map<UUID, AssessmentQuestion> questionsById,
            List<AssessmentOption> options) {
        Map<UUID, Set<UUID>> optionIdsByQuestion = options.stream()
                .collect(Collectors.groupingBy(AssessmentOption::getQuestionId,
                        Collectors.mapping(AssessmentOption::getId, Collectors.toSet())));

        Map<UUID, List<UUID>> selected = new java.util.HashMap<>();
        Set<UUID> seenQuestions = new HashSet<>();
        for (SubmitAttemptRequest.AnswerSubmission submission : request.answers()) {
            AssessmentQuestion question = questionsById.get(submission.questionId());
            if (question == null) {
                throw ApiException.badRequest("One or more answers reference an unknown question.");
            }
            if (!seenQuestions.add(submission.questionId())) {
                throw ApiException.badRequest("Each question may be answered only once.");
            }
            List<UUID> optionIds = submission.optionIds() == null
                    ? List.of() : submission.optionIds();
            if (question.getQuestionType() != QuestionType.SHORT_ANSWER) {
                Set<UUID> allowed = optionIdsByQuestion.getOrDefault(
                        question.getId(), Set.of());
                for (UUID optionId : optionIds) {
                    if (!allowed.contains(optionId)) {
                        throw ApiException.badRequest(
                                "One or more answers reference an unknown option.");
                    }
                }
            } else {
                optionIds = List.of();
            }
            selected.put(submission.questionId(), List.copyOf(optionIds));
        }
        return selected;
    }

    private String answerTextFor(SubmitAttemptRequest request, UUID questionId) {
        return request.answers().stream()
                .filter(submission -> submission.questionId().equals(questionId))
                .map(SubmitAttemptRequest.AnswerSubmission::answerText)
                .findFirst()
                .orElse(null);
    }

    private boolean isTimeExpired(Assessment assessment, AssessmentAttempt attempt,
                                  Instant now) {
        if (assessment.getTimeLimitMinutes() == null) {
            return false;
        }
        Instant deadline = attempt.getStartedAt()
                .plus(Duration.ofMinutes(assessment.getTimeLimitMinutes()))
                .plus(SUBMISSION_GRACE);
        return now.isAfter(deadline);
    }

    // --- access ------------------------------------------------------------

    private StudentAssessmentAttemptResponse takingView(Assessment assessment,
                                                        AssessmentAttempt attempt) {
        List<AssessmentQuestion> questions = questionRepository
                .findByAssessmentIdOrderByDisplayOrderAsc(assessment.getId());
        List<AssessmentOption> options = questions.isEmpty() ? List.of()
                : optionRepository.findByQuestionIdInOrderByDisplayOrderAsc(
                        questions.stream().map(AssessmentQuestion::getId).toList());
        return StudentAssessmentAttemptResponse.of(assessment, attempt, questions, options);
    }

    private List<StudentAssessmentListResponse> visibleAssessments(AppUser student,
                                                                   List<UUID> courseIds) {
        List<Assessment> assessments = assessmentRepository
                .findPublishedInCourses(courseIds, ContentStatus.PUBLISHED);
        Set<UUID> publishedModuleIds = publishedModuleIds(assessments);
        List<Assessment> visible = assessments.stream()
                .filter(assessment -> assessment.getModuleId() == null
                        || publishedModuleIds.contains(assessment.getModuleId()))
                .toList();
        List<UUID> assessmentIds = visible.stream().map(Assessment::getId).toList();

        Map<UUID, Integer> questionCounts = assessmentIds.isEmpty() ? Map.of()
                : questionRepository.countByAssessmentIdIn(assessmentIds).stream()
                        .collect(Collectors.toMap(
                                AssessmentQuestionRepository.QuestionCount::getAssessmentId,
                                count -> Math.toIntExact(count.getQuestionCount())));
        Map<UUID, List<AssessmentAttempt>> attemptsByAssessment = assessmentIds.isEmpty()
                ? Map.of()
                : attemptRepository.findByAssessmentIdInAndStudentId(
                        assessmentIds, student.getId()).stream()
                        .collect(Collectors.groupingBy(AssessmentAttempt::getAssessmentId));

        Map<UUID, Course> courses = courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Function.identity()));
        return visible.stream()
                .map(assessment -> StudentAssessmentListResponse.of(
                        assessment,
                        courses.get(assessment.getCourseId()).getSlug(),
                        courses.get(assessment.getCourseId()).getTitle(),
                        questionCounts.getOrDefault(assessment.getId(), 0),
                        attemptsByAssessment.getOrDefault(assessment.getId(), List.of())))
                .toList();
    }

    /**
     * Full Phase 7 access rule for one assessment: approved enrollment in a
     * published course, assessment published, and its module published when
     * set. Everything else is a 404 so existence never leaks.
     */
    private Assessment requireVisibleAssessment(AppUser student, UUID assessmentId) {
        Assessment assessment = assessmentRepository
                .findByIdAndStatus(assessmentId, ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Assessment not found."));
        Course course = courseRepository.findById(assessment.getCourseId())
                .filter(candidate -> candidate.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Assessment not found."));
        if (assessment.getModuleId() != null) {
            moduleRepository.findById(assessment.getModuleId())
                    .filter(module -> module.getCourseId().equals(course.getId()))
                    .filter(module -> module.getStatus() == ContentStatus.PUBLISHED)
                    .orElseThrow(() -> ApiException.notFound("Assessment not found."));
        }
        enrollmentRepository.findByCourse_IdAndStudent_IdAndStatus(
                        course.getId(), student.getId(), EnrollmentStatus.APPROVED)
                .orElseThrow(() -> ApiException.notFound("Assessment not found."));
        return assessment;
    }

    private Set<UUID> publishedModuleIds(List<Assessment> assessments) {
        Set<UUID> moduleIds = assessments.stream()
                .map(Assessment::getModuleId)
                .filter(java.util.Objects::nonNull)
                .collect(Collectors.toSet());
        if (moduleIds.isEmpty()) {
            return Set.of();
        }
        return moduleRepository.findAllById(moduleIds).stream()
                .filter(module -> module.getStatus() == ContentStatus.PUBLISHED)
                .map(CourseModule::getId)
                .collect(Collectors.toSet());
    }

    private AppUser requireActiveStudent(String email) {
        AppUser student = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.forbidden("Signed-in account not found."));
        if (student.getRole() != UserRole.STUDENT || student.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden(
                    "An active student account is required for assessments.");
        }
        return student;
    }
}
