package com.codepath.academy.common.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/** One SHA-256 implementation shared by content edits and the curriculum importer. */
public final class Sha256 {

    private Sha256() {
    }

    public static String hex(String content) {
        return hex(content.getBytes(StandardCharsets.UTF_8));
    }

    public static String hex(byte[] content) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(content));
        } catch (NoSuchAlgorithmException ex) {
            // SHA-256 is mandated by the JDK; reaching this line is a broken JVM.
            throw new IllegalStateException("SHA-256 is unavailable", ex);
        }
    }
}
