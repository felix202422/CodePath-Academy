package com.codepath.academy.importer;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseModule;
import com.codepath.academy.catalog.model.Lesson;
import com.codepath.academy.catalog.repository.CourseModuleRepository;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LessonRepository;
import com.codepath.academy.common.error.ApiException;
import com.codepath.academy.common.util.Sha256;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserRole;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.codepath.academy.importer.api.dto.ImportRowDetailResponse;
import com.codepath.academy.importer.api.dto.ImportRowResponse;
import com.codepath.academy.importer.api.dto.ImportRunResponse;
import com.codepath.academy.importer.model.ImportMode;
import com.codepath.academy.importer.model.ImportStatus;
import com.codepath.academy.importer.repository.ContentImportRepository;
import com.codepath.academy.importer.service.ContentImportReviewService;
import com.codepath.academy.importer.service.CurriculumImporter;
import com.codepath.academy.importer.source.CurriculumSourceFactory;
import com.codepath.academy.support.FixtureCurriculum;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.transaction.annotation.Transactional;

/**
 * Importer behavior against the staged curriculum fixtures (a documented
 * local-directory run, behavior 9): first import creates DRAFT lessons with
 * provenance, re-runs are idempotent, changed source either updates safely or
 * stages a reviewable conflict, and accept/discard resolve conflicts exactly
 * as documented. The test transaction rolls every run back.
 */
@SpringBootTest
@ActiveProfiles("test")
@Transactional
class CurriculumImporterTest {

    /** Staged checkout the importer reads from (mutated per test). */
    private static final Path CURRICULUM =
            Path.of("target", "test-curriculum").toAbsolutePath().normalize();

    /** Staged media root the importer copies images into. */
    private static final Path MEDIA =
            Path.of("target", "test-media").toAbsolutePath().normalize();

    @DynamicPropertySource
    static void importerProperties(DynamicPropertyRegistry registry) {
        FixtureCurriculum.stage(CURRICULUM);
        FixtureCurriculum.clear(MEDIA);
        registry.add("app.curriculum.local-checkout-path", () -> CURRICULUM.toString());
        registry.add("app.media.root", () -> MEDIA.toString());
    }

    @Autowired
    private CurriculumImporter importer;

    @Autowired
    private ContentImportReviewService review;

    @Autowired
    private CurriculumSourceFactory sourceFactory;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private CourseModuleRepository moduleRepository;

    @Autowired
    private LessonRepository lessonRepository;

    @Autowired
    private ContentImportRepository importRepository;

    @Autowired
    private AppUserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @BeforeEach
    void pristineFixtures() {
        FixtureCurriculum.stage(CURRICULUM);
        FixtureCurriculum.clear(MEDIA);
    }

