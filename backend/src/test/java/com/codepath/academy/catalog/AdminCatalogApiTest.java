package com.codepath.academy.catalog;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.everyItem;
import static org.hamcrest.Matchers.is;
import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.support.FixtureCurriculum;
import com.codepath.academy.support.SecurityTestSupport;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.Cookie;
import java.nio.file.Path;
import java.util.UUID;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Administrator HTTP contract for Phase 5 against the frozen frontend
 * client: the catalog write endpoints (create → cascade → publish) and the
 * content-import endpoints (source info, run, ledger query, review actions),
 * all through real session login with CSRF. Runs against the staged local
 * curriculum fixtures; the test transaction rolls everything back.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class AdminCatalogApiTest {

    private static final String PASSWORD = "contract test password";

    private static final Path CURRICULUM =
            Path.of("target", "test-curriculum").toAbsolutePath().normalize();

    private static final Path MEDIA =
            Path.of("target", "test-media").toAbsolutePath().normalize();

    @DynamicPropertySource
    static void contentProperties(DynamicPropertyRegistry registry) {
        FixtureCurriculum.stage(CURRICULUM);
        FixtureCurriculum.clear(MEDIA);
        registry.add("app.curriculum.local-checkout-path", () -> CURRICULUM.toString());
        registry.add("app.media.root", () -> MEDIA.toString());
    }

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

    /**
     * This class issues {@code .with(csrf())} requests; restore the production
     * cookie repository afterwards so later classes (notably the public
     * no-session contract) do not depend on test order.
     */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @BeforeEach
    void pristineFixtures() {
        FixtureCurriculum.stage(CURRICULUM);
        FixtureCurriculum.clear(MEDIA);
    }

    @Test
    void contentEndpointsDenyAnonymousCallers() throws Exception {
        mockMvc.perform(get("/api/v1/admin/content/import-source"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/content/imports"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/content/imports")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void administratorSeesTheImportSourceConfiguration() throws Exception {
        Cookie session = signIn();

        mockMvc.perform(get("/api/v1/admin/content/import-source").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.repository")
                        .value("https://github.com/felix202422/CodePath-Masterclass"))
                .andExpect(jsonPath("$.localPathConfigured").value(true))
                .andExpect(jsonPath("$.localPath").value(CURRICULUM.toString()))
                .andExpect(jsonPath("$.commitPin").value(""));
    }

    @Test
    void catalogLifecycleFollowsThePublicationCascade() throws Exception {
        Cookie session = signIn();

        String pathId = createPath(session, "contract-path");
        String courseId = createCourse(session, pathId, "contract-course");
        String moduleId = createModule(session, courseId, "Contract Module");
        String lessonId = createLesson(session, moduleId, "first-lesson");

        // Publication is bottom-up; each premature step gets an honest 409.
        mockMvc.perform(post("/api/v1/admin/lessons/" + lessonId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("owning module")));
        mockMvc.perform(post("/api/v1/admin/modules/" + moduleId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("owning course")));
        mockMvc.perform(post("/api/v1/admin/courses/" + courseId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("owning learning path")));

        // Publish bottom-up: path → course → module → lesson.
        mockMvc.perform(post("/api/v1/admin/paths/" + pathId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mockMvc.perform(post("/api/v1/admin/courses/" + courseId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mockMvc.perform(post("/api/v1/admin/modules/" + moduleId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"));
        mockMvc.perform(post("/api/v1/admin/lessons/" + lessonId + "/status")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"PUBLISHED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.publishedAt", notNullValue()));

        // Reads reflect the hierarchy the frontend screens render.
        mockMvc.perform(get("/api/v1/admin/courses?pathId=" + pathId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].slug").value("contract-course"))
                .andExpect(jsonPath("$[0].status").value("PUBLISHED"));
        mockMvc.perform(get("/api/v1/admin/courses/" + courseId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.course.slug").value("contract-course"))
                .andExpect(jsonPath("$.modules.length()").value(1))
                .andExpect(jsonPath("$.modules[0].publishedLessonCount").value(1));
        mockMvc.perform(get("/api/v1/admin/modules/" + moduleId + "/lessons")
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].slug").value("first-lesson"));

        // Duplicate slugs are refused with a conflict, not a 500.
        mockMvc.perform(post("/api/v1/admin/paths").with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"contract-path","name":"Duplicate",\
                                "summary":"Must collide with the existing slug."}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("slug")));

        // Administrator edits keep the lesson published and protected.
        mockMvc.perform(put("/api/v1/admin/lessons/" + lessonId).with(csrf())
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"first-lesson","title":"First Lesson",\
                                "summary":"Edited in the academy.",\
                                "bodyMarkdown":"# First Lesson\\n\\nEdited body."}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PUBLISHED"))
                .andExpect(jsonPath("$.editedByAdmin").value(true))
                .andExpect(jsonPath("$.bodyMarkdown").value(containsString("Edited body")));
    }

    @Test
    void importRunOverHttpIsIdempotentAndLedgerIsQueryable() throws Exception {
        Cookie session = signIn();

        mockMvc.perform(post("/api/v1/admin/content/imports").with(csrf())
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.mode").value("LOCAL"))
                .andExpect(jsonPath("$.lessonsCreated").value(3))
                .andExpect(jsonPath("$.lessonsUpdated").value(0))
                .andExpect(jsonPath("$.lessonsUnchanged").value(0))
                .andExpect(jsonPath("$.conflictsStaged").value(0))
                .andExpect(jsonPath("$.failures").value(0))
                .andExpect(jsonPath("$.subjectsScanned").value(3))
                .andExpect(jsonPath("$.mediaFilesStored").value(1))
                .andExpect(jsonPath("$.unmappedSubjects[0]").value("99-UNMAPPED-SUBJECT"));

        // The ledger is queryable by status and capped by limit.
        MvcResult listed = mockMvc.perform(
                        get("/api/v1/admin/content/imports?limit=100").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[*].status", everyItem(is("IMPORTED"))))
                .andReturn();
        mockMvc.perform(get("/api/v1/admin/content/imports?status=CONFLICT&limit=100")
                        .cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        String firstId = objectMapper
                .readTree(listed.getResponse().getContentAsString())
                .get(0).get("id").asText();
        mockMvc.perform(get("/api/v1/admin/content/imports/" + firstId).cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentBody", containsString("Imported from")))
                .andExpect(jsonPath("$.hasProposal").value(false));

        // Only staged conflicts can be accepted or discarded.
        mockMvc.perform(post("/api/v1/admin/content/imports/" + firstId + "/accept")
                        .with(csrf()).cookie(session))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.message", containsString("staged conflicts")));
        mockMvc.perform(get("/api/v1/admin/content/imports/" + UUID.randomUUID())
                        .cookie(session))
                .andExpect(status().isNotFound());

        // Re-running the same source is idempotent: nothing created, no
        // duplicate ledger rows.
        mockMvc.perform(post("/api/v1/admin/content/imports").with(csrf())
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.lessonsCreated").value(0))
                .andExpect(jsonPath("$.lessonsUnchanged").value(3));
        mockMvc.perform(get("/api/v1/admin/content/imports?limit=100").cookie(session))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3));

        // An unknown mode is an honest 400, not a 500.
        mockMvc.perform(post("/api/v1/admin/content/imports").with(csrf())
                        .cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"mode\":\"TELEPATHY\"}"))
                .andExpect(status().isBadRequest());
    }

    // --- helpers -----------------------------------------------------------

    private Cookie signIn() throws Exception {
        String email = "catalog-admin-" + UUID.randomUUID() + "@example.test";
        AppUser administrator = new AppUser();
        administrator.setEmail(email);
        administrator.setEmailNormalized(AppUser.normalizeEmail(email));
        administrator.setPasswordHash(passwordEncoder.encode(PASSWORD));
        administrator.setFullName("Catalog Administrator");
        administrator.setRole(UserRole.ADMIN);
        administrator.setStatus(UserStatus.ACTIVE);
        userRepository.save(administrator);

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

    private String createPath(Cookie session, String slug) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/paths")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"slug":"%s","name":"Contract Path",\
                                "summary":"Path created by the Phase 5 contract test."}
                                """.formatted(slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return idOf(result);
    }

    private String createCourse(Cookie session, String pathId, String slug) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/admin/courses")
                        .with(csrf()).cookie(session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"pathId":"%s","slug":"%s","title":"Contract Course",\
                                "summary":"Course created by the Phase 5 contract test.",\
                                "level":"BEGINNER"}
                                """.formatted(pathId, slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return idOf(result);
    }

    private String createModule(Cookie session, String courseId, String title)
            throws Exception {
        MvcResult result = mockMvc.perform(
                        post("/api/v1/admin/courses/" + courseId + "/modules")
                                .with(csrf()).cookie(session)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"title\":\"%s\"}".formatted(title)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andReturn();
        return idOf(result);
    }

    private String createLesson(Cookie session, String moduleId, String slug)
            throws Exception {
        MvcResult result = mockMvc.perform(
                        post("/api/v1/admin/modules/" + moduleId + "/lessons")
                                .with(csrf()).cookie(session)
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("""
                                        {"slug":"%s","title":"First Lesson",\
                                        "bodyMarkdown":"# First Lesson\\n\\nHello."}
                                        """.formatted(slug)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("DRAFT"))
                .andExpect(jsonPath("$.editedByAdmin").value(true))
                .andReturn();
        return idOf(result);
    }

    private String idOf(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .get("id").asText();
    }
}
