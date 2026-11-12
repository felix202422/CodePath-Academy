package com.codepath.academy.config;

import com.codepath.academy.config.AppProperties.Web;
import com.codepath.academy.identity.service.ApiAuthenticationProvider;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.List;
import java.util.function.Supplier;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.savedrequest.NullRequestCache;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

/**
 * Browser-session security: HTTP-only session cookie, CSRF token issued as a readable
 * cookie for the SPA and required on every mutation. Route-level rules below are a first
 * line only; object-level checks happen in services.
 */
@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final AppProperties properties;
    private final ApiSecurityHandlers securityHandlers;

    public SecurityConfig(AppProperties properties, ApiSecurityHandlers securityHandlers) {
        this.properties = properties;
        this.securityHandlers = securityHandlers;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        CsrfTokenRequestAttributeHandler requestHandler = new EagerCsrfTokenRequestHandler();
        // SPA reads the XSRF-TOKEN cookie and echoes it in a header; never render the token
        // into HTML, so the attribute handler defers encoding to the repository.
        requestHandler.setCsrfRequestAttributeName(null);

        http
                .csrf(csrf -> csrf
                        .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                        .csrfTokenRequestHandler(requestHandler))
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                // The SPA handles navigation itself; don't create server sessions to
                // cache anonymous API requests before returning a JSON 401.
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .headers(headers -> headers
                        .contentSecurityPolicy(csp -> csp.policyDirectives(
                                "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
                                        + "script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"))
                        .frameOptions(frame -> frame.deny())
                        .contentTypeOptions(content -> {})
                        .httpStrictTransportSecurity(hsts -> hsts
                                .includeSubDomains(true)
                                .maxAgeInSeconds(31536000)))
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint(securityHandlers)
                        .accessDeniedHandler(securityHandlers))
                .authorizeHttpRequests(auth -> auth
                        // /me must be checked before the /auth/** wildcard below.
                        .requestMatchers("/api/v1/auth/me").authenticated()
                        .requestMatchers(
                                "/api/v1/health",
                                "/api/v1/auth/**",
                                "/api/v1/public/**",
                                "/api/v1/registration/**",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/api/v1/openapi.json",
                                "/api/v1/swagger.html")
                        .permitAll()
                        .requestMatchers("/api/v1/me/enrollments", "/api/v1/me/enrollments/**")
                        .hasRole("STUDENT")
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/**").authenticated()
                        .anyRequest().permitAll())
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/logout")
                        .logoutSuccessHandler((request, response, authentication) -> {
                            response.setStatus(HttpStatus.NO_CONTENT.value());
                        })
                        .deleteCookies("SESSION", "JSESSIONID", "XSRF-TOKEN")
                        .invalidateHttpSession(true)
                        .permitAll());

        return http.build();
    }

    /** Single password hashing algorithm for registration, login, and bootstrap. */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /**
     * Boot backs its own AuthenticationManager auto-configuration off once a
     * custom AuthenticationProvider bean exists, so the manager used by the
     * login endpoint is wired explicitly over the single API provider.
     */
    @Bean
    public AuthenticationManager authenticationManager(ApiAuthenticationProvider provider) {
        return new ProviderManager(provider);
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        Web web = properties.web();
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(web.corsAllowedOrigins()));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of(HttpHeaders.CONTENT_TYPE, "X-XSRF-TOKEN", "X-Requested-With"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    /**
     * Spring Security defers CSRF token creation until an application reads it.
     * The SPA needs the readable double-submit cookie on its initial safe GET,
     * before it can send a mutation, so materialize the token for each request.
     */
    private static final class EagerCsrfTokenRequestHandler extends CsrfTokenRequestAttributeHandler {

        @Override
        public void handle(HttpServletRequest request, HttpServletResponse response,
                           Supplier<CsrfToken> deferredCsrfToken) {
            super.handle(request, response, deferredCsrfToken);
            deferredCsrfToken.get();
        }
    }
}
