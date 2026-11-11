package com.codepath.academy.security;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.support.SecurityTestSupport;
import java.util.Locale;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

/**
 * Security contract tests. Every protected endpoint must deny anonymous callers and
 * every browser mutation must require a CSRF token. These run on every build so a
 * future endpoint cannot silently open up.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.BEFORE_CLASS)
class SecurityAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    /**
     * This class issues {@code .with(csrf())} requests; spring-security-test swaps the
     * shared CsrfFilter repository to a session-backed one and never swaps it back.
     * Restore the production cookie repository so tests running after this class
     * (notably the public no-session contract) do not depend on class order.
     */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void adminApiRejectsAnonymousCallers() throws Exception {
        mockMvc.perform(get("/api/v1/admin/students"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticatedPrefixRejectsAnonymousCallers() throws Exception {
        mockMvc.perform(get("/api/v1/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void mutationWithoutCsrfTokenIsRejected() throws Exception {
        mockMvc.perform(post("/api/v1/admin/courses")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void csrfCookieIsIssuedForTheSpa() throws Exception {
        var result = mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andReturn();
        var csrfCookieHeader = result.getResponse().getHeaders("Set-Cookie").stream()
                .filter(value -> value.startsWith("XSRF-TOKEN="))
                .findFirst()
                .orElse(null);
        assertNotNull(csrfCookieHeader, "The SPA needs an XSRF-TOKEN cookie on a safe GET; Set-Cookie headers="
                + result.getResponse().getHeaders("Set-Cookie"));
        assertFalse(csrfCookieHeader.toLowerCase(Locale.ROOT).contains("httponly"),
                "The SPA must be able to echo the CSRF cookie in a header");
    }

    @Test
    void securityHeadersArePresent() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                .andExpect(header().string("X-Frame-Options", "DENY"));
    }

    @Test
    void mutationWithCsrfTokenPassesAuthorizationCheck() throws Exception {
        // Passes CSRF; reaches authorization and is denied as anonymous — proves the
        // 403 above came from the missing token, not from an unrelated failure.
        mockMvc.perform(post("/api/v1/admin/courses")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }
}
