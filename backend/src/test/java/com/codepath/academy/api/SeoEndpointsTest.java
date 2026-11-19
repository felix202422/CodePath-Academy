package com.codepath.academy.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.codepath.academy.catalog.model.ContentStatus;
import com.codepath.academy.catalog.model.Course;
import com.codepath.academy.catalog.model.CourseLevel;
import com.codepath.academy.catalog.model.LearningPath;
import com.codepath.academy.catalog.repository.CourseRepository;
import com.codepath.academy.catalog.repository.LearningPathRepository;
import com.codepath.academy.support.SecurityTestSupport;
import java.io.ByteArrayInputStream;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import javax.xml.parsers.DocumentBuilderFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.WebApplicationContext;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.NodeList;

/**
 * Crawler contract for /robots.txt and /sitemap.xml: anonymous, no session,
 * sitemap limited to indexable public pages (static routes + published catalog
 * with the same visibility rules as the public API), absolute locs. Host-header
 * handling is pinned by SeoControllerTest; this class asserts content only.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class SeoEndpointsTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private CourseRepository courseRepository;

    @Autowired
    private LearningPathRepository pathRepository;

    @Autowired
    private WebApplicationContext wac;

    /**
     * Same reset as PublicCatalogApiTest: classes that issue .with(csrf())
     * requests can leave the shared CsrfFilter on a session-backed repository,
     * which would make no-session assertions order-dependent.
     */
    @BeforeEach
    void useProductionCsrfRepository() {
        SecurityTestSupport.restoreCookieCsrfRepository(wac);
    }

    @Test
    void robotsTxtAllowsPublicCrawlingAndBlocksPrivateAreas() throws Exception {
        var result = mockMvc.perform(get("/robots.txt"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.TEXT_PLAIN))
                .andReturn();
        String body = result.getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertTrue(body.contains("User-agent: *"), body);
        assertTrue(body.contains("Allow: /"), body);
        assertTrue(body.contains("Disallow: /student"), "private area must be blocked:\n" + body);
        assertTrue(body.contains("Disallow: /admin"), "private area must be blocked:\n" + body);
        assertTrue(body.contains("Disallow: /api/"), body);
        assertTrue(body.contains("Disallow: /actuator/"), body);

        // Public content stays crawlable.
        assertFalse(body.contains("Disallow: /courses"), body);
        assertFalse(body.contains("Disallow: /paths"), body);
        assertFalse(body.contains("Disallow: /about"), body);
        assertFalse(body.contains("Disallow: /login"), body);
        assertFalse(body.contains("Disallow: /register"), body);

        // The sitemap is advertised with an absolute URL.
        String sitemapLine = body.lines()
                .filter(line -> line.startsWith("Sitemap: "))
                .findFirst()
                .orElseThrow(() -> new AssertionError("robots.txt must advertise the sitemap:\n" + body));
        assertTrue(sitemapLine.startsWith("Sitemap: http"), sitemapLine);
        assertTrue(sitemapLine.endsWith("/sitemap.xml"), sitemapLine);
    }

    @Test
    void sitemapListsStaticRoutesAndEveryPublishedCatalogPage() throws Exception {
        String xml = fetchSitemap();
        Document doc = parseXml(xml);
        NodeList urls = doc.getElementsByTagName("url");

        // 7 static public routes + 7 published paths + 20 published courses.
        assertEquals(34, urls.getLength(), "unexpected sitemap size");

        Set<String> staticRoutes = Set.of(
                "/", "/courses", "/paths", "/about", "/contact", "/privacy", "/terms");
        Set<String> paths = new HashSet<>();
        for (int i = 0; i < urls.getLength(); i++) {
            Element url = (Element) urls.item(i);
            String loc = url.getElementsByTagName("loc").item(0).getTextContent();
            assertTrue(loc.startsWith("http://") || loc.startsWith("https://"),
                    "locs must be absolute: " + loc);
            String path = URI.create(loc).getPath();
            paths.add(path);
            if (staticRoutes.contains(path)) {
                // Static routes are not database rows; they carry no lastmod.
                assertNull(url.getElementsByTagName("lastmod").item(0),
                        "static route must not claim a lastmod: " + loc);
            } else {
                // updated_at is NOT NULL DEFAULT CURRENT_TIMESTAMP on catalog rows.
                assertNotNull(url.getElementsByTagName("lastmod").item(0),
                        "missing lastmod for " + loc);
            }
        }

        assertTrue(paths.containsAll(List.of(
                        "/", "/courses", "/paths", "/about", "/contact", "/privacy", "/terms")),
                "static routes missing: " + paths);
        assertTrue(paths.contains("/paths/frontend-development"), "known published path missing");
        assertTrue(paths.contains("/courses/java-programming"), "known published course missing");
        assertFalse(paths.stream().anyMatch(p -> p.startsWith("/student")),
                "private area in sitemap: " + paths);
        assertFalse(paths.stream().anyMatch(p -> p.startsWith("/admin")),
                "private area in sitemap: " + paths);
        assertFalse(paths.contains("/login") || paths.contains("/register"),
                "utility routes do not belong in the sitemap: " + paths);
    }

    @Test
    void sitemapFollowsTheSameVisibilityRulesAsThePublicApi() throws Exception {
        LearningPath draftPath = new LearningPath();
        draftPath.setSlug("draft-path-" + UUID.randomUUID());
        draftPath.setName("Draft path");
        draftPath.setSummary("Never listed publicly.");
        draftPath.setDisplayOrder(999);
        draftPath.setStatus(ContentStatus.DRAFT);
        pathRepository.save(draftPath);

        Course draftCourse = new Course();
        draftCourse.setLearningPathId(
                pathRepository.findBySlugAndStatus("software-engineering", ContentStatus.PUBLISHED)
                        .orElseThrow().getId());
        draftCourse.setSlug("draft-course-" + UUID.randomUUID());
        draftCourse.setTitle("Draft course");
        draftCourse.setSummary("Never listed publicly.");
        draftCourse.setLevel(CourseLevel.BEGINNER);
        draftCourse.setStatus(ContentStatus.DRAFT);
        draftCourse.setDisplayOrder(999);
        courseRepository.save(draftCourse);

        // Published course under a draft path: hidden by the path guard.
        Course orphanCourse = new Course();
        orphanCourse.setLearningPathId(draftPath.getId());
        orphanCourse.setSlug("orphan-course-" + UUID.randomUUID());
        orphanCourse.setTitle("Orphan course");
        orphanCourse.setSummary("Hidden because its path is not published.");
        orphanCourse.setLevel(CourseLevel.BEGINNER);
        orphanCourse.setStatus(ContentStatus.PUBLISHED);
        orphanCourse.setDisplayOrder(998);
        courseRepository.save(orphanCourse);

        // Positive control: a properly published course must appear.
        Course controlCourse = new Course();
        controlCourse.setLearningPathId(
                pathRepository.findBySlugAndStatus("software-engineering", ContentStatus.PUBLISHED)
                        .orElseThrow().getId());
        controlCourse.setSlug("control-course-" + UUID.randomUUID());
        controlCourse.setTitle("Control course");
        controlCourse.setSummary("A valid published course for the sitemap test.");
        controlCourse.setLevel(CourseLevel.BEGINNER);
        controlCourse.setStatus(ContentStatus.PUBLISHED);
        controlCourse.setDisplayOrder(997);
        courseRepository.save(controlCourse);

        String xml = fetchSitemap();
        Document doc = parseXml(xml);

        assertFalse(xml.contains(draftPath.getSlug()), "draft path leaked into the sitemap");
        assertFalse(xml.contains(draftCourse.getSlug()), "draft course leaked into the sitemap");
        assertFalse(xml.contains(orphanCourse.getSlug()), "orphaned course leaked into the sitemap");
        assertTrue(xml.contains("/courses/" + controlCourse.getSlug()),
                "published course missing from the sitemap");

        // 34 baseline (7 static + 7 paths + 20 courses) + the control course only.
        assertEquals(35, doc.getElementsByTagName("url").getLength());
    }

    @Test
    void crawlerFilesAreAnonymousAndCreateNoSession() throws Exception {
        for (String path : List.of("/robots.txt", "/sitemap.xml")) {
            var result = mockMvc.perform(get(path))
                    .andExpect(status().isOk())
                    .andReturn();
            assertTrue(result.getResponse().getHeaders("Set-Cookie").stream()
                            .noneMatch(cookie -> cookie.startsWith("SESSION=")),
                    "crawler files must not create sessions: "
                            + result.getResponse().getHeaders("Set-Cookie"));
        }
    }

    private String fetchSitemap() throws Exception {
        return mockMvc.perform(get("/sitemap.xml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_XML))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);
    }

    private static Document parseXml(String xml) throws Exception {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        try (var input = new ByteArrayInputStream(xml.getBytes(StandardCharsets.UTF_8))) {
            return factory.newDocumentBuilder().parse(input);
        }
    }
}
