package com.codepath.academy.identity.service;

import com.codepath.academy.config.AppProperties;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * One-time administrator bootstrap from secret environment variables
 * (APP_BOOTSTRAP_ADMIN_*). Disabled by default and idempotent: it only creates
 * an account when no ADMIN exists yet, so restarts never duplicate or reset it.
 */
@Component
public class BootstrapAdminRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(BootstrapAdminRunner.class);

    private final AppProperties properties;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public BootstrapAdminRunner(AppProperties properties,
                                AppUserRepository userRepository,
                                PasswordEncoder passwordEncoder) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        AppProperties.BootstrapAdmin config = properties.bootstrapAdmin();
        if (!config.enabled()) {
            return;
        }
        if (userRepository.existsByRole(UserRole.ADMIN)) {
            log.info("Bootstrap skipped: an administrator already exists.");
            return;
        }
        if (config.email() == null || config.email().isBlank()
                || config.password() == null || config.password().isBlank()) {
            log.warn("Bootstrap enabled but APP_BOOTSTRAP_ADMIN_EMAIL/PASSWORD is empty; skipping.");
            return;
        }

        String normalized = AppUser.normalizeEmail(config.email());
        if (userRepository.existsByEmailNormalized(normalized)) {
            log.warn("Bootstrap skipped: {} is already registered.", config.email());
            return;
        }

        AppUser admin = new AppUser();
        admin.setEmail(config.email().trim());
        admin.setEmailNormalized(normalized);
        admin.setPasswordHash(passwordEncoder.encode(config.password()));
        admin.setFullName("Administrator");
        admin.setRole(UserRole.ADMIN);
        admin.setStatus(UserStatus.ACTIVE);
        userRepository.save(admin);
        log.info("Bootstrap administrator created for {}.", config.email());
    }
}
