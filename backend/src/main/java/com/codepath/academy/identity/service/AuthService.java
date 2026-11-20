package com.codepath.academy.identity.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.identity.api.dto.SessionUserResponse;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resolves the session's account for /api/v1/auth/me and self-service password changes. */
@Service
public class AuthService {

    private final AppUserRepository userRepository;
    private final org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    public AuthService(AppUserRepository userRepository,
                       org.springframework.security.crypto.password.PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional(readOnly = true)
    public SessionUserResponse getSessionUser(String email) {
        AppUser user = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.notFound("Account not found."));
        return new SessionUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole().name(),
                user.getStatus().name());
    }

    /**
     * Changes the signed-in account's password after re-proving the current
     * one. A wrong current password is a field-scoped 400 (never 401 — the
     * session itself is fine) and deliberately does not touch the login
     * lockout counters, so a hijacked session cannot lock the owner out of
     * sign-in. A successful change clears any stale failed-login state, the
     * same reset a successful login performs; existing sessions (this one and
     * any others) stay valid until they sign out.
     */
    @Transactional
    public void changePassword(String email, String currentPassword, String newPassword) {
        AppUser user = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.notFound("Account not found."));

        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Wrong current password", "The current password is incorrect.",
                    java.util.Map.of("currentPassword", "The current password is incorrect."));
        }
        if (newPassword.equals(currentPassword)) {
            throw new ApiException(org.springframework.http.HttpStatus.BAD_REQUEST,
                    "Validation failed", "Choose a password you have not used before.",
                    java.util.Map.of("newPassword",
                            "The new password must differ from the current one."));
        }

        user.setPasswordHash(passwordEncoder.encode(newPassword));
        user.setFailedAttempts(0);
        user.setLockedUntil(null);
        userRepository.save(user);
    }
}
