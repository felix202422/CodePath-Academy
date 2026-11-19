package com.codepath.academy.contact.api.dto;

import com.codepath.academy.contact.model.ContactMessage;
import java.time.Instant;
import java.util.UUID;

/** Administrator-inbox view of one stored contact message. */
public record ContactMessageResponse(
        UUID id,
        String name,
        String email,
        String subject,
        String message,
        Instant createdAt,
        Instant readAt
) {
    public static ContactMessageResponse from(ContactMessage entity) {
        return new ContactMessageResponse(
                entity.getId(),
                entity.getName(),
                entity.getEmail(),
                entity.getSubject(),
                entity.getMessage(),
                entity.getCreatedAt(),
                entity.getReadAt());
    }
}
