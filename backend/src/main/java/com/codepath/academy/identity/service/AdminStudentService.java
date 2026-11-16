package com.codepath.academy.identity.service;

import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.identity.api.dto.StudentAdminResponse;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrator management of student accounts. The registration queue owns
 * the PENDING → ACTIVE/REJECTED review; this service covers the rest of the
 * lifecycle: listing accounts and suspending/reactivating ones that already
 * exist. Role and status transitions are decided here, never by the client.
 */
@Service
public class AdminStudentService {

    private final AppUserRepository userRepository;

    public AdminStudentService(AppUserRepository userRepository) {
        this.userRepository = userRepository;
    }

    /** All student accounts, newest first, optionally filtered by status. */
    @Transactional(readOnly = true)
    public List<StudentAdminResponse> list(UserStatus status) {
        List<AppUser> students = status == null
                ? userRepository.findByRoleOrderByCreatedAtDesc(UserRole.STUDENT)
                : userRepository.findByRoleAndStatusOrderByCreatedAtDesc(UserRole.STUDENT, status);
        return students.stream().map(AdminStudentService::toResponse).toList();
    }

    /**
     * Suspend an ACTIVE student: they can no longer sign in, and an existing
     * session is rejected on the next request. Accounts awaiting registration
     * review keep their queue state — suspend applies only to live accounts.
     */
    @Transactional
    public StudentAdminResponse suspend(UUID id) {
        AppUser student = requireStudent(id);
        if (student.getStatus() == UserStatus.SUSPENDED) {
            throw ApiException.conflict("This account is already suspended.");
        }
        if (student.getStatus() != UserStatus.ACTIVE) {
            throw ApiException.conflict(
                    "Only active accounts can be suspended. Resolve the registration queue first.");
        }
        student.setStatus(UserStatus.SUSPENDED);
        // A suspended account starts fresh on return: no stale lock window.
        student.setLockedUntil(null);
        userRepository.save(student);
        return toResponse(student);
    }

    /** Return a suspended student to ACTIVE sign-in. */
    @Transactional
    public StudentAdminResponse reactivate(UUID id) {
        AppUser student = requireStudent(id);
        if (student.getStatus() == UserStatus.ACTIVE) {
            throw ApiException.conflict("This account is already active.");
        }
        if (student.getStatus() != UserStatus.SUSPENDED) {
            throw ApiException.conflict(
                    "Only suspended accounts can be reactivated. Resolve the registration queue first.");
        }
        student.setStatus(UserStatus.ACTIVE);
        student.setFailedAttempts(0);
        student.setLockedUntil(null);
        userRepository.save(student);
        return toResponse(student);
    }

    private AppUser requireStudent(UUID id) {
        AppUser user = userRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Student account not found."));
        if (user.getRole() != UserRole.STUDENT) {
            throw ApiException.notFound("Student account not found.");
        }
        return user;
    }

    private static StudentAdminResponse toResponse(AppUser student) {
        return new StudentAdminResponse(
                student.getId(),
                student.getEmail(),
                student.getFullName(),
                student.getStatus(),
                student.getInterests(),
                student.getCreatedAt());
    }
}