    @Test
    void firstRunImportsIndexedLessonsAsDraftsWithProvenance() {
        ImportRunResponse run = importer.run(null, null);

        assertEquals(ImportMode.LOCAL, run.mode());
        assertEquals(sourceFactory.canonicalRepository(), run.repository());
        assertTrue(run.commit().matches("[0-9a-f]{40}"), "commit pin: " + run.commit());
        assertEquals(3, run.subjectsScanned());
        assertEquals(List.of("99-UNMAPPED-SUBJECT"), run.unmappedSubjects());
        assertEquals(3, run.lessonsCreated());
        assertEquals(0, run.lessonsUpdated());
        assertEquals(0, run.lessonsUnchanged());
        assertEquals(0, run.conflictsStaged());
        assertEquals(0, run.failures());
        assertEquals(1, run.mediaFilesStored());
        // Index entries that do not exist and a subject without README are
        // reported honestly instead of failing the run.
        assertTrue(run.warnings().stream().anyMatch(w -> w.contains("ghost.md")),
                "missing index entry warned: " + run.warnings());
        assertTrue(run.warnings().stream().anyMatch(w -> w.contains("01-NO-README")),
                "README-less subject warned: " + run.warnings());

        Course course = courseRepository.findBySourcePath("04-JAVA-PROGRAMMING")
                .orElseThrow();
        List<CourseModule> modules =
                moduleRepository.findByCourseIdOrderByDisplayOrderAsc(course.getId());
        assertEquals(1, modules.size());
        CourseModule module = modules.get(0);
        assertEquals("Core lessons", module.getTitle());
        assertEquals("04-JAVA-PROGRAMMING", module.getSourcePath());
        assertEquals(ContentStatus.DRAFT, module.getStatus());

        List<Lesson> lessons = lessonRepository.findByModuleIdOrderByDisplayOrderAsc(
                module.getId());
        assertEquals(3, lessons.size());
        Lesson variables = lessons.get(0);
        assertEquals("variables", variables.getSlug());
        assertEquals("Variables and types", variables.getTitle());
        assertEquals(ContentStatus.DRAFT, variables.getStatus());
        assertFalse(variables.isEditedByAdmin());
        assertEquals("04-JAVA-PROGRAMMING/variables.md", variables.getSourcePath());
        assertEquals(run.repository(), variables.getSourceRepository());
        assertEquals(run.commit(), variables.getSourceCommit());
        assertEquals(Sha256.hex(variables.getBodyMarkdown()), variables.getContentHash());

        String body = variables.getBodyMarkdown();
        assertTrue(body.contains("Imported from [CodePath-Masterclass](" + run.repository() + ")"),
                "attribution footer present");
        assertTrue(body.contains("`04-JAVA-PROGRAMMING/variables.md @ " + run.commit() + "`"),
                "path @ commit recorded");
        assertTrue(body.contains("MIT © Felix Haule 2026"));
        // Relative image copied into academy media and repointed.
        assertTrue(body.contains("(/media/04-JAVA-PROGRAMMING/assets/flow.svg)"));
        assertTrue(Files.isRegularFile(MEDIA.resolve("04-JAVA-PROGRAMMING/assets/flow.svg")));
        // Relative lesson link becomes a pinned GitHub permalink.
        assertTrue(body.contains(run.repository() + "/blob/" + run.commit()
                + "/04-JAVA-PROGRAMMING/loops.md"));
        // A cross-file link with a heading fragment resolves to the file and
        // keeps the fragment on the permalink (never a "not found" warning).
        assertTrue(body.contains(run.repository() + "/blob/" + run.commit()
                + "/04-JAVA-PROGRAMMING/README.md#exercises"));
        assertFalse(run.warnings().stream().anyMatch(w -> w.contains("README.md#exercises")),
                "fragment link must resolve: " + run.warnings());
        // Summary is derived from the raw source, never from the footer.
        assertEquals("Variables hold the values your program operates on.",
                variables.getSummary());
        // Fenced sample code is never rewritten.
        assertTrue(body.contains("int count = 3;"));

        assertEquals(3, importRepository.count());
        assertTrue(importRepository.findBySourceRepositoryAndSourcePathAndSourceHash(
                        run.repository(), "04-JAVA-PROGRAMMING/variables.md",
                        variables.getSourceHash()).isPresent());
        // Excluded directories never become lessons or ledger rows.
        assertTrue(lessonRepository.findByModuleIdAndSlug(module.getId(),
                "exercises-exercise-one").isEmpty());
        assertTrue(lessonRepository.findByModuleIdAndSlug(module.getId(),
                "solutions-solution-one").isEmpty());
    }

    @Test
    void secondRunIsIdempotent() {
        importer.run(null, null);
        ImportRunResponse second = importer.run(null, null);

        assertEquals(0, second.lessonsCreated());
        assertEquals(0, second.lessonsUpdated());
        assertEquals(3, second.lessonsUnchanged());
        assertEquals(0, second.conflictsStaged());
        assertEquals(0, second.failures());
        // Nothing was re-processed, so no media was stored again either.
        assertEquals(0, second.mediaFilesStored());
        assertEquals(3, importRepository.count());
    }

    @Test
    void changedSourceUpdatesAnUneditedDraftInPlace() {
        importer.run(null, null);
        Lesson variables = lesson("04-JAVA-PROGRAMMING/variables.md");
        String firstBody = variables.getBodyMarkdown();

        String newRaw = "# Variables and types\n\nUpdated prose from the new revision.\n";
        changeSource("04-JAVA-PROGRAMMING/variables.md", newRaw);

        ImportRunResponse run = importer.run(null, null);
        assertEquals(0, run.lessonsCreated());
        assertEquals(1, run.lessonsUpdated());
        assertEquals(0, run.conflictsStaged());
        assertEquals(0, run.failures());

        Lesson reloaded = lessonRepository.findById(variables.getId()).orElseThrow();
        assertNotEquals(firstBody, reloaded.getBodyMarkdown());
        assertTrue(reloaded.getBodyMarkdown().contains("Updated prose from the new revision."));
        assertEquals(Sha256.hex(newRaw), reloaded.getSourceHash());
        assertFalse(reloaded.isEditedByAdmin());
        assertEquals(ContentStatus.DRAFT, reloaded.getStatus());
        // The new source version is recorded; the old row stays as history.
        assertNotNull(importRepository.findBySourceRepositoryAndSourcePathAndSourceHash(
                sourceFactory.canonicalRepository(), "04-JAVA-PROGRAMMING/variables.md",
                Sha256.hex(newRaw)).orElse(null));
        assertEquals(4, importRepository.count());
    }

