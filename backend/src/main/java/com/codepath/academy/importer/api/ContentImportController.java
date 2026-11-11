package com.codepath.academy.importer.api;

import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.importer.api.dto.ImportRowDetailResponse;
import com.codepath.academy.importer.api.dto.ImportRowResponse;
import com.codepath.academy.importer.api.dto.ImportRunRequest;
import com.codepath.academy.importer.api.dto.ImportRunResponse;
import com.codepath.academy.importer.api.dto.ImportSourceResponse;
import com.codepath.academy.importer.model.ImportMode;
import com.codepath.academy.importer.model.ImportStatus;
import com.codepath.academy.importer.service.ContentImportReviewService;
import com.codepath.academy.importer.service.CurriculumImporter;
import com.codepath.academy.importer.source.CurriculumSourceFactory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrator content screen API: where imports read from, running an
 * import, and reviewing the resulting ledger (including conflict resolution).
 *
 * <p>Route rules in SecurityConfig require ROLE_ADMIN for /api/v1/admin/**;
 * this controller resolves the acting administrator and delegates — the
 * import and review rules live in {@link CurriculumImporter} and
 * {@link ContentImportReviewService}.
 */
@RestController
@RequestMapping("/api/v1/admin/content")
public class ContentImportController {

    private final CurriculumImporter importer;
    private final ContentImportReviewService review;
    private final CurriculumSourceFactory sourceFactory;
    private final AppUserRepository userRepository;

    public ContentImportController(CurriculumImporter importer,
                                   ContentImportReviewService review,
                                   CurriculumSourceFactory sourceFactory,
                                   AppUserRepository userRepository) {
        this.importer = importer;
        this.review = review;
        this.sourceFactory = sourceFactory;
        this.userRepository = userRepository;
    }

    @GetMapping("/import-source")
    public ImportSourceResponse importSource() {
        return new ImportSourceResponse(
                sourceFactory.canonicalRepository(),
                sourceFactory.localConfigured(),
                sourceFactory.localPath(),
                sourceFactory.pinnedCommit());
    }

    @PostMapping("/imports")
    @ResponseStatus(HttpStatus.CREATED)
    public ImportRunResponse runImport(
            @RequestBody(required = false) ImportRunRequest request,
            Authentication authentication) {
        ImportMode mode = request == null ? null : request.mode();
        return importer.run(mode, administratorId(authentication));
    }

    @GetMapping("/imports")
    public List<ImportRowResponse> imports(
            @RequestParam(required = false) ImportStatus status,
            @RequestParam(defaultValue = "100") int limit) {
        return review.list(status, limit);
    }

    @GetMapping("/imports/{id}")
    public ImportRowDetailResponse importRow(@PathVariable UUID id) {
        return review.get(id);
    }

    @PostMapping("/imports/{id}/accept")
    public ImportRowDetailResponse accept(@PathVariable UUID id,
                                          Authentication authentication) {
        return review.accept(id, administratorId(authentication));
    }

    @PostMapping("/imports/{id}/discard")
    public ImportRowDetailResponse discard(@PathVariable UUID id,
                                           Authentication authentication) {
        return review.discard(id, administratorId(authentication));
    }

    /** The signed-in administrator's account id, for provenance columns. */
    private UUID administratorId(Authentication authentication) {
        if (authentication == null || authentication.getName() == null) {
            return null;
        }
        Optional<AppUser> user = userRepository.findByEmailNormalized(
                AppUser.normalizeEmail(authentication.getName()));
        return user.map(AppUser::getId).orElse(null);
    }
}
