package com.codepath.academy.importer.service;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LessonRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.common.util.Sha256;
import com.codepath.academy.importer.api.dto.ImportRunResponse;
import com.codepath.academy.importer.model.ContentImport;
import com.codepath.academy.importer.model.ImportMode;
import com.codepath.academy.importer.model.ImportStatus;
import com.codepath.academy.importer.repository.ContentImportRepository;
import com.codepath.academy.importer.source.CurriculumSource;
import com.codepath.academy.importer.source.CurriculumSourceFactory;
import com.codepath.academy.importer.source.LessonIndexParser;
import com.codepath.academy.importer.source.SourceLessonContent;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.UUID;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * One synchronous import run over a pinned curriculum revision
 * (docs/CONTENT-INTEGRATION.md behaviors 1–9).
 *
 * <p>Subject directories are the numbered top-level folders of the source
 * repository; their {@code README.md} {@code ## Lessons} index is the
 * authoritative lesson list (no directory scanning), so administrative files
 * and unindexed material never enter the academy. Each indexed file is
 * recorded in {@code content_import} keyed by (repository, path, SHA-256) —
 * the unique index makes re-runs idempotent: an already-recorded source
 * version is skipped, a changed version updates the lesson when it is safe
 * (not admin-edited, not published) or stages a {@code CONFLICT} row with the
 * proposed body otherwise. Everything imported lands as {@code DRAFT}: an
 * administrator reviews and publishes it (behavior 8).
 *
 * <p>Per-file failures are isolated: a file that exists but cannot be
 * processed records a FAILED row and the run continues; files missing from
 * the revision become warnings (nothing to hash, nothing to record).
 */
@Service
public class CurriculumImporter {

    private static final Logger log = LoggerFactory.getLogger(CurriculumImporter.class);

    /** Top-level source directories never imported (behavior 2). */
    private static final Set<String> EXCLUDED_TOP_DIRS = Set.of("exercises", "solutions");

    /** Numbered subject directory at the repository root, e.g. 04-JAVA-PROGRAMMING. */
    private static final Pattern SUBJECT_DIR = Pattern.compile("^\\d{2}-[A-Z0-9][A-Z0-9-]*$");

    /** Warnings beyond this are summarized in the final entry of the response. */
    private static final int MAX_WARNINGS = 50;

    private static final int MESSAGE_LIMIT = 2000;

    private final CurriculumSourceFactory sourceFactory;
    private final ContentImportRepository importRepository;
    private final CourseRepository courseRepository;
    private final CourseModuleRepository moduleRepository;
    private final LessonRepository lessonRepository;
    private final MediaStorage mediaStorage;

    public CurriculumImporter(CurriculumSourceFactory sourceFactory,
                              ContentImportRepository importRepository,
                              CourseRepository courseRepository,
                              CourseModuleRepository moduleRepository,
                              LessonRepository lessonRepository,
                              MediaStorage mediaStorage) {
        this.sourceFactory = sourceFactory;
        this.importRepository = importRepository;
        this.courseRepository = courseRepository;
        this.moduleRepository = moduleRepository;
        this.lessonRepository = lessonRepository;
        this.mediaStorage = mediaStorage;
    }

    /**
     * @param requestedMode null = auto-resolve (local checkout when configured)
     * @param importedBy    administrator who triggered the run, or null
     */
    @Transactional
    public ImportRunResponse run(ImportMode requestedMode, UUID importedBy) {
        long startedAt = System.currentTimeMillis();
        CurriculumSource source = sourceFactory.create(requestedMode);
        ImportMode mode = requestedMode != null ? requestedMode : sourceFactory.defaultMode();
        log.info("Import run starting: {} at {}", source.describe(), source.commit());

        Set<String> paths = source.listPaths();
        Run run = new Run();
        Set<String> mediaLocations = new LinkedHashSet<>();
        List<String> unmappedSubjects = new ArrayList<>();

        for (String subject : subjectsIn(paths)) {
            String readmePath = subject + "/README.md";
            if (!paths.contains(readmePath)) {
                run.warn("Subject " + subject + " has no README.md; skipped.");
                continue;
            }
            Optional<String> readme = source.readText(readmePath);
            if (readme.isEmpty()) {
                run.warn("Could not read " + readmePath + "; subject skipped.");
                continue;
            }
            run.subjectsScanned++;
            List<String> entries = LessonIndexParser.parse(readme.get());
            if (entries.isEmpty()) {
                continue; // a subject without a lesson index contributes nothing
            }
            Optional<Course> course = courseRepository.findBySourcePath(subject);
            if (course.isEmpty()) {
                unmappedSubjects.add(subject);
                continue;
            }
            SubjectContext context = new SubjectContext(course.get(), subject);
            for (String entry : entries) {
                if (excluded(entry)) {
                    continue;
                }
                String sourcePath = subject + "/" + entry;
                if (!paths.contains(sourcePath)) {
                    run.warn("Lesson index of " + subject + " lists " + entry
                            + ", which does not exist in the source revision.");
                    continue;
                }
                importFile(source, context, sourcePath, importedBy, run, mediaLocations);
            }
        }

        ImportRunResponse response = new ImportRunResponse(
                mode, source.repository(), source.commit(),
                System.currentTimeMillis() - startedAt,
                run.subjectsScanned, List.copyOf(unmappedSubjects),
                run.lessonsCreated, run.lessonsUpdated, run.lessonsUnchanged,
                run.conflictsStaged, run.failures, mediaLocations.size(),
                run.warningList());
        log.info("Import run finished: {} created, {} updated, {} unchanged, {} conflicts, "
                        + "{} failures, {} media files",
                response.lessonsCreated(), response.lessonsUpdated(),
                response.lessonsUnchanged(), response.conflictsStaged(),
                response.failures(), response.mediaFilesStored());
        return response;
    }

    // --- per-file processing ------------------------------------------------

    private void importFile(CurriculumSource source, SubjectContext context,
                            String sourcePath, UUID importedBy, Run run,
                            Set<String> mediaLocations) {
        String repository = source.repository();
        String commit = source.commit();

        String raw;
        try {
            Optional<String> text = source.readText(sourcePath);
            if (text.isEmpty()) {
                // Listed in the revision but unreadable as text: nothing to
                // hash, so nothing can be recorded honestly — report it.
                run.warn("Could not read " + sourcePath + " from the source revision.");
                return;
            }
            raw = text.get();
        } catch (RuntimeException ex) {
            run.warn("Could not read " + sourcePath + ": " + safeMessage(ex));
            return;
        }
        String sourceHash = Sha256.hex(raw);

        // Idempotency guard: this exact source version was already recorded.
        Optional<ContentImport> recorded = importRepository
                .findBySourceRepositoryAndSourcePathAndSourceHash(
                        repository, sourcePath, sourceHash);
        if (recorded.isPresent() && recorded.get().getStatus() != ImportStatus.FAILED) {
            // Already imported, staged, or deliberately discarded — a re-run
            // must not re-apply or re-stage what an administrator has seen.
            run.lessonsUnchanged++;
            return;
        }

        Optional<Lesson> found = Optional.empty();
        try {
            MarkdownTransformer.Result transformed =
                    MarkdownTransformer.transform(raw, sourcePath, source, mediaStorage);
            transformed.media().forEach(ref -> mediaLocations.add(ref.location()));
            transformed.warnings().forEach(run::warn);

            found = lessonRepository.findBySourceRepositoryAndSourcePath(repository, sourcePath);
            // Slugs derive from the subject-relative path (one module per
            // subject); provenance rows carry the repository-relative path.
            String entry = sourcePath.substring(context.subject.length() + 1);
            if (found.isEmpty()) {
                createLesson(context, repository, sourcePath, entry, raw, transformed.body(),
                        commit, sourceHash, importedBy, recorded, run);
            } else {
                applyToExisting(found.get(), repository, sourcePath, entry, raw,
                        transformed.body(), commit, sourceHash, importedBy, recorded, run);
            }
        } catch (RuntimeException ex) {
            recordFailure(repository, sourcePath, commit, sourceHash,
                    found.map(Lesson::getId).orElse(null), importedBy, recorded, ex, run);
        }
    }

    private void createLesson(SubjectContext context, String repository, String sourcePath,
                              String entry, String raw, String body, String commit,
                              String sourceHash, UUID importedBy,
                              Optional<ContentImport> recorded, Run run) {
        // Display fields come from the raw source; the stored body carries the
        // attribution footer, which must never leak into title or summary.
        SourceLessonContent derived = SourceLessonContent.of(entry, raw);
        CourseModule module = context.module();
        if (lessonRepository.findByModuleIdAndSlug(module.getId(), derived.slug()).isPresent()) {
            throw ApiException.conflict("A lesson with slug '" + derived.slug()
                    + "' already exists in module '" + module.getTitle() + "'.");
        }
        Lesson lesson = new Lesson();
        lesson.setModuleId(module.getId());
        lesson.setSlug(derived.slug());
        lesson.setTitle(derived.title());
        lesson.setSummary(emptyToNull(derived.summary()));
        lesson.setBodyMarkdown(body);
        lesson.setStatus(ContentStatus.DRAFT);
        lesson.setContentHash(Sha256.hex(body));
        lesson.setSourceRepository(repository);
        lesson.setSourcePath(sourcePath);
        lesson.setSourceCommit(commit);
        lesson.setSourceHash(sourceHash);
        lesson.setEditedByAdmin(false);
        lesson.setDisplayOrder(lessonRepository.maxDisplayOrderForModule(module.getId()) + 1);
        lessonRepository.save(lesson);

        ContentImport row = recorded.orElseGet(ContentImport::new);
        fillRow(row, repository, sourcePath, commit, sourceHash,
                ImportStatus.IMPORTED, lesson.getId(), importedBy,
                "Created lesson " + lesson.getTitle() + ".");
        clearResolution(row);
        importRepository.save(row);
        run.lessonsCreated++;
    }

    private void applyToExisting(Lesson lesson, String repository,
                                 String sourcePath, String entry, String raw, String body,
                                 String commit, String sourceHash, UUID importedBy,
                                 Optional<ContentImport> recorded, Run run) {
        if (sourceHash.equals(lesson.getSourceHash())) {
            // The lesson already holds this exact source version.
            ContentImport row = recorded.orElseGet(ContentImport::new);
            fillRow(row, repository, sourcePath, commit, sourceHash,
                    ImportStatus.UNCHANGED, lesson.getId(), importedBy,
                    "Lesson already holds this source version.");
            clearResolution(row);
            importRepository.save(row);
            run.lessonsUnchanged++;
            return;
        }

        if (lesson.isEditedByAdmin() || lesson.getStatus() == ContentStatus.PUBLISHED) {
            // Never silently replace academy-side work: stage the new source
            // version for review instead (behavior 7).
            ContentImport row = recorded.orElseGet(() -> importRepository
                    .findFirstBySourceRepositoryAndSourcePathAndStatusOrderByCreatedAtDesc(
                            repository, sourcePath, ImportStatus.CONFLICT)
                    .orElseGet(ContentImport::new));
            fillRow(row, repository, sourcePath, commit, sourceHash,
                    ImportStatus.CONFLICT, lesson.getId(), importedBy,
                    "Source changed while the academy lesson was edited or published; "
                            + "the new source version is staged for review.");
            row.setProposedBody(body);
            row.setResolvedAt(null);
            row.setResolvedById(null);
            importRepository.save(row);
            run.conflictsStaged++;
            return;
        }

        SourceLessonContent derived = SourceLessonContent.of(entry, raw);
        lesson.setBodyMarkdown(body);
        lesson.setContentHash(Sha256.hex(body));
        lesson.setTitle(derived.title());
        lesson.setSummary(emptyToNull(derived.summary()));
        lesson.setSourceCommit(commit);
        lesson.setSourceHash(sourceHash);
        lesson.setEditedByAdmin(false);
        lessonRepository.save(lesson);

        // Any conflict staged for an older version of this file is now moot.
        resolveStaleConflict(repository, sourcePath);

        ContentImport row = recorded.orElseGet(ContentImport::new);
        fillRow(row, repository, sourcePath, commit, sourceHash,
                ImportStatus.IMPORTED, lesson.getId(), importedBy,
                "Updated lesson " + lesson.getTitle() + " from the source revision.");
        clearResolution(row);
        importRepository.save(row);
        run.lessonsUpdated++;
    }

    private void resolveStaleConflict(String repository, String sourcePath) {
        Optional<ContentImport> stale = importRepository
                .findFirstBySourceRepositoryAndSourcePathAndStatusOrderByCreatedAtDesc(
                        repository, sourcePath, ImportStatus.CONFLICT);
        if (stale.isPresent()) {
            ContentImport row = stale.get();
            row.setStatus(ImportStatus.UNCHANGED);
            row.setProposedBody(null);
            row.setResolvedAt(Instant.now());
            row.setResolvedById(null);
            row.setMessage("Auto-resolved: the source file was re-imported without "
                    + "conflict, superseding the staged version.");
            importRepository.save(row);
        }
    }

    private void recordFailure(String repository, String sourcePath, String commit,
                               String sourceHash, UUID lessonId, UUID importedBy,
                               Optional<ContentImport> recorded, RuntimeException ex, Run run) {
        ContentImport row = recorded.orElseGet(ContentImport::new);
        fillRow(row, repository, sourcePath, commit, sourceHash,
                ImportStatus.FAILED, lessonId, importedBy, failureMessage(ex));
        clearResolution(row);
        importRepository.save(row);
        run.failures++;
    }

    // --- helpers ------------------------------------------------------------

    private static void fillRow(ContentImport row, String repository, String sourcePath,
                                String commit, String sourceHash, ImportStatus status,
                                UUID lessonId, UUID importedBy, String message) {
        row.setSourceRepository(repository);
        row.setSourcePath(sourcePath);
        row.setSourceCommit(commit);
        row.setSourceHash(sourceHash);
        row.setStatus(status);
        row.setTargetLessonId(lessonId);
        row.setImportedById(importedBy);
        row.setMessage(truncate(message, MESSAGE_LIMIT));
    }

    private static void clearResolution(ContentImport row) {
        row.setProposedBody(null);
        row.setResolvedAt(null);
        row.setResolvedById(null);
    }

    /** Top-level numbered subject directories present in the revision, sorted. */
    private static List<String> subjectsIn(Set<String> paths) {
        SortedSet<String> subjects = new TreeSet<>();
        for (String path : paths) {
            int slash = path.indexOf('/');
            if (slash > 0 && SUBJECT_DIR.matcher(path.substring(0, slash)).matches()) {
                subjects.add(path.substring(0, slash));
            }
        }
        return List.copyOf(subjects);
    }

    private static boolean excluded(String entry) {
        int slash = entry.indexOf('/');
        String top = slash < 0 ? entry : entry.substring(0, slash);
        return EXCLUDED_TOP_DIRS.contains(top.toLowerCase(Locale.ROOT));
    }

    private static String failureMessage(RuntimeException ex) {
        return ex instanceof ApiException
                ? ex.getMessage()
                : "Processing failed: " + ex.getClass().getSimpleName()
                        + (ex.getMessage() == null ? "" : " — " + ex.getMessage());
    }

    private static String safeMessage(RuntimeException ex) {
        String message = ex.getMessage();
        return message == null || message.isBlank()
                ? ex.getClass().getSimpleName() : message;
    }

    private static String emptyToNull(String value) {
        return value == null || value.isEmpty() ? null : value;
    }

    private static String truncate(String text, int limit) {
        if (text == null || text.length() <= limit) {
            return text;
        }
        return text.substring(0, limit - 1) + "…";
    }

    /** One subject directory being imported; its module is created on demand. */
    private final class SubjectContext {
        final Course course;
        final String subject;
        private CourseModule module;

        SubjectContext(Course course, String subject) {
            this.course = course;
            this.subject = subject;
        }

        CourseModule module() {
            if (module == null) {
                module = moduleRepository
                        .findByCourseIdAndSourcePath(course.getId(), subject)
                        .orElseGet(this::createModule);
            }
            return module;
        }

        private CourseModule createModule() {
            CourseModule created = new CourseModule();
            created.setCourseId(course.getId());
            created.setTitle("Core lessons");
            created.setSummary(null);
            created.setStatus(ContentStatus.DRAFT);
            created.setSourcePath(subject);
            created.setDisplayOrder(
                    moduleRepository.maxDisplayOrderForCourse(course.getId()) + 1);
            return moduleRepository.save(created);
        }
    }

    /** Per-run counters plus the capped warning list. */
    private static final class Run {
        int subjectsScanned;
        int lessonsCreated;
        int lessonsUpdated;
        int lessonsUnchanged;
        int conflictsStaged;
        int failures;
        private int dropped;
        private final List<String> warnings = new ArrayList<>();

        void warn(String message) {
            if (warnings.size() < MAX_WARNINGS) {
                warnings.add(message);
            } else {
                dropped++;
            }
        }

        List<String> warningList() {
            if (dropped > 0 && !warnings.isEmpty()) {
                warnings.set(warnings.size() - 1, "… " + (dropped + 1)
                        + " more warnings not shown (cap " + MAX_WARNINGS + ").");
            }
            return List.copyOf(warnings);
        }
    }
}