    @Test
    void editedLessonGetsAStagedConflictThatAcceptApplies() {
        importer.run(null, null);
        Lesson variables = lesson("04-JAVA-PROGRAMMING/variables.md");

        // The administrator rewrites the lesson in the academy.
        String academyBody = "# Variables and types\n\nAcademy-authored explanation.\n";
        variables.setBodyMarkdown(academyBody);
        variables.setContentHash(Sha256.hex(academyBody));
        variables.setEditedByAdmin(true);
        lessonRepository.save(variables);

        changeSource("04-JAVA-PROGRAMMING/variables.md",
                "# Variables and types\n\nNew source explanation.\n");

        ImportRunResponse run = importer.run(null, null);
        assertEquals(0, run.lessonsUpdated());
        assertEquals(1, run.conflictsStaged());

        Lesson untouched = lessonRepository.findById(variables.getId()).orElseThrow();
        assertEquals(academyBody, untouched.getBodyMarkdown());
        assertTrue(untouched.isEditedByAdmin());

        // Re-running the same source version does not re-stage the conflict.
        ImportRunResponse again = importer.run(null, null);
        assertEquals(0, again.conflictsStaged());
        assertEquals(3, again.lessonsUnchanged());

        List<ImportRowResponse> conflicts = review.list(ImportStatus.CONFLICT, 100);
        assertEquals(1, conflicts.size());
        ImportRowResponse conflict = conflicts.get(0);
        assertTrue(conflict.hasProposal());
        assertEquals(variables.getId(), conflict.targetLessonId());
        assertEquals("04-JAVA-PROGRAMMING/variables.md", conflict.sourcePath());

        ImportRowDetailResponse detail = review.get(conflict.id());
        assertEquals(academyBody, detail.currentBody());
        assertEquals(Sha256.hex(academyBody), detail.currentContentHash());
        assertTrue(detail.proposedBody().contains("New source explanation."));

        AppUser administrator = createAdministrator();
        ImportRowDetailResponse accepted = review.accept(conflict.id(), administrator.getId());
        assertEquals(ImportStatus.IMPORTED, accepted.status());
        assertNull(accepted.proposedBody());
        assertNotNull(accepted.resolvedAt());
        assertFalse(accepted.hasProposal());
        assertEquals(administrator.getId(), importRepository.findById(conflict.id())
                .orElseThrow().getResolvedById(), "accept records who decided");

        Lesson applied = lessonRepository.findById(variables.getId()).orElseThrow();
        assertTrue(applied.getBodyMarkdown().contains("New source explanation."));
        assertFalse(applied.isEditedByAdmin());
        assertEquals(Sha256.hex(applied.getBodyMarkdown()), applied.getContentHash());

        // The staged row is spent: accepting it again is an honest conflict.
        assertThrows(ApiException.class,
                () -> review.accept(conflict.id(), administrator.getId()));
    }

