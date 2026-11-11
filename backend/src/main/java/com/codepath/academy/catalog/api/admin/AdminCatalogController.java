package com.codepath.academy.catalog.api.admin;

import com.codepath.academy.catalog.api.dto.CourseAdminResponse;
import com.codepath.academy.catalog.api.dto.CourseDetailAdminResponse;
import com.codepath.academy.catalog.api.dto.CourseWriteRequest;
import com.codepath.academy.catalog.api.dto.LessonAdminResponse;
import com.codepath.academy.catalog.api.dto.LessonDetailAdminResponse;
import com.codepath.academy.catalog.api.dto.LessonWriteRequest;
import com.codepath.academy.catalog.api.dto.ModuleAdminResponse;
import com.codepath.academy.catalog.api.dto.ModuleWriteRequest;
import com.codepath.academy.catalog.api.dto.PathAdminResponse;
import com.codepath.academy.catalog.api.dto.PathWriteRequest;
import com.codepath.academy.catalog.api.dto.StatusChangeRequest;
import com.codepath.academy.catalog.service.AdminCatalogService;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator management of the curriculum hierarchy: paths, courses,
 * modules and lessons, with explicit draft/publication transitions.
 *
 * <p>Route rules in SecurityConfig require ROLE_ADMIN for /api/v1/admin/**;
 * controllers here only validate and delegate — all cascade, uniqueness and
 * edit-protection rules live in {@link AdminCatalogService}.
 */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminCatalogController {

    private final AdminCatalogService catalogService;

    public AdminCatalogController(AdminCatalogService catalogService) {
        this.catalogService = catalogService;
    }

    // --- learning paths -----------------------------------------------------

    @GetMapping("/paths")
    public List<PathAdminResponse> paths() {
        return catalogService.listPaths();
    }

    @PostMapping("/paths")
    @ResponseStatus(HttpStatus.CREATED)
    public PathAdminResponse createPath(@Valid @RequestBody PathWriteRequest request) {
        return catalogService.createPath(request);
    }

    @PutMapping("/paths/{id}")
    public PathAdminResponse updatePath(@PathVariable UUID id,
                                        @Valid @RequestBody PathWriteRequest request) {
        return catalogService.updatePath(id, request);
    }

    @PostMapping("/paths/{id}/status")
    public PathAdminResponse changePathStatus(@PathVariable UUID id,
                                              @Valid @RequestBody StatusChangeRequest request) {
        return catalogService.changePathStatus(id, request);
    }

    // --- courses ------------------------------------------------------------

    @GetMapping("/courses")
    public List<CourseAdminResponse> courses(@RequestParam(required = false) UUID pathId) {
        return catalogService.listCourses(pathId);
    }

    @PostMapping("/courses")
    @ResponseStatus(HttpStatus.CREATED)
    public CourseAdminResponse createCourse(@Valid @RequestBody CourseWriteRequest request) {
        return catalogService.createCourse(request);
    }

    @GetMapping("/courses/{id}")
    public CourseDetailAdminResponse course(@PathVariable UUID id) {
        return catalogService.getCourse(id);
    }

    @PutMapping("/courses/{id}")
    public CourseAdminResponse updateCourse(@PathVariable UUID id,
                                            @Valid @RequestBody CourseWriteRequest request) {
        return catalogService.updateCourse(id, request);
    }

    @PostMapping("/courses/{id}/status")
    public CourseAdminResponse changeCourseStatus(@PathVariable UUID id,
                                                  @Valid @RequestBody StatusChangeRequest request) {
        return catalogService.changeCourseStatus(id, request);
    }

    @PostMapping("/courses/{id}/modules")
    @ResponseStatus(HttpStatus.CREATED)
    public ModuleAdminResponse createModule(@PathVariable UUID id,
                                            @Valid @RequestBody ModuleWriteRequest request) {
        return catalogService.createModule(id, request);
    }

    // --- modules ------------------------------------------------------------

    @GetMapping("/modules/{id}")
    public ModuleAdminResponse module(@PathVariable UUID id) {
        return catalogService.getModule(id);
    }

    @PutMapping("/modules/{id}")
    public ModuleAdminResponse updateModule(@PathVariable UUID id,
                                            @Valid @RequestBody ModuleWriteRequest request) {
        return catalogService.updateModule(id, request);
    }

    @PostMapping("/modules/{id}/status")
    public ModuleAdminResponse changeModuleStatus(@PathVariable UUID id,
                                                  @Valid @RequestBody StatusChangeRequest request) {
        return catalogService.changeModuleStatus(id, request);
    }

    @GetMapping("/modules/{id}/lessons")
    public List<LessonAdminResponse> lessons(@PathVariable UUID id) {
        return catalogService.listLessons(id);
    }

    @PostMapping("/modules/{id}/lessons")
    @ResponseStatus(HttpStatus.CREATED)
    public LessonDetailAdminResponse createLesson(@PathVariable UUID id,
                                                  @Valid @RequestBody LessonWriteRequest request) {
        return catalogService.createLesson(id, request);
    }

    // --- lessons ------------------------------------------------------------

    @GetMapping("/lessons/{id}")
    public LessonDetailAdminResponse lesson(@PathVariable UUID id) {
        return catalogService.getLesson(id);
    }

    @PutMapping("/lessons/{id}")
    public LessonDetailAdminResponse updateLesson(@PathVariable UUID id,
                                                  @Valid @RequestBody LessonWriteRequest request) {
        return catalogService.updateLesson(id, request);
    }

    @PostMapping("/lessons/{id}/status")
    public LessonDetailAdminResponse changeLessonStatus(
            @PathVariable UUID id,
            @Valid @RequestBody StatusChangeRequest request) {
        return catalogService.changeLessonStatus(id, request);
    }
}
