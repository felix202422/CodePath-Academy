package com.codepath.academy.announcement.service;

import com.codepath.academy.announcement.api.dto.AnnouncementAdminResponse;
import com.codepath.academy.announcement.api.dto.AnnouncementResponse;
import com.codepath.academy.announcement.api.dto.AnnouncementWriteRequest;
import com.codepath.academy.announcement.model.Announcement;
import com.codepath.academy.announcement.repository.AnnouncementRepository;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrator-authored announcements with the shared publication lifecycle
 * (DRAFT → PUBLISHED → ARCHIVED). A null {@code courseId} makes an
 * announcement platform-wide; otherwise only students with an APPROVED
 * enrollment in that course ever see it. Status never comes from the write
 * payload — publication happens through {@link #changeStatus}.
 */
@Service
public class AnnouncementService {

    private final AnnouncementRepository announcementRepository;
    private final CourseRepository courseRepository;
    private final AppUserRepository userRepository;

    public AnnouncementService(AnnouncementRepository announcementRepository,
                               CourseRepository courseRepository,
                               AppUserRepository userRepository) {
        this.announcementRepository = announcementRepository;
        this.courseRepository = courseRepository;
        this.userRepository = userRepository;
    }

    // --- administrator surface ---------------------------------------------

    @Transactional(readOnly = true)
    public List<AnnouncementAdminResponse> list(ContentStatus status) {
        List<Announcement> announcements = status == null
                ? announcementRepository.findAllByOrderByCreatedAtDesc()
                : announcementRepository.findByStatusOrderByCreatedAtDesc(status);
        Map<UUID, String> courseTitles = courseTitles(announcements);
        return announcements.stream()
                .map(announcement -> toAdminResponse(announcement, courseTitles))
                .toList();
    }

    @Transactional
    public AnnouncementAdminResponse create(AnnouncementWriteRequest request, String adminEmail) {
        Announcement announcement = new Announcement();
        apply(announcement, request);
        announcement.setStatus(ContentStatus.DRAFT);
        announcement.setCreatedBy(requireAdmin(adminEmail));
        announcementRepository.save(announcement);
        return toAdminResponse(announcement, courseTitles(List.of(announcement)));
    }

    @Transactional
    public AnnouncementAdminResponse update(UUID id, AnnouncementWriteRequest request) {
        Announcement announcement = requireAnnouncement(id);
        apply(announcement, request);
        announcementRepository.save(announcement);
        return toAdminResponse(announcement, courseTitles(List.of(announcement)));
    }

    /**
     * Explicit publication transition. Entering PUBLISHED stamps
     * {@code publishedAt} (the student feed orders by it); leaving PUBLISHED
     * clears it so a re-publish re-stamps honestly.
     */
    @Transactional
    public AnnouncementAdminResponse changeStatus(UUID id, ContentStatus status) {
        Announcement announcement = requireAnnouncement(id);
        announcement.setStatus(status);
        announcement.setPublishedAt(status == ContentStatus.PUBLISHED ? Instant.now() : null);
        announcementRepository.save(announcement);
        return toAdminResponse(announcement, courseTitles(List.of(announcement)));
    }

    // --- student surface ----------------------------------------------------

    /** PUBLISHED announcements visible to this student, newest first. */
    @Transactional(readOnly = true)
    public List<AnnouncementResponse> feed(String studentEmail) {
        AppUser student = requireUser(studentEmail);
        List<Announcement> visible = announcementRepository.findVisibleToStudent(
                student.getId(), ContentStatus.PUBLISHED);
        Map<UUID, String> courseTitles = courseTitles(visible);
        return visible.stream()
                .map(announcement -> new AnnouncementResponse(
                        announcement.getId(),
                        announcement.getTitle(),
                        announcement.getBodyMarkdown(),
                        announcement.getAudience(),
                        announcement.getCourseId(),
                        announcement.getCourseId() == null ? null : courseTitles.get(announcement.getCourseId()),
                        announcement.getPublishedAt()))
                .toList();
    }

    // --- helpers ------------------------------------------------------------

    private void apply(Announcement announcement, AnnouncementWriteRequest request) {
        announcement.setTitle(request.title().trim());
        announcement.setBodyMarkdown(request.bodyMarkdown().trim());
        announcement.setAudience(request.audience());
        if (request.courseId() != null) {
            // A scoped announcement must point at a real course; a typo'd UUID
            // would silently hide it from everyone.
            requireCourse(request.courseId());
        }
        announcement.setCourseId(request.courseId());
    }

    private Announcement requireAnnouncement(UUID id) {
        return announcementRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Announcement not found."));
    }

    private Course requireCourse(UUID id) {
        return courseRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
    }

    private AppUser requireAdmin(String email) {
        return userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.forbidden("Administrator account not found."));
    }

    private AppUser requireUser(String email) {
        return userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.notFound("Account not found."));
    }

    /** One extra query for course titles instead of one per announcement. */
    private Map<UUID, String> courseTitles(List<Announcement> announcements) {
        List<UUID> courseIds = announcements.stream()
                .map(Announcement::getCourseId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (courseIds.isEmpty()) {
            return Map.of();
        }
        return courseRepository.findAllById(courseIds).stream()
                .collect(Collectors.toMap(Course::getId, Course::getTitle, (a, b) -> a));
    }

    private AnnouncementAdminResponse toAdminResponse(Announcement announcement,
                                                      Map<UUID, String> courseTitles) {
        AppUser creator = announcement.getCreatedBy();
        return new AnnouncementAdminResponse(
                announcement.getId(),
                announcement.getTitle(),
                announcement.getBodyMarkdown(),
                announcement.getAudience(),
                announcement.getStatus(),
                announcement.getCourseId(),
                announcement.getCourseId() == null ? null : courseTitles.get(announcement.getCourseId()),
                creator == null ? null : creator.getEmail(),
                announcement.getPublishedAt(),
                announcement.getCreatedAt(),
                announcement.getUpdatedAt());
    }
}
