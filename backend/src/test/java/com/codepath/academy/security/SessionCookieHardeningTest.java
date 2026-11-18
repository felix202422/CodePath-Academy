package com.codepath.academy.security;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

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

/**
 * Phase 10: {@code app.web.cookie-secure} must actually reach the session
 * cookie serializer. With the flag forced on, the SESSION cookie is marked
 * Secure even though the container sees plain HTTP — the TLS-terminating
 * proxy deployment where {@code request.isSecure()} would otherwise skip the
 * flag. The default (flag off) keeps Spring Session's request-based rule and
 * is covered by {@code SecurityHardeningTest}.
 */
@SpringBootTest(properties = "app.web.cookie-secure=true")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SessionCookieHardeningTest {

    private static final String PASSWORD = "forced secure cookie password";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void forcedSecureSettingMarksTheSessionCookieSecure() throws Exception {
        String email = "secure-cookie-" + UUID.randomUUID() + "@example.test";
        AppUser student = new AppUser();
        student.setEmail(email);
        student.setEmailNormalized(AppUser.normalizeEmail(email));
        student.setPasswordHash(passwordEncoder.encode(PASSWORD));
        student.setFullName("Forced Secure Student");
        student.setRole(UserRole.STUDENT);
        student.setStatus(UserStatus.ACTIVE);
        userRepository.save(student);

        MvcResult login = mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        String sessionCookie = login.getResponse().getHeaders("Set-Cookie").stream()
                .filter(header -> header.startsWith("SESSION="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no SESSION cookie in Set-Cookie: "
                        + login.getResponse().getHeaders("Set-Cookie")));
        String attributes = sessionCookie.substring(sessionCookie.indexOf(';'));
        assertTrue(attributes.contains("Secure"),
                "app.web.cookie-secure=true must mark the session cookie Secure: "
                        + sessionCookie);
        assertTrue(attributes.contains("HttpOnly"),
                "the session cookie must stay HttpOnly: " + sessionCookie);
        assertTrue(attributes.contains("SameSite=Lax"),
                "the session cookie must stay SameSite=Lax: " + sessionCookie);

        // The cookie still authenticates: the flag changes attributes, not value.
        Cookie session = new Cookie("SESSION",
                sessionCookie.substring("SESSION=".length(), sessionCookie.indexOf(';')));
        assertNotNull(session.getValue());
        mockMvc.perform(get("/api/v1/auth/me").cookie(session))
                .andExpect(status().isOk());
    }
}
