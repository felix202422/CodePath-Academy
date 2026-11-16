package com.codepath.academy.config;

import com.codepath.academy.common.error.ApiError;
import com.codepath.academy.identity.model.AppUser;
import com.codepath.academy.identity.model.UserStatus;
import com.codepath.academy.identity.repository.AppUserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Re-checks the account status behind every signed-in /me and /admin request.
 * Login already rejects non-ACTIVE accounts, but a session issued before a
 * suspension would otherwise keep working until it expires — this filter makes
 * suspend/reactivate take effect immediately on the existing session too.
 *
 * <p>/api/v1/auth/** is deliberately exempt: a suspended student must still be
 * able to read their honest status from /auth/me and to sign out.
 */
@Component
public class AccountStatusFilter extends OncePerRequestFilter {

    private final AppUserRepository userRepository;
    private final ObjectMapper objectMapper;

    public AccountStatusFilter(AppUserRepository userRepository, ObjectMapper objectMapper) {
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        if (!requiresActiveAccount(request.getRequestURI())) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            filterChain.doFilter(request, response);
            return;
        }

        AppUser user = userRepository
                .findByEmailNormalized(AppUser.normalizeEmail(authentication.getName()))
                .orElse(null);

        if (user == null) {
            write(response, HttpServletResponse.SC_UNAUTHORIZED, "Authentication required",
                    "Your session is no longer valid. Sign in again.", request.getRequestURI());
            return;
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            String message = user.getStatus() == UserStatus.SUSPENDED
                    ? "Your account is suspended. Contact an administrator."
                    : "Your account is not active. Contact an administrator.";
            write(response, HttpServletResponse.SC_FORBIDDEN, "Account suspended", message,
                    request.getRequestURI());
            return;
        }

        filterChain.doFilter(request, response);
    }

    private static boolean requiresActiveAccount(String path) {
        return path.equals("/api/v1/me") || path.startsWith("/api/v1/me/")
                || path.equals("/api/v1/admin") || path.startsWith("/api/v1/admin/");
    }

    private void write(HttpServletResponse response, int status, String error, String message,
                       String path) throws IOException {
        if (response.isCommitted()) {
            return;
        }
        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        objectMapper.writeValue(response.getWriter(), ApiError.of(status, error, message, path));
    }
}
