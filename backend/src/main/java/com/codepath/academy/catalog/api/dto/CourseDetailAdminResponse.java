package com.codepath.academy.catalog.api.dto;

import java.util.List;

/** Course detail for administrators: metadata plus its modules (with counts). */
public record CourseDetailAdminResponse(
        CourseAdminResponse course,
        List<ModuleAdminResponse> modules) {
}
