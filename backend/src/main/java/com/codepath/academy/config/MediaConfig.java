package com.codepath.academy.config;

import java.nio.file.Path;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Serves academy-managed media (images copied by the curriculum importer)
 * from the configured media root at {@code /media/**}.
 *
 * <p>The path falls under {@code anyRequest().permitAll()} in SecurityConfig —
 * imported lesson images must render for anonymous readers of published
 * lessons — and the CSP allows them via {@code img-src 'self'}.
 */
@Configuration
public class MediaConfig implements WebMvcConfigurer {

    private final AppProperties properties;

    public MediaConfig(AppProperties properties) {
        this.properties = properties;
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        String root = Path.of(properties.media().root())
                .toAbsolutePath().normalize().toUri().toString();
        if (!root.endsWith("/")) {
            root += "/";
        }
        registry.addResourceHandler("/media/**").addResourceLocations(root);
    }
}
