package com.codepath.academy.api;

import java.time.Instant;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Versioned API root. Public liveness payload used by health checks and the SPA
 * to confirm the API is reachable before authentication.
 */
@RestController
@RequestMapping("/api/v1")
public class ApiController {

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        return ResponseEntity.ok(Map.of(
                "status", "UP",
                "service", "codepath-academy",
                "time", Instant.now().toString()
        ));
    }
}
