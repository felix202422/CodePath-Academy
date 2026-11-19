package com.codepath.academy.api;

import com.codepath.academy.catalog.api.dto.SitemapEntry;
import com.codepath.academy.catalog.service.PublicCatalogService;
import com.codepath.academy.config.AppProperties;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.List;
import java.util.regex.Pattern;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Crawler-facing files served at the site root: robots.txt and sitemap.xml.
 * The Vite dev proxy and the Nginx edge both forward these two paths here, so
 * development and the container stack expose identical crawler behavior.
 *
 * <p>Absolute URLs use {@code APP_PUBLIC_BASE_URL} when configured (required in
 * production). With no configuration the origin is derived from the request
 * (Host + X-Forwarded-Proto), which is exactly what a local dev proxy provides;
 * the derived host is validated so a spoofed Host header can never inject
 * markup into the sitemap.
 */
@RestController
public class SeoController {

    /** Indexable public SPA routes (stable, no dynamic segments). */
    static final List<String> PUBLIC_ROUTES = List.of("/", "/courses", "/paths", "/about");

    /** Host header shape: hostname with an optional port. Rejects everything else. */
    private static final Pattern SAFE_HOST = Pattern.compile("[A-Za-z0-9.\\-]+(:\\d{1,5})?");

    private final PublicCatalogService catalogService;
    private final AppProperties properties;

    public SeoController(PublicCatalogService catalogService, AppProperties properties) {
        this.catalogService = catalogService;
        this.properties = properties;
    }

    @GetMapping("/robots.txt")
    public ResponseEntity<String> robots(HttpServletRequest request) {
        return ResponseEntity.ok()
                .contentType(new MediaType(MediaType.TEXT_PLAIN, StandardCharsets.UTF_8))
                .body(robotsBody(resolveBaseUrl(properties, request)));
    }

    @GetMapping("/sitemap.xml")
    public ResponseEntity<String> sitemap(HttpServletRequest request) {
        return ResponseEntity.ok()
                .contentType(new MediaType("application", "xml", StandardCharsets.UTF_8))
                .body(sitemapXml(resolveBaseUrl(properties, request),
                        catalogService.getPublicSitemapEntries()));
    }

    /**
     * robots.txt: crawl everything public, block the private application areas
     * (student, admin) and non-content endpoints (API, actuator), then advertise
     * the sitemap. Private areas are session-protected as well — this is the
     * crawler-facing layer of that boundary.
     */
    static String robotsBody(String base) {
        return """
                User-agent: *
                Allow: /

                # Private application areas — never crawled or indexed.
                Disallow: /student
                Disallow: /admin
                # Backend endpoints are not website content.
                Disallow: /api/
                Disallow: /actuator/

                Sitemap: %s/sitemap.xml
                """.formatted(base);
    }

    /**
     * sitemap.xml: the static public routes plus every published catalog page
     * (lastmod is omitted when a row has no modification timestamp).
     */
    static String sitemapXml(String base, List<SitemapEntry> catalogEntries) {
        StringBuilder xml = new StringBuilder(4096);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n");
        for (String route : PUBLIC_ROUTES) {
            appendUrl(xml, base + route, null);
        }
        for (SitemapEntry entry : catalogEntries) {
            appendUrl(xml, base + entry.path(), entry.lastmod());
        }
        xml.append("</urlset>\n");
        return xml.toString();
    }

    /**
     * Configured origin wins (operator truth). Otherwise scheme from
     * X-Forwarded-Proto (proxy-set, validated to http/https) and a Host header
     * that must look like a hostname; anything else falls back to the container's
     * own server name and port.
     */
    static String resolveBaseUrl(AppProperties properties, HttpServletRequest request) {
        AppProperties.Seo seo = properties.seo();
        if (seo != null && seo.publicBaseUrl() != null && !seo.publicBaseUrl().isBlank()) {
            return stripTrailingSlash(seo.publicBaseUrl().trim());
        }

        String scheme = forwardedValue(request.getHeader("X-Forwarded-Proto"));
        if (!"http".equals(scheme) && !"https".equals(scheme)) {
            scheme = request.getScheme();
        }

        String host = request.getHeader("Host");
        if (host == null || !SAFE_HOST.matcher(host).matches()) {
            // getServerName() is itself Host-header derived (Servlet spec), so a
            // rejected header would just come back through the side door. The
            // local name/port is the container's own identity.
            host = request.getLocalName() + defaultPortSuffix(request);
        }
        return scheme + "://" + host;
    }

    private static void appendUrl(StringBuilder xml, String loc, Instant lastmod) {
        xml.append("  <url>\n");
        xml.append("    <loc>").append(escapeXml(loc)).append("</loc>\n");
        if (lastmod != null) {
            xml.append("    <lastmod>").append(lastmod).append("</lastmod>\n");
        }
        xml.append("  </url>\n");
    }

    private static String forwardedValue(String header) {
        if (header == null || header.isBlank()) {
            return null;
        }
        return header.split(",")[0].trim();
    }

    private static String defaultPortSuffix(HttpServletRequest request) {
        int port = request.getLocalPort();
        boolean standard = ("http".equals(request.getScheme()) && port == 80)
                || ("https".equals(request.getScheme()) && port == 443);
        return standard || port <= 0 ? "" : ":" + port;
    }

    private static String stripTrailingSlash(String value) {
        String result = value;
        while (result.endsWith("/") && result.length() > "https://".length()) {
            result = result.substring(0, result.length() - 1);
        }
        return result;
    }

    private static String escapeXml(String value) {
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }
}
