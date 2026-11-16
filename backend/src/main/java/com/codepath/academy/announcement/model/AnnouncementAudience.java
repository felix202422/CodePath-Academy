package com.codepath.academy.announcement.model;

/**
 * Who an announcement is written for. STUDENTS is the default from the
 * baseline schema; ALL marks an announcement that is also intended for a
 * future public (signed-out) surface. Both audiences are visible to signed-in
 * students — the public surface does not exist yet, so the student feed
 * includes both and the column is carried as authored intent.
 */
public enum AnnouncementAudience {
    STUDENTS,
    ALL
}
