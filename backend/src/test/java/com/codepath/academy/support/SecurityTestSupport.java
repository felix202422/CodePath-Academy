package com.codepath.academy.support;

import jakarta.servlet.Filter;
import org.springframework.security.web.DefaultSecurityFilterChain;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.WebApplicationContext;

/**
 * Repairs shared security filter state that spring-security-test mutates.
 *
 * <p>The {@code csrf()} request post-processor does not scope its session-backed
 * {@code TestCsrfTokenRepository} to the request it processes: it resolves the running
 * chain's {@link CsrfFilter} and permanently overwrites its {@code tokenRepository} field
 * ({@code WebTestUtils.setCsrfTokenRepository} delegates to
 * {@link ReflectionTestUtils#setField}). From that moment on, every request in the same
 * Spring context stores its CSRF token in a server session, so Spring Session starts
 * sending {@code SESSION} cookies — including on anonymous {@code GET /api/v1/public/**}
 * reads. Because test-class order differs per platform (surefire {@code filesystem}
 * runOrder is a different order on Linux than on Windows), which tests observe the leak
 * depends on run order.
 *
 * <p>Contract for this suite: any test class that issues {@code .with(csrf())} requests
 * must call {@link #restoreCookieCsrfRepository(WebApplicationContext)} in an
 * {@code @AfterEach} so the next test class sees the repository the application ships
 * with, and tests that assert the anonymous no-session contract call it in a
 * {@code @BeforeEach} as defense against future classes that forget.
 */
public final class SecurityTestSupport {

    private SecurityTestSupport() {
    }

    /**
     * Puts every {@link CsrfFilter} in the context back onto the cookie repository the
     * application configures in {@code SecurityConfig#securityFilterChain}
     * ({@code CookieCsrfTokenRepository.withHttpOnlyFalse()}). CookieCsrfTokenRepository
     * is stateless, so a factory-fresh instance is behaviorally identical to the one
     * created at startup.
     */
    public static void restoreCookieCsrfRepository(WebApplicationContext wac) {
        for (SecurityFilterChain chain : wac.getBeansOfType(SecurityFilterChain.class).values()) {
            if (!(chain instanceof DefaultSecurityFilterChain defaultChain)) {
                continue;
            }
            for (Filter filter : defaultChain.getFilters()) {
                if (filter instanceof CsrfFilter csrfFilter) {
                    ReflectionTestUtils.setField(csrfFilter, "tokenRepository",
                            CookieCsrfTokenRepository.withHttpOnlyFalse());
                }
            }
        }
    }
}
