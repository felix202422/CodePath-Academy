package com.codepath.academy.config;

import com.codepath.academy.audit.AuditInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registers the audit trail interceptor over every administrator endpoint. */
@Configuration
public class AuditConfig implements WebMvcConfigurer {

    private final AuditInterceptor auditInterceptor;

    public AuditConfig(AuditInterceptor auditInterceptor) {
        this.auditInterceptor = auditInterceptor;
    }

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(auditInterceptor).addPathPatterns("/api/v1/admin/**");
    }
}
