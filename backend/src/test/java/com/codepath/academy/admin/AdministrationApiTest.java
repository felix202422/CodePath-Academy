package com.codepath.academy.admin;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.announcement.model.AnnouncementAudience;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.repository.CourseRepository;
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
import java.time.Instant;
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
 * Phase 9 administration contract: the dashboard reports live aggregates,
 * the student list and suspend/reactivate lifecycle are enforced server-side,
 * announcements follow the draft → publish lifecycle with course-scoped
 * visibility, and every successful administrator mutation lands in the
 * append-only audit trail.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdministrationApiTest {

    private static final String PASSWORD = "phase nine test password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CourseEnrollmentRepository enrollmentRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    /** Keep csrf() mutations to the shared test filter chain order-independent. */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void administratorSurfacesRejectStudentsAndAnonymousCallers() throws Exception {
        Cookie student = signIn(createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Route Student"));
        Cookie admin = signIn(createUser(UserRole.ADMIN, UserStatus.ACTIVE, "Route Admin"));

        String[] adminReads = {
                "/api/v1/admin/dashboard",
                "/api/v1/admin/students",
                "/api/v1/admin/announcements",
                "/api/v1/admin/audit"
        };
        for (String route : adminReads) {
            mockMvc.perform(get(route)).andExpect(status().isUnauthorized());
            mockMvc.perform(get(route).cookie(student)).andExpect(status().isForbidden());
            mockMvc.perform(get(route).cookie(admin)).andExpect(status().isOk());
        }

        // Mutations follow the same route rule.
        mockMvc.perform(post("/api/v1/admin/students/" + UUID.randomUUID() + "/suspend")
                        .with(csrf()).cookie(student))
                .andExpect(status().isForbidden());

        // The announcement feed is a signed-in student surface, not an admin one.
        mockMvc.perform(get("/api/v1/me/announcements")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/me/announcements").cookie(admin)).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/me/announcements").cookie(student)).andExpect(status().isOk());
    }

    @Test
    void studentListIsScopedToStudentAccountsAndFilterableByStatus() throws Exception {
        AppUser listAdmin = createUser(UserRole.ADMIN, UserStatus.ACTIVE, "List Admin");
        Cookie admin = signIn(listAdmin);
        AppUser active = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Listed Active");
        AppUser suspended = createUser(UserRole.STUDENT, UserStatus.SUSPENDED, "Listed Suspended");

        JsonNode all = list(admin, "/api/v1/admin/students");
        assertTrue(containsEmail(all, active.getEmail()), "active student must be listed");
        assertTrue(containsEmail(all, suspended.getEmail()), "suspended student must be listed");
        assertFalse(containsEmail(all, listAdmin.getEmail()), "administrators are not student accounts");

        JsonNode suspendedOnly = list(admin, "/api/v1/admin/students?status=SUSPENDED");
        assertTrue(containsEmail(suspendedOnly, suspended.getEmail()));
        assertFalse(containsEmail(suspendedOnly, active.getEmail()));

        JsonNode activeOnly = list(admin, "/api/v1/admin/students?status=ACTIVE");
        assertTrue(containsEmail(activeOnly, active.getEmail()));
        assertFalse(containsEmail(activeOnly, suspended.getEmail()));
    }

    @Test
    void announcementsFollowDraftPublishLifecycleWithCourseScopedVisibility() throws Exception {
        Course course = publishedCourse("computer-foundations");
        AppUser announcementAdmin = createUser(UserRole.ADMIN, UserStatus.ACTIVE, "Announcement Admin");
        Cookie admin = signIn(announcementAdmin);
        AppUser enrolledStudent = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Enrolled Student");
        Cookie enrolledSession = signIn(enrolledStudent);
        enroll(enrolledStudent, course, EnrollmentStatus.APPROVED);
        AppUser outsider = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Outsider Student");
        Cookie outsiderSession = signIn(outsider);
        AppUser pendingStudent = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Pending Student");
        Cookie pendingSession = signIn(pendingStudent);
        enroll(pendingStudent, course, EnrollmentStatus.PENDING);

        // A smuggled status field never publishes: publication happens via /status only.
        JsonNode wide = createAnnouncement(admin, """
                {"title":"Platform notice","bodyMarkdown":"Read this.","audience":"STUDENTS",
                 "courseId":null,"status":"PUBLISHED"}
                """);
        assertEquals("DRAFT", wide.get("status").asText());
        assertTrue(wide.get("publishedAt").isNull(), "a draft has no publishedAt");
        assertEquals(announcementAdmin.getEmail(), wide.get("createdByEmail").asText());
        String wideId = wide.get("id").asText();

        // Drafts are invisible to every student surface.
        assertEquals(0, feed(outsiderSession).size());

        publish(admin, wideId);
        assertEquals(1, feed(outsiderSession).size());
        assertEquals(1, feed(enrolledSession).size());

        // Course-scoped: only APPROVED enrollees ever see it.
        JsonNode scoped = createAnnouncement(admin, announcementJson(
                "Course notice", AnnouncementAudience.STUDENTS, course.getId()));
        assertEquals("Computer Foundations", scoped.get("courseTitle").asText());
        String scopedId = scoped.get("id").asText();
        assertEquals(1, feed(enrolledSession).size(), "a scoped draft stays hidden");
        publish(admin, scopedId);

        JsonNode enrolledFeed = feed(enrolledSession);
        assertEquals(2, enrolledFeed.size());
        assertEquals(1, feed(outsiderSession).size(), "no enrollment means no scoped announcement");
        assertEquals(1, feed(pendingSession).size(), "a PENDING enrollment is not access");
        JsonNode scopedRow = findByTitle(enrolledFeed, "Course notice");
        assertNotNull(scopedRow);
        assertEquals(course.getId().toString(), scopedRow.get("courseId").asText());
        assertEquals("Computer Foundations", scopedRow.get("courseTitle").asText());
        assertNotNull(scopedRow.get("publishedAt"));

        // Audience ALL is authored intent for a future public surface; signed-in
        // students see it today just like STUDENTS.
        JsonNode allAudience = createAnnouncement(admin, announcementJson(
                "Everyone notice", AnnouncementAudience.ALL, null));
        publish(admin, allAudience.get("id").asText());
        assertEquals(2, feed(outsiderSession).size());

        // Editing never flips publication state; status is not part of the payload.
        mockMvc.perform(put("/api/v1/admin/announcements/" + wideId)
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(announcementJson("Platform notice (edited)",
                                AnnouncementAudience.STUDENTS, null)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.title").value("Platform notice (edited)"));

        // Leaving PUBLISHED clears publishedAt and removes it from every feed.
        mockMvc.perform(post("/api/v1/admin/announcements/" + scopedId + "/status")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"ARCHIVED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.publishedAt").value(org.hamcrest.Matchers.nullValue()));
        JsonNode afterArchive = feed(enrolledSession);
        assertEquals(2, afterArchive.size(),
                "only the two platform-wide announcements remain");
        assertNull(findByTitle(afterArchive, "Course notice"),
                "the archived course notice must leave every feed");

        // A typo'd course id fails loudly instead of hiding the announcement.
        mockMvc.perform(post("/api/v1/admin/announcements")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(announcementJson("Orphan notice", AnnouncementAudience.STUDENTS,
                                UUID.randomUUID())))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message", containsString("Course not found")));
    }

    @Test
    void studentAccountsSuspendAndReactivateFollowStateRulesAndEndSessionsImmediately()
            throws Exception {
        Cookie admin = signIn(createUser(UserRole.ADMIN, UserStatus.ACTIVE, "Lifecycle Admin"));
        AppUser target = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Lifecycle Student");
        Cookie session = signIn(target);
        String suspendUrl = "/api/v1/admin/students/" + target.getId() + "/suspend";
        String reactivateUrl = "/api/v1/admin/students/" + target.getId() + "/reactivate";

        mockMvc.perform(get("/api/v1/me/enrollments").cookie(session)).andExpect(status().isOk());

        // A stale lock window must not survive suspension.
        target.setFailedAttempts(3);
        target.setLockedUntil(Instant.now().plusSeconds(600));
        userRepository.save(target);

        mockMvc.perform(post(suspendUrl).with(csrf()).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"))
                .andExpect(jsonPath("$.email").value(target.getEmail()));
        assertNull(target.getLockedUntil(), "suspend clears the lock window");

        // The session issued before the suspension dies on the next /me request...
        mockMvc.perform(get("/api/v1/me/enrollments").cookie(session))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("suspended")));

        // ...but the student can still read their honest status from /auth/me,
        // which is deliberately exempt from the status filter.
        mockMvc.perform(get("/api/v1/auth/me").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        // A fresh sign-in is refused with the same honest reason.
        mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(target.getEmail(), PASSWORD)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message", containsString("suspended")));

        // State rules: suspend only ACTIVE, reactivate only SUSPENDED.
        mockMvc.perform(post(suspendUrl).with(csrf()).cookie(admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already suspended")));

        target.setFailedAttempts(4);
        userRepository.save(target);
        mockMvc.perform(post(reactivateUrl).with(csrf()).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("ACTIVE"));
        assertEquals(0, target.getFailedAttempts(), "reactivate resets failed attempts");
        assertNull(target.getLockedUntil(), "reactivate clears the lock window");

        // The original session works again once the account is ACTIVE.
        mockMvc.perform(get("/api/v1/me/enrollments").cookie(session)).andExpect(status().isOk());

        mockMvc.perform(post(reactivateUrl).with(csrf()).cookie(admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already active")));

        // Queue-state accounts (registration not yet reviewed) are neither
        // suspendable nor reactivatable; the registration queue owns them.
        AppUser pending = createUser(UserRole.STUDENT, UserStatus.PENDING, "Queue Applicant");
        mockMvc.perform(post("/api/v1/admin/students/" + pending.getId() + "/suspend")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("registration queue")));
        mockMvc.perform(post("/api/v1/admin/students/" + pending.getId() + "/reactivate")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("Only suspended accounts")));

        // Administrators are not student accounts.
        AppUser administrator = createUser(UserRole.ADMIN, UserStatus.ACTIVE, "Not A Student");
        mockMvc.perform(post("/api/v1/admin/students/" + administrator.getId() + "/suspend")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isNotFound());
        mockMvc.perform(post("/api/v1/admin/students/" + UUID.randomUUID() + "/reactivate")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isNotFound());
    }

    @Test
    void adminMutationsAreRecordedInTheAuditTrailWithNormalizedActions() throws Exception {
        AppUser admin = createUser(UserRole.ADMIN, UserStatus.ACTIVE, "Audit Admin");
        Cookie adminSession = signIn(admin);
        AppUser target = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Audit Target");

        // Reads never write audit rows.
        int beforeReads = audit(adminSession, "?limit=200").size();
        mockMvc.perform(get("/api/v1/admin/students").cookie(adminSession))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/dashboard").cookie(adminSession))
                .andExpect(status().isOk());
        assertEquals(beforeReads, audit(adminSession, "?limit=200").size(),
                "GET requests must not be audited");

        // Creation records the acting administrator; the collection POST has no
        // entity id, the status transition carries the normalized target.
        JsonNode created = createAnnouncement(adminSession, announcementJson(
                "Audit notice", AnnouncementAudience.STUDENTS, null));
        String announcementId = created.get("id").asText();
        publish(adminSession, announcementId);

        JsonNode announcements = audit(adminSession, "?entityType=announcements");
        JsonNode createRow = findRow(announcements, "POST /api/v1/admin/announcements", null);
        assertNotNull(createRow, "announcement creation must be audited");
        assertEquals(admin.getEmail(), createRow.get("actorEmail").asText());
        JsonNode statusRow = findRow(announcements,
                "POST /api/v1/admin/announcements/{id}/status", announcementId);
        assertNotNull(statusRow, "publication must be audited with the target id");

        // Targeted mutations record the entity id and a normalized action so
        // the trail groups by endpoint instead of exploding per row.
        mockMvc.perform(post("/api/v1/admin/students/" + target.getId() + "/suspend")
                        .with(csrf()).cookie(adminSession))
                .andExpect(status().isOk());
        JsonNode students = audit(adminSession, "?entityType=students");
        JsonNode suspendRow = findRow(students, "POST /api/v1/admin/students/{id}/suspend",
                target.getId().toString());
        assertNotNull(suspendRow, "suspension must be audited with the target id");
        assertEquals(admin.getEmail(), suspendRow.get("actorEmail").asText());

        // A rejected mutation is not an action and must not be recorded.
        int targetRowsBefore = countRows(students, target.getId().toString());
        mockMvc.perform(post("/api/v1/admin/students/" + target.getId() + "/suspend")
                        .with(csrf()).cookie(adminSession))
                .andExpect(status().isConflict());
        students = audit(adminSession, "?entityType=students");
        assertEquals(targetRowsBefore, countRows(students, target.getId().toString()),
                "failed mutations are not audited");

        // The entityType filter narrows the trail.
        for (JsonNode row : announcements) {
            assertEquals("announcements", row.get("entityType").asText());
        }
    }

    @Test
    void dashboardReportsLiveAggregatesThatMoveWithAdministrativeWork() throws Exception {
        AppUser administrator = createUser(UserRole.ADMIN, UserStatus.ACTIVE, "Dashboard Admin");
        Cookie admin = signIn(administrator);
        Course course = publishedCourse("computer-foundations");
        AppUser target = createUser(UserRole.STUDENT, UserStatus.ACTIVE, "Dashboard Student");
        Cookie targetSession = signIn(target);

        JsonNode before = dashboard(admin);

        // One new pending registration through the public endpoint.
        String applicantEmail = "phase9-" + UUID.randomUUID() + "@example.test";
        mockMvc.perform(post("/api/v1/registration").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Queue Applicant","email":"%s","password":"ApplicantPass123!"}
                                """.formatted(applicantEmail)))
                .andExpect(status().isCreated());

        // One new pending enrollment request.
        mockMvc.perform(post("/api/v1/me/enrollments/" + course.getId())
                        .with(csrf()).cookie(targetSession))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"));

        // One new published announcement.
        JsonNode announcement = createAnnouncement(admin, announcementJson(
                "Dashboard notice", AnnouncementAudience.STUDENTS, null));
        publish(admin, announcement.get("id").asText());

        // And the target student is suspended.
        mockMvc.perform(post("/api/v1/admin/students/" + target.getId() + "/suspend")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isOk());

        JsonNode after = dashboard(admin);
        assertEquals(before.get("pendingRegistrations").asLong() + 1,
                after.get("pendingRegistrations").asLong(), "pending registrations are live");
        assertEquals(before.get("pendingEnrollments").asLong() + 1,
                after.get("pendingEnrollments").asLong(), "pending enrollments are live");
        assertEquals(before.get("publishedAnnouncements").asLong() + 1,
                after.get("publishedAnnouncements").asLong(), "published announcements are live");
        assertEquals(before.get("activeStudents").asLong() - 1,
                after.get("activeStudents").asLong(), "suspension leaves the active count");
        assertEquals(before.get("suspendedStudents").asLong() + 1,
                after.get("suspendedStudents").asLong(), "suspension fills the suspended count");
        assertTrue(after.get("publishedCourses").asLong() > 0, "the seeded catalog is published");
        assertTrue(after.get("publishedPaths").asLong() > 0, "the seeded paths are published");

        // The dashboard counts the same rows the queue screens return.
        mockMvc.perform(get("/api/v1/admin/registrations?status=PENDING").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(after.get("pendingRegistrations").asInt()));
        mockMvc.perform(get("/api/v1/admin/enrollments?status=PENDING").cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()")
                        .value(after.get("pendingEnrollments").asInt()));

        // The recent audit strip reflects the mutations just performed.
        JsonNode recent = after.get("recentAudit");
        assertTrue(recent.size() > 0, "recent admin work must appear on the dashboard");
        assertTrue(hasEntityType(recent, "students"), "the suspension must be in recent audit");
    }

    // --- helpers -----------------------------------------------------------

    private AppUser createUser(UserRole role, UserStatus status, String fullName) {
        String email = "phase9-" + UUID.randomUUID() + "@example.test";
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName(fullName);
        user.setRole(role);
        user.setStatus(status);
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
        assertNotNull(sessionCookie, "login must issue a session cookie");
        return new Cookie("SESSION", sessionCookie.getValue());
    }

    private Course publishedCourse(String slug) {
        return courseRepository.findBySlugAndStatus(slug, ContentStatus.PUBLISHED).orElseThrow();
    }

    private void enroll(AppUser student, Course course, EnrollmentStatus status) {
        CourseEnrollment enrollment = new CourseEnrollment();
        enrollment.setCourse(course);
        enrollment.setStudent(student);
        enrollment.setStatus(status);
        enrollment.setRequestedAt(Instant.now());
        enrollmentRepository.save(enrollment);
    }

    private static String announcementJson(String title, AnnouncementAudience audience,
                                           UUID courseId) {
        return "{\"title\":\"" + title + "\","
                + "\"bodyMarkdown\":\"Announcement body for " + title + ".\","
                + "\"audience\":\"" + audience.name() + "\","
                + "\"courseId\":" + (courseId == null ? "null" : "\"" + courseId + "\"") + "}";
    }

    private JsonNode createAnnouncement(Cookie admin, String body) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/announcements")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn();
        return json(result);
    }

    private void publish(Cookie admin, String id) throws Exception {
        mockMvc.perform(post("/api/v1/admin/announcements/" + id + "/status")
                        .with(csrf()).cookie(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.publishedAt").isNotEmpty());
    }

    private JsonNode feed(Cookie student) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/me/announcements").cookie(student))
                .andExpect(status().isOk())
                .andReturn();
        return json(result);
    }

    private JsonNode dashboard(Cookie admin) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/admin/dashboard").cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        return json(result);
    }

    private JsonNode list(Cookie admin, String path) throws Exception {
        MvcResult result = mockMvc.perform(get(path).cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        return json(result);
    }

    private JsonNode audit(Cookie admin, String query) throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/admin/audit" + query).cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        return json(result);
    }

    private JsonNode json(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString());
    }

    private static JsonNode findRow(JsonNode rows, String action) {
        for (JsonNode row : rows) {
            if (action.equals(row.get("action").asText())) {
                return row;
            }
        }
        return null;
    }

    private static JsonNode findByTitle(JsonNode rows, String title) {
        for (JsonNode row : rows) {
            if (title.equals(row.get("title").asText())) {
                return row;
            }
        }
        return null;
    }

    private static JsonNode findRow(JsonNode rows, String action, String entityId) {
        for (JsonNode row : rows) {
            if (!action.equals(row.get("action").asText())) {
                continue;
            }
            JsonNode id = row.get("entityId");
            if (entityId == null ? id.isNull() : entityId.equals(id.asText())) {
                return row;
            }
        }
        return null;
    }

    private static int countRows(JsonNode rows, String entityId) {
        int count = 0;
        for (JsonNode row : rows) {
            JsonNode id = row.get("entityId");
            if (id != null && !id.isNull() && entityId.equals(id.asText())) {
                count++;
            }
        }
        return count;
    }

    private static boolean containsEmail(JsonNode rows, String email) {
        for (JsonNode row : rows) {
            if (email.equals(row.get("email").asText())) {
                return true;
            }
        }
        return false;
    }

    private static boolean hasEntityType(JsonNode rows, String entityType) {
        for (JsonNode row : rows) {
            if (entityType.equals(row.get("entityType").asText())) {
                return true;
            }
        }
        return false;
    }
}
