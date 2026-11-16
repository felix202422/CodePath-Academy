package com.codepath.academy.announcement.api.dto;

import com.codepath.academy.announcement.model.AnnouncementAudience;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.UUID;

/**
 * Create/update payload for an announcement. courseId null means
 * platform-wide; a value scopes visibility to approved enrollees of that
 * course. Status is never accepted here — it moves through /status only.
 */
public record AnnouncementWriteRequest(
        @NotBlank @Size(max = 240) String title,
        @NotBlank @Size(max = 20000) String bodyMarkdown,
        @NotNull AnnouncementAudience audience,
        UUID courseId
) {}
