package com.codepath.academy.announcement.repository;

import com.codepath.academy.announcement.model.Announcement;
import com.codepath.academy.catalog.model.ContentStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Persistence for administrator-authored announcements. */
public interface AnnouncementRepository extends JpaRepository<Announcement, UUID> {

    List<Announcement> findAllByOrderByCreatedAtDesc();

    List<Announcement> findByStatusOrderByCreatedAtDesc(ContentStatus status);

    Optional<Announcement> findById(UUID id);

    long countByStatus(ContentStatus status);

    /**
     * The student feed: PUBLISHED rows whose audience is meant for students,
     * either platform-wide or scoped to a course this student is enrolled in
     * (APPROVED only). Newest first.
     */
    @Query("""
            select a from Announcement a
            where a.status = :status
              and (a.courseId is null
                   or a.courseId in (select e.course.id from CourseEnrollment e
                                      where e.student.id = :studentId
                                        and e.status = com.codepath.academy.enrollment.model.EnrollmentStatus.APPROVED))
            order by a.publishedAt desc
            """)
    List<Announcement> findVisibleToStudent(@Param("studentId") UUID studentId,
                                            @Param("status") ContentStatus status);
}
