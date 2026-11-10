package com.codepath.academy.identity.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Single authentication path for the API:
 * - unknown email or wrong password → BadCredentials (401), indistinguishable
 * - 5 consecutive failures → temporary lock (429), reset on success
 * - PENDING / REJECTED / SUSPENDED accounts → 403 with an honest reason
 * - ACTIVE → authenticated token carrying ROLE_* authorities for the session
 */
@Component
public class ApiAuthenticationProvider implements AuthenticationProvider {

    static final int MAX_FAILED_ATTEMPTS = 5;
    static final Duration LOCK_DURATION = Duration.ofMinutes(15);

    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public ApiAuthenticationProvider(AppUserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // Deliberately NOT @Transactional: a failed attempt must still persist its
    // incremented counter, so each repository call commits on its own.
    @Override
    public Authentication authenticate(Authentication authentication) {
        String email = String.valueOf(authentication.getPrincipal());
        String rawPassword = String.valueOf(authentication.getCredentials());

        AppUser user = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(ApiAuthenticationProvider::badCredentials);

        Instant now = Instant.now();
        if (user.getLockedUntil() != null && user.getLockedUntil().isAfter(now)) {
            throw new LockedException("Too many failed attempts. Try again later.");
        }

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            int attempts = user.getFailedAttempts() + 1;
            user.setFailedAttempts(attempts);
            if (attempts >= MAX_FAILED_ATTEMPTS) {
                user.setLockedUntil(now.plus(LOCK_DURATION));
            }
            userRepository.save(user);
            throw badCredentials();
        }

        if (user.getStatus() != UserStatus.ACTIVE) {
            throw statusFailure(user.getStatus());
        }

        if (user.getFailedAttempts() > 0 || user.getLockedUntil() != null) {
            user.setFailedAttempts(0);
            user.setLockedUntil(null);
            userRepository.save(user);
        }

        return new UsernamePasswordAuthenticationToken(
                user.getEmail(),
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name())));
    }

    private static BadCredentialsException badCredentials() {
        return new BadCredentialsException("Email or password is incorrect.");
    }

    private static ApiException statusFailure(UserStatus status) {
        return switch (status) {
            case PENDING -> new ApiException(HttpStatus.FORBIDDEN, "Awaiting approval",
                    "Your registration is awaiting administrator approval.");
            case REJECTED -> new ApiException(HttpStatus.FORBIDDEN, "Registration rejected",
                    "This registration was rejected. Contact an administrator.");
            case SUSPENDED -> new ApiException(HttpStatus.FORBIDDEN, "Account suspended",
                    "This account is suspended. Contact an administrator.");
            case ACTIVE -> throw new IllegalStateException("ACTIVE accounts never fail status checks");
        };
    }

    @Override
    public boolean supports(Class<?> authentication) {
        return UsernamePasswordAuthenticationToken.class.isAssignableFrom(authentication);
    }
}
