package com.codepath.academy.identity;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.context.WebApplicationContext;

/**
 * Self-service password change against real PostgreSQL: the endpoint is
 * authenticated only (never anonymous through the /auth/** wildcard), the
 * current password is re-proved with a field-scoped 400 when wrong, validation
 * mirrors registration policy, and a success swaps the sign-in credential
 * without killing the current session.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ChangePasswordApiTest {

    private static final String PASSWORD = "correct horse battery";

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext wac;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    @Test
    void anonymousChangePasswordIsRejectedWith401() throws Exception {
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"anything-old-1","newPassword":"anything-new-1"}
                                """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void changePasswordWithoutCsrfTokenIsRejectedWith403() throws Exception {
        ActiveUser user = createActiveStudent();

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"brand new pass 1"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isForbidden());
    }

    @Test
    void wrongCurrentPasswordIsAFieldScoped400ThatKeepsTheOldCredential() throws Exception {
        ActiveUser user = createActiveStudent();

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"not-the-current-1","newPassword":"brand new pass 1"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.currentPassword")
                        .value("The current password is incorrect."));

        // The stored credential is untouched: the old password still signs in.
        login(user.email, PASSWORD, 200);
    }

    @Test
    void newPasswordMustMeetRegistrationPolicy() throws Exception {
        ActiveUser user = createActiveStudent();

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"short"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.newPassword").exists());
    }

    @Test
    void newPasswordMustDifferFromTheCurrentOne() throws Exception {
        ActiveUser user = createActiveStudent();

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"%s"}
                                """.formatted(PASSWORD, PASSWORD)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.newPassword")
                        .value("The new password must differ from the current one."));
    }

    @Test
    void successfulChangeSwapsTheCredentialAndKeepsTheSession() throws Exception {
        ActiveUser user = createActiveStudent();
        String nextPassword = "a completely new secret";

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"%s"}
                                """.formatted(PASSWORD, nextPassword)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("Password updated."));

        // The current session keeps working — no forced sign-out on change.
        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"another new secret 2"}
                                """.formatted(nextPassword)))
                .andExpect(status().isOk());

        // Old credential refused, new credential accepted.
        login(user.email, PASSWORD, 401);
        login(user.email, "another new secret 2", 200);
    }

    @Test
    void successfulChangeClearsStaleFailedLoginAttempts() throws Exception {
        ActiveUser user = createActiveStudent();

        // Two failed sign-ins leave residue in the counters.
        login(user.email, "wrong-one-111", 401);
        login(user.email, "wrong-two-222", 401);
        AppUser before = userRepository.findById(user.id).orElseThrow();
        org.junit.jupiter.api.Assertions.assertTrue(before.getFailedAttempts() > 0);

        mockMvc.perform(post("/api/v1/auth/change-password")
                        .with(csrf())
                        .cookie(user.session)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"currentPassword":"%s","newPassword":"brand new pass 9"}
                                """.formatted(PASSWORD)))
                .andExpect(status().isOk());

        AppUser after = userRepository.findById(user.id).orElseThrow();
        org.junit.jupiter.api.Assertions.assertEquals(0, after.getFailedAttempts());
        org.junit.jupiter.api.Assertions.assertNull(after.getLockedUntil());
    }

    // --- helpers -----------------------------------------------------------

    /**
     * Same CSRF-repository hygiene as AuthenticationFlowTest: .with(csrf())
     * swaps the shared token repository, restore it for later test classes.
     */
    @AfterEach
    void restoreProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    private record ActiveUser(UUID id, String email, Cookie session) {}

    /** Creates an ACTIVE student directly in the store and returns a live session. */
    private ActiveUser createActiveStudent() throws Exception {
        String email = "ch-" + UUID.randomUUID() + "@example.test";
        AppUser user = new AppUser();
        user.setEmail(email);
        user.setEmailNormalized(AppUser.normalizeEmail(email));
        user.setPasswordHash(passwordEncoder.encode(PASSWORD));
        user.setFullName("Change Password Student");
        user.setRole(UserRole.STUDENT);
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);

        Cookie session = login(email, PASSWORD, 200);
        return new ActiveUser(user.getId(), email, session);
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
}
