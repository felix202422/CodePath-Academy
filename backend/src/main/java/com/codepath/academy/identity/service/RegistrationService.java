package com.codepath.academy.identity.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.identity.api.dto.RegisterRequest;
import com.codepath.academy.identity.api.dto.RegisterResponse;
import com.codepath.academy.identity.api.dto.RegistrationRequestResponse;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.RegistrationRequest;
import com.codepath.academy.identity.model.RegistrationStatus;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.identity.repository.RegistrationRequestRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registration and administrator review. Clients can never set a role or
 * status: registration always creates a PENDING STUDENT, and only review
 * transitions the account to ACTIVE or REJECTED.
 */
@Service
public class RegistrationService {

    private final AppUserRepository userRepository;
    private final RegistrationRequestRepository registrationRepository;
    private final PasswordEncoder passwordEncoder;

    public RegistrationService(AppUserRepository userRepository,
                               RegistrationRequestRepository registrationRepository,
                               PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.registrationRepository = registrationRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String normalized = AppUser.normalizeEmail(request.email());
        if (userRepository.existsByEmailNormalized(normalized)) {
            throw ApiException.conflict("An account with this email already exists.");
        }

        AppUser user = new AppUser();
        user.setEmail(request.email().trim());
        user.setEmailNormalized(normalized);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setRole(UserRole.STUDENT);
        user.setStatus(UserStatus.PENDING);
        user.setInterests(blankToNull(request.interests()));
        userRepository.save(user);

        RegistrationRequest registration = new RegistrationRequest();
        registration.setUser(user);
        registration.setStatus(RegistrationStatus.PENDING);
        registrationRepository.save(registration);

        return new RegisterResponse(
                "Registration submitted. An administrator will review your request before you can sign in.");
    }

    @Transactional(readOnly = true)
    public List<RegistrationRequestResponse> listByStatus(RegistrationStatus status) {
        return registrationRepository.findByStatusOrderByCreatedAtAsc(status).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public RegistrationRequestResponse approve(UUID requestId, String adminEmail, String notes) {
        return review(requestId, adminEmail, notes, RegistrationStatus.APPROVED);
    }

    @Transactional
    public RegistrationRequestResponse reject(UUID requestId, String adminEmail, String notes) {
        return review(requestId, adminEmail, notes, RegistrationStatus.REJECTED);
    }

    private RegistrationRequestResponse review(UUID requestId, String adminEmail, String notes,
                                               RegistrationStatus decision) {
        RegistrationRequest registration = registrationRepository.findByIdWithUser(requestId)
                .orElseThrow(() -> ApiException.notFound("Registration request not found."));

        if (registration.getStatus() != RegistrationStatus.PENDING) {
            throw ApiException.conflict("This registration request has already been reviewed.");
        }

        AppUser admin = userRepository
                .findByEmailNormalized(AppUser.normalizeEmail(adminEmail))
                .orElseThrow(() -> ApiException.forbidden("Administrator account not found."));

        AppUser applicant = registration.getUser();
        registration.setStatus(decision);
        registration.setReviewedBy(admin);
        registration.setReviewNotes(blankToNull(notes));
        registration.setReviewedAt(Instant.now());
        applicant.setStatus(decision == RegistrationStatus.APPROVED
                ? UserStatus.ACTIVE
                : UserStatus.REJECTED);

        registrationRepository.save(registration);
        userRepository.save(applicant);
        return toResponse(registration);
    }

    private RegistrationRequestResponse toResponse(RegistrationRequest registration) {
        AppUser user = registration.getUser();
        return new RegistrationRequestResponse(
                registration.getId(),
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                registration.getStatus().name(),
                user.getInterests(),
                registration.getCreatedAt(),
                registration.getReviewNotes(),
                registration.getReviewedAt());
    }

    private static String blankToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }
}
