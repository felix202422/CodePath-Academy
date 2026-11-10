package com.codepath.academy.catalog.api;

import com.codepath.academy.catalog.api.dto.CourseDetailResponse;
import com.codepath.academy.catalog.api.dto.CourseSummaryResponse;
import com.codepath.academy.catalog.api.dto.OverviewResponse;
import com.codepath.academy.catalog.api.dto.PathDetailResponse;
import com.codepath.academy.catalog.api.dto.PathSummaryResponse;
import com.codepath.academy.catalog.service.PublicCatalogService;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Anonymous read API for the public academy (homepage, catalog, paths).
 * SecurityConfig permits /api/v1/public/** without authentication; only
 * PUBLISHED rows are ever returned.
 */
@RestController
@RequestMapping("/api/v1/public")
public class PublicCatalogController {

    private final PublicCatalogService catalogService;

    public PublicCatalogController(PublicCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    @GetMapping("/overview")
    public OverviewResponse overview() {
        return catalogService.getOverview();
    }

    @GetMapping("/paths")
    public List<PathSummaryResponse> paths() {
        return catalogService.listPaths();
    }

    @GetMapping("/paths/{slug}")
    public PathDetailResponse path(@PathVariable String slug) {
        return catalogService.getPath(slug);
    }

    @GetMapping("/courses")
    public List<CourseSummaryResponse> courses() {
        return catalogService.listCourses();
    }

    @GetMapping("/courses/{slug}")
    public CourseDetailResponse course(@PathVariable String slug) {
        return catalogService.getCourse(slug);
    }
}
