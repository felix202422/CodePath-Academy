package com.codepath.academy.catalog;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseLevel;
import com.codepath.academy.catalog.model.LearningPath;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.support.SecurityTestSupport;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Public catalog contract: anonymous reads over PUBLISHED content only, real
 * seed data from the audited curriculum source, and honest 404s. Runs against
 * the same PostgreSQL test database as the rest of the suite; transactional
 * tests roll their fixtures back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class PublicCatalogApiTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LearningPathRepository pathRepository;

    @Autowired
    private WebApplicationContext wac;

    /**
     * The no-session contract must be evaluated against the repository the application
     * ships with. Earlier test classes that issue {@code .with(csrf())} requests leave
     * the shared CsrfFilter on a session-backed test repository (spring-security-test
     * swaps it and does not swap it back), which would make this class's session
     * assertions depend on test order. Reset before each test.
     */
    @BeforeEach
    void useProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void overviewReportsPublishedCountsAndCurriculumOrder() throws Exception {
        mockMvc.perform(get("/api/v1/public/overview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pathCount").value(7))
                .andExpect(jsonPath("$.courseCount").value(20))
                .andExpect(jsonPath("$.paths.length()").value(7))
                .andExpect(jsonPath("$.paths[0].slug").value("software-engineering"))
                .andExpect(jsonPath("$.paths[0].courseCount").value(8))
                .andExpect(jsonPath("$.startHere.length()").value(4))
                .andExpect(jsonPath("$.startHere[0].slug").value("computer-foundations"));
    }

    @Test
    void pathListExcludesDraftPaths() throws Exception {
        mockMvc.perform(get("/api/v1/public/paths"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7))
                .andExpect(jsonPath("$.[*].slug", not(containsString("computer-networking"))));
    }

    @Test
    void pathDetailReturnsItsCoursesInCurriculumOrder() throws Exception {
        mockMvc.perform(get("/api/v1/public/paths/frontend-development"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Frontend Development"))
                .andExpect(jsonPath("$.courses.length()").value(4))
                .andExpect(jsonPath("$.courses[0].slug").value("internet-and-web-foundations"))
                .andExpect(jsonPath("$.courses[3].slug").value("frontend-engineering"));
    }

    @Test
    void unknownPathReturnsHonest404() throws Exception {
        mockMvc.perform(get("/api/v1/public/paths/not-a-real-path"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Learning path not found."));
    }

    @Test
    void courseListReturnsAllPublishedCoursesInCurriculumOrder() throws Exception {
        mockMvc.perform(get("/api/v1/public/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(20))
                .andExpect(jsonPath("$.[0].slug").value("computer-foundations"))
                .andExpect(jsonPath("$.[19].slug").value("project-laboratory"));
    }

    @Test
    void courseDetailCarriesPrerequisitesAndSourceProvenance() throws Exception {
        mockMvc.perform(get("/api/v1/public/courses/java-programming"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Java Programming"))
                .andExpect(jsonPath("$.pathSlug").value("software-engineering"))
                .andExpect(jsonPath("$.sourceRepository")
                        .value("https://github.com/felix202422/CodePath-Masterclass"))
                .andExpect(jsonPath("$.description").value(
                        containsString("62afa4143c26c036169429810fe8bc0b4e9a4de6")))
                // No lessons are imported yet; the counts are real zeros.
                .andExpect(jsonPath("$.moduleCount").value(0))
                .andExpect(jsonPath("$.lessonCount").value(0))
                .andExpect(jsonPath("$.prerequisites.length()").value(2))
                .andExpect(jsonPath("$.prerequisites[0].slug").value("programming-fundamentals"))
                .andExpect(jsonPath("$.prerequisites[1].slug").value("developer-tools"));
    }

    @Test
    void unknownCourseReturnsHonest404() throws Exception {
        mockMvc.perform(get("/api/v1/public/courses/not-a-real-course"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("Course not found."));
    }

    @Test
    void draftRowsAreNeverExposed() throws Exception {
        LearningPath draftPath = new LearningPath();
        draftPath.setSlug("draft-path-" + UUID.randomUUID());
        draftPath.setName("Draft path");
        draftPath.setSummary("Hidden from the public API.");
        draftPath.setDisplayOrder(999);
        draftPath.setStatus(ContentStatus.DRAFT);
        pathRepository.save(draftPath);

        // Draft course inside a published path: hidden by status.
        Course draftCourse = new Course();
        draftCourse.setLearningPathId(
                pathRepository.findBySlugAndStatus("software-engineering", ContentStatus.PUBLISHED)
                        .orElseThrow().getId());
        draftCourse.setSlug("draft-course-" + UUID.randomUUID());
        draftCourse.setTitle("Draft course");
        draftCourse.setSummary("Hidden from the public API.");
        draftCourse.setLevel(CourseLevel.BEGINNER);
        draftCourse.setStatus(ContentStatus.DRAFT);
        draftCourse.setDisplayOrder(999);
        courseRepository.save(draftCourse);

        // Published course under a draft path: hidden by the path guard.
        Course orphanCourse = new Course();
        orphanCourse.setLearningPathId(draftPath.getId());
        orphanCourse.setSlug("orphan-course-" + UUID.randomUUID());
        orphanCourse.setTitle("Orphan course");
        orphanCourse.setSummary("Hidden because its path is not published.");
        orphanCourse.setLevel(CourseLevel.BEGINNER);
        orphanCourse.setStatus(ContentStatus.PUBLISHED);
        orphanCourse.setDisplayOrder(998);
        courseRepository.save(orphanCourse);

        mockMvc.perform(get("/api/v1/public/courses"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(20));

        mockMvc.perform(get("/api/v1/public/paths"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(7));

        mockMvc.perform(get("/api/v1/public/courses/" + orphanCourse.getSlug()))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/v1/public/paths/" + draftPath.getSlug()))
                .andExpect(status().isNotFound());
    }

    @Test
    void publicEndpointsAllowAnonymousWithoutSessionCookies() throws Exception {
        var result = mockMvc.perform(get("/api/v1/public/overview"))
                .andExpect(status().isOk())
                .andReturn();
        // Anonymous browsing must not create server sessions.
        org.junit.jupiter.api.Assertions.assertTrue(
                result.getResponse().getHeaders("Set-Cookie").stream()
                        .noneMatch(cookie -> cookie.startsWith("SESSION=")),
                "Public reads must not create sessions: "
                        + result.getResponse().getHeaders("Set-Cookie"));
    }
}
