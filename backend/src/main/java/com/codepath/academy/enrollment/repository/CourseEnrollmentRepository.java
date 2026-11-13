package com.codepath.academy.enrollment.repository;

import com.codepath.academy.enrollment.model.CourseEnrollment;
import com.codepath.academy.enrollment.model.EnrollmentStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for administrator-reviewed course enrollment requests. */
public interface CourseEnrollmentRepository extends JpaRepository<CourseEnrollment, UUID> {

    @EntityGraph(attributePaths = "course")
    Optional<CourseEnrollment> findByCourse_IdAndStudent_Id(UUID courseId, UUID studentId);

    @EntityGraph(attributePaths = "course")
    List<CourseEnrollment> findTop100ByStudent_IdOrderByRequestedAtDesc(UUID studentId);

    @EntityGraph(attributePaths = "course")
    List<CourseEnrollment> findTop100ByStudent_IdAndStatusOrderByRequestedAtDesc(
            UUID studentId, EnrollmentStatus status);

    @EntityGraph(attributePaths = "course")
    Optional<CourseEnrollment> findByCourse_IdAndStudent_IdAndStatus(
            UUID courseId, UUID studentId, EnrollmentStatus status);

    /** Lock the approved enrollment while lesson progress and last-access data are updated. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = "course")
    @Query("""
            select enrollment from CourseEnrollment enrollment
            where enrollment.course.id = :courseId
              and enrollment.student.id = :studentId
              and enrollment.status = :status
            """)
    Optional<CourseEnrollment> findApprovedEnrollmentForUpdate(
            @Param("courseId") UUID courseId,
            @Param("studentId") UUID studentId,
            @Param("status") EnrollmentStatus status);

    @EntityGraph(attributePaths = {"course", "student"})
    List<CourseEnrollment> findTop100ByStatusOrderByRequestedAtAsc(EnrollmentStatus status);

    @EntityGraph(attributePaths = {"course", "student"})
    List<CourseEnrollment> findTop100ByOrderByRequestedAtDesc();

    /** Serialize concurrent decisions so a reviewed request cannot be overwritten. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = {"course", "student"})
    @Query("select enrollment from CourseEnrollment enrollment where enrollment.id = :id")
    Optional<CourseEnrollment> findByIdForReview(@Param("id") UUID id);

    long countByCourse_IdAndStatus(UUID courseId, EnrollmentStatus status);

    /** Efficient real-time enrollment counts for the published public catalog. */
    @Query("""
            select enrollment.course.id as courseId, count(enrollment.id) as enrollmentCount
            from CourseEnrollment enrollment
            where enrollment.status = :status
            group by enrollment.course.id
            """)
    List<EnrollmentCount> aggregateEnrollmentCountsByStatus(
            @Param("status") EnrollmentStatus status);

    /** Aggregate projection for {@link #aggregateEnrollmentCountsByStatus(EnrollmentStatus)}. */
    interface EnrollmentCount {
        UUID getCourseId();

        Long getEnrollmentCount();
    }
}
