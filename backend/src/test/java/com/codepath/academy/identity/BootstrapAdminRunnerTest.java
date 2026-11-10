package com.codepath.academy.identity.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.codepath.academy.config.AppProperties;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * Bootstrap administrator rules: disabled by default, idempotent when an admin
 * exists, and never overwriting an already-registered email.
 */
@ExtendWith(MockitoExtension.class)
class BootstrapAdminRunnerTest {

    @Mock
    private AppUserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    private AppProperties properties(boolean enabled, String email, String password) {
        return new AppProperties(
                new AppProperties.Web(new String[] {"http://localhost:5173"}, false),
                new AppProperties.BootstrapAdmin(enabled, email, password),
                new AppProperties.Curriculum("felix202422/CodePath-Masterclass", ""),
                new AppProperties.Media("./data/test-media"));
    }

    private BootstrapAdminRunner runner(AppProperties properties) {
        return new BootstrapAdminRunner(properties, userRepository, passwordEncoder);
    }

    @Test
    void disabledBootstrapDoesNothing() throws Exception {
        runner(properties(false, "admin@example.test", "secret")).run(null);

        verify(userRepository, never()).existsByRole(any());
        verify(userRepository, never()).save(any());
    }

    @Test
    void existingAdminSkipsBootstrap() throws Exception {
        when(userRepository.existsByRole(UserRole.ADMIN)).thenReturn(true);

        runner(properties(true, "admin@example.test", "secret")).run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void missingCredentialsSkipBootstrap() throws Exception {
        when(userRepository.existsByRole(UserRole.ADMIN)).thenReturn(false);

        runner(properties(true, "  ", "secret")).run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void alreadyRegisteredEmailSkipsBootstrap() throws Exception {
        when(userRepository.existsByRole(UserRole.ADMIN)).thenReturn(false);
        when(userRepository.existsByEmailNormalized("taken@example.test")).thenReturn(true);

        runner(properties(true, "Taken@Example.Test", "secret")).run(null);

        verify(userRepository, never()).save(any());
    }

    @Test
    void enabledBootstrapCreatesActiveAdministrator() throws Exception {
        when(userRepository.existsByRole(UserRole.ADMIN)).thenReturn(false);
        when(userRepository.existsByEmailNormalized("fresh@example.test")).thenReturn(false);
        when(passwordEncoder.encode("secret")).thenReturn("$2a$hashed");

        runner(properties(true, "Fresh@Example.test", "secret")).run(null);

        ArgumentCaptor<AppUser> captor = ArgumentCaptor.forClass(AppUser.class);
        verify(userRepository).save(captor.capture());
        AppUser saved = captor.getValue();
        assertEquals(UserRole.ADMIN, saved.getRole());
        assertEquals(UserStatus.ACTIVE, saved.getStatus());
        assertEquals("fresh@example.test", saved.getEmailNormalized());
        assertEquals("$2a$hashed", saved.getPasswordHash());
        assertNull(saved.getLockedUntil());
        assertTrue(saved.getFailedAttempts() == 0);
        assertEquals(UUID.class, saved.getId() == null ? UUID.class : saved.getId().getClass());
    }
}
