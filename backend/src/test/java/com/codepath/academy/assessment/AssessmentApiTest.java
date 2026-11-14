package com.codepath.academy.assessment;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.assessment.model.Assessment;
import com.codepath.academy.assessment.model.AssessmentAttempt;
import com.codepath.academy.assessment.repository.AssessmentAttemptRepository;
import com.codepath.academy.assessment.repository.AssessmentRepository;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseLevel;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.repository.CourseEnrollmentRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.support.SecurityTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Phase 8 contract: administrator authoring (structure rules, publication
 * cascades, replace-all questions locked by the first attempt) and the student
 * attempt lifecycle (visibility, server-side grading per question type, the
 * pass threshold, attempt limits and the time-expiry rule). Every score in
 * these assertions comes from the stored answer key, never from the client.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AssessmentApiTest {

    private static final String PASSWORD = "assessment test password";

    /** One question per type: 2 + 1 + 3 + 4 = 10 points, pass mark 70 %. */
    private static final String ALL_TYPES_QUESTIONS = """
            [
              {
                "questionType": "MULTIPLE_CHOICE",
                "prompt": "Which framework powers this API?",
                "points": 2,
                "options": [
                  {"optionText": "Spring Boot", "isCorrect": true},
                  {"optionText": "Django", "isCorrect": false},
                  {"optionText": "Rails", "isCorrect": false}
                ]
              },
              {
                "questionType": "TRUE_FALSE",
                "prompt": "Grading happens on the server.",
                "points": 1,
                "options": [
                  {"optionText": "True", "isCorrect": true},
                  {"optionText": "False", "isCorrect": false}
                ]
              },
              {
                "questionType": "MULTI_ANSWER",
                "prompt": "Select both relational databases.",
                "points": 3,
                "options": [
                  {"optionText": "PostgreSQL", "isCorrect": true},
                  {"optionText": "MySQL", "isCorrect": true},
                  {"optionText": "Redis", "isCorrect": false}
                ]
              },
              {
                "questionType": "SHORT_ANSWER",
                "prompt": "Name the build tool used by this backend.",
                "correctText": "Maven",
                "points": 4
              }
            ]
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LearningPathRepository learningPathRepository;

    @Autowired
    private CourseModuleRepository moduleRepository;

    @Autowired
    private CourseEnrollmentRepository enrollmentRepository;

    @Autowired
    private AssessmentRepository assessmentRepository;

    @Autowired
    private AssessmentAttemptRepository attemptRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    /** Keep csrf() mutations to the shared test filter chain order-independent. */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    // --- administrator authoring ------------------------------------------

    @Test
    void administratorAuthorsValidatesCascadesAndDeletesAssessments() throws Exception {
        Course course = publishedCourse("computer-foundations");
        Course draft = draftCourse();
        Cookie admin = signIn(activeUser(UserRole.ADMIN, "Assessment Admin"));

        // Author the complete question set; new assessments start as DRAFT.
        JsonNode created = createAssessment(admin, course.getId(),
                body("Phase 8 check", null, null, 1, ALL_TYPES_QUESTIONS));
        String assessmentId = created.get("id").asText();
        assertEquals("DRAFT", created.get("status").asText());
        assertEquals(4, created.get("questionCount").asInt());
        assertEquals(0, created.get("attemptCount").asInt());

        // Structural rules reject malformed sets and name the bad question.
        assertCreateRejected(admin, course.getId(),
                body("Bad MC", null, null, 1,
                        "[{\"questionType\":\"MULTIPLE_CHOICE\",\"prompt\":\"One option.\","
                                + "\"points\":1,\"options\":"
                                + "[{\"optionText\":\"Only\",\"isCorrect\":true}]}]"),
                "Question 1 needs at least two options.");
        assertCreateRejected(admin, course.getId(),
                body("Bad MC", null, null, 1,
                        "[{\"questionType\":\"MULTIPLE_CHOICE\",\"prompt\":\"Two correct.\","
                                + "\"points\":1,\"options\":"
                                + "[{\"optionText\":\"A\",\"isCorrect\":true},"
                                + "{\"optionText\":\"B\",\"isCorrect\":true}]}]"),
                "Question 1 must have exactly one correct option.");
        assertCreateRejected(admin, course.getId(),
                body("Bad TF", null, null, 1,
                        "[{\"questionType\":\"TRUE_FALSE\",\"prompt\":\"Three options.\","
                                + "\"points\":1,\"options\":"
                                + "[{\"optionText\":\"True\",\"isCorrect\":true},"
                                + "{\"optionText\":\"False\",\"isCorrect\":false},"
                                + "{\"optionText\":\"Maybe\",\"isCorrect\":false}]}]"),
                "Question 1 must have exactly two options");
        assertCreateRejected(admin, course.getId(),
                body("Bad short answer", null, null, 1,
                        "[{\"questionType\":\"SHORT_ANSWER\",\"prompt\":\"Key plus options.\","
                                + "\"correctText\":\"x\",\"points\":1,\"options\":"
                                + "[{\"optionText\":\"A\",\"isCorrect\":true}]}]"),
                "takes an answer key");
        assertCreateRejected(admin, course.getId(),
                body("Keyless short answer", null, null, 1,
                        "[{\"questionType\":\"SHORT_ANSWER\",\"prompt\":\"No key.\","
                                + "\"points\":1}]"),
                "Question 1 needs an answer key.");
        mockMvc.perform(post("/api/v1/admin/courses/" + course.getId() + "/assessments")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"\",\"passScorePercent\":70,\"maxAttempts\":1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("One or more fields are invalid."));

        // No half-created assessment survives the rejected writes.
        mockMvc.perform(get("/api/v1/admin/courses/" + course.getId() + "/assessments")
                        .cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        // The administrator detail is the only place the answer key exists.
        JsonNode detail = detail(admin, assessmentId);
        assertEquals(4, detail.get("questionCount").asInt());
        assertEquals(0, detail.get("attemptCount").asInt());
        JsonNode questions = detail.get("questions");
        assertEquals(4, questions.size());
        assertEquals(3, questions.get(0).get("options").size());
        assertEquals(1, optionIds(detail, 0, true).size());
        assertEquals(2, questions.get(1).get("options").size());
        assertEquals(3, questions.get(2).get("options").size());
        assertEquals(2, optionIds(detail, 2, true).size());
        assertEquals(0, questions.get(3).get("options").size());
        assertEquals("Maven", questions.get(3).get("correctText").asText());
        assertEquals(4, questions.get(3).get("points").asInt());

        // Publication cascades: course first, then module, then a real question set.
        JsonNode onDraftCourse = createAssessment(admin, draft.getId(),
                body("Draft course quiz", null, null, 1, ALL_TYPES_QUESTIONS));
        assertPublishRejected(admin, onDraftCourse.get("id").asText(),
                "Publish the owning course");

        CourseModule draftModule = module(course, "Draft module", ContentStatus.DRAFT, 1);
        JsonNode onDraftModule = createAssessment(admin, course.getId(),
                body("Module quiz", draftModule.getId().toString(), null, 1,
                        ALL_TYPES_QUESTIONS));
        assertPublishRejected(admin, onDraftModule.get("id").asText(),
                "Publish the owning module");

        JsonNode questionless = createAssessment(admin, course.getId(),
                body("Questionless quiz", null, null, 1, null));
        assertEquals(0, questionless.get("questionCount").asInt());
        assertPublishRejected(admin, questionless.get("id").asText(),
                "Add at least one question");

        // Publishing succeeds once every rule holds.
        publish(admin, assessmentId);
        draftModule.setStatus(ContentStatus.PUBLISHED);
        moduleRepository.save(draftModule);
        publish(admin, onDraftModule.get("id").asText());

        // The administrator list reports real counts, statuses and ownership.
        mockMvc.perform(get("/api/v1/admin/courses/" + course.getId() + "/assessments")
                        .cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].id").value(assessmentId))
                .andExpect(jsonPath("$[0].status").value("PUBLISHED"))
                .andExpect(jsonPath("$[0].questionCount").value(4))
                .andExpect(jsonPath("$[0].attemptCount").value(0))
                .andExpect(jsonPath("$[1].id").value(onDraftModule.get("id").asText()))
                .andExpect(jsonPath("$[1].moduleId")
                        .value(draftModule.getId().toString()))
                .andExpect(jsonPath("$[2].id").value(questionless.get("id").asText()))
                .andExpect(jsonPath("$[2].questionCount").value(0));

        // Deleting an unattempted assessment cascades questions and options.
        mockMvc.perform(delete("/api/v1/admin/assessments/"
                        + questionless.get("id").asText()).with(csrf()).cookie(admin))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/admin/assessments/"
                        + questionless.get("id").asText()).cookie(admin))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/admin/courses/" + course.getId() + "/assessments")
                        .cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2));
    }

    @Test
    void questionSetsAreReplaceAllAndLockAfterTheFirstAttempt() throws Exception {
        Course course = publishedCourse("computer-foundations");
        Cookie admin = signIn(activeUser(UserRole.ADMIN, "Assessment Author"));
        AppUser student = activeUser(UserRole.STUDENT, "Locking Student");
        Cookie studentSession = signIn(student);
        enroll(student, course, EnrollmentStatus.APPROVED);

        JsonNode created = createAssessment(admin, course.getId(),
                body("Replaceable quiz", null, null, 1, ALL_TYPES_QUESTIONS));
        String assessmentId = created.get("id").asText();
        assertEquals(4, created.get("questionCount").asInt());

        // Replace-all before any attempt: the submitted set wins entirely.
        String replacement = """
                [{"questionType":"TRUE_FALSE","prompt":"Replacement prompt.","points":5,
                  "options":[{"optionText":"True","isCorrect":true},
                             {"optionText":"False","isCorrect":false}]},
                 {"questionType":"SHORT_ANSWER","prompt":"Second replacement.",
                  "correctText":"Paris","points":5}]""";
        mockMvc.perform(put("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Replaceable quiz", null, null, 1, replacement)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.questionCount").value(2));
        JsonNode replaced = detail(admin, assessmentId);
        assertEquals(2, replaced.get("questions").size());
        assertEquals("Replacement prompt.",
                replaced.get("questions").get(0).get("prompt").asText());

        // A malformed replacement is rejected before the stored set is touched.
        mockMvc.perform(put("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Replaceable quiz", null, null, 1,
                                "[{\"questionType\":\"MULTIPLE_CHOICE\","
                                        + "\"prompt\":\"No options.\",\"points\":1}]")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message",
                        containsString("Question 1 needs at least two options.")));
        JsonNode untouched = detail(admin, assessmentId);
        assertEquals(2, untouched.get("questions").size());
        assertEquals("Replacement prompt.",
                untouched.get("questions").get(0).get("prompt").asText());

        publish(admin, assessmentId);

        // The first attempt locks the question set...
        start(studentSession, assessmentId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptNumber").value(1));
        mockMvc.perform(put("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Replaceable quiz", null, null, 1, replacement)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("questions are locked")));

        // ...but metadata-only updates still work, and deletion becomes archive-only.
        mockMvc.perform(put("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("Renamed after launch", null, null, 1, null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Renamed after launch"))
                .andExpect(jsonPath("$.questionCount").value(2))
                .andExpect(jsonPath("$.attemptCount").value(1));
        mockMvc.perform(delete("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("archive it instead")));

        // An assessment nobody attempted still deletes cleanly.
        JsonNode second = createAssessment(admin, course.getId(),
                body("Disposable quiz", null, null, 1, ALL_TYPES_QUESTIONS));
        String secondId = second.get("id").asText();
        mockMvc.perform(delete("/api/v1/admin/assessments/" + secondId)
                        .with(csrf()).cookie(admin))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/admin/assessments/" + secondId).cookie(admin))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/admin/courses/" + course.getId() + "/assessments")
                        .cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }

    // --- student attempts --------------------------------------------------

    @Test
    void studentSeesPublishedAssessmentsAndGetsServerGradedResults() throws Exception {
        Course course = publishedCourse("computer-foundations");
        AppUser student = activeUser(UserRole.STUDENT, "Quiz Student");
        AppUser pending = activeUser(UserRole.STUDENT, "Pending Student");
        Cookie session = signIn(student);
        Cookie pendingSession = signIn(pending);
        Cookie admin = signIn(activeUser(UserRole.ADMIN, "Visibility Admin"));
        enroll(student, course, EnrollmentStatus.APPROVED);
        enroll(pending, course, EnrollmentStatus.PENDING);

        // Visible: published, course-level, inside a published course.
        JsonNode visible = createAssessment(admin, course.getId(),
                body("Phase 8 check", null, null, 2, ALL_TYPES_QUESTIONS));
        String visibleId = visible.get("id").asText();
        publish(admin, visibleId);

        // Hidden: still a draft.
        JsonNode draft = createAssessment(admin, course.getId(),
                body("Draft quiz", null, null, 2, ALL_TYPES_QUESTIONS));
        String draftId = draft.get("id").asText();

        // Hidden: its module went back to draft after publication.
        CourseModule module = module(course, "Assessment module",
                ContentStatus.PUBLISHED, 1);
        JsonNode inModule = createAssessment(admin, course.getId(),
                body("Module quiz", module.getId().toString(), null, 2,
                        ALL_TYPES_QUESTIONS));
        String inModuleId = inModule.get("id").asText();
        publish(admin, inModuleId);
        module.setStatus(ContentStatus.DRAFT);
        moduleRepository.save(module);

        // Hidden: the owning course was never published. The admin API refuses
        // to publish into a draft course, so the fixture sets the status
        // directly to exercise the student-facing rule.
        Course unpublishedCourse = draftCourse();
        enroll(student, unpublishedCourse, EnrollmentStatus.APPROVED);
        JsonNode offCourse = createAssessment(admin, unpublishedCourse.getId(),
                body("Draft course quiz", null, null, 2, ALL_TYPES_QUESTIONS));
        String offCourseId = offCourse.get("id").asText();
        Assessment offCourseAssessment = assessmentRepository
                .findById(UUID.fromString(offCourseId)).orElseThrow();
        offCourseAssessment.setStatus(ContentStatus.PUBLISHED);
        assessmentRepository.save(offCourseAssessment);

        // Only the visible assessment is listed, with this student's real state.
        mockMvc.perform(get("/api/v1/me/assessments").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].id").value(visibleId))
                .andExpect(jsonPath("$[0].courseSlug").value("computer-foundations"))
                .andExpect(jsonPath("$[0].questionCount").value(4))
                .andExpect(jsonPath("$[0].attemptsUsed").value(0))
                .andExpect(jsonPath("$[0].bestScore").value(0))
                .andExpect(jsonPath("$[0].passed").value(false))
                .andExpect(jsonPath("$[0].inProgressAttemptId").value(nullValue()));
        mockMvc.perform(get("/api/v1/me/assessments").cookie(pendingSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Hidden assessments 404 on start — existence never leaks.
        for (String hidden : List.of(draftId, inModuleId, offCourseId)) {
            mockMvc.perform(post("/api/v1/me/assessments/" + hidden + "/attempts")
                            .with(csrf()).cookie(session))
                    .andExpect(status().isNotFound());
        }
        mockMvc.perform(post("/api/v1/me/assessments/" + visibleId + "/attempts")
                        .with(csrf()).cookie(pendingSession))
                .andExpect(status().isNotFound());

        // Starting is idempotent and the taking view never carries the key.
        MvcResult started = start(session, visibleId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptNumber").value(1))
                .andExpect(jsonPath("$.questions.length()").value(4))
                .andExpect(jsonPath("$.questions[0].options.length()").value(3))
                .andExpect(jsonPath("$.questions[0].options[0].isCorrect").doesNotExist())
                .andExpect(jsonPath("$.questions[3].correctText").doesNotExist())
                .andExpect(jsonPath("$.questions[3].explanation").doesNotExist())
                .andExpect(content().string(not(containsString("isCorrect"))))
                .andExpect(content().string(not(containsString("Maven"))))
                .andReturn();
        String attemptId = read(started).get("attemptId").asText();
        start(session, visibleId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptId").value(attemptId))
                .andExpect(jsonPath("$.attemptNumber").value(1));

        // Grading is the server's job: every point comes from the stored key.
        JsonNode detail = detail(admin, visibleId);
        String perfect = perfectSubmission(detail);
        submit(session, attemptId, perfect)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(10))
                .andExpect(jsonPath("$.maxScore").value(10))
                .andExpect(jsonPath("$.percent").value(100))
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.timeExpired").value(false))
                .andExpect(jsonPath("$.questions.length()").value(4))
                .andExpect(jsonPath("$.questions[0].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[0].pointsAwarded").value(2))
                .andExpect(jsonPath("$.questions[0].correctOptionIds.length()").value(1))
                .andExpect(jsonPath("$.questions[1].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[2].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[3].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[3].pointsAwarded").value(4))
                .andExpect(jsonPath("$.questions[3].correctAnswerText").value("Maven"))
                .andExpect(jsonPath("$.questions[3].yourAnswerText").value("Maven"));

        // Re-submitting a graded attempt is a conflict; results stay readable.
        submit(session, attemptId, perfect)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already been submitted")));
        mockMvc.perform(get("/api/v1/me/assessments/attempts/" + attemptId)
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(10))
                .andExpect(jsonPath("$.passed").value(true));

        // Another student can neither read nor touch someone else's attempt.
        mockMvc.perform(get("/api/v1/me/assessments/attempts/" + attemptId)
                        .cookie(pendingSession))
                .andExpect(status().isNotFound());
        submit(pendingSession, attemptId, perfect)
                .andExpect(status().isNotFound());

        // The list reflects the stored outcome.
        mockMvc.perform(get("/api/v1/me/assessments").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].attemptsUsed").value(1))
                .andExpect(jsonPath("$[0].bestScore").value(10))
                .andExpect(jsonPath("$[0].bestMaxScore").value(10))
                .andExpect(jsonPath("$[0].passed").value(true))
                .andExpect(jsonPath("$[0].inProgressAttemptId").value(nullValue()));
    }

    @Test
    void serverSideGradingAppliesPerQuestionRulesAndThePassThreshold() throws Exception {
        Course course = publishedCourse("computer-foundations");
        AppUser studentA = activeUser(UserRole.STUDENT, "Grading Student A");
        AppUser studentB = activeUser(UserRole.STUDENT, "Grading Student B");
        AppUser studentC = activeUser(UserRole.STUDENT, "Grading Student C");
        Cookie sessionA = signIn(studentA);
        Cookie sessionB = signIn(studentB);
        Cookie sessionC = signIn(studentC);
        Cookie admin = signIn(activeUser(UserRole.ADMIN, "Grading Admin"));
        enroll(studentA, course, EnrollmentStatus.APPROVED);
        enroll(studentB, course, EnrollmentStatus.APPROVED);
        enroll(studentC, course, EnrollmentStatus.APPROVED);

        JsonNode created = createAssessment(admin, course.getId(),
                body("Grading quiz", null, null, 2, ALL_TYPES_QUESTIONS));
        String quizId = created.get("id").asText();
        publish(admin, quizId);
        JsonNode detail = detail(admin, quizId);

        String mc = qid(detail, 0);
        String tf = qid(detail, 1);
        String multi = qid(detail, 2);
        String shortAnswer = qid(detail, 3);
        String correctMc = optionIds(detail, 0, true).get(0);
        String wrongMc = optionIds(detail, 0, false).get(0);
        String correctTf = optionIds(detail, 1, true).get(0);
        List<String> correctMulti = optionIds(detail, 2, true);
        String wrongMulti = optionIds(detail, 2, false).get(0);
        List<String> allThreeMulti = new ArrayList<>(correctMulti);
        allThreeMulti.add(wrongMulti);

        // A: wrong choice, right true/false, exact multi set, sloppy short
        // answer — normalization (case and whitespace) still earns the points.
        String attemptAId = read(start(sessionA, quizId)
                .andExpect(status().isOk())
                .andReturn()).get("attemptId").asText();
        submit(sessionA, attemptAId, answers(
                        choiceAnswer(mc, wrongMc),
                        choiceAnswer(tf, correctTf),
                        multiAnswer(multi, correctMulti),
                        textAnswer(shortAnswer, "  maven  ")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(8))
                .andExpect(jsonPath("$.percent").value(80))
                .andExpect(jsonPath("$.passed").value(true))
                .andExpect(jsonPath("$.questions[0].isCorrect").value(false))
                .andExpect(jsonPath("$.questions[0].pointsAwarded").value(0))
                .andExpect(jsonPath("$.questions[1].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[2].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[3].isCorrect").value(true))
                .andExpect(jsonPath("$.questions[3].yourAnswerText").value("  maven  "))
                .andExpect(jsonPath("$.questions[3].correctAnswerText").value("Maven"));

        // B: right choice, true/false left unanswered, a multi-answer superset
        // (exact set match required) and a wrong key. 2/10 fails the 70 % mark.
        String attemptBId = read(start(sessionB, quizId)
                .andExpect(status().isOk())
                .andReturn()).get("attemptId").asText();
        submit(sessionB, attemptBId, answers(
                        choiceAnswer(mc, correctMc),
                        multiAnswer(multi, allThreeMulti),
                        textAnswer(shortAnswer, "Gradle")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(2))
                .andExpect(jsonPath("$.percent").value(20))
                .andExpect(jsonPath("$.passed").value(false))
                .andExpect(jsonPath("$.questions[1].yourOptionIds.length()").value(0))
                .andExpect(jsonPath("$.questions[1].isCorrect").value(false))
                .andExpect(jsonPath("$.questions[1].pointsAwarded").value(0))
                .andExpect(jsonPath("$.questions[2].yourOptionIds.length()").value(3))
                .andExpect(jsonPath("$.questions[2].isCorrect").value(false))
                .andExpect(jsonPath("$.questions[3].isCorrect").value(false));

        // C: exactly 7/10 — the boundary passes because the rule is >=.
        String attemptCId = read(start(sessionC, quizId)
                .andExpect(status().isOk())
                .andReturn()).get("attemptId").asText();
        submit(sessionC, attemptCId, answers(
                        choiceAnswer(mc, correctMc),
                        choiceAnswer(tf, correctTf),
                        multiAnswer(multi, List.of(wrongMulti)),
                        textAnswer(shortAnswer, "Maven")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(7))
                .andExpect(jsonPath("$.percent").value(70))
                .andExpect(jsonPath("$.passed").value(true));

        // Each student's list shows only their own honest best result.
        mockMvc.perform(get("/api/v1/me/assessments").cookie(sessionA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attemptsUsed").value(1))
                .andExpect(jsonPath("$[0].bestScore").value(8))
                .andExpect(jsonPath("$[0].bestMaxScore").value(10))
                .andExpect(jsonPath("$[0].passed").value(true));
        mockMvc.perform(get("/api/v1/me/assessments").cookie(sessionB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attemptsUsed").value(1))
                .andExpect(jsonPath("$[0].bestScore").value(2))
                .andExpect(jsonPath("$[0].passed").value(false));
        mockMvc.perform(get("/api/v1/me/assessments").cookie(sessionC))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attemptsUsed").value(1))
                .andExpect(jsonPath("$[0].bestScore").value(7))
                .andExpect(jsonPath("$[0].passed").value(true));
    }

    @Test
    void attemptLimitsAndTheTimeExpiryRuleAreEnforcedByTheServer() throws Exception {
        Course course = publishedCourse("computer-foundations");
        AppUser student = activeUser(UserRole.STUDENT, "Timed Student");
        Cookie session = signIn(student);
        Cookie admin = signIn(activeUser(UserRole.ADMIN, "Timed Admin"));
        enroll(student, course, EnrollmentStatus.APPROVED);

        // One-minute limit, two attempts allowed, pass mark 70 %.
        JsonNode created = createAssessment(admin, course.getId(),
                body("Timed quiz", null, 1, 2, ALL_TYPES_QUESTIONS));
        String quizId = created.get("id").asText();
        publish(admin, quizId);
        String perfect = perfectSubmission(detail(admin, quizId));

        // A submission inside the 30-second grace past the limit grades normally.
        JsonNode first = read(start(session, quizId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptNumber").value(1))
                .andReturn());
        backdate(first.get("attemptId").asText(), Duration.ofSeconds(70));
        submit(session, first.get("attemptId").asText(), perfect)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeExpired").value(false))
                .andExpect(jsonPath("$.score").value(10))
                .andExpect(jsonPath("$.passed").value(true));

        // Past the window the attempt is still recorded, but it scores zero.
        JsonNode second = read(start(session, quizId)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptNumber").value(2))
                .andReturn());
        backdate(second.get("attemptId").asText(), Duration.ofMinutes(10));
        submit(session, second.get("attemptId").asText(), perfect)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeExpired").value(true))
                .andExpect(jsonPath("$.score").value(0))
                .andExpect(jsonPath("$.maxScore").value(10))
                .andExpect(jsonPath("$.percent").value(0))
                .andExpect(jsonPath("$.passed").value(false))
                .andExpect(jsonPath("$.questions[0].isCorrect").value(false))
                .andExpect(jsonPath("$.questions[0].pointsAwarded").value(0))
                .andExpect(jsonPath("$.questions[0].yourOptionIds.length()").value(1))
                .andExpect(jsonPath("$.questions[3].isCorrect").value(false))
                .andExpect(jsonPath("$.questions[3].yourAnswerText").value("Maven"));

        // Both attempts are spent: a third start is a conflict.
        mockMvc.perform(post("/api/v1/me/assessments/" + quizId + "/attempts")
                        .with(csrf()).cookie(session))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("used all 2 attempt(s)")));

        // The stored result reads back the same honest outcome.
        mockMvc.perform(get("/api/v1/me/assessments/attempts/"
                        + second.get("attemptId").asText()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.timeExpired").value(true))
                .andExpect(jsonPath("$.score").value(0));

        mockMvc.perform(get("/api/v1/me/assessments").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attemptsUsed").value(2))
                .andExpect(jsonPath("$[0].bestScore").value(10))
                .andExpect(jsonPath("$[0].passed").value(true));
    }

    // --- route authorization ------------------------------------------------

    @Test
    void assessmentRoutesRequireTheRightRole() throws Exception {
        UUID courseId = UUID.randomUUID();
        UUID assessmentId = UUID.randomUUID();
        UUID attemptId = UUID.randomUUID();

        // Anonymous callers are rejected before any handler runs.
        mockMvc.perform(get("/api/v1/me/assessments"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/me/assessments/" + assessmentId + "/attempts")
                        .with(csrf()))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/me/assessments/attempts/" + attemptId + "/submit")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"answers\":[]}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/me/assessments/attempts/" + attemptId))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/courses/" + courseId + "/assessments"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/courses/" + courseId + "/assessments")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Anonymous\"}"))
                .andExpect(status().isUnauthorized());

        // Administrators do not get the student routes...
        Cookie admin = signIn(activeUser(UserRole.ADMIN, "Route Admin"));
        mockMvc.perform(get("/api/v1/me/assessments").cookie(admin))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/me/assessments/" + assessmentId + "/attempts")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isForbidden());

        // ...and students do not get the authoring routes.
        Cookie student = signIn(activeUser(UserRole.STUDENT, "Route Student"));
        mockMvc.perform(get("/api/v1/admin/courses/" + courseId + "/assessments")
                        .cookie(student))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(student)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Student edit\"}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(delete("/api/v1/admin/assessments/" + assessmentId)
                        .with(csrf()).cookie(student))
                .andExpect(status().isForbidden());
    }

    // --- fixtures ----------------------------------------------------------

    private Course publishedCourse(String slug) {
        return courseRepository.findBySlugAndStatus(slug, ContentStatus.PUBLISHED)
                .orElseThrow();
    }

    /** A never-published course for cascade and visibility rules. */
    private Course draftCourse() {
        Course course = new Course();
        course.setLearningPathId(learningPathRepository
                .findByStatusOrderByDisplayOrderAsc(ContentStatus.PUBLISHED)
                .get(0).getId());
        course.setSlug("draft-course-" + UUID.randomUUID());
        course.setTitle("Unpublished course");
        course.setSummary("Stays in draft so publication rules have a target.");
        course.setDescription("A course that is never published.");
        course.setLevel(CourseLevel.BEGINNER);
        course.setStatus(ContentStatus.DRAFT);
        course.setDisplayOrder(500);
        return courseRepository.save(course);
    }

    private AppUser activeUser(UserRole role, String name) {
        String email = "assessment-" + UUID.randomUUID() + "@example.test";
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName(name);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Cookie signIn(AppUser user) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(user.getEmail(), PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie sessionCookie = result.getResponse().getCookie("SESSION");
        org.junit.jupiter.api.Assertions.assertNotNull(sessionCookie,
                "login must issue a session cookie");
        return new Cookie("SESSION", sessionCookie.getValue());
    }

    private void enroll(AppUser student, Course course, EnrollmentStatus status) {
        CourseEnrollment enrollment = new CourseEnrollment();
        enrollment.setCourse(course);
        enrollment.setStudent(student);
        enrollment.setStatus(status);
        enrollment.setRequestedAt(Instant.now());
        enrollmentRepository.save(enrollment);
    }

    private CourseModule module(Course course, String title, ContentStatus status,
                                int order) {
        CourseModule module = new CourseModule();
        module.setCourseId(course.getId());
        module.setTitle(title);
        module.setSummary("Module summary.");
        module.setDisplayOrder(order);
        module.setStatus(status);
        return moduleRepository.save(module);
    }

    /** Rewrites an attempt's start time so the deadline math can be tested. */
    private void backdate(String attemptId, Duration ago) {
        AssessmentAttempt attempt = attemptRepository
                .findById(UUID.fromString(attemptId)).orElseThrow();
        attempt.setStartedAt(Instant.now().minus(ago));
        attemptRepository.save(attempt);
    }

    // --- request helpers ----------------------------------------------------

    /** Assessment payload; {@code null} fields are omitted from the JSON. */
    private static String body(String title, String moduleId, Integer timeLimitMinutes,
                               int maxAttempts, String questions) {
        StringBuilder json = new StringBuilder("{\"title\":\"").append(title)
                .append("\",\"description\":\"Authored during Phase 8.\"")
                .append(",\"passScorePercent\":70,\"maxAttempts\":").append(maxAttempts);
        if (timeLimitMinutes != null) {
            json.append(",\"timeLimitMinutes\":").append(timeLimitMinutes);
        }
        if (moduleId != null) {
            json.append(",\"moduleId\":\"").append(moduleId).append('"');
        }
        if (questions != null) {
            json.append(",\"questions\":").append(questions);
        }
        return json.append('}').toString();
    }

    private JsonNode createAssessment(Cookie admin, UUID courseId, String payload)
            throws Exception {
        MvcResult result = mockMvc.perform(
                        post("/api/v1/admin/courses/" + courseId + "/assessments")
                                .with(csrf()).cookie(admin)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(payload))
                .andExpect(status().isCreated())
                .andReturn();
        return read(result);
    }

    private JsonNode detail(Cookie admin, String assessmentId) throws Exception {
        MvcResult result = mockMvc.perform(
                        get("/api/v1/admin/assessments/" + assessmentId).cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        return read(result);
    }

    private void publish(Cookie admin, String assessmentId) throws Exception {
        mockMvc.perform(post("/api/v1/admin/assessments/" + assessmentId + "/status")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    private void assertCreateRejected(Cookie admin, UUID courseId, String payload,
                                      String expectedMessage) throws Exception {
        mockMvc.perform(post("/api/v1/admin/courses/" + courseId + "/assessments")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message", containsString(expectedMessage)));
    }

    private void assertPublishRejected(Cookie admin, String assessmentId,
                                       String expectedMessage) throws Exception {
        mockMvc.perform(post("/api/v1/admin/assessments/" + assessmentId + "/status")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString(expectedMessage)));
    }

    private ResultActions start(Cookie session, String assessmentId) throws Exception {
        return mockMvc.perform(post("/api/v1/me/assessments/" + assessmentId + "/attempts")
                .with(csrf()).cookie(session));
    }

    private ResultActions submit(Cookie session, String attemptId, String answers)
            throws Exception {
        return mockMvc.perform(
                post("/api/v1/me/assessments/attempts/" + attemptId + "/submit")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(answers));
    }

    private JsonNode read(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    // --- payload builders ---------------------------------------------------

    private static String qid(JsonNode detail, int questionIndex) {
        return detail.get("questions").get(questionIndex).get("id").asText();
    }

    private static List<String> optionIds(JsonNode detail, int questionIndex,
                                          boolean correct) {
        List<String> ids = new ArrayList<>();
        for (JsonNode option : detail.get("questions").get(questionIndex)
                .get("options")) {
            if (option.get("correct").asBoolean() == correct) {
                ids.add(option.get("id").asText());
            }
        }
        return ids;
    }

    private static String uuidList(List<String> ids) {
        return ids.stream().map(id -> "\"" + id + "\"")
                .collect(Collectors.joining(","));
    }

    private static String answers(String... fragments) {
        return "{\"answers\":[" + String.join(",", fragments) + "]}";
    }

    private static String choiceAnswer(String questionId, String optionId) {
        return "{\"questionId\":\"%s\",\"optionIds\":[\"%s\"]}"
                .formatted(questionId, optionId);
    }

    private static String multiAnswer(String questionId, List<String> optionIds) {
        return "{\"questionId\":\"%s\",\"optionIds\":[%s]}"
                .formatted(questionId, uuidList(optionIds));
    }

    private static String textAnswer(String questionId, String text) {
        return "{\"questionId\":\"%s\",\"answerText\":\"%s\"}".formatted(questionId, text);
    }

    /** All four answers correct — the full 10 points. */
    private static String perfectSubmission(JsonNode detail) {
        return answers(
                choiceAnswer(qid(detail, 0), optionIds(detail, 0, true).get(0)),
                choiceAnswer(qid(detail, 1), optionIds(detail, 1, true).get(0)),
                multiAnswer(qid(detail, 2), optionIds(detail, 2, true)),
                textAnswer(qid(detail, 3), "Maven"));
    }
}
