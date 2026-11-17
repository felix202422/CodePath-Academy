package com.codepath.academy.identity.api.admin;

import com.codepath.academy.identity.api.dto.StudentAdminResponse;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.service.AdminStudentService;
import java.util.List;
import java.util.UUID;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator management of student accounts: listing, suspend and
 * reactivate. Registration review stays at /admin/registrations; route rules
 * require ROLE_ADMIN and the service owns every state rule.
 */
@RestController
@RequestMapping("/api/v1/admin/students")
public class AdminStudentController {

    private final AdminStudentService studentService;

    public AdminStudentController(AdminStudentService studentService) {
        this.studentService = studentService;
    }

    @GetMapping
    public List<StudentAdminResponse> list(@RequestParam(required = false) UserStatus status) {
        return studentService.list(status);
    }

    @PostMapping("/{id}/suspend")
    public StudentAdminResponse suspend(@PathVariable UUID id) {
        return studentService.suspend(id);
    }

    @PostMapping("/{id}/reactivate")
    public StudentAdminResponse reactivate(@PathVariable UUID id) {
        return studentService.reactivate(id);
    }
}
