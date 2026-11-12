package com.codepath.academy.enrollment;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.support.SecurityTestSupport;
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

/** Enrollment requests are owner-scoped, reviewed by admins, and counted only after approval. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class EnrollmentApiTest {

    private static final String PASSWORD = "enrollment test password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Keep csrf() mutations to the shared test filter chain order-independent. */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void studentRequestStaysPendingUntilAdminApprovalThenIncrementsPublicCount() throws Exception {
        Course course = publishedCourse();
        Cookie student = signIn(UserRole.STUDENT, "Student One");
        Cookie administrator = signIn(UserRole.ADMIN, "Enrollment Admin");

        mockMvc.perform(get("/api/v1/me/enrollments").cookie(student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/v1/me/enrollments/" + course.getId()).cookie(student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(nullValue()));
        mockMvc.perform(get("/api/v1/public/courses/" + course.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrollmentCount").value(0));

        mockMvc.perform(post("/api/v1/me/enrollments/" + course.getId())
                        .with(csrf()).cookie(student))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.courseId").value(course.getId().toString()))
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.requestedAt").isNotEmpty());

        mockMvc.perform(get("/api/v1/public/courses/" + course.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrollmentCount").value(0));
        mockMvc.perform(post("/api/v1/me/enrollments/" + course.getId())
                        .with(csrf()).cookie(student))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already awaiting review")));

        MvcResult pending = mockMvc.perform(get("/api/v1/admin/enrollments?status=PENDING")
                        .cookie(administrator))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].studentName").value("Student One"))
                .andExpect(jsonPath("$[0].courseSlug").value(course.getSlug()))
                .andReturn();
        String requestId = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(pending.getResponse().getContentAsString())
                .get(0).get("id").asText();

        mockMvc.perform(post("/api/v1/admin/enrollments/" + requestId + "/approve")
                        .with(csrf()).cookie(administrator)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Welcome to the course.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"))
                .andExpect(jsonPath("$.reviewNotes").value("Welcome to the course."))
                .andExpect(jsonPath("$.reviewedAt").isNotEmpty());

        mockMvc.perform(get("/api/v1/me/enrollments/" + course.getId()).cookie(student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));
        mockMvc.perform(get("/api/v1/me/enrollments").cookie(student))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[*].status", everyItem(is("APPROVED"))));
        mockMvc.perform(get("/api/v1/public/courses/" + course.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrollmentCount").value(1));
        mockMvc.perform(get("/api/v1/public/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.slug == 'computer-foundations')].enrollmentCount")
                        .value(contains(1)));
        mockMvc.perform(post("/api/v1/admin/enrollments/" + requestId + "/reject")
                        .with(csrf()).cookie(administrator))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already been reviewed")));
    }

    @Test
    void studentsCannotReadAnotherStudentsEnrollmentAndRejectionsRemainInHistory()
            throws Exception {
        Course course = publishedCourse();
        Cookie owner = signIn(UserRole.STUDENT, "Request Owner");
        Cookie otherStudent = signIn(UserRole.STUDENT, "Other Student");
        Cookie administrator = signIn(UserRole.ADMIN, "Enrollment Admin");

        mockMvc.perform(post("/api/v1/me/enrollments/" + course.getId())
                        .with(csrf()).cookie(owner))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/api/v1/me/enrollments").cookie(otherStudent))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
        mockMvc.perform(get("/api/v1/me/enrollments/" + course.getId()).cookie(otherStudent))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value(nullValue()));

        MvcResult pending = mockMvc.perform(get("/api/v1/admin/enrollments?status=PENDING")
                        .cookie(administrator))
                .andExpect(status().isOk())
                .andReturn();
        String requestId = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(pending.getResponse().getContentAsString())
                .get(0).get("id").asText();

        mockMvc.perform(post("/api/v1/admin/enrollments/" + requestId + "/reject")
                        .with(csrf()).cookie(administrator)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"Please complete the prerequisites first.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));
        mockMvc.perform(get("/api/v1/me/enrollments").cookie(owner))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].status").value("REJECTED"))
                .andExpect(jsonPath("$[0].reviewNotes")
                        .value("Please complete the prerequisites first."));
        mockMvc.perform(post("/api/v1/me/enrollments/" + course.getId())
                        .with(csrf()).cookie(owner))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("already reviewed")));
    }

    @Test
    void enrollmentEndpointsRequireTheStudentOrAdministratorRole() throws Exception {
        Course course = publishedCourse();
        Cookie administrator = signIn(UserRole.ADMIN, "Enrollment Admin");
        Cookie student = signIn(UserRole.STUDENT, "Enrollment Student");

        mockMvc.perform(get("/api/v1/me/enrollments"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/me/enrollments").cookie(administrator))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/me/enrollments/" + course.getId())
                        .with(csrf()).cookie(administrator))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/enrollments"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/enrollments").cookie(student))
                .andExpect(status().isForbidden());
    }

    private Course publishedCourse() {
        return courseRepository.findBySlugAndStatus("computer-foundations", ContentStatus.PUBLISHED)
                .orElseThrow();
    }

    private Cookie signIn(UserRole role, String fullName) throws Exception {
        String email = "enrollment-" + UUID.randomUUID() + "@example.test";
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName(fullName);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        Cookie sessionCookie = result.getResponse().getCookie("SESSION");
        org.junit.jupiter.api.Assertions.assertNotNull(sessionCookie,
                "login must issue a session cookie");
        return new Cookie("SESSION", sessionCookie.getValue());
    }
}
