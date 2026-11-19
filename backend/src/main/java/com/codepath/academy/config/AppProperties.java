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
        Media media,
        Seo seo
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
            String localCheckoutPath,
            String commit
    ) {}

    public record Media(
            String root
    ) {}

    /**
     * Absolute public origin used for crawler files (sitemap/robots). Empty means
     * "derive from the request"; production sets APP_PUBLIC_BASE_URL to the real
     * deployed origin so sitemap URLs never depend on proxy headers.
     */
    public record Seo(
            String publicBaseUrl
    ) {}
}
