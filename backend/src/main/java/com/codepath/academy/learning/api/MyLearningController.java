package com.codepath.academy.learning.api;

import com.codepath.academy.learning.api.dto.LessonProgressResponse;
import com.codepath.academy.learning.api.dto.StudentCourseLearningResponse;
import com.codepath.academy.learning.api.dto.StudentDashboardResponse;
import com.codepath.academy.learning.api.dto.StudentLessonResponse;
import com.codepath.academy.learning.service.LearningService;
import java.util.UUID;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Approved-enrollment learning APIs for the signed-in student. */
@RestController
@RequestMapping("/api/v1/me/learning")
public class MyLearningController {

    private final LearningService learningService;

    public MyLearningController(LearningService learningService) {
        this.learningService = learningService;
    }

    @GetMapping
    public StudentDashboardResponse dashboard(Authentication authentication) {
        return learningService.dashboard(authentication.getName());
    }

    @GetMapping("/courses/{courseSlug}")
    public StudentCourseLearningResponse course(@PathVariable String courseSlug,
                                                Authentication authentication) {
        return learningService.course(authentication.getName(), courseSlug);
    }

    @GetMapping("/courses/{courseSlug}/lessons/{lessonId}")
    public StudentLessonResponse lesson(@PathVariable String courseSlug,
                                        @PathVariable UUID lessonId,
                                        Authentication authentication) {
        return learningService.lesson(authentication.getName(), courseSlug, lessonId);
    }

    /** Records the current lesson and continue-where-you-left-off target. */
    @PostMapping("/courses/{courseSlug}/lessons/{lessonId}/access")
    public LessonProgressResponse access(@PathVariable String courseSlug,
                                         @PathVariable UUID lessonId,
                                         Authentication authentication) {
        return learningService.recordAccess(authentication.getName(), courseSlug, lessonId);
    }

    /** Marks this student's lesson complete; repeated submissions remain idempotent. */
    @PostMapping("/courses/{courseSlug}/lessons/{lessonId}/complete")
    public LessonProgressResponse complete(@PathVariable String courseSlug,
                                           @PathVariable UUID lessonId,
                                           Authentication authentication) {
        return learningService.completeLesson(authentication.getName(), courseSlug, lessonId);
    }
}
