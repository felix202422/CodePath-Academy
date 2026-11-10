package com.codepath.academy.identity.model;

/**
 * Account lifecycle. Registration always creates PENDING; only administrator
 * review moves an account to ACTIVE or REJECTED. SUSPENDED is set by admins.
 */
public enum UserStatus {
    PENDING,
    ACTIVE,
    REJECTED,
    SUSPENDED
}
