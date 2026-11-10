package com.codepath.academy;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

// Security is fully configured by SecurityConfig; the generated default user is disabled.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
@ConfigurationPropertiesScan
public class CodepathAcademyApplication {

    public static void main(String[] args) {
        SpringApplication.run(CodepathAcademyApplication.class, args);
    }
}
