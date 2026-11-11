package com.codepath.academy.support;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.FileVisitResult;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.SimpleFileVisitor;
import java.nio.file.StandardCopyOption;
import java.nio.file.attribute.BasicFileAttributes;

/**
 * Stages the curriculum importer fixtures into a writable directory under
 * {@code target/}. Tests mutate the staged copy (to simulate source changes)
 * and re-stage it before every test method, so {@code src/test/resources}
 * always stays pristine.
 */
public final class FixtureCurriculum {

    /** Pristine fixture tree shipped with the test sources. */
    public static final Path SOURCE =
            Path.of("src", "test", "resources", "fixtures", "curriculum");

    private FixtureCurriculum() {
    }

    /** Replaces {@code target} with a fresh copy of the fixtures. */
    public static Path stage(Path target) {
        try {
            deleteRecursively(target);
            Files.createDirectories(target);
            copyRecursively(SOURCE, target);
            return target;
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not stage curriculum fixtures into " + target, ex);
        }
    }

    /** Empties {@code target} and recreates it (media root between tests). */
    public static void clear(Path target) {
        try {
            deleteRecursively(target);
            Files.createDirectories(target);
        } catch (IOException ex) {
            throw new UncheckedIOException("Could not clear " + target, ex);
        }
    }

    private static void deleteRecursively(Path root) throws IOException {
        if (!Files.exists(root)) {
            return;
        }
        Files.walkFileTree(root, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
                    throws IOException {
                Files.delete(file);
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult postVisitDirectory(Path dir, IOException exc)
                    throws IOException {
                Files.delete(dir);
                return FileVisitResult.CONTINUE;
            }
        });
    }

    private static void copyRecursively(Path from, Path to) throws IOException {
        Files.walkFileTree(from, new SimpleFileVisitor<>() {
            @Override
            public FileVisitResult preVisitDirectory(Path dir, BasicFileAttributes attrs)
                    throws IOException {
                Files.createDirectories(to.resolve(from.relativize(dir).toString()));
                return FileVisitResult.CONTINUE;
            }

            @Override
            public FileVisitResult visitFile(Path file, BasicFileAttributes attrs)
                    throws IOException {
                Files.copy(file, to.resolve(from.relativize(file).toString()),
                        StandardCopyOption.REPLACE_EXISTING);
                return FileVisitResult.CONTINUE;
            }
        });
    }
}
