package com.codepath.academy.learning.api.dto;

import com.codepath.academy.catalog.model.LessonResource;
import java.util.UUID;

/** A resource attached to a lesson; storage locations stay academy-managed. */
public record LearningResourceResponse(
        UUID id,
        LessonResource.Kind kind,
        String title,
        String location,
        String mimeType,
        Long sizeBytes) {

    public static LearningResourceResponse from(LessonResource resource) {
        return new LearningResourceResponse(
                resource.getId(),
                resource.getKind(),
                resource.getTitle(),
                resource.getLocation(),
                resource.getMimeType(),
                resource.getSizeBytes());
    }
}
