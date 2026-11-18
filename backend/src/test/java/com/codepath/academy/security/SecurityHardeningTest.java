package com.codepath.academy.security;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
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
 * Phase 10 security hardening contract: the browser header policy (CSP, frame
 * and content-type options, HSTS only on TLS), the CORS allow-list for both
 * preflight and actual requests, session cookie flags, BCrypt password storage
 * that never leaks into any API view, a route sweep proving anonymous and
 * wrong-role callers never reach {@code /api/v1/admin/**} or
 * {@code /api/v1/me/**}, and the actuator surface.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SecurityHardeningTest {

    private static final String PASSWORD = "phase ten hardening password";

    private static final String CSP = "default-src 'self'; img-src 'self' data:; "
            + "style-src 'self' 'unsafe-inline'; script-src 'self'; object-src 'none'; "
            + "base-uri 'self'; frame-ancestors 'none'";

    private static final String ALLOWED_ORIGIN = "http://localhost:5173";

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
    void browserHardeningHeadersShipOnSuccessAndErrorResponses() throws Exception {
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Security-Policy", CSP))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));

        // A JSON error response carries the same policy as a successful one.
        mockMvc.perform(get("/api/v1/admin/students"))
                .andExpect(status().isUnauthorized())
                .andExpect(header().string("Content-Security-Policy", CSP))
                .andExpect(header().string("X-Frame-Options", "DENY"))
                .andExpect(header().string("X-Content-Type-Options", "nosniff"));
    }

    @Test
    void strictTransportSecurityIsEmittedOnlyForSecureRequests() throws Exception {
        // Plain HTTP must not promise HSTS to a browser that cannot honour it.
        mockMvc.perform(get("/api/v1/health"))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist("Strict-Transport-Security"));

        // Over TLS the header appears with the configured directives.
        mockMvc.perform(get("/api/v1/health").secure(true))
                .andExpect(status().isOk())
                .andExpect(header().string("Strict-Transport-Security",
                        containsString("max-age=31536000")))
                .andExpect(header().string("Strict-Transport-Security",
                        containsString("includeSubDomains")));
    }

    @Test
    void corsAllowListCoversPreflightAndActualRequests() throws Exception {
        // The configured SPA origin completes a preflight.
        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", ALLOWED_ORIGIN)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,x-xsrf-token"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"))
                .andExpect(header().string("Access-Control-Allow-Methods",
                        containsString("POST")));

        mockMvc.perform(get("/api/v1/health").header("Origin", ALLOWED_ORIGIN))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", ALLOWED_ORIGIN));

        // Any other origin is refused before the handler runs, on both kinds
        // of request, and never receives a usable CORS response.
        mockMvc.perform(options("/api/v1/auth/login")
                        .header("Origin", "https://evil.example")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));

        mockMvc.perform(get("/api/v1/health").header("Origin", "https://evil.example"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }

    @Test
    void sessionCookieIsHttpOnlySameSiteAndNeverIssuedWithASecureFlagOnHttp() throws Exception {
        String email = unique("cookie");
        createAccount(UserRole.STUDENT, email, "Cookie Student");

        MvcResult loginResponse = login(email, PASSWORD);
        String sessionCookie = sessionCookieFrom(loginResponse);
        String attributes = sessionCookie.substring(sessionCookie.indexOf(';'));
        assertTrue(attributes.contains("HttpOnly"),
                "the session cookie must be unreadable from script: " + sessionCookie);
        assertTrue(attributes.contains("SameSite=Lax"),
                "the session cookie must be SameSite=Lax: " + sessionCookie);
        assertFalse(attributes.contains("Secure"),
                "a plain-HTTP login must not mark the cookie Secure: " + sessionCookie);

        // Spring Session replaces the container cookie entirely.
        String allCookies = String.join(" ",
                loginResponse.getResponse().getHeaders("Set-Cookie"));
        assertFalse(allCookies.contains("JSESSIONID"),
                "Spring Session must not leave a container session cookie: " + allCookies);
    }

    @Test
    void secureRequestsGetASecureSessionCookie() throws Exception {
        String email = unique("tls");
        createAccount(UserRole.STUDENT, email, "TLS Student");

        MvcResult login = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf()).secure(true)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isOk())
                .andReturn();
        String sessionCookie = sessionCookieFrom(login);
        String attributes = sessionCookie.substring(sessionCookie.indexOf(';'));
        assertTrue(attributes.contains("Secure"),
                "a login over TLS must mark the session cookie Secure: " + sessionCookie);
        assertTrue(attributes.contains("HttpOnly"),
                "the session cookie must stay HttpOnly: " + sessionCookie);
    }

    @Test
    void passwordsAreHashedAtRestAndNeverSerialized() throws Exception {
        // A real registration: the stored value must be a BCrypt hash.
        String pendingEmail = unique("hash");
        mockMvc.perform(post("/api/v1/registration").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Hash Student","email":"%s","password":"%s"}
                                """.formatted(pendingEmail, PASSWORD)))
                .andExpect(status().isCreated());
        AppUser stored = userRepository
                .findByEmailNormalized(AppUser.normalizeEmail(pendingEmail)).orElseThrow();
        String hash = stored.getPasswordHash();
        assertTrue(hash.startsWith("$2"), "passwords must be stored as BCrypt: " + hash);
        assertFalse(hash.contains(PASSWORD), "the plaintext must not be stored");
        assertFalse(PASSWORD.equals(hash));
        assertTrue(passwordEncoder.matches(PASSWORD, hash),
                "the stored hash must verify the original password");

        // No API view of that account carries the hash or the plaintext.
        Cookie admin = adminSession();
        String registrations = mockMvc.perform(
                        get("/api/v1/admin/registrations?status=PENDING").cookie(admin))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(registrations.contains(hash), "registration rows must not expose the hash");
        assertFalse(registrations.contains(PASSWORD),
                "registration rows must not expose the plaintext password");

        // An authenticated session view of a live account is equally clean.
        String activeEmail = unique("session");
        createAccount(UserRole.STUDENT, activeEmail, "Session Student");
        Cookie student = signIn(activeEmail, PASSWORD);
        String me = mockMvc.perform(get("/api/v1/auth/me").cookie(student))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertFalse(me.contains(hash), "/auth/me must not expose the password hash");
        assertFalse(me.contains(PASSWORD), "/auth/me must not expose the plaintext password");
        mockMvc.perform(get("/api/v1/auth/me").cookie(student))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void routeSweepKeepsAdminAndMeSurfacesClosed() throws Exception {
        String studentEmail = unique("sweep-student");
        createAccount(UserRole.STUDENT, studentEmail, "Sweep Student");
        Cookie student = signIn(studentEmail, PASSWORD);
        Cookie administrator = adminSession();

        String[] adminRoutes = {
                "/api/v1/admin/dashboard",
                "/api/v1/admin/students",
                "/api/v1/admin/registrations",
                "/api/v1/admin/enrollments",
                "/api/v1/admin/announcements",
                "/api/v1/admin/audit",
                "/api/v1/admin/paths",
                "/api/v1/admin/content/imports",
                "/api/v1/admin/content/import-source"
        };
        for (String route : adminRoutes) {
            mockMvc.perform(get(route)).andExpect(status().isUnauthorized());
            mockMvc.perform(get(route).cookie(student)).andExpect(status().isForbidden());
        }
        // Positive controls: the same reads succeed for an administrator.
        String[] administratorReadable = {
                "/api/v1/admin/dashboard",
                "/api/v1/admin/students",
                "/api/v1/admin/registrations",
                "/api/v1/admin/enrollments",
                "/api/v1/admin/announcements",
                "/api/v1/admin/audit"
        };
        for (String route : administratorReadable) {
            mockMvc.perform(get(route).cookie(administrator)).andExpect(status().isOk());
        }

        String[] studentRoutes = {
                "/api/v1/me/enrollments",
                "/api/v1/me/learning",
                "/api/v1/me/assessments",
                "/api/v1/me/announcements"
        };
        for (String route : studentRoutes) {
            mockMvc.perform(get(route)).andExpect(status().isUnauthorized());
            mockMvc.perform(get(route).cookie(administrator)).andExpect(status().isForbidden());
            mockMvc.perform(get(route).cookie(student)).andExpect(status().isOk());
        }
        mockMvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/auth/me").cookie(student)).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/auth/me").cookie(administrator))
                .andExpect(status().isOk());

        // Mutations follow the same rules; the administrator's 400 proves the
        // request reached the handler instead of being blocked by routing.
        mockMvc.perform(post("/api/v1/admin/paths").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/admin/paths").with(csrf()).cookie(student)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/admin/paths").with(csrf()).cookie(administrator)
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/api/v1/me/enrollments/" + UUID.randomUUID())
                        .with(csrf()).contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/v1/me/enrollments/" + UUID.randomUUID())
                        .with(csrf()).cookie(administrator)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/me/enrollments/" + UUID.randomUUID())
                        .with(csrf()).cookie(student)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    void actuatorExposesOnlyHealthAndInfo() throws Exception {
        mockMvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"));
        mockMvc.perform(get("/actuator/info")).andExpect(status().isOk());
        mockMvc.perform(get("/actuator/env")).andExpect(status().isNotFound());
        mockMvc.perform(get("/actuator/beans")).andExpect(status().isNotFound());
        mockMvc.perform(get("/actuator/metrics")).andExpect(status().isNotFound());
    }

    // --- helpers -----------------------------------------------------------

    private static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.test";
    }

    private void createAccount(UserRole role, String email, String name) {
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName(name);
        user.setRole(role);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }

    /** Creates and signs in a fresh ACTIVE administrator. */
    private Cookie adminSession() throws Exception {
        String email = unique("hardening-admin");
        createAccount(UserRole.ADMIN, email, "Hardening Administrator");
        return signIn(email, PASSWORD);
    }

    private Cookie signIn(String email, String password) throws Exception {
        Cookie session = login(email, password).getResponse().getCookie("SESSION");
        assertNotNull(session, "login must issue a session cookie");
        return new Cookie("SESSION", session.getValue());
    }

    /** Performs a login that must succeed and returns the raw response. */
    private MvcResult login(String email, String password) throws Exception {
        return mockMvc.perform(post("/api/v1/auth/login").with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn();
    }

    private static String sessionCookieFrom(MvcResult login) {
        return login.getResponse().getHeaders("Set-Cookie").stream()
                .filter(header -> header.startsWith("SESSION="))
                .findFirst()
                .orElseThrow(() -> new AssertionError("no SESSION cookie in Set-Cookie: "
                        + login.getResponse().getHeaders("Set-Cookie")));
    }
}
