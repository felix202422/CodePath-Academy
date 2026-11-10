package com.codepath.academy.identity.api.admin;

import com.codepath.academy.identity.api.dto.RegistrationRequestResponse;
import com.codepath.academy.identity.api.dto.ReviewRequest;
import com.codepath.academy.identity.model.RegistrationStatus;
import com.codepath.academy.identity.service.RegistrationService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator review of registration requests. Route rules require ROLE_ADMIN,
 * and review() re-resolves the acting administrator server-side.
 */
@RestController
@RequestMapping("/api/v1/admin/registrations")
public class AdminRegistrationController {

    private final RegistrationService registrationService;

    public AdminRegistrationController(RegistrationService registrationService) {
        this.registrationService = registrationService;
    }

    @GetMapping
    public List<RegistrationRequestResponse> list(
            @RequestParam(defaultValue = "PENDING") RegistrationStatus status) {
        return registrationService.listByStatus(status);
    }

    @PostMapping("/{id}/approve")
    public RegistrationRequestResponse approve(@PathVariable UUID id,
                                               @Valid @RequestBody(required = false) ReviewRequest body,
                                               Authentication authentication) {
        return registrationService.approve(id, authentication.getName(), notes(body));
    }

    @PostMapping("/{id}/reject")
    public RegistrationRequestResponse reject(@PathVariable UUID id,
                                              @Valid @RequestBody(required = false) ReviewRequest body,
                                              Authentication authentication) {
        return registrationService.reject(id, authentication.getName(), notes(body));
    }

    private static String notes(ReviewRequest body) {
        return body == null ? null : body.notes();
    }
}
