package com.codepath.academy.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Externalized configuration. Secret values are supplied only through environment
 * variables (see .env.example); nothing sensitive is committed to the repository.
 */
@ConfigurationProperties(prefix = "app")
public record AppProperties(
        Web web,
        BootstrapAdmin bootstrapAdmin,
        Curriculum curriculum,
        Media media
) {
    public record Web(
            String[] corsAllowedOrigins,
            boolean cookieSecure
    ) {}

    public record BootstrapAdmin(
            boolean enabled,
            String email,
            String password
    ) {}

    public record Curriculum(
            String repository,
            String localCheckoutPath
    ) {}

    public record Media(
            String root
    ) {}
}
