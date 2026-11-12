package com.codepath.academy.enrollment.api;

import com.codepath.academy.enrollment.api.dto.EnrollmentStatusResponse;
import com.codepath.academy.enrollment.api.dto.MyEnrollmentResponse;
import com.codepath.academy.enrollment.service.EnrollmentService;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Student-owned enrollment requests and history. */
@RestController
@RequestMapping("/api/v1/me/enrollments")
public class MyEnrollmentController {

    private final EnrollmentService enrollmentService;

    public MyEnrollmentController(EnrollmentService enrollmentService) {
        this.enrollmentService = enrollmentService;
    }

    @GetMapping
    public List<MyEnrollmentResponse> mine(Authentication authentication) {
        return enrollmentService.listMine(authentication.getName());
    }

    @GetMapping("/{courseId}")
    public EnrollmentStatusResponse status(@PathVariable UUID courseId,
                                           Authentication authentication) {
        return enrollmentService.statusForCourse(authentication.getName(), courseId);
    }

    @PostMapping("/{courseId}")
    @ResponseStatus(HttpStatus.CREATED)
    public MyEnrollmentResponse request(@PathVariable UUID courseId,
                                        Authentication authentication) {
        return enrollmentService.request(authentication.getName(), courseId);
    }
}
