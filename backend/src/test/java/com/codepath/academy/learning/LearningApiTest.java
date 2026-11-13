package com.codepath.academy.learning;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.nullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.catalog.model.LessonResource;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LessonRepository;
import com.codepath.academy.catalog.repository.LessonResourceRepository;
import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.repository.CourseEnrollmentRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.learning.model.LessonProgressStatus;
import com.codepath.academy.learning.repository.LessonProgressRepository;
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

/** Student learning reads and progress writes stay scoped to approved enrollments. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class LearningApiTest {

    private static final String PASSWORD = "learning test password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CourseModuleRepository moduleRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private LessonResourceRepository resourceRepository;

    @Autowired
    private CourseEnrollmentRepository enrollmentRepository;

    @Autowired
    private LessonProgressRepository progressRepository;

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
    void dashboardReaderAndCompletionUsePublishedContentAndRealProgress() throws Exception {
        Course course = publishedCourse("computer-foundations");
        AppUser student = activeUser(UserRole.STUDENT, "Learning Student");
        Cookie session = signIn(student);
        enroll(student, course, EnrollmentStatus.APPROVED);

        CourseModule module = module(course, "Published module", ContentStatus.PUBLISHED, 1);
        Lesson first = lesson(module, "first-lesson", "First lesson", "# First lesson\n\nReal body.",
                ContentStatus.PUBLISHED, 1);
        Lesson second = lesson(module, "second-lesson", "Second lesson", "Second lesson body.",
                ContentStatus.PUBLISHED, 2);
        Lesson draft = lesson(module, "draft-lesson", "Unpublished lesson", "Draft body.",
                ContentStatus.DRAFT, 3);
        LessonResource resource = new LessonResource();
        resource.setLessonId(first.getId());
        resource.setKind(LessonResource.Kind.IMAGE);
        resource.setTitle("Lesson diagram");
        resource.setLocation("/media/lessons/diagram.svg");
        resource.setMimeType("image/svg+xml");
        resourceRepository.save(resource);

        Course pendingCourse = publishedCourse("programming-fundamentals");
        enroll(student, pendingCourse, EnrollmentStatus.PENDING);

        mockMvc.perform(get("/api/v1/me/learning").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrolledCourseCount").value(1))
                .andExpect(jsonPath("$.totalLessonCount").value(2))
                .andExpect(jsonPath("$.completedLessonCount").value(0))
                .andExpect(jsonPath("$.progressPercent").value(0))
                .andExpect(jsonPath("$.courses[0].courseSlug").value(course.getSlug()))
                .andExpect(jsonPath("$.courses[0].continueLessonId").value(first.getId().toString()));

        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modules.length()").value(1))
                .andExpect(jsonPath("$.modules[0].lessons.length()").value(2))
                .andExpect(jsonPath("$.modules[0].lessons[0].progressStatus").value(nullValue()))
                .andExpect(jsonPath("$.modules[0].lessons[1].id").value(second.getId().toString()));

        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + first.getId()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.bodyMarkdown", containsString("Real body.")))
                .andExpect(jsonPath("$.previousLessonId").value(nullValue()))
                .andExpect(jsonPath("$.nextLessonId").value(second.getId().toString()))
                .andExpect(jsonPath("$.resources[0].title").value("Lesson diagram"));

        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + draft.getId()).cookie(session))
                .andExpect(status().isNotFound());

        mockMvc.perform(post("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + first.getId() + "/access")
                        .with(csrf()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
        mockMvc.perform(post("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + first.getId() + "/complete")
                        .with(csrf()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andExpect(jsonPath("$.completedAt").isNotEmpty());

        MvcResult completed = mockMvc.perform(post("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + first.getId() + "/complete")
                        .with(csrf()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("COMPLETED"))
                .andReturn();
        JsonNode completedBody = objectMapper.readTree(completed.getResponse().getContentAsString());
        mockMvc.perform(get("/api/v1/me/learning").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalLessonCount").value(2))
                .andExpect(jsonPath("$.completedLessonCount").value(1))
                .andExpect(jsonPath("$.progressPercent").value(50))
                .andExpect(jsonPath("$.courses[0].continueLessonId").value(second.getId().toString()));
        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.modules[0].lessons[0].progressStatus").value("COMPLETED"))
                .andExpect(jsonPath("$.modules[0].lessons[1].progressStatus").value(nullValue()));

        // Completion is idempotent: repeating it preserves the original completion timestamp.
        mockMvc.perform(post("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + first.getId() + "/complete")
                        .with(csrf()).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.completedAt")
                        .value(completedBody.get("completedAt").asText()));
        org.junit.jupiter.api.Assertions.assertEquals(
                LessonProgressStatus.COMPLETED,
                progressRepository.findByStudentIdAndLessonId(student.getId(), first.getId())
                        .orElseThrow().getStatus());
    }

    @Test
    void anotherStudentCannotReadTheCourseOutlineOrLesson() throws Exception {
        Course course = publishedCourse("computer-foundations");
        AppUser owner = activeUser(UserRole.STUDENT, "Course Owner");
        AppUser otherStudent = activeUser(UserRole.STUDENT, "Other Student");
        Cookie ownerSession = signIn(owner);
        Cookie otherSession = signIn(otherStudent);
        enroll(owner, course, EnrollmentStatus.APPROVED);
        CourseModule module = module(course, "Owner's module", ContentStatus.PUBLISHED, 1);
        Lesson lesson = lesson(module, "owners-lesson", "Owner's lesson", "Private course text.",
                ContentStatus.PUBLISHED, 1);

        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()).cookie(ownerSession))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()).cookie(otherSession))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/me/learning/courses/" + course.getSlug()
                        + "/lessons/" + lesson.getId()).cookie(otherSession))
                .andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/me/learning").cookie(otherSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enrolledCourseCount").value(0));
    }

    @Test
    void learningEndpointsRequireAnActiveStudentRole() throws Exception {
        AppUser administrator = activeUser(UserRole.ADMIN, "Learning Admin");
        Cookie adminSession = signIn(administrator);

        mockMvc.perform(get("/api/v1/me/learning"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/me/learning").cookie(adminSession))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/me/learning/courses/computer-foundations/lessons/"
                        + UUID.randomUUID() + "/complete").with(csrf()).cookie(adminSession))
                .andExpect(status().isForbidden());
    }

    private Course publishedCourse(String slug) {
        return courseRepository.findBySlugAndStatus(slug, ContentStatus.PUBLISHED).orElseThrow();
    }

    private AppUser activeUser(UserRole role, String name) {
        String email = "learning-" + UUID.randomUUID() + "@example.test";
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

    private CourseModule module(Course course, String title, ContentStatus status, int order) {
        CourseModule module = new CourseModule();
        module.setCourseId(course.getId());
        module.setTitle(title);
        module.setSummary("Module summary.");
        module.setDisplayOrder(order);
        module.setStatus(status);
        return moduleRepository.save(module);
    }

    private Lesson lesson(CourseModule module, String slug, String title, String body,
                         ContentStatus status, int order) {
        Lesson lesson = new Lesson();
        lesson.setModuleId(module.getId());
        lesson.setSlug(slug);
        lesson.setTitle(title);
        lesson.setSummary("Lesson summary.");
        lesson.setBodyMarkdown(body);
        lesson.setDisplayOrder(order);
        lesson.setStatus(status);
        lesson.setContentHash("a".repeat(64));
        lesson.setPublishedAt(status == ContentStatus.PUBLISHED ? Instant.now() : null);
        return lessonRepository.save(lesson);
    }
}
