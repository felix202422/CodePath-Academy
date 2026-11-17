package com.codepath.academy.admin.service;

import com.codepath.academy.admin.api.dto.AdminDashboardResponse;
import com.codepath.academy.announcement.repository.AnnouncementRepository;
import com.codepath.academy.audit.service.AuditService;
import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.repository.CourseEnrollmentRepository;
import com.codepath.academy.identity.model.RegistrationStatus;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.identity.repository.RegistrationRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Live aggregates for the administrator dashboard. Each figure is a single
 * indexed count over the same tables the queue screens read, so the numbers
 * always match what the admin sees one click deeper.
 */
@Service
public class AdminDashboardService {

    private static final int RECENT_AUDIT_ROWS = 8;

    private final RegistrationRequestRepository registrationRepository;
    private final CourseEnrollmentRepository enrollmentRepository;
    private final AppUserRepository userRepository;
    private final CourseRepository courseRepository;
    private final LearningPathRepository pathRepository;
    private final AnnouncementRepository announcementRepository;
    private final AuditService auditService;

    public AdminDashboardService(RegistrationRequestRepository registrationRepository,
                                 CourseEnrollmentRepository enrollmentRepository,
                                 AppUserRepository userRepository,
                                 CourseRepository courseRepository,
                                 LearningPathRepository pathRepository,
                                 AnnouncementRepository announcementRepository,
                                 AuditService auditService) {
        this.registrationRepository = registrationRepository;
        this.enrollmentRepository = enrollmentRepository;
        this.userRepository = userRepository;
        this.courseRepository = courseRepository;
        this.pathRepository = pathRepository;
        this.announcementRepository = announcementRepository;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public AdminDashboardResponse dashboard() {
        return new AdminDashboardResponse(
                registrationRepository.countByStatus(RegistrationStatus.PENDING),
                enrollmentRepository.countByStatus(EnrollmentStatus.PENDING),
                userRepository.countByRoleAndStatus(UserRole.STUDENT, UserStatus.ACTIVE),
                userRepository.countByRoleAndStatus(UserRole.STUDENT, UserStatus.SUSPENDED),
                courseRepository.countByStatus(ContentStatus.PUBLISHED),
                pathRepository.countByStatus(ContentStatus.PUBLISHED),
                announcementRepository.countByStatus(ContentStatus.PUBLISHED),
                auditService.recent(null, RECENT_AUDIT_ROWS));
    }
}
