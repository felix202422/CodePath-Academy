package com.codepath.academy.identity;

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
import com.codepath.academy.identity.repository.RegistrationRequestRepository;
import jakarta.servlet.http.Cookie;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

/**
 * End-to-end authentication contract against real PostgreSQL:
 * registration creates a PENDING student, only administrator review activates it,
 * session login/logout works, lockout triggers after five failures, and role
 * rules hold for every identity endpoint.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthenticationFlowTest {

    private static final String PASSWORD = "correct horse battery";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private RegistrationRequestRepository registrationRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Test
    void registrationCreatesPendingStudentThatCannotSignIn() throws Exception {
        String email = unique("pending");

        register(email, PASSWORD);
        AppUser user = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserRole.STUDENT, user.getRole());
        org.junit.jupiter.api.Assertions.assertEquals(UserStatus.PENDING, user.getStatus());

        // Correct password is still not enough before administrator approval.
        login(email, PASSWORD, 403);
    }

    @Test
    void duplicateRegistrationIsRejectedWithConflict() throws Exception {
        String email = unique("dup");
        register(email, PASSWORD);
        registerExpecting(email, PASSWORD, 409);
    }

    @Test
    void administratorApprovesThenStudentCanUseSession() throws Exception {
        String email = unique("approved");
        register(email, PASSWORD);
        AppUser student = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow();

        // Reviewer: an ACTIVE administrator created directly in the store (the
        // bootstrap runner is covered by its own unit test).
        String adminEmail = unique("admin");
        createActiveAdmin(adminEmail);
        Cookie adminSession = login(adminEmail, PASSWORD, 200);

        UUID requestId = registrationRepository.findByUserId(student.getId()).orElseThrow().getId();
        mockMvc.perform(post("/api/v1/admin/registrations/" + requestId + "/approve")
                        .with(csrf())
                        .cookie(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"ok\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPROVED"));

        AppUser approved = userRepository.findById(student.getId()).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(UserStatus.ACTIVE, approved.getStatus());

        // Student signs in and reads the session account.
        Cookie studentSession = login(email, PASSWORD, 200);
        mockMvc.perform(get("/api/v1/auth/me").cookie(studentSession))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(email))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"));

        // Logout invalidates the session; /me then reports 401.
        mockMvc.perform(post("/api/v1/auth/logout")
                        .with(csrf())
                        .cookie(studentSession))
                .andExpect(status().isNoContent());
        mockMvc.perform(get("/api/v1/auth/me").cookie(studentSession))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rejectedRegistrationIsToldHonestlyWhy() throws Exception {
        String email = unique("rejected");
        register(email, PASSWORD);
        AppUser student = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow();

        String adminEmail = unique("admin");
        createActiveAdmin(adminEmail);
        Cookie adminSession = login(adminEmail, PASSWORD, 200);

        UUID requestId = registrationRepository.findByUserId(student.getId()).orElseThrow().getId();
        mockMvc.perform(post("/api/v1/admin/registrations/" + requestId + "/reject")
                        .with(csrf())
                        .cookie(adminSession)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"notes\":\"not eligible\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        MvcResult denied = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, PASSWORD)))
                .andExpect(status().isForbidden())
                .andReturn();
        org.junit.jupiter.api.Assertions.assertTrue(
                denied.getResponse().getContentAsString().contains("rejected"),
                "403 body should explain the rejection: " + denied.getResponse().getContentAsString());
    }

    @Test
    void studentCannotReachAdminEndpoints() throws Exception {
        String email = unique("student403");
        register(email, PASSWORD);
        AppUser student = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow();
        activate(student);

        Cookie session = login(email, PASSWORD, 200);
        mockMvc.perform(get("/api/v1/admin/registrations").cookie(session))
                .andExpect(status().isForbidden());
    }

    @Test
    void fiveFailedAttemptsLockTheAccountEvenWithTheCorrectPassword() throws Exception {
        String email = unique("locked");
        register(email, PASSWORD);
        AppUser user = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow();
        activate(user);

        for (int i = 0; i < 5; i++) {
            login(email, "wrong-password-" + i, 401);
        }
        // Lock is now active: the correct password must also be refused, with 429.
        login(email, PASSWORD, 429);
    }

    @Test
    void malformedJsonBodyIsRejectedWith400() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{not json"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    // --- helpers -----------------------------------------------------------

    private static String unique(String prefix) {
        return prefix + "-" + UUID.randomUUID() + "@example.test";
    }

    private void register(String email, String password) throws Exception {
        registerExpecting(email, password, 201);
    }

    private void registerExpecting(String email, String password, int expected) throws Exception {
        mockMvc.perform(post("/api/v1/registration")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"fullName":"Test Person","email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().is(expected));
    }

    /** Performs a login and returns the Spring Session cookie for follow-up requests. */
    private Cookie login(String email, String password, int expected) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/v1/auth/login")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s"}
                                """.formatted(email, password)))
                .andExpect(status().is(expected))
                .andReturn();
        if (expected != 200) {
            return null;
        }
        Cookie sessionCookie = result.getResponse().getCookie("SESSION");
        assertNotNull(sessionCookie, "Successful login should issue a Spring Session cookie");
        return new Cookie("SESSION", sessionCookie.getValue());
    }

    private void createActiveAdmin(String email) {
        AppUser admin = new AppUser();
        admin.setEmail(email);
        admin.setEmailNormalized(AppUser.normalizeEmail(email));
        admin.setPasswordHash(passwordEncoder.encode(PASSWORD));
        admin.setFullName("Test Administrator");
        admin.setRole(UserRole.ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        userRepository.save(admin);
    }

    private void activate(AppUser user) {
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
    }
}
