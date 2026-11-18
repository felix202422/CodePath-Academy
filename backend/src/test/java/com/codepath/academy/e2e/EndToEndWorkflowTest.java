package com.codepath.academy.e2e;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasItem;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.support.SecurityTestSupport;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
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
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Phase 10 end-to-end journey across every phase's API in one transaction:
 * a learner self-registers, an administrator approves the account, authors
 * and publishes path → course → module → lesson → assessment through the
 * admin API, the learner requests and receives enrollment, reads the lesson,
 * records progress and submits an attempt the server grades. Each step must
 * show up in the dashboard aggregates and the append-only audit trail, so
 * this test proves the phases compose instead of only passing in isolation.
 * Every number asserted here is read back from the API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EndToEndWorkflowTest {

    private static final String ADMIN_PASSWORD = "journey administrator password";
    private static final String LEARNER_PASSWORD = "journey learner password";

    /** One question worth ten points: a perfect submission is 10/10 and a pass. */
    private static final String ONE_QUESTION = """
            [
              {
                "questionType": "MULTIPLE_CHOICE",
                "prompt": "Which framework powers this API?",
                "points": 10,
                "options": [
                  {"optionText": "Spring Boot", "isCorrect": true},
                  {"optionText": "Django", "isCorrect": false}
                ]
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
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    /** This journey issues csrf() mutations; restore the production repository. */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void learnerJourneyComposesEveryPhaseWithServerSideDecisions() throws Exception {
        String adminEmail = "journey-admin-" + UUID.randomUUID() + "@example.test";
        account(UserRole.ADMIN, adminEmail, "Journey Administrator", ADMIN_PASSWORD);
        Cookie admin = signIn(adminEmail, ADMIN_PASSWORD);
        JsonNode start = dashboard(admin);

        // --- 1. Self-registration creates a PENDING learner ----------------
        String learnerEmail = "journey-learner-" + UUID.randomUUID() + "@example.test";
        mockMvc.perform(post("/api/v1/registration").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Journey Learner","email":"%s","password":"%s"}
                                """.formatted(learnerEmail, LEARNER_PASSWORD)))
                .andExpect(status().isCreated());
        // The correct password is not enough before administrator approval.
        mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(learnerEmail, LEARNER_PASSWORD)))
                .andExpect(status().isForbidden());
        assertEquals(start.get("pendingRegistrations").asLong() + 1,
                dashboard(admin).get("pendingRegistrations").asLong(),
                "the queue grows by exactly the registration this journey submitted");

        // --- 2. Administrator approves, then the learner can sign in --------
        String registrationId = requireId(registrationFor(admin, learnerEmail),
                "registration request for " + learnerEmail);
        mockMvc.perform(post("/api/v1/admin/registrations/" + registrationId + "/approve")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Approved during the Phase 10 journey.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewNotes")
                        .value("Approved during the Phase 10 journey."));
        JsonNode afterApproval = dashboard(admin);
        assertEquals(start.get("pendingRegistrations").asLong(),
                afterApproval.get("pendingRegistrations").asLong(),
                "the approved request leaves the pending queue");
        assertEquals(start.get("activeStudents").asLong() + 1,
                afterApproval.get("activeStudents").asLong(),
                "the approved learner becomes one active student");

        Cookie learner = signIn(learnerEmail, LEARNER_PASSWORD);
        mockMvc.perform(get("/api/v1/auth/me").cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(learnerEmail))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // --- 3. Administrator authors the course through the API ------------
        String unique = UUID.randomUUID().toString().substring(0, 8);
        String courseSlug = "journey-course-" + unique;
        String pathId = createPath(admin, "journey-path-" + unique);
        String courseId = createCourse(admin, pathId, courseSlug);
        String moduleId = createModule(admin, courseId, "Journey Module");
        String lessonId = createLesson(admin, moduleId, "journey-lesson-" + unique);
        String assessmentId = createAssessment(admin, courseId, moduleId);

        // --- 4. Publication cascade, bottom-up, with an honest refusal -------
        publish(admin, "paths", pathId);
        publish(admin, "courses", courseId);
        // The module is still a draft, so the assessment cannot publish yet.
        mockMvc.perform(post("/api/v1/admin/assessments/" + assessmentId + "/status")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("owning module")));
        publish(admin, "modules", moduleId);
        publish(admin, "lessons", lessonId);
        publish(admin, "assessments", assessmentId);

        JsonNode afterPublish = dashboard(admin);
        assertEquals(start.get("publishedPaths").asLong() + 1,
                afterPublish.get("publishedPaths").asLong());
        assertEquals(start.get("publishedCourses").asLong() + 1,
                afterPublish.get("publishedCourses").asLong());

        // --- 5. Enrollment request → administrator approval → access --------
        // The published outline stays invisible until the enrollment is approved.
        mockMvc.perform(get("/api/v1/me/learning/courses/" + courseSlug).cookie(learner))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/me/enrollments/" + courseId).with(csrf()).cookie(learner))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.courseSlug").value(courseSlug));
        assertEquals(start.get("pendingEnrollments").asLong() + 1,
                dashboard(admin).get("pendingEnrollments").asLong());

        String enrollmentId = requireId(enrollmentFor(admin, learnerEmail),
                "pending enrollment for " + learnerEmail);
        mockMvc.perform(post("/api/v1/admin/enrollments/" + enrollmentId + "/approve")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Approved in the Phase 10 journey.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.courseSlug").value(courseSlug));
        assertEquals(start.get("pendingEnrollments").asLong(),
                dashboard(admin).get("pendingEnrollments").asLong(),
                "the approved enrollment leaves the pending queue");

        mockMvc.perform(get("/api/v1/me/enrollments").cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].courseSlug").value(courseSlug))
                .andExpect(jsonPath("$[0].status").value("APPROVED"));

        // --- 6. Learning progress comes from the stored lesson state --------
        mockMvc.perform(get("/api/v1/me/learning").cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrolledCourseCount").value(1))
                .andExpect(jsonPath("$.totalLessonCount").value(1))
                .andExpect(jsonPath("$.completedLessonCount").value(0))
                .andExpect(jsonPath("$.progressPercent").value(0));

        mockMvc.perform(post("/api/v1/me/learning/courses/" + courseSlug
                        + "/lessons/" + lessonId + "/access")
                        .with(csrf()).cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mockMvc.perform(post("/api/v1/me/learning/courses/" + courseSlug
                        + "/lessons/" + lessonId + "/complete")
                        .with(csrf()).cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"));

        mockMvc.perform(get("/api/v1/me/learning").cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedLessonCount").value(1))
                .andExpect(jsonPath("$.progressPercent").value(100));

        // --- 7. Attempt graded on the server from the stored answer key -----
        JsonNode available = getJson("/api/v1/me/assessments", learner);
        assertEquals(1, available.size(),
                "an approved learner sees exactly the assessment of the enrolled course");
        assertEquals(assessmentId, available.get(0).get("id").asText());
        assertEquals(1, available.get(0).get("questionCount").asInt());

        MvcResult started = mockMvc.perform(post("/api/v1/me/assessments/" + assessmentId
                        + "/attempts").with(csrf()).cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.attemptNumber").value(1))
                .andExpect(jsonPath("$.questions.length()").value(1))
                .andReturn();
        String attemptId = objectMapper
                .readTree(started.getResponse().getContentAsString())
                .get("attemptId").asText();

        // The authoring view holds the answer key; the taking view never does.
        JsonNode detail = getJson("/api/v1/admin/assessments/" + assessmentId, admin);
        String questionId = detail.get("questions").get(0).get("id").asText();
        String correctOptionId = null;
        for (JsonNode option : detail.get("questions").get(0).get("options")) {
            if (option.get("correct").asBoolean()) {
                correctOptionId = option.get("id").asText();
            }
        }
        assertNotNull(correctOptionId, "the authored question must have a correct option");

        mockMvc.perform(post("/api/v1/me/assessments/attempts/" + attemptId + "/submit")
                        .with(csrf()).cookie(learner)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"answers":[{"questionId":"%s","optionIds":["%s"]}]}
                                """.formatted(questionId, correctOptionId)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(10))
                .andExpect(jsonPath("$.maxScore").value(10))
                .andExpect(jsonPath("$.percent").value(100))
                .andExpect(jsonPath("$.passed").value(true));

        mockMvc.perform(get("/api/v1/me/assessments/attempts/" + attemptId).cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.score").value(10))
                .andExpect(jsonPath("$.passed").value(true));
        mockMvc.perform(get("/api/v1/me/assessments").cookie(learner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].attemptsUsed").value(1))
                .andExpect(jsonPath("$[0].bestScore").value(10))
                .andExpect(jsonPath("$[0].passed").value(true));

        // --- 8. Every administrator step lands in the audit trail -----------
        JsonNode trail = getJson("/api/v1/admin/audit?limit=50", admin);

        JsonNode registrationAudit = auditEntry(trail, "registrations", registrationId);
        assertNotNull(registrationAudit,
                "approving a registration must be audited; trail=" + trail);
        assertEquals("POST /api/v1/admin/registrations/{id}/approve",
                registrationAudit.get("action").asText());
        assertEquals(adminEmail, registrationAudit.get("actorEmail").asText());

        JsonNode enrollmentAudit = auditEntry(trail, "enrollments", enrollmentId);
        assertNotNull(enrollmentAudit,
                "approving an enrollment must be audited; trail=" + trail);
        assertEquals("POST /api/v1/admin/enrollments/{id}/approve",
                enrollmentAudit.get("action").asText());
        assertEquals(adminEmail, enrollmentAudit.get("actorEmail").asText());

        JsonNode lessonAudit = auditEntry(trail, "lessons", lessonId);
        assertNotNull(lessonAudit, "publishing a lesson must be audited; trail=" + trail);
        assertEquals("POST /api/v1/admin/lessons/{id}/status",
                lessonAudit.get("action").asText());

        mockMvc.perform(get("/api/v1/admin/dashboard").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.recentAudit[*].actorEmail", hasItem(adminEmail)));
    }

    // --- helpers -----------------------------------------------------------

    private AppUser account(UserRole role, String email, String name, String password) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setFullName(name);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Cookie signIn(String email, String password) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie session = result.getResponse().getCookie("SESSION");
        assertNotNull(session, "login must issue a session cookie");
        return new Cookie("SESSION", session.getValue());
    }

    private JsonNode dashboard(Cookie admin) throws Exception {
        return getJson("/api/v1/admin/dashboard", admin);
    }

    private JsonNode getJson(String url, Cookie session) throws Exception {
        MvcResult result = mockMvc.perform(get(url).cookie(session))
                .andExpect(status().isOk())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    /** The newest pending registration row for one applicant, via the admin API. */
    private JsonNode registrationFor(Cookie admin, String email) throws Exception {
        JsonNode rows = getJson("/api/v1/admin/registrations?status=PENDING", admin);
        for (JsonNode row : rows) {
            if (email.equals(row.get("email").asText())) {
                return row;
            }
        }
        return null;
    }

    /** The newest pending enrollment row for one learner, via the admin API. */
    private JsonNode enrollmentFor(Cookie admin, String email) throws Exception {
        JsonNode rows = getJson("/api/v1/admin/enrollments?status=PENDING", admin);
        for (JsonNode row : rows) {
            if (email.equals(row.get("studentEmail").asText())) {
                return row;
            }
        }
        return null;
    }

    private static String requireId(JsonNode row, String description) {
        assertNotNull(row, "expected " + description);
        return row.get("id").asText();
    }

    private static JsonNode auditEntry(JsonNode trail, String entityType, String entityId) {
        for (JsonNode entry : trail) {
            if (entityType.equals(entry.get("entityType").asText())
                    && entityId.equals(entry.get("entityId").asText())) {
                return entry;
            }
        }
        return null;
    }

    private String createPath(Cookie admin, String slug) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/paths").with(csrf())
                        .cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"%s","name":"Journey Path",\
                                "summary":"Authored by the Phase 10 end-to-end journey."}
                                """.formatted(slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return idOf(result);
    }

    private String createCourse(Cookie admin, String pathId, String slug) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/courses").with(csrf())
                        .cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"pathId":"%s","slug":"%s","title":"Journey Course",\
                                "summary":"Course authored during the Phase 10 journey.",\
                                "level":"BEGINNER"}
                                """.formatted(pathId, slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return idOf(result);
    }

    private String createModule(Cookie admin, String courseId, String title) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/courses/" + courseId
                        + "/modules").with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"%s\"}".formatted(title)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return idOf(result);
    }

    private String createLesson(Cookie admin, String moduleId, String slug) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/modules/" + moduleId
                        + "/lessons").with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"%s","title":"Journey Lesson",\
                                "bodyMarkdown":"# Journey Lesson\\n\\nReal lesson body."}
                                """.formatted(slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.editedByAdmin").value(true))
                .andReturn();
        return idOf(result);
    }

    private String createAssessment(Cookie admin, String courseId, String moduleId)
            throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/courses/" + courseId
                        + "/assessments").with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"title":"Journey Quiz","description":"Graded by the server.",\
                                "passScorePercent":70,"maxAttempts":1,"moduleId":"%s",\
                                "questions":%s}
                                """.formatted(moduleId, ONE_QUESTION)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.questionCount").value(1))
                .andReturn();
        return idOf(result);
    }

    private void publish(Cookie admin, String collection, String id) throws Exception {
        mockMvc.perform(post("/api/v1/admin/" + collection + "/" + id + "/status")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
    }

    private String idOf(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asText();
    }
}