    @Test
    void discardedConflictKeepsTheAcademyVersionAndFutureRunsRespectIt() {
        importer.run(null, null);
        Lesson variables = lesson("04-JAVA-PROGRAMMING/variables.md");

        // Protected only by publication: not edited, but already published.
        variables.setStatus(ContentStatus.PUBLISHED);
        lessonRepository.save(variables);

        changeSource("04-JAVA-PROGRAMMING/variables.md",
                "# Variables and types\n\nStaged source version.\n");
        ImportRunResponse run = importer.run(null, null);
        assertEquals(1, run.conflictsStaged());

        AppUser administrator = createAdministrator();
        ImportRowResponse conflict = review.list(ImportStatus.CONFLICT, 100).get(0);
        ImportRowDetailResponse discarded = review.discard(conflict.id(), administrator.getId());
        assertEquals(ImportStatus.UNCHANGED, discarded.status());
        assertNull(discarded.proposedBody());
        assertNotNull(discarded.resolvedAt());
        assertEquals(administrator.getId(), importRepository.findById(conflict.id())
                .orElseThrow().getResolvedById(), "discard records who decided");

        Lesson kept = lessonRepository.findById(variables.getId()).orElseThrow();
        assertTrue(kept.getBodyMarkdown().contains("Variables hold the values"));
        assertTrue(kept.isEditedByAdmin(), "discard protects the academy version");

        // The same source version must not resurrect the discarded proposal.
        ImportRunResponse rerun = importer.run(null, null);
        assertEquals(0, rerun.conflictsStaged());
        assertEquals(3, rerun.lessonsUnchanged());

        // Even after the lesson is taken back to DRAFT, a NEW source version
        // still stages instead of overwriting the administrator's choice.
        kept.setStatus(ContentStatus.DRAFT);
        lessonRepository.save(kept);
        changeSource("04-JAVA-PROGRAMMING/variables.md",
                "# Variables and types\n\nThird source version.\n");
        ImportRunResponse third = importer.run(null, null);
        assertEquals(1, third.conflictsStaged());
        Lesson afterThird = lessonRepository.findById(variables.getId()).orElseThrow();
        assertTrue(afterThird.getBodyMarkdown().contains("Variables hold the values"));
    }

    @Test
    void processingFailureIsRecordedPerFileAndTheRunContinues() {
        // An academy lesson already owns the slug the importer would derive.
        Course course = courseRepository.findBySourcePath("04-JAVA-PROGRAMMING")
                .orElseThrow();
        CourseModule module = new CourseModule();
        module.setCourseId(course.getId());
        module.setTitle("Core lessons");
        module.setSourcePath("04-JAVA-PROGRAMMING");
        module.setStatus(ContentStatus.DRAFT);
        module.setDisplayOrder(1);
        moduleRepository.save(module);

        Lesson collision = new Lesson();
        collision.setModuleId(module.getId());
        collision.setSlug("variables");
        collision.setTitle("Academy variables");
        collision.setBodyMarkdown("# Academy\n");
        collision.setContentHash(Sha256.hex(collision.getBodyMarkdown()));
        collision.setStatus(ContentStatus.DRAFT);
        collision.setEditedByAdmin(true);
        collision.setDisplayOrder(1);
        lessonRepository.save(collision);

        ImportRunResponse run = importer.run(null, null);

        assertEquals(1, run.failures());
        assertEquals(2, run.lessonsCreated());
        String rawVariables;
        try {
            rawVariables = Files.readString(
                    CURRICULUM.resolve("04-JAVA-PROGRAMMING/variables.md"));
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
        var failed = importRepository.findBySourceRepositoryAndSourcePathAndSourceHash(
                        sourceFactory.canonicalRepository(),
                        "04-JAVA-PROGRAMMING/variables.md", Sha256.hex(rawVariables))
                .orElseThrow();
        assertEquals(ImportStatus.FAILED, failed.getStatus());
        assertTrue(failed.getMessage().contains("already exists"),
                "failure message explains the cause: " + failed.getMessage());

        // The failing file did not touch the academy lesson, and the other
        // indexed files still imported.
        Lesson untouched = lessonRepository.findById(collision.getId()).orElseThrow();
        assertEquals("# Academy\n", untouched.getBodyMarkdown());
        assertNotNull(lesson("04-JAVA-PROGRAMMING/loops.md"));
    }

    // --- helpers -----------------------------------------------------------

    private Lesson lesson(String sourcePath) {
        return lessonRepository
                .findBySourceRepositoryAndSourcePath(
                        sourceFactory.canonicalRepository(), sourcePath)
                .orElseThrow(() -> new AssertionError(
                        "No lesson imported from " + sourcePath));
    }

    private void changeSource(String relativePath, String content) {
        try {
            Files.writeString(CURRICULUM.resolve(relativePath), content);
        } catch (IOException ex) {
            throw new UncheckedIOException(ex);
        }
    }

    private AppUser createAdministrator() {
        AppUser administrator = new AppUser();
        String email = "import-reviewer-" + UUID.randomUUID() + "@example.test";
        administrator.setEmail(email);
        administrator.setEmailNormalized(AppUser.normalizeEmail(email));
        administrator.setPasswordHash(passwordEncoder.encode("irrelevant-for-this-test"));
        administrator.setFullName("Import Reviewer");
        administrator.setRole(UserRole.ADMIN);
        administrator.setStatus(UserStatus.ACTIVE);
        return userRepository.save(administrator);
    }
}
