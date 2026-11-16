package com.codepath.academy.announcement.api;

import com.codepath.academy.announcement.api.dto.AnnouncementResponse;
import com.codepath.academy.announcement.service.AnnouncementService;
import java.util.List;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * The signed-in student's announcement feed: PUBLISHED announcements that are
 * platform-wide or scoped to a course this student has an APPROVED enrollment
 * in. There is no public (signed-out) announcement surface yet, so this is the
 * only read path for either audience.
 */
@RestController
@RequestMapping("/api/v1/me/announcements")
public class MyAnnouncementController {

    private final AnnouncementService announcementService;

    public MyAnnouncementController(AnnouncementService announcementService) {
        this.announcementService = announcementService;
    }

    @GetMapping
    public List<AnnouncementResponse> feed(Authentication authentication) {
        return announcementService.feed(authentication.getName());
    }
}
