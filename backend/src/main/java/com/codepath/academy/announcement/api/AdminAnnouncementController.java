package com.codepath.academy.announcement.api;

import com.codepath.academy.announcement.api.dto.AnnouncementAdminResponse;
import com.codepath.academy.announcement.api.dto.AnnouncementWriteRequest;
import com.codepath.academy.announcement.service.AnnouncementService;
import com.codepath.academy.catalog.api.dto.StatusChangeRequest;
import com.codepath.academy.catalog.model.ContentStatus;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator management of announcements: draft-first authoring, explicit
 * publication transitions, and optional course scoping. Route rules require
 * ROLE_ADMIN; the service re-resolves the acting administrator server-side.
 */
@RestController
@RequestMapping("/api/v1/admin/announcements")
public class AdminAnnouncementController {

    private final AnnouncementService announcementService;

    public AdminAnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping
    public List<AnnouncementAdminResponse> list(
            @RequestParam(required = false) ContentStatus status) {
        return announcementService.list(status);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public AnnouncementAdminResponse create(@Valid @RequestBody AnnouncementWriteRequest request,
                                            Authentication authentication) {
        return announcementService.create(request, authentication.getName());
    }

    @PutMapping("/{id}")
    public AnnouncementAdminResponse update(@PathVariable UUID id,
                                            @Valid @RequestBody AnnouncementWriteRequest request) {
        return announcementService.update(id, request);
    }

    @PostMapping("/{id}/status")
    public AnnouncementAdminResponse changeStatus(@PathVariable UUID id,
                                                  @Valid @RequestBody StatusChangeRequest request) {
        return announcementService.changeStatus(id, request.status());
    }
}
