package com.codepath.academy.identity.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.identity.api.dto.SessionUserResponse;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.repository.AppUserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Resolves the session's account for /api/v1/auth/me. */
@Service
public class AuthService {

    private final AppUserRepository userRepository;

    public AuthService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
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
}
