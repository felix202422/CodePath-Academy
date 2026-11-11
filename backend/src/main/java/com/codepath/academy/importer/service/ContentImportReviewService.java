package com.codepath.academy.importer.service;

import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.catalog.repository.LessonRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.common.util.Sha256;
import com.codepath.academy.importer.api.dto.ImportRowDetailResponse;
import com.codepath.academy.importer.api.dto.ImportRowResponse;
import com.codepath.academy.importer.model.ContentImport;
import com.codepath.academy.importer.model.ImportStatus;
import com.codepath.academy.importer.repository.ContentImportRepository;
import com.codepath.academy.importer.source.SourceLessonContent;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Administrator review of import outcomes: the ledger list, the
 * current-versus-proposed comparison, and the two conflict resolutions.
 *
 * <p><b>accept</b> applies the staged source version to the lesson (title and
 * summary re-derived from it) and clears {@code editedByAdmin} — the academy
 * version now <em>is</em> the source version. <b>discard</b> keeps the academy
 * version and sets {@code editedByAdmin}, which is what stops the next import
 * run from silently replacing the administrator's work again. Either way the
 * row records who decided and when, and the staged proposal is dropped.
 */
@Service
public class ContentImportReviewService {

    private static final int MAX_LIMIT = 100;

    private final ContentImportRepository importRepository;
    private final LessonRepository lessonRepository;

    public ContentImportReviewService(ContentImportRepository importRepository,
                                      LessonRepository lessonRepository) {
        this.importRepository = importRepository;
        this.lessonRepository = lessonRepository;
    }

    @Transactional
    public List<ImportRowResponse> list(ImportStatus status, int limit) {
        List<ContentImport> rows = status == null
                ? importRepository.findTop100ByOrderByCreatedAtDesc()
                : importRepository.findTop100ByStatusOrderByCreatedAtDesc(status);
        Set<UUID> lessonIds = rows.stream()
                .map(ContentImport::getTargetLessonId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<UUID, String> titles = lessonIds.isEmpty() ? Map.of()
                : lessonRepository.findAllById(lessonIds).stream()
                        .collect(Collectors.toMap(Lesson::getId, Lesson::getTitle));
        int capped = Math.max(1, Math.min(limit, MAX_LIMIT));
        return rows.stream()
                .limit(capped)
                .map(row -> ImportRowResponse.of(row,
                        row.getTargetLessonId() == null
                                ? null : titles.get(row.getTargetLessonId())))
                .toList();
    }

    @Transactional
    public ImportRowDetailResponse get(UUID id) {
        ContentImport row = require(id);
        return ImportRowDetailResponse.of(row, lessonOf(row));
    }

    @Transactional
    public ImportRowDetailResponse accept(UUID id, UUID administratorId) {
        ContentImport row = require(id);
        if (row.getStatus() != ImportStatus.CONFLICT) {
            throw ApiException.conflict("Only staged conflicts can be accepted.");
        }
        if (row.getProposedBody() == null) {
            throw ApiException.conflict(
                    "This staged version has no proposal to accept; re-run the import.");
        }
        Lesson lesson = lessonOf(row);
        if (lesson == null) {
            throw ApiException.conflict(
                    "The target lesson of this staged version no longer exists.");
        }

        String body = row.getProposedBody();
        SourceLessonContent derived = SourceLessonContent.of(row.getSourcePath(), body);
        lesson.setBodyMarkdown(body);
        lesson.setContentHash(Sha256.hex(body));
        lesson.setTitle(derived.title());
        lesson.setSummary(derived.summary() == null || derived.summary().isEmpty()
                ? null : derived.summary());
        lesson.setSourceCommit(row.getSourceCommit());
        lesson.setSourceHash(row.getSourceHash());
        lesson.setEditedByAdmin(false);
        lessonRepository.save(lesson);

        row.setStatus(ImportStatus.IMPORTED);
        row.setResolvedAt(Instant.now());
        row.setResolvedById(administratorId);
        row.setProposedBody(null);
        row.setMessage("Accepted by an administrator: the staged source version "
                + "is now the lesson body.");
        importRepository.save(row);
        return ImportRowDetailResponse.of(row, lesson);
    }

    @Transactional
    public ImportRowDetailResponse discard(UUID id, UUID administratorId) {
        ContentImport row = require(id);
        if (row.getStatus() != ImportStatus.CONFLICT) {
            throw ApiException.conflict("Only staged conflicts can be discarded.");
        }
        Lesson lesson = lessonOf(row);
        if (lesson != null) {
            // Protect the kept version: without this flag the next run would
            // silently replace the administrator's decision again.
            lesson.setEditedByAdmin(true);
            lessonRepository.save(lesson);
        }

        row.setStatus(ImportStatus.UNCHANGED);
        row.setResolvedAt(Instant.now());
        row.setResolvedById(administratorId);
        row.setProposedBody(null);
        row.setMessage("Discarded by an administrator: the academy version was kept.");
        importRepository.save(row);
        return ImportRowDetailResponse.of(row, lesson);
    }

    private ContentImport require(UUID id) {
        return importRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("Import row not found."));
    }

    private Lesson lessonOf(ContentImport row) {
        if (row.getTargetLessonId() == null) {
            return null;
        }
        Optional<Lesson> lesson = lessonRepository.findById(row.getTargetLessonId());
        return lesson.orElse(null);
    }
}
