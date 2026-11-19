package com.codepath.academy.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.codepath.academy.catalog.api.dto.SitemapEntry;
import com.codepath.academy.config.AppProperties;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

/**
 * Base-URL resolution and file bodies without a Spring context: configured
 * origin wins, forwarded headers are validated, unsafe Host headers fall back
 * to the container identity, and both files carry the expected directives.
 */
class SeoControllerTest {

    private static AppProperties properties(String publicBaseUrl) {
        return new AppProperties(
                new AppProperties.Web(new String[] {"http://localhost:5173"}, false),
                new AppProperties.BootstrapAdmin(false, "", ""),
                new AppProperties.Curriculum("felix202422/CodePath-Masterclass", "", ""),
                new AppProperties.Media("./data/media"),
                new AppProperties.Seo(publicBaseUrl));
    }

    private static MockHttpServletRequest request(String host, String forwardedProto) {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/sitemap.xml");
        if (host != null) {
            request.addHeader("Host", host);
        }
        if (forwardedProto != null) {
            request.addHeader("X-Forwarded-Proto", forwardedProto);
        }
        return request;
    }

    @Test
    void configuredBaseUrlWinsOverAnyRequestHeader() {
        assertEquals("https://academy.example.org",
                SeoController.resolveBaseUrl(
                        properties("https://academy.example.org/"),
                        request("spoofed.example", "http")));
        assertEquals("https://academy.example.org",
                SeoController.resolveBaseUrl(properties("  https://academy.example.org  "),
                        request(null, null)));
    }

    @Test
    void baseUrlDerivesFromForwardedProtoAndHostHeader() {
        assertEquals("https://academy.test",
                SeoController.resolveBaseUrl(properties(""), request("academy.test", "https")));
        // Multiple forwarded values: the first (nearest proxy) wins.
        assertEquals("https://academy.test",
                SeoController.resolveBaseUrl(properties(null), request("academy.test", "https, http")));
        // Non-http(s) forwarding values are rejected.
        assertEquals("http://academy.test",
                SeoController.resolveBaseUrl(properties(""), request("academy.test", "javascript")));
        // Local dev proxy: Host keeps the port, no forwarding header.
        assertEquals("http://localhost:5173",
                SeoController.resolveBaseUrl(properties(""), request("localhost:5173", null)));
    }

    @Test
    void unsafeHostHeaderFallsBackToServerIdentity() {
        assertEquals("http://localhost",
                SeoController.resolveBaseUrl(properties(""), request("evil.example/path?x=1", null)));
        assertEquals("http://localhost",
                SeoController.resolveBaseUrl(properties(""), request("evil.example:80<script>", null)));
        assertEquals("http://localhost",
                SeoController.resolveBaseUrl(properties(""), request(null, null)));
    }

    @Test
    void nonStandardLocalPortIsPreservedWithoutHostHeader() {
        MockHttpServletRequest request = request(null, null);
        request.setLocalPort(8082);
        assertEquals("http://localhost:8082",
                SeoController.resolveBaseUrl(properties(""), request));
    }

    @Test
    void robotsBodyBlocksPrivateAreasAndAdvertisesTheSitemap() {
        String body = SeoController.robotsBody("https://academy.example.org");
        assertTrue(body.startsWith("User-agent: *"), body);
        assertTrue(body.contains("Allow: /"), body);
        assertTrue(body.contains("Disallow: /student"), body);
        assertTrue(body.contains("Disallow: /admin"), body);
        assertTrue(body.contains("Disallow: /api/"), body);
        assertTrue(body.contains("Disallow: /actuator/"), body);
        assertTrue(body.contains("Sitemap: https://academy.example.org/sitemap.xml"), body);
        assertFalse(body.contains("Disallow: /courses"), body);
        assertTrue(body.endsWith("\n"), "robots.txt should end with a newline");
    }

    @Test
    void sitemapXmlEmitsStaticRoutesEntriesAndEscapesLocs() {
        Instant lastmod = Instant.parse("2026-11-19T10:11:12Z");
        String xml = SeoController.sitemapXml("http://localhost:5173", List.of(
                new SitemapEntry("/paths/frontend-development", lastmod),
                new SitemapEntry("/courses/a&b", lastmod),
                new SitemapEntry("/courses/unknown-timestamp", null)));

        assertTrue(xml.startsWith("<?xml version=\"1.0\" encoding=\"UTF-8\"?>"), xml);
        assertTrue(xml.contains(
                "<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">"), xml);
        assertTrue(xml.contains("<loc>http://localhost:5173/</loc>"), xml);
        assertTrue(xml.contains("<loc>http://localhost:5173/courses</loc>"), xml);
        assertTrue(xml.contains("<loc>http://localhost:5173/paths</loc>"), xml);
        assertTrue(xml.contains("<loc>http://localhost:5173/about</loc>"), xml);
        assertTrue(xml.contains("<loc>http://localhost:5173/paths/frontend-development</loc>"), xml);
        assertTrue(xml.contains("<lastmod>2026-11-19T10:11:12Z</lastmod>"), xml);

        // XML metacharacters in a location never break the document.
        assertTrue(xml.contains("<loc>http://localhost:5173/courses/a&amp;b</loc>"), xml);

        // 4 static routes + 3 entries; a null lastmod omits the element entirely.
        assertEquals(7, xml.split("<url>", -1).length - 1);
        assertEquals(2, xml.split("<lastmod>", -1).length - 1);
        assertTrue(xml.endsWith("</urlset>\n"), xml);
    }
}
