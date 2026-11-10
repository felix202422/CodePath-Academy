package com.codepath.academy.identity.api.dto;

import jakarta.validation.constraints.Size;

/** Optional reviewer notes captured on approve/reject. */
public record ReviewRequest(@Size(max = 1000) String notes) {}
