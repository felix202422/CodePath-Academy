package com.codepath.academy.admin.api;

import com.codepath.academy.admin.api.dto.AdminDashboardResponse;
import com.codepath.academy.admin.service.AdminDashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator dashboard aggregates: review queues, account counts,
 * published-content counts and the most recent audit entries. Route rules
 * require ROLE_ADMIN.
 */
@RestController
@RequestMapping("/api/v1/admin/dashboard")
public class AdminDashboardController {

    private final AdminDashboardService dashboardService;

    public AdminDashboardController(AdminDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping
    public AdminDashboardResponse dashboard() {
        return dashboardService.dashboard();
    }
}
