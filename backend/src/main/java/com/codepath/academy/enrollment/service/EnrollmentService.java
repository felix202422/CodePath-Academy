package com.codepath.academy.enrollment.service;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.enrollment.api.dto.AdminEnrollmentResponse;
import com.codepath.academy.enrollment.api.dto.EnrollmentStatusResponse;
import com.codepath.academy.enrollment.api.dto.MyEnrollmentResponse;
import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import com.codepath.academy.enrollment.repository.CourseEnrollmentRepository;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Student enrollment requests and administrator review. The caller's identity
 * is always resolved server-side; a client can never submit an arbitrary
 * student id or reach another student's enrollment history.
 */
@Service
public class EnrollmentService {

    private final CourseEnrollmentRepository enrollmentRepository;
    private final CourseRepository courseRepository;
    private final LearningPathRepository pathRepository;
    private final AppUserRepository userRepository;

    public EnrollmentService(CourseEnrollmentRepository enrollmentRepository,
                             CourseRepository courseRepository,
                             LearningPathRepository pathRepository,
                             AppUserRepository userRepository) {
        this.enrollmentRepository = enrollmentRepository;
        this.courseRepository = courseRepository;
        this.pathRepository = pathRepository;
        this.userRepository = userRepository;
    }

    /** Submit one request for the currently signed-in active student. */
    @Transactional
    public MyEnrollmentResponse request(String studentEmail, UUID courseId) {
        AppUser student = requireUser(studentEmail, UserRole.STUDENT);
        Course course = requirePublishedCourse(courseId);

        enrollmentRepository.findByCourse_IdAndStudent_Id(courseId, student.getId())
                .ifPresent(existing -> {
                    String message = switch (existing.getStatus()) {
                        case PENDING -> "Your enrollment request is already awaiting review.";
                        case APPROVED -> "You are already enrolled in this course.";
                        case REJECTED -> "Your enrollment request was already reviewed. Contact an administrator for help.";
                    };
                    throw ApiException.conflict(message);
                });

        CourseEnrollment enrollment = new CourseEnrollment();
        enrollment.setCourse(course);
        enrollment.setStudent(student);
        enrollment.setStatus(EnrollmentStatus.PENDING);
        enrollment.setRequestedAt(Instant.now());
        try {
            return MyEnrollmentResponse.from(enrollmentRepository.saveAndFlush(enrollment));
        } catch (DataIntegrityViolationException duplicateRequest) {
            // The database unique index is the final arbiter if two requests race
            // after the existence check above.
            throw ApiException.conflict("An enrollment request already exists for this course.");
        }
    }

    /** Return the current student's status for one published course. */
    @Transactional(readOnly = true)
    public EnrollmentStatusResponse statusForCourse(String studentEmail, UUID courseId) {
        AppUser student = requireUser(studentEmail, UserRole.STUDENT);
        requirePublishedCourse(courseId);
        return enrollmentRepository.findByCourse_IdAndStudent_Id(courseId, student.getId())
                .map(EnrollmentStatusResponse::from)
                .orElseGet(() -> EnrollmentStatusResponse.notRequested(courseId));
    }

    /** Enrollment history for only the currently signed-in active student. */
    @Transactional(readOnly = true)
    public List<MyEnrollmentResponse> listMine(String studentEmail) {
        AppUser student = requireUser(studentEmail, UserRole.STUDENT);
        return enrollmentRepository.findTop100ByStudent_IdOrderByRequestedAtDesc(student.getId())
                .stream()
                .map(MyEnrollmentResponse::from)
                .toList();
    }

    /** Up to 100 recent rows for the administrator queue/history. */
    @Transactional(readOnly = true)
    public List<AdminEnrollmentResponse> listForAdmin(EnrollmentStatus status) {
        List<CourseEnrollment> rows = status == null
                ? enrollmentRepository.findTop100ByOrderByRequestedAtDesc()
                : enrollmentRepository.findTop100ByStatusOrderByRequestedAtAsc(status);
        return rows.stream().map(AdminEnrollmentResponse::from).toList();
    }

    @Transactional
    public AdminEnrollmentResponse approve(UUID enrollmentId, String administratorEmail,
                                           String notes) {
        return review(enrollmentId, administratorEmail, notes, EnrollmentStatus.APPROVED);
    }

    @Transactional
    public AdminEnrollmentResponse reject(UUID enrollmentId, String administratorEmail,
                                          String notes) {
        return review(enrollmentId, administratorEmail, notes, EnrollmentStatus.REJECTED);
    }

    private AdminEnrollmentResponse review(UUID enrollmentId, String administratorEmail,
                                            String notes, EnrollmentStatus decision) {
        AppUser administrator = requireUser(administratorEmail, UserRole.ADMIN);
        CourseEnrollment enrollment = enrollmentRepository.findByIdForReview(enrollmentId)
                .orElseThrow(() -> ApiException.notFound("Enrollment request not found."));
        if (enrollment.getStatus() != EnrollmentStatus.PENDING) {
            throw ApiException.conflict("This enrollment request has already been reviewed.");
        }

        enrollment.setStatus(decision);
        enrollment.setReviewedBy(administrator);
        enrollment.setReviewNotes(blankToNull(notes));
        enrollment.setReviewedAt(Instant.now());
        return AdminEnrollmentResponse.from(enrollmentRepository.save(enrollment));
    }

    private AppUser requireUser(String email, UserRole role) {
        AppUser user = userRepository.findByEmailNormalized(AppUser.normalizeEmail(email))
                .orElseThrow(() -> ApiException.forbidden("Signed-in account not found."));
        if (user.getRole() != role || user.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.forbidden("An active " + role.name().toLowerCase()
                    + " account is required for this operation.");
        }
        return user;
    }

    /** Draft or archived courses (or courses under draft paths) cannot be requested. */
    private Course requirePublishedCourse(UUID courseId) {
        Course course = courseRepository.findById(courseId)
                .filter(candidate -> candidate.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
        pathRepository.findById(course.getLearningPathId())
                .filter(candidate -> candidate.getStatus() == ContentStatus.PUBLISHED)
                .orElseThrow(() -> ApiException.notFound("Course not found."));
        return course;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
