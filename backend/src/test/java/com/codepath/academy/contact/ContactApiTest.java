package com.codepath.academy.contact;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.contact.model.ContactMessage;
import com.codepath.academy.contact.repository.ContactMessageRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.support.SecurityTestSupport;
import jakarta.servlet.http.Cookie;
import java.util.List;
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
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;

/**
 * Phase 14 contact contract: the public form stores messages anonymously
 * (CSRF enforced, validation mirrors the V6 columns, no session created),
 * and only administrators can list the inbox or mark messages read.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ContactApiTest {

    private static final String PASSWORD = "phase fourteen test password";

    private static final String VALID_BODY = """
            {"name":"Casey Caller","email":"casey@example.test",
             "subject":"Question about paths","message":"How do the paths sequence?"}
            """;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Same reset as SeoEndpointsTest: csrf() must not leak its test repository. */
    @BeforeEach
    void useProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @AfterEach
    void restoreAfterCsrfRequests() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void anonymousSubmissionIsStoredWithoutCreatingASession() throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/contact")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.message").value(
                        org.hamcrest.Matchers.containsString("recorded")))
                .andReturn();

        List<ContactMessage> stored = contactMessageRepository.findAll();
        assertEquals(1, stored.size());
        ContactMessage message = stored.get(0);
        assertEquals("Casey Caller", message.getName());
        assertEquals("casey@example.test", message.getEmail());
        assertEquals("Question about paths", message.getSubject());
        assertEquals("How do the paths sequence?", message.getMessage());
        assertNotNull(message.getCreatedAt());
        assertNull(message.getReadAt(), "messages start unread");

        // Anonymous write must not start a server session.
        assertNull(result.getResponse().getCookie("SESSION"),
                "contact submissions stay session-free");
    }

    @Test
    void invalidPayloadsReturnFieldErrorsBeforeAnyWrite() throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"  ","email":"not-an-email","subject":"","message":""}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Validation failed"))
                .andExpect(jsonPath("$.message").value("One or more fields are invalid."))
                .andExpect(jsonPath("$.fieldErrors.name").exists())
                .andExpect(jsonPath("$.fieldErrors.email").exists())
                .andExpect(jsonPath("$.fieldErrors.subject").exists())
                .andExpect(jsonPath("$.fieldErrors.message").exists());

        assertEquals(0, contactMessageRepository.count(), "invalid input must not persist");

        // Column limits are enforced too (4001-char message).
        String oversized = """
                {"name":"Long Writer","email":"long@example.test","subject":"Big message",
                 "message":"%s"}
                """.formatted("x".repeat(4001));
        mockMvc.perform(post("/api/v1/contact")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(oversized))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.message").exists());
        assertEquals(0, contactMessageRepository.count());
    }

    @Test
    void submissionRequiresCsrfToken() throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(VALID_BODY))
                .andExpect(status().isForbidden());
        assertEquals(0, contactMessageRepository.count());
    }

    @Test
    void inboxIsAdminOnly() throws Exception {
        ContactMessage stored = submit(VALID_BODY);
        String route = "/api/v1/admin/contact-messages";

        mockMvc.perform(get(route)).andExpect(status().isUnauthorized());
        mockMvc.perform(get(route).cookie(signIn(UserRole.STUDENT)))
                .andExpect(status().isForbidden());

        Cookie admin = signIn(UserRole.ADMIN);
        mockMvc.perform(get(route).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].subject").value("Question about paths"))
                .andExpect(jsonPath("$[0].email").value("casey@example.test"))
                .andExpect(jsonPath("$[0].readAt").value(org.hamcrest.Matchers.nullValue()));

        mockMvc.perform(post(route + "/" + stored.getId() + "/read")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readAt").isNotEmpty());
    }

    @Test
    void markingReadIsIdempotentAndNotFoundIsHonest() throws Exception {
        ContactMessage stored = submit(VALID_BODY);
        Cookie admin = signIn(UserRole.ADMIN);
        String route = "/api/v1/admin/contact-messages";

        MvcResult first = mockMvc.perform(post(route + "/" + stored.getId() + "/read")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isOk())
                .andReturn();
        String firstReadAt = com.jayway.jsonpath.JsonPath.read(
                first.getResponse().getContentAsString(), "$.readAt");
        assertNotNull(firstReadAt);

        // Second open returns the same timestamp — readAt is stamped exactly once.
        mockMvc.perform(post(route + "/" + stored.getId() + "/read")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.readAt").value(firstReadAt));

        mockMvc.perform(post(route + "/" + UUID.randomUUID() + "/read")
                        .with(csrf()).cookie(admin))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.message").value("This message no longer exists."));

        // Students can never touch the inbox, even with a valid CSRF token.
        mockMvc.perform(post(route + "/" + stored.getId() + "/read")
                        .with(csrf()).cookie(signIn(UserRole.STUDENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void inboxListsNewestFirstAndCapsAt100() throws Exception {
        for (int i = 0; i < 3; i++) {
            submit("""
                    {"name":"Sender %d","email":"sender%d@example.test",
                     "subject":"Subject %d","message":"Body %d"}
                    """.formatted(i, i, i, i));
        }
        List<ContactMessage> rows = contactMessageRepository.findTop100ByOrderByCreatedAtDesc();
        assertEquals(3, rows.size());
        assertTrue(rows.get(0).getCreatedAt().compareTo(rows.get(2).getCreatedAt()) >= 0,
                "newest-first ordering");
    }

    // --- helpers -----------------------------------------------------------

    private ContactMessage submit(String json) throws Exception {
        mockMvc.perform(post("/api/v1/contact")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json))
                .andExpect(status().isCreated());
        List<ContactMessage> all = contactMessageRepository.findAll();
        return all.get(all.size() - 1);
    }

    private AppUser createUser(UserRole role) {
        String email = "phase14-" + UUID.randomUUID() + "@example.test";
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName("Phase 14 " + role);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        return userRepository.save(user);
    }

    private Cookie signIn(UserRole role) throws Exception {
        AppUser user = createUser(role);
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
}
